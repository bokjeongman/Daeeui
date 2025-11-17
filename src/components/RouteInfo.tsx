import { MapPin, Clock, CheckCircle2, AlertTriangle, AlertCircle, Bus, Train } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import SaveRouteButton from "./SaveRouteButton";

interface RouteInfoProps {
  distance?: string;
  duration?: string;
  safePercentage?: number;
  warningPercentage?: number;
  dangerPercentage?: number;
  showButton?: boolean;
  variant?: "default" | "yellow";
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
  onStartNavigation?: () => void;
  startPoint?: { lat: number; lon: number; name: string };
  endPoint?: { lat: number; lon: number; name: string };
  rawDistance?: number;
  rawDuration?: number;
}

const RouteInfo = ({
  distance = "1.2 km",
  duration = "15분",
  safePercentage = 70,
  warningPercentage = 20,
  dangerPercentage = 10,
  showButton = true,
  variant = "default",
  transitInfo,
  onStartNavigation,
  startPoint,
  endPoint,
  rawDistance,
  rawDuration,
}: RouteInfoProps) => {
  return (
    <Card className="rounded-t-3xl border-0 shadow-lg">
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          추천 경로
        </h3>
        
        {/* 거리 및 시간 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">총 거리</span>
            </div>
            <p className="text-xl font-bold">{distance}</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-sm">예상 시간</span>
            </div>
            <p className="text-xl font-bold">{duration}</p>
          </div>
        </div>

        {/* 구간 정보 */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground mb-2">구간별 장애물 정보</h4>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-medium">안심 구간</span>
            </div>
            <span className="font-bold text-green-500">{safePercentage}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="font-medium">경고 구간</span>
            </div>
            <span className="font-bold text-yellow-500">{warningPercentage}%</span>
          </div>

          {dangerPercentage > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="font-medium">위험 구간</span>
              </div>
              <span className="font-bold text-red-500">{dangerPercentage}%</span>
            </div>
          )}
        </div>

        {/* 대중교통 노선 정보 */}
        {transitInfo && transitInfo.legs.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground mb-2">
              대중교통 이용 정보 (환승 {transitInfo.transfers}회)
            </h4>
            {transitInfo.legs.map((leg, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {leg.mode === "BUS" ? (
                    <Bus className="h-5 w-5 text-blue-500" />
                  ) : (
                    <Train className="h-5 w-5 text-green-500" />
                  )}
                  <span className="font-semibold text-sm">
                    {leg.mode === "BUS" ? "버스" : "지하철"} {leg.route}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>출발: {leg.from}</div>
                  <div>도착: {leg.to}</div>
                  <div className="flex gap-3 mt-2">
                    <span>{(leg.distance / 1000).toFixed(1)}km</span>
                    <span>{Math.ceil(leg.time / 60)}분</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showButton && (
          <div className="space-y-2">
            {startPoint && endPoint && rawDistance && rawDuration && (
              <SaveRouteButton
                startPoint={startPoint}
                endPoint={endPoint}
                distance={rawDistance}
                duration={rawDuration}
              />
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default RouteInfo;
