import { ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RouteSelectorProps {
  startPoint: { lat: number; lon: number; name: string } | null;
  endPoint: { lat: number; lon: number; name: string } | null;
  onStartClick: () => void;
  onEndClick: () => void;
  onSwap: () => void;
  onCancel: () => void;
}

const RouteSelector = ({
  startPoint,
  endPoint,
  onStartClick,
  onEndClick,
  onSwap,
  onCancel,
}: RouteSelectorProps) => {
  return (
    <div className="bg-background border-b">
      <div className="p-2">
        <div className="flex items-start gap-2">
          {/* 좌측: 출발지/도착지 영역 */}
          <div className="flex-1 bg-card rounded-lg border-2 p-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-1">
                {/* 출발지 */}
                <button
                  onClick={onStartClick}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {startPoint?.name || "출발지 입력"}
                  </span>
                </button>

                {/* 구분선 */}
                <div className="h-px bg-border mx-1" />

                {/* 도착지 */}
                <button
                  onClick={onEndClick}
                  className="w-full flex items-center gap-2 p-1.5 rounded-lg hover:bg-accent transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground">
                    {endPoint?.name || "도착지 입력"}
                  </span>
                </button>
              </div>

              {/* 위치 바꾸기 버튼 */}
              <Button
                variant="outline"
                size="icon"
                onClick={onSwap}
                disabled={!startPoint || !endPoint}
                className="h-8 w-8 flex-shrink-0"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* 우측: 버튼 영역 */}
          <div className="flex flex-col gap-1">
            {/* X 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 hover:bg-destructive/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteSelector;

