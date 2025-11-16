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

// MapView component for route planning and navigation
interface MapViewProps {
  startPoint?: { lat: number; lon: number; name: string } | null;
  endPoint?: { lat: number; lon: number; name: string } | null;
  selectedRouteType?: "transit" | "walk" | "car" | null;
  onPlaceClick?: (place: { name: string; lat: number; lon: number }) => void;
  onRoutesCalculated?: (routes: Array<{
    type: "transit" | "walk" | "car";
    distance: number;
    duration: number;
    safePercentage: number;
    warningPercentage: number;
    dangerPercentage: number;
    barriers: { type: string; severity: string; name: string }[];
    transitInfo?: {
      legs: Array<{
        mode: string;
        route: string;
        from: string;
        to: string;
        distance: number;
        time: number;
      }>;
      transfers: number;
    };
  }>) => void;
}

const MapView = ({ 
  startPoint, 
  endPoint, 
  selectedRouteType, 
  onRoutesCalculated, 
  onPlaceClick 
}: MapViewProps) => {
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
  const [previousDuration, setPreviousDuration] = useState<number | null>(null);
  const [routeUpdateTrigger, setRouteUpdateTrigger] = useState(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const barrierMarkersRef = useRef<any[]>([]);
  const favoriteMarkersRef = useRef<any[]>([]);
  const arrowMarkersRef = useRef<any[]>([]);
  const [transitDetails, setTransitDetails] = useState<any>(null);

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
        if (import.meta.env.DEV) console.error("제보 데이터 로딩 실패:", error);
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
        if (import.meta.env.DEV) console.error("즐겨찾기 데이터 로딩 실패:", error);
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
      
      // 지도 클릭 이벤트 - POI 검색
      tmapInstance.addListener("click", async (evt: any) => {
        if (!onPlaceClick) return;
        
        const lat = evt.latLng.lat();
        const lon = evt.latLng.lng();
        
        try {
          // 클릭한 위치 주변의 POI 검색
          const response = await fetch(
            `https://apis.openapi.sk.com/tmap/pois/search/around?version=1&centerLon=${lon}&centerLat=${lat}&radius=50&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=1`,
            {
              headers: {
                appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
              },
            }
          );
          
          if (!response.ok) return;
          
          const text = await response.text();
          if (!text) return;
          
          const data = JSON.parse(text);
          
          if (data.searchPoiInfo?.pois?.poi && data.searchPoiInfo.pois.poi.length > 0) {
            const poi = data.searchPoiInfo.pois.poi[0];
            onPlaceClick({
              name: poi.name,
              lat: parseFloat(poi.noorLat),
              lon: parseFloat(poi.noorLon),
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error("POI 검색 실패:", error);
        }
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("지도 초기화 실패:", err);
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

      // 마커 클릭 이벤트 - 장소 후기 열기
      marker.addListener("click", () => {
        if (onPlaceClick) {
          onPlaceClick({
            name: barrier.name,
            lat: barrier.latitude,
            lon: barrier.longitude,
          });
        }
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

      // 마커 클릭 이벤트 - 장소 후기 열기
      marker.addListener("click", () => {
        if (onPlaceClick) {
          onPlaceClick({
            name: favorite.place_name,
            lat: Number(favorite.latitude),
            lon: Number(favorite.longitude),
          });
        }
      });

      favoriteMarkersRef.current.push(marker);
    });
  }, [map, favorites]);

  // 여러 교통수단으로 경로 탐색
  useEffect(() => {
    if (!map || !window.Tmapv2 || !endPoint) return;

    const calculateAllRoutes = async () => {
      try {
        // 기존 경로 및 마커 제거
        if (routeLayerRef.current && routeLayerRef.current.length) {
          routeLayerRef.current.forEach((layer: any) => layer.setMap(null));
          routeLayerRef.current = [];
        }
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];
        arrowMarkersRef.current.forEach((marker) => marker.setMap(null));
        arrowMarkersRef.current = [];
        
        // 출발지가 없으면 현재 위치 사용
        const start = startPoint || userLocation;
        if (!start) {
          toast.error("현재 위치를 찾을 수 없습니다.");
          return;
        }

        // 선택된 교통수단이 없으면 3가지 모두 계산
        const routesToCalculate = selectedRouteType ? [selectedRouteType] : ["transit", "walk", "car"];
        const calculatedRoutes: any[] = [];

        for (const routeType of routesToCalculate) {
          try {
            let apiUrl = "";
            let requestBody: any = {
              startX: start.lon.toString(),
              startY: start.lat.toString(),
              endX: endPoint.lon.toString(),
              endY: endPoint.lat.toString(),
              reqCoordType: "WGS84GEO",
              resCoordType: "WGS84GEO",
              startName: startPoint?.name || "현재 위치",
              endName: endPoint.name,
            };

            // 교통수단별 API 엔드포인트 설정
            if (routeType === "walk") {
              apiUrl = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
            } else if (routeType === "car") {
              apiUrl = "https://apis.openapi.sk.com/tmap/routes?version=1";
              requestBody.searchOption = "10"; // 실시간 빠른 경로
              requestBody.trafficInfo = "Y"; // 실시간 교통정보 반영
            } else if (routeType === "transit") {
              // 대중교통 경로
              apiUrl = "https://apis.openapi.sk.com/transit/routes?version=1";
              requestBody.format = "json";
            }

            const response = await fetch(apiUrl, {
              method: "POST",
              headers: {
                appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
                "Content-Type": "application/json",
              },
              body: JSON.stringify(requestBody),
            });

            const data = await response.json();

            // API 에러 응답 체크
            if (data.error) {
              console.warn(`${routeType} API 에러:`, data.error);
              if (routeType === "transit" && data.error.code === "QUOTA_EXCEEDED") {
                toast.warning("대중교통 경로는 일시적으로 이용할 수 없습니다.", {
                  description: "API 할당량이 초과되었습니다."
                });
              } else {
                toast.warning(`${routeType === "walk" ? "도보" : routeType === "car" ? "자동차" : "대중교통"} 경로를 찾을 수 없습니다.`);
              }
              continue; // 다음 경로 계산 계속 진행
            }

            if (routeType === "transit" && data.metaData && data.metaData.plan) {
              // 대중교통 경로 처리
              const itinerary = data.metaData.plan.itineraries[0];
              if (itinerary) {
                let totalDistance = 0;
                let totalTime = itinerary.totalTime || 0;
                const transitInfo: any = {
                  legs: [],
                  transfers: 0,
                };

                itinerary.legs.forEach((leg: any) => {
                  totalDistance += leg.distance || 0;
                  if (leg.mode === "BUS" || leg.mode === "SUBWAY") {
                    transitInfo.legs.push({
                      mode: leg.mode,
                      route: leg.route || leg.routeId,
                      from: leg.from?.name,
                      to: leg.to?.name,
                      distance: leg.distance,
                      time: leg.sectionTime,
                    });
                    if (transitInfo.legs.length > 1) {
                      transitInfo.transfers++;
                    }
                  }
                });

                setTransitDetails(transitInfo);
                calculatedRoutes.push({
                  type: "transit",
                  distance: totalDistance,
                  duration: totalTime,
                  safePercentage: 85,
                  warningPercentage: 15,
                  dangerPercentage: 0,
                  barriers: [],
                  transitInfo,
                });
              }
            } else if (data.features) {
              // 도보/자동차 경로 처리
              const lineStrings: any[] = [];
              let totalDistance = 0;
              let totalTime = 0;
              
              data.features.forEach((feature: any) => {
                if (feature.geometry.type === "LineString") {
                  feature.geometry.coordinates.forEach((coord: any) => {
                    lineStrings.push(new window.Tmapv2.LatLng(coord[1], coord[0]));
                  });
                }
                if (feature.properties) {
                  if (feature.properties.distance) {
                    totalDistance += feature.properties.distance;
                  }
                  if (feature.properties.time) {
                    totalTime += feature.properties.time;
                  }
                }
              });

              // 경로 근처의 배리어 찾기
              const nearbyBarriers = barrierData.filter((barrier) => {
                return lineStrings.some((point) => {
                  const distance = calculateDistance(
                    point.lat(),
                    point.lng(),
                    barrier.latitude,
                    barrier.longitude
                  );
                  return distance < 0.05; // 50m 이내
                });
              });

              // 안전도 계산
              const dangerCount = nearbyBarriers.filter(
                (b) => b.accessibility_level === "매우위험" && filter.danger
              ).length;
              const warningCount = nearbyBarriers.filter(
                (b) => b.accessibility_level === "주의" && filter.warning
              ).length;
              const totalBarriers = dangerCount + warningCount;
              
              let dangerPercentage = 0;
              let warningPercentage = 0;
              let safePercentage = 100;
              
              if (totalBarriers > 0) {
                dangerPercentage = (dangerCount / totalBarriers) * 100;
                warningPercentage = (warningCount / totalBarriers) * 100;
                safePercentage = 100 - dangerPercentage - warningPercentage;
              }

              // 첫 번째 feature의 정보 가져오기
              const firstFeature = data.features[0];
              if (firstFeature && firstFeature.properties) {
                totalDistance = firstFeature.properties.totalDistance || totalDistance;
                totalTime = firstFeature.properties.totalTime || totalTime;
              }

              calculatedRoutes.push({
                type: routeType,
                distance: totalDistance,
                duration: totalTime,
                safePercentage,
                warningPercentage,
                dangerPercentage,
                barriers: nearbyBarriers,
                lineStrings,
              });

              // 자동차 경로일 때 이전 시간과 비교하여 알림
              if (routeType === "car" && previousDuration !== null && routeUpdateTrigger > 1) {
                const timeDiff = totalTime - previousDuration;
                const minuteDiff = Math.abs(Math.round(timeDiff / 60));
                
                if (minuteDiff > 2) {
                  if (timeDiff > 0) {
                    toast.error(`⚠️ 교통 정체로 ${minuteDiff}분 지연 예상`, {
                      description: "실시간 교통 정보가 반영되었습니다."
                    });
                  } else {
                    toast.success(`✅ 교통 상황 개선! ${minuteDiff}분 단축`, {
                      description: "실시간 교통 정보가 반영되었습니다."
                    });
                  }
                }
              }
              
              if (routeType === "car") {
                setPreviousDuration(totalTime);
              }
            }
          } catch (error) {
            if (import.meta.env.DEV) console.error(`${routeType} 경로 계산 실패:`, error);
            // 에러가 발생해도 다음 경로는 계속 시도
            continue;
          }
        }

        // 모든 경로 계산 후 콜백 호출
        if (calculatedRoutes.length > 0) {
          if (onRoutesCalculated) {
            onRoutesCalculated(calculatedRoutes);
          }
          
          // 일부 경로만 성공한 경우 알림
          const failedRoutes = routesToCalculate.filter(
            rt => !calculatedRoutes.find(cr => cr.type === rt)
          );
          if (failedRoutes.length > 0 && failedRoutes.length < routesToCalculate.length) {
            const routeNames = failedRoutes.map(rt => 
              rt === "walk" ? "도보" : rt === "car" ? "자동차" : "대중교통"
            ).join(", ");
            toast.info(`${routeNames} 경로를 제외한 경로를 표시합니다.`);
          }
        } else {
          toast.error("경로를 찾을 수 없습니다. 다시 시도해주세요.");
        }

        // 선택된 경로가 있으면 해당 경로만 지도에 표시
        if (selectedRouteType && calculatedRoutes.length > 0) {
          const selectedRoute = calculatedRoutes.find(r => r.type === selectedRouteType);
          if (selectedRoute && selectedRoute.lineStrings) {
            // 경로 그리기
            const routeSegments = createRouteSegments(selectedRoute.lineStrings);
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

            // 화살표 마커 추가 (일정 간격으로)
            addArrowMarkers(selectedRoute.lineStrings);

            // 출발지 마커
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

            // 지도 범위 조정
            const bounds = new window.Tmapv2.LatLngBounds();
            selectedRoute.lineStrings.forEach((point: any) => bounds.extend(point));
            map.fitBounds(bounds);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("경로 탐색 실패:", error);
        toast.error("경로를 찾을 수 없습니다.");
      }
    };

    calculateAllRoutes();
  }, [map, startPoint, endPoint, userLocation, barrierData, onRoutesCalculated, selectedRouteType, routeUpdateTrigger]);

  // 실시간 교통 정보 자동 업데이트 (자동차 경로가 선택되었을 때만)
  useEffect(() => {
    // 기존 interval 정리
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    // 자동차 경로가 선택되었을 때만 실시간 업데이트 시작
    if (selectedRouteType === "car" && map && endPoint) {
      toast.info("🚗 실시간 교통 정보 업데이트 시작", {
        description: "30초마다 경로를 자동 업데이트합니다."
      });

      // 30초마다 경로 재탐색
      updateIntervalRef.current = setInterval(() => {
        setRouteUpdateTrigger(prev => prev + 1);
      }, 30000);
    }

    // cleanup
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [selectedRouteType, map, endPoint]);

  // 화살표 마커 추가 함수
  const addArrowMarkers = (path: any[]) => {
    // 기존 화살표 제거
    arrowMarkersRef.current.forEach((marker) => marker.setMap(null));
    arrowMarkersRef.current = [];

    // 경로 길이에 따라 화살표 간격 조정 (약 100m마다)
    const arrowInterval = Math.max(10, Math.floor(path.length / 10));

    for (let i = arrowInterval; i < path.length; i += arrowInterval) {
      const prevPoint = path[i - 1];
      const currentPoint = path[i];

      // 화살표 방향 계산
      const angle = calculateBearing(
        prevPoint.lat(),
        prevPoint.lng(),
        currentPoint.lat(),
        currentPoint.lng()
      );

      // 화살표 SVG 생성
      const arrowSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2 L12 18 M12 18 L6 12 M12 18 L18 12" 
                stroke="${getRouteColor(selectedRouteType)}" 
                stroke-width="3" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                fill="none"/>
        </svg>
      `;

      const arrowDiv = document.createElement('div');
      arrowDiv.innerHTML = arrowSvg;
      arrowDiv.style.transform = `rotate(${angle}deg)`;
      arrowDiv.style.transformOrigin = 'center';

      const arrowMarker = new window.Tmapv2.Marker({
        position: currentPoint,
        icon: arrowDiv,
        iconSize: new window.Tmapv2.Size(24, 24),
        map: map,
      });

      arrowMarkersRef.current.push(arrowMarker);
    }
  };

  // 방향 계산 함수 (bearing)
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360;
  };

  // 교통수단별 기본 색상
  const getRouteColor = (routeType: "transit" | "walk" | "car" | null | undefined) => {
    switch (routeType) {
      case "transit":
        return "#3b82f6"; // 파란색
      case "walk":
        return "#22c55e"; // 초록색
      case "car":
        return "#ef4444"; // 빨간색
      default:
        return "#22c55e"; // 기본 초록색
    }
  };

  // 경로 세그먼트 생성 (배리어 근처는 다른 색상)
  const createRouteSegments = (path: any[]) => {
    const segments: { path: any[]; color: string }[] = [];
    let currentSegment: any[] = [];
    const baseColor = getRouteColor(selectedRouteType);
    let currentColor = baseColor; // 선택된 교통수단 색상

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

      let segmentColor = baseColor; // 선택된 교통수단 색상
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

