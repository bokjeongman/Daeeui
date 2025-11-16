import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
  const currentMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const routeLayerRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const barrierMarkersRef = useRef<any[]>([]);

  // 현재 위치 가져오기
  const getCurrentLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError("이 브라우저는 위치 서비스를 지원하지 않습니다.");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({ lat: latitude, lon: longitude });
        setLoading(false);
        toast.success("현재 위치를 찾았습니다!");
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
  };

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

    // 현재 위치 마커 생성 (파란색 핀)
    const marker = new window.Tmapv2.Marker({
      position: position,
      map: map,
      icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_c.png",
      iconSize: new window.Tmapv2.Size(24, 38),
      title: "현재 위치",
      zIndex: 9999,
    });

    currentMarkerRef.current = marker;

    // 정확도 원(약 30m)
    const circle = new window.Tmapv2.Circle({
      center: position,
      radius: 30,
      strokeWeight: 0,
      fillColor: "#3b82f6",
      fillOpacity: 0.2,
      map: map,
    });
    accuracyCircleRef.current = circle;

    // 경로가 없을 때만 지도 중심 이동
    if (!startPoint && !endPoint) {
      map.setCenter(position);
      map.setZoom(16);
    }
  }, [map, userLocation, startPoint, endPoint]);

  // 배리어 데이터 (더미 데이터 - 추후 실제 DB 연동)
  const barrierData = [
    { id: 1, lat: 37.5665, lon: 126.9780, type: "slope", severity: "safe", name: "경사로" },
    { id: 2, lat: 37.5670, lon: 126.9785, type: "curb", severity: "warning", name: "위험한 턱" },
    { id: 3, lat: 37.5660, lon: 126.9775, type: "elevator", severity: "safe", name: "엘리베이터" },
    { id: 4, lat: 37.5675, lon: 126.9790, type: "curb", severity: "danger", name: "높은 턱" },
  ];

  // 배리어 마커 표시
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 기존 배리어 마커 제거
    barrierMarkersRef.current.forEach((marker) => marker.setMap(null));
    barrierMarkersRef.current = [];

    // 배리어 마커 생성
    barrierData.forEach((barrier) => {
      const position = new window.Tmapv2.LatLng(barrier.lat, barrier.lon);
      
      // 배리어 타입과 심각도에 따라 마커 색상 결정
      let iconUrl = "";
      if (barrier.type === "slope") {
        iconUrl = "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_g_m_p.png"; // 녹색
      } else if (barrier.type === "elevator") {
        iconUrl = "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_p.png"; // 파란색
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
        const infoWindow = new window.Tmapv2.InfoWindow({
          position: position,
          content: `<div style="padding:10px;"><strong>${barrier.name}</strong><br/>${barrier.type === "slope" ? "경사로 있음" : barrier.type === "elevator" ? "엘리베이터 있음" : "턱 주의"}</div>`,
          type: 2,
          map: map,
        });
      });

      barrierMarkersRef.current.push(marker);
    });
  }, [map]);

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

      {/* 현재 위치 버튼 */}
      <Button
        onClick={getCurrentLocation}
        size="icon"
        className="absolute bottom-4 right-4 h-12 w-12 rounded-full shadow-lg bg-background hover:bg-muted z-10"
        title="현재 위치"
        disabled={loading}
      >
        {loading && userLocation === null ? (
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        ) : (
          <MapPin className="h-5 w-5 text-primary" />
        )}
      </Button>
    </div>
  );
};

export default MapView;

