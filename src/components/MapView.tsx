import { MapPin } from "lucide-react";

const MapView = () => {
  return (
    <div className="relative w-full h-full bg-muted/30 flex items-center justify-center">
      {/* 지도 플레이스홀더 */}
      <div className="text-center space-y-4 p-8">
        <MapPin className="h-16 w-16 text-primary mx-auto" />
        <div className="space-y-2">
          <p className="text-lg font-medium text-foreground">
            T Map API 연동 필요
          </p>
          <p className="text-sm text-muted-foreground max-w-md">
            실제 지도를 표시하려면 T Map API 키가 필요합니다.<br />
            현재 위치와 경로가 여기에 표시됩니다.
          </p>
        </div>
      </div>
      
      {/* 현재 위치 마커 (예시) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <div className="w-4 h-4 bg-primary rounded-full border-2 border-background shadow-lg" />
          <div className="absolute inset-0 w-4 h-4 bg-primary/30 rounded-full animate-ping" />
        </div>
      </div>
    </div>
  );
};

export default MapView;
