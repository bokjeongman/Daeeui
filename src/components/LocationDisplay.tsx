import { useGeolocationWatch } from "@/hooks/useGeolocationWatch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MapPin, Navigation, AlertCircle } from "lucide-react";

const LocationDisplay = () => {
  const { position, error, isTracking, startTracking, stopTracking } = useGeolocationWatch();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          실시간 위치 추적
        </CardTitle>
        <CardDescription>
          현재 위치를 실시간으로 추적합니다
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 추적 상태 표시 */}
        <div className="flex items-center gap-2">
          <div className={`h-3 w-3 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
          <span className="text-sm font-medium">
            {isTracking ? '추적 중' : '추적 중지됨'}
          </span>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
        )}

        {/* 위치 정보 표시 */}
        {position && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">위도</span>
              <span className="font-mono font-medium">{position.latitude.toFixed(8)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">경도</span>
              <span className="font-mono font-medium">{position.longitude.toFixed(8)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">정확도</span>
              <span className="font-mono font-medium">{position.accuracy.toFixed(1)}m</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">마지막 업데이트</span>
              <span className="text-sm">
                {new Date(position.timestamp).toLocaleTimeString('ko-KR')}
              </span>
            </div>
          </div>
        )}

        {/* 추적 제어 버튼 */}
        <div className="flex gap-2">
          {!isTracking ? (
            <Button onClick={startTracking} className="w-full" size="lg">
              <Navigation className="mr-2 h-4 w-4" />
              추적 시작
            </Button>
          ) : (
            <Button onClick={stopTracking} variant="destructive" className="w-full" size="lg">
              추적 중지
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default LocationDisplay;
