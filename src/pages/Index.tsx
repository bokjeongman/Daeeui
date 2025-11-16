import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import RouteInfo from "@/components/RouteInfo";
import ReviewButton from "@/components/ReviewButton";
import Sidebar from "@/components/Sidebar";
import ReviewModal from "@/components/ReviewModal";
import WheelchairBadge from "@/components/WheelchairBadge";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "yellow">("default");
  const [hasRoute, setHasRoute] = useState(false);

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
                placeholder="장소 검색"
                variant={viewMode}
                onRouteCreate={() => setHasRoute(true)}
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
        <MapView />
        
        {/* 후기 등록 버튼 */}
        <ReviewButton onClick={() => setReviewModalOpen(true)} />
      </div>

      {/* 하단 경로 정보 - 경로 탐색 후에만 표시 */}
      {hasRoute && (
        <div className="relative z-10">
          <RouteInfo
            variant={viewMode}
            onStartNavigation={() => {
              if (viewMode === "default") {
                setViewMode("yellow");
              }
            }}
          />
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
