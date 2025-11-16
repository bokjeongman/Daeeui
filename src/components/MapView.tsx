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

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const currentMarkerRef = useRef<any>(null);

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
    } catch (err) {
      console.error("지도 초기화 실패:", err);
      setError("지도를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, []);

  // 사용자 위치가 변경되면 지도 중심 이동 및 마커 표시
  useEffect(() => {
    if (!map || !userLocation) return;

    const { lat, lon } = userLocation;
    const position = new window.Tmapv2.LatLng(lat, lon);

    // 지도 중심 이동
    map.setCenter(position);
    map.setZoom(16);

    // 기존 마커 제거
    if (currentMarkerRef.current) {
      currentMarkerRef.current.setMap(null);
    }

    // 새 마커 생성 (핀 모양)
    const marker = new window.Tmapv2.Marker({
      position: position,
      map: map,
      icon: "https://tmapapi.sktelecom.com/upload/tmap/marker/pin_b_m_p.png",
      iconSize: new window.Tmapv2.Size(24, 38),
      title: "현재 위치",
    });

    currentMarkerRef.current = marker;
  }, [map, userLocation]);

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

