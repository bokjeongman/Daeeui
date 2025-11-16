import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import RouteInfo from "@/components/RouteInfo";
import RouteOptions from "@/components/RouteOptions";
import ReviewButton from "@/components/ReviewButton";
import Sidebar from "@/components/Sidebar";
import ReviewModal from "@/components/ReviewModal";
import WheelchairBadge from "@/components/WheelchairBadge";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "yellow">("default");
  const [hasRoute, setHasRoute] = useState(false);
  const [startPoint, setStartPoint] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [endPoint, setEndPoint] = useState<{ lat: number; lon: number; name: string } | null>(null);
  const [searchMode, setSearchMode] = useState<"start" | "end" | null>(null);
  const [routeOptions, setRouteOptions] = useState<Array<{
    type: "transit" | "walk" | "car";
    distance: number;
    duration: number;
    safePercentage: number;
    warningPercentage: number;
    dangerPercentage: number;
    barriers: { type: string; severity: string; name: string }[];
  }>>([]);
  const [selectedRouteType, setSelectedRouteType] = useState<"transit" | "walk" | "car" | null>(null);

  const handleSelectPlace = (place: { lat: number; lon: number; name: string }, type: "start" | "end") => {
    if (type === "start") {
      setStartPoint(place);
      setSearchMode("end");
      setEndPoint(null);
      setHasRoute(false);
    } else {
      setEndPoint(place);
      setSearchMode(null);
      setHasRoute(true);
      setRouteOptions([]);
      setSelectedRouteType(null);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="relative z-10">
        <div className={`${viewMode === "yellow" ? "bg-accent" : "bg-background"}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="shrink-0"
            >
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <SearchBar
                placeholder={searchMode === "end" ? "도착지 검색" : "장소 검색"}
                variant={viewMode}
                onSelectStart={(place) => handleSelectPlace(place, "start")}
                onSelectEnd={(place) => handleSelectPlace(place, "end")}
              />
            </div>
          </div>
          {viewMode === "yellow" && (
            <div className="px-4 pb-4">
              <WheelchairBadge />
            </div>
          )}
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <MapView 
          startPoint={startPoint}
          endPoint={endPoint}
          onRoutesCalculated={setRouteOptions}
        />
        
        {/* 후기 등록 버튼 */}
        <ReviewButton onClick={() => setReviewModalOpen(true)} />
      </div>

      {/* 하단 경로 옵션 - 경로 탐색 후에만 표시 */}
      {hasRoute && routeOptions.length > 0 && (
        <div className="relative z-10 bg-background rounded-t-3xl border-t shadow-lg max-h-[50vh] overflow-y-auto">
          {selectedRouteType ? (
            <div className="p-4">
              <button
                onClick={() => setSelectedRouteType(null)}
                className="text-sm text-primary hover:underline mb-2"
              >
                ← 다른 경로 보기
              </button>
              <RouteInfo
                variant={viewMode}
                distance={`${(routeOptions.find(r => r.type === selectedRouteType)?.distance / 1000).toFixed(1)} km`}
                duration={`${Math.ceil(routeOptions.find(r => r.type === selectedRouteType)?.duration / 60)}분`}
                safePercentage={routeOptions.find(r => r.type === selectedRouteType)?.safePercentage || 0}
                warningPercentage={routeOptions.find(r => r.type === selectedRouteType)?.warningPercentage || 0}
                dangerPercentage={routeOptions.find(r => r.type === selectedRouteType)?.dangerPercentage || 0}
                onStartNavigation={() => {
                  if (viewMode === "default") {
                    setViewMode("yellow");
                  }
                }}
              />
            </div>
          ) : (
            <RouteOptions
              options={routeOptions}
              selectedType={selectedRouteType}
              onSelectRoute={setSelectedRouteType}
            />
          )}
        </div>
      )}

      {/* 사이드바 */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* 후기 등록 모달 */}
      <ReviewModal open={reviewModalOpen} onOpenChange={setReviewModalOpen} />
    </div>
  );
};

export default Index;
