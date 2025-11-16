import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, AlertCircle, Navigation, Filter, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// T Map 타입 선언
declare global {
  interface Window {
    Tmapv2: any;
  }
}

interface MapViewProps {
  startPoint?: { lat: number; lon: number; name: string } | null;
  endPoint?: { lat: number; lon: number; name: string } | null;
  onRouteCalculated?: (routeData: {
    distance: number;
    duration: number;
    barriers: { type: string; severity: string; name: string }[];
  }) => void;
}

const MapView = ({ startPoint, endPoint, onRouteCalculated }: MapViewProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [barrierData, setBarrierData] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [filter, setFilter] = useState({ safe: true, warning: true, danger: true });
  const [showFilter, setShowFilter] = useState(false);
  const currentMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const barrierMarkersRef = useRef<any[]>([]);
  const favoriteMarkersRef = useRef<any[]>([]);

  // 현재 위치 가져오기 및 지속적 추적
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      setLoading(false);
      return;
    }

    // 기존 watch 정리
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    // 지속적으로 위치 추적
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setLoading(false);
        if (watchIdRef.current === null) {
          toast.success("현재 위치를 찾았습니다!");
        }
      },
      (error) => {
        let errorMessage = "위치를 가져올 수 없습니다.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "위치 접근 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "위치 정보를 사용할 수 없습니다.";
            break;
          case error.TIMEOUT:
            errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
            break;
        }
        
        setError(errorMessage);
        setLoading(false);
        toast.error(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );

    watchIdRef.current = watchId;

    // 나침반 방향 추적 (지원하는 경우)
    if (window.DeviceOrientationEvent && 'ontouchstart' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // alpha는 0-360도 값, 북쪽이 0도
      setHeading(360 - event.alpha);
    } else if ((event as any).webkitCompassHeading !== undefined) {
      // iOS Safari용
      setHeading((event as any).webkitCompassHeading);
    }
  };

  // 컴포넌트 언마운트 시 watch 정리
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      window.removeEventListener('deviceorientationabsolute', handleOrientation, true);
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, []);

  // 승인된 제보 데이터 가져오기
  useEffect(() => {
    const fetchApprovedReports = async () => {
      try {
        const { data, error } = await supabase
          .from("accessibility_reports")
          .select("*")
          .eq("status", "approved");

        if (error) throw error;

        // 제보 데이터를 barrierData 형식으로 변환
        const barriers = (data || []).map((report) => {
          let severity = "safe";
          if (report.accessibility_level === "difficult") {
            severity = "danger";
          } else if (report.accessibility_level === "moderate") {
            severity = "warning";
          }

          return {
            id: report.id,
            lat: Number(report.latitude),
            lon: Number(report.longitude),
            type: report.category,
            severity: severity,
            name: report.location_name,
            details: report.details,
          };
        });

        setBarrierData(barriers);
      } catch (error) {
        console.error("제보 데이터 로딩 실패:", error);
      }
    };

    fetchApprovedReports();

    // 실시간 업데이트 구독
    const channel = supabase
      .channel("accessibility_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accessibility_reports",
          filter: "status=eq.approved",
        },
        () => {
          fetchApprovedReports();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 즐겨찾기 데이터 가져오기
  useEffect(() => {
    const fetchFavorites = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      try {
        const { data, error } = await supabase
          .from("favorites")
          .select("*")
          .eq("user_id", session.user.id);

        if (error) throw error;

        setFavorites(data || []);
      } catch (error) {
        console.error("즐겨찾기 데이터 로딩 실패:", error);
      }
    };

    fetchFavorites();

    // 실시간 업데이트 구독
    const channel = supabase
      .channel("favorites_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
        },
        () => {
          fetchFavorites();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.Tmapv2) {
      return;
    }

    try {
      const tmapInstance = new window.Tmapv2.Map(mapRef.current, {
        center: new window.Tmapv2.LatLng(37.5665, 126.9780), // 서울시청 기본 위치
        width: "100%",
        height: "100%",
        zoom: 16,
      });

      setMap(tmapInstance);
      setLoading(false);
      // 최초 진입 시 현재 위치 자동 요청
      getCurrentLocation();
    } catch (err) {
      console.error("지도 초기화 실패:", err);
      setError("지도를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, []);

  // 사용자 위치가 변경되면 현재 위치 마커 표시
  useEffect(() => {
    if (!map || !userLocation) return;

    const { lat, lon } = userLocation;
    const position = new window.Tmapv2.LatLng(lat, lon);

    // 기존 마커 및 정확도 원 제거
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
    }
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }

    // 나침반 방향을 고려한 SVG 마커 생성
    const rotation = heading !== null ? heading : 0;
    const svgIcon = `
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;">
        <defs>
          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.3"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <!-- 외부 원 (흰색 테두리) -->
        <circle cx="24" cy="24" r="16" fill="white" filter="url(#shadow)"/>
        <!-- 내부 원 (파란색) -->
        <circle cx="24" cy="24" r="14" fill="#3b82f6"/>
        <!-- 나침반 화살표 -->
        <path d="M 24 10 L 28 24 L 24 20 L 20 24 Z" fill="white"/>
        <path d="M 24 38 L 20 24 L 24 28 L 28 24 Z" fill="#93c5fd"/>
        <!-- 중심점 -->
        <circle cx="24" cy="24" r="3" fill="white"/>
      </svg>
    `;

    // HTML 마커로 생성
    const markerDiv = document.createElement('div');
    markerDiv.innerHTML = svgIcon;
    markerDiv.style.width = '48px';
    markerDiv.style.height = '48px';
    markerDiv.style.cursor = 'pointer';

    const marker = new window.Tmapv2.Marker({
      position: position,
      map: map,
      icon: markerDiv,
      iconSize: new window.Tmapv2.Size(48, 48),
      title: "현재 위치",
      zIndex: 9999,
    });

    currentMarkerRef.current = marker;

    // 정확도 원(약 30m)
    const circle = new window.Tmapv2.Circle({
      center: position,
      radius: 30,
      strokeWeight: 2,
      strokeColor: "#3b82f6",
      strokeOpacity: 0.5,
      fillColor: "#3b82f6",
      fillOpacity: 0.15,
      map: map,
    });
    accuracyCircleRef.current = circle;

    // 경로가 없을 때만 지도 중심 이동
    if (!startPoint && !endPoint) {
      map.setCenter(position);
      map.setZoom(16);
    }
  }, [map, userLocation, heading, startPoint, endPoint]);

  // 배리어 마커 표시
  useEffect(() => {
    if (!map || !window.Tmapv2 || barrierData.length === 0) return;

    // 기존 배리어 마커 제거
    barrierMarkersRef.current.forEach((marker) => marker.setMap(null));
    barrierMarkersRef.current = [];

    // 배리어 마커 생성 (필터 적용)
    barrierData.forEach((barrier) => {
      // 필터 상태에 따라 표시 여부 결정
      if (
        (barrier.severity === "safe" && !filter.safe) ||
        (barrier.severity === "warning" && !filter.warning) ||
        (barrier.severity === "danger" && !filter.danger)
      ) {
        return;
      }

      const position = new window.Tmapv2.LatLng(barrier.lat, barrier.lon);
      
      // 배리어 심각도에 따라 마커 색상 결정
      let iconUrl = "";
      if (barrier.severity === "safe") {
        iconUrl = "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_g_m_p.png"; // 녹색
      } else if (barrier.severity === "warning") {
        iconUrl = "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_y_m_p.png"; // 노란색
      } else {
        iconUrl = "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_p.png"; // 빨간색
      }

      const marker = new window.Tmapv2.Marker({
        position: position,
        map: map,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(24, 38),
        title: barrier.name,
      });

      // 마커 클릭 이벤트 - 인포윈도우
      marker.addListener("click", () => {
        const categoryLabels: Record<string, string> = {
          ramp: "경사로",
          elevator: "엘리베이터",
          curb: "턱",
          stairs: "계단",
          parking: "주차장",
          restroom: "화장실",
          entrance: "출입구",
          other: "기타",
        };
        
        const infoWindow = new window.Tmapv2.InfoWindow({
          position: position,
          content: `<div style="padding:10px;"><strong>${barrier.name}</strong><br/>${categoryLabels[barrier.type] || barrier.type}${barrier.details ? `<br/>${barrier.details}` : ""}</div>`,
          type: 2,
          map: map,
        });
      });

      barrierMarkersRef.current.push(marker);
    });
  }, [map, barrierData, filter]);

  // 즐겨찾기 마커 표시
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 기존 즐겨찾기 마커 제거
    favoriteMarkersRef.current.forEach((marker) => marker.setMap(null));
    favoriteMarkersRef.current = [];

    // 즐겨찾기 마커 생성
    favorites.forEach((favorite) => {
      const position = new window.Tmapv2.LatLng(Number(favorite.latitude), Number(favorite.longitude));
      
      // 별표 SVG 아이콘
      const starIcon = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="star-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1"/>
              <feOffset dx="0" dy="1" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M16 2 L19.5 12 L30 12 L21.5 18.5 L25 28 L16 22 L7 28 L10.5 18.5 L2 12 L12.5 12 Z" 
                fill="#fbbf24" 
                stroke="#f59e0b" 
                stroke-width="1.5" 
                filter="url(#star-shadow)"/>
        </svg>
      `;

      const markerDiv = document.createElement('div');
      markerDiv.innerHTML = starIcon;
      markerDiv.style.width = '32px';
      markerDiv.style.height = '32px';
      markerDiv.style.cursor = 'pointer';

      const marker = new window.Tmapv2.Marker({
        position: position,
        map: map,
        icon: markerDiv,
        iconSize: new window.Tmapv2.Size(32, 32),
        title: favorite.place_name,
      });

      // 마커 클릭 이벤트
      marker.addListener("click", () => {
        const infoWindow = new window.Tmapv2.InfoWindow({
          position: position,
          content: `<div style="padding:10px;">
            <div style="display:flex;align-items:center;gap:4px;margin-bottom:4px;">
              <svg width="16" height="16" viewBox="0 0 16 16" style="fill:#fbbf24;">
                <path d="M8 1 L9.75 6 L15 6 L10.75 9.25 L12.5 14 L8 11 L3.5 14 L5.25 9.25 L1 6 L6.25 6 Z"/>
              </svg>
              <strong>${favorite.place_name}</strong>
            </div>
            <div style="font-size:12px;color:#666;">${favorite.address || ''}</div>
          </div>`,
          type: 2,
          map: map,
        });
      });

      favoriteMarkersRef.current.push(marker);
    });
  }, [map, favorites]);

  // 도보 경로 탐색 및 배리어 오버레이
  useEffect(() => {
    if (!map || !window.Tmapv2 || !endPoint) return;

    const drawRoute = async () => {
      try {
        // 기존 경로 및 마커 제거
        if (routeLayerRef.current && routeLayerRef.current.length) {
          routeLayerRef.current.forEach((layer: any) => layer.setMap(null));
          routeLayerRef.current = [];
        }
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        // 출발지가 없으면 현재 위치 사용
        const start = startPoint || userLocation;
        if (!start) {
          toast.error("현재 위치를 찾을 수 없습니다. 위치 권한을 허용해주세요.");
          return;
        }

        // T Map 도보 경로 API 호출
        const response = await fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1", {
          method: "POST",
          headers: {
            appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startX: start.lon.toString(),
            startY: start.lat.toString(),
            endX: endPoint.lon.toString(),
            endY: endPoint.lat.toString(),
            reqCoordType: "WGS84GEO",
            resCoordType: "WGS84GEO",
            startName: startPoint?.name || "현재 위치",
            endName: endPoint.name,
          }),
        });

        const data = await response.json();
        
        if (data.features) {
          const lineStrings: any[] = [];
          let totalDistance = 0;
          let totalTime = 0;
          
          data.features.forEach((feature: any) => {
            if (feature.geometry.type === "LineString") {
              feature.geometry.coordinates.forEach((coord: any) => {
                lineStrings.push(new window.Tmapv2.LatLng(coord[1], coord[0]));
              });
            }
            // 거리와 시간 정보 수집
            if (feature.properties) {
              if (feature.properties.distance) {
                totalDistance += feature.properties.distance;
              }
              if (feature.properties.time) {
                totalTime += feature.properties.time;
              }
            }
          });

          // 경로를 여러 세그먼트로 나눠서 배리어 근처는 다른 색으로 표시
          const routeSegments = createRouteSegments(lineStrings);
          
          // 경로 근처의 배리어 찾기
          const nearbyBarriers: { type: string; severity: string; name: string }[] = [];
          lineStrings.forEach((point) => {
            barrierData.forEach((barrier) => {
              const distance = calculateDistance(
                point.lat(),
                point.lng(),
                barrier.lat,
                barrier.lon
              );
              if (distance < 20 && !nearbyBarriers.find(b => b.name === barrier.name)) {
                nearbyBarriers.push({
                  type: barrier.type,
                  severity: barrier.severity,
                  name: barrier.name
                });
              }
            });
          });

          // 경로 정보를 부모 컴포넌트로 전달
          if (onRouteCalculated) {
            onRouteCalculated({
              distance: totalDistance,
              duration: totalTime,
              barriers: nearbyBarriers
            });
          }
          
          const createdPolylines: any[] = [];
          routeSegments.forEach((segment) => {
            const polyline = new window.Tmapv2.Polyline({
              path: segment.path,
              strokeColor: segment.color,
              strokeWeight: 6,
              map: map,
            });
            createdPolylines.push(polyline);
          });
          routeLayerRef.current = createdPolylines;

          // 출발지 마커 (startPoint가 있을 때만)
          if (startPoint) {
            const startMarker = new window.Tmapv2.Marker({
              position: new window.Tmapv2.LatLng(startPoint.lat, startPoint.lon),
              icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_s.png",
              iconSize: new window.Tmapv2.Size(24, 38),
              map: map,
              title: "출발",
            });
            markersRef.current.push(startMarker);
          }

          // 도착지 마커
          const endMarker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(endPoint.lat, endPoint.lon),
            icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_r_m_e.png",
            iconSize: new window.Tmapv2.Size(24, 38),
            map: map,
            title: "도착",
          });
          markersRef.current.push(endMarker);

          // 경로가 모두 보이도록 지도 범위 조정
          const bounds = new window.Tmapv2.LatLngBounds();
          lineStrings.forEach((point) => bounds.extend(point));
          map.fitBounds(bounds);
        }
      } catch (error) {
        console.error("경로 탐색 실패:", error);
        toast.error("경로를 찾을 수 없습니다.");
      }
    };

    drawRoute();
  }, [map, startPoint, endPoint, userLocation]);

  // 경로 세그먼트 생성 (배리어 근처는 다른 색상)
  const createRouteSegments = (path: any[]) => {
    const segments: { path: any[]; color: string }[] = [];
    let currentSegment: any[] = [];
    let currentColor = "#22c55e"; // 기본 안전 색상 (녹색)

    path.forEach((point, index) => {
      // 배리어와의 거리 계산하여 색상 결정
      const nearbyBarrier = barrierData.find((barrier) => {
        const distance = calculateDistance(
          point.lat(),
          point.lng(),
          barrier.lat,
          barrier.lon
        );
        return distance < 20; // 20m 이내
      });

      let segmentColor = "#22c55e"; // 안심 (녹색)
      if (nearbyBarrier) {
        if (nearbyBarrier.severity === "warning") {
          segmentColor = "#f59e0b"; // 경고 (주황색)
        } else if (nearbyBarrier.severity === "danger") {
          segmentColor = "#ef4444"; // 위험 (빨간색)
        }
      }

      if (segmentColor !== currentColor && currentSegment.length > 0) {
        segments.push({ path: [...currentSegment], color: currentColor });
        currentSegment = [point];
        currentColor = segmentColor;
      } else {
        currentSegment.push(point);
      }

      if (index === path.length - 1 && currentSegment.length > 0) {
        segments.push({ path: currentSegment, color: currentColor });
      }
    });

    return segments.length > 0 ? segments : [{ path, color: currentColor }];
  };

  // 두 지점 간 거리 계산 (하버사인 공식, 미터 단위)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // 지구 반지름 (m)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  if (!window.Tmapv2) {
    return (
      <div className="relative w-full h-full bg-muted/30 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">
              T Map API를 불러올 수 없습니다
            </p>
            <p className="text-sm text-muted-foreground max-w-md">
              페이지를 새로고침해주세요.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="w-full h-full" />

      {/* 로딩 오버레이 */}
      {loading && userLocation === null && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="text-lg font-medium">위치 정보를 가져오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && !loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-sm w-full px-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
            <Button
              onClick={getCurrentLocation}
              size="sm"
              className="w-full"
              variant="outline"
            >
              다시 시도
            </Button>
          </div>
        </div>
      )}

      {/* 필터 버튼 */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
        <Button
          onClick={() => setShowFilter(!showFilter)}
          size="lg"
          className="h-12 w-12 rounded-full shadow-xl bg-background hover:bg-muted text-foreground border-2 border-border"
          title="필터"
        >
          <Filter className="h-5 w-5" />
        </Button>
        
        {showFilter && (
          <div className="bg-background border-2 border-border rounded-lg shadow-xl p-3 space-y-2 min-w-[160px]">
            <div className="text-sm font-semibold mb-2 text-foreground">접근성 필터</div>
            
            <button
              onClick={() => setFilter({ ...filter, safe: !filter.safe })}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
            >
              <div className={`w-4 h-4 rounded border-2 ${filter.safe ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                {filter.safe && <div className="text-white text-xs text-center leading-none">✓</div>}
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                안심
              </Badge>
            </button>
            
            <button
              onClick={() => setFilter({ ...filter, warning: !filter.warning })}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
            >
              <div className={`w-4 h-4 rounded border-2 ${filter.warning ? 'bg-yellow-500 border-yellow-500' : 'border-muted-foreground'}`}>
                {filter.warning && <div className="text-white text-xs text-center leading-none">✓</div>}
              </div>
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                주의
              </Badge>
            </button>
            
            <button
              onClick={() => setFilter({ ...filter, danger: !filter.danger })}
              className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors"
            >
              <div className={`w-4 h-4 rounded border-2 ${filter.danger ? 'bg-red-500 border-red-500' : 'border-muted-foreground'}`}>
                {filter.danger && <div className="text-white text-xs text-center leading-none">✓</div>}
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                위험
              </Badge>
            </button>
          </div>
        )}
      </div>

      {/* 현재 위치 버튼 */}
      <Button
        onClick={getCurrentLocation}
        size="lg"
        className="absolute bottom-4 right-4 h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground z-10 border-4 border-background"
        title="현재 위치"
        disabled={loading}
      >
        {loading && userLocation === null ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <Navigation className="h-6 w-6" />
        )}
      </Button>
    </div>
  );
};

export default MapView;

