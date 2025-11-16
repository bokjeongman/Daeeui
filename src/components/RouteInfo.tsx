import { MapPin, Clock, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface RouteInfoProps {
  distance?: string;
  duration?: string;
  safePercentage?: number;
  warningPercentage?: number;
  showButton?: boolean;
  variant?: "default" | "yellow";
  onStartNavigation?: () => void;
}

const RouteInfo = ({
  distance = "1.2 km",
  duration = "15분",
  safePercentage = 85,
  warningPercentage = 15,
  showButton = true,
  variant = "default",
  onStartNavigation,
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="font-medium">안심 구간</span>
            </div>
            <span className="font-bold text-primary">{safePercentage}%</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-secondary" />
              <span className="font-medium">경고 구간</span>
            </div>
            <span className="font-bold text-secondary">{warningPercentage}%</span>
          </div>
        </div>

        {showButton && (
          <Button
            className={`w-full h-14 text-base font-semibold ${
              variant === "yellow"
                ? "bg-accent hover:bg-accent/90 text-accent-foreground"
                : "bg-primary hover:bg-primary/90"
            }`}
            onClick={onStartNavigation}
          >
            {variant === "yellow" ? "🦽 휠체어 경로 안내 시작" : "경로 안내 시작"}
          </Button>
        )}
      </div>
    </Card>
  );
};

export default RouteInfo;
