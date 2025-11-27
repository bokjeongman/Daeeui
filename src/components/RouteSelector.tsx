import { ArrowUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "./SearchBar";

interface RouteSelectorProps {
  startPoint: { lat: number; lon: number; name: string } | null;
  endPoint: { lat: number; lon: number; name: string } | null;
  onStartClick: () => void;
  onEndClick: () => void;
  onSwap: () => void;
  onCancel: () => void;
  isSearchingEnd?: boolean;
  onSelectEnd?: (place: { lat: number; lon: number; name: string }) => void;
}

const RouteSelector = ({
  startPoint,
  endPoint,
  onStartClick,
  onEndClick,
  onSwap,
  onCancel,
  isSearchingEnd = false,
  onSelectEnd,
}: RouteSelectorProps) => {
  return (
    <div className="bg-background border-b">
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* 좌측: 출발지/도착지 영역 */}
          <div className="flex-1 bg-card rounded-lg border p-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 space-y-2">
                {/* 출발지 */}
                <button
                  onClick={onStartClick}
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-left"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">
                    {startPoint?.name || "출발지"}
                  </span>
                </button>

                {/* 구분선 */}
                <div className="h-px bg-border" />

                {/* 도착지 */}
                {isSearchingEnd && onSelectEnd ? (
                  <div className="py-1">
                    <SearchBar
                      placeholder="도착지 검색"
                      searchMode="end"
                      onSelectEnd={onSelectEnd}
                    />
                  </div>
                ) : (
                  <button
                    onClick={onEndClick}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-accent transition-colors text-left"
                  >
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground truncate">
                      {endPoint?.name || "도착지"}
                    </span>
                  </button>
                )}
              </div>

              {/* 위치 바꾸기 버튼 */}
              <Button
                variant="outline"
                size="icon"
                onClick={onSwap}
                disabled={!startPoint || !endPoint}
                className="h-9 w-9 flex-shrink-0"
              >
                <ArrowUpDown className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 우측: X 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-9 w-9 hover:bg-destructive/10 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RouteSelector;

