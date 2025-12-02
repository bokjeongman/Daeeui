import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import SearchBar from "@/components/SearchBar";
import MapView from "@/components/MapView";
import RouteInfo from "@/components/RouteInfo";
import RouteOptions from "@/components/RouteOptions";
import ReviewButton from "@/components/ReviewButton";
import Sidebar from "@/components/Sidebar";
import ReviewModal from "@/components/ReviewModal";
import PlaceReviewModal from "@/components/PlaceReviewModal";
import WheelchairBadge from "@/components/WheelchairBadge";
import BarrierDetailSheet from "@/components/BarrierDetailSheet";
import RouteSelector from "@/components/RouteSelector";
import CampaignPopup from "@/components/CampaignPopup";
import { toast } from "sonner";
import { reverseGeocode } from "@/lib/utils";
const Index = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [placeReviewModalOpen, setPlaceReviewModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [selectedBarrier, setSelectedBarrier] = useState<any>(null);
  const [barrierSheetOpen, setBarrierSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "yellow">("default");
  const [hasRoute, setHasRoute] = useState(false);
  const [routeClearKey, setRouteClearKey] = useState(0);
  const [startPoint, setStartPoint] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [endPoint, setEndPoint] = useState<{
    lat: number;
    lon: number;
    name: string;
  } | null>(null);
  const [searchMode, setSearchMode] = useState<"start" | "end" | null>(null);
  const [routeOptions, setRouteOptions] = useState<Array<{
    type: "transit" | "walk" | "car";
    distance: number;
    duration: number;
    safePercentage: number;
    warningPercentage: number;
    dangerPercentage: number;
    barriers: {
      type: string;
      severity: string;
      name: string;
    }[];
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
  }>>([]);
  const [selectedRouteType, setSelectedRouteType] = useState<"transit" | "walk" | "car" | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lon: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedSearchPlace, setSelectedSearchPlace] = useState<{ lat: number; lon: number; name: string } | null>(null);

  const handleCampaignAgree = () => {
    setReviewModalOpen(true);
    toast.success("접근성 정보를 공유해 주셔서 감사합니다!");
  };

  // 로그인 체크 및 경로 복원
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
      }
    };
    checkAuth();

    // 실시간 인증 상태 변경 감지
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  // 내 경로에서 전달된 경로 정보 복원
  useEffect(() => {
    if (location.state?.startPoint && location.state?.destination) {
      const { startPoint, destination } = location.state;
      setStartPoint(startPoint);
      setEndPoint(destination);
      setHasRoute(true);
      setSelectedRouteType("walk");
      setSearchMode(null);
      // state 초기화 (뒤로가기 시 중복 실행 방지)
      window.history.replaceState({}, document.title);
    }
  }, [location]);
  const handleSelectPlace = (place: {
    lat: number;
    lon: number;
    name: string;
  }, type: "start" | "end") => {
    if (type === "start") {
      setStartPoint(place);
      setSearchMode(null); // RouteSelector를 표시하기 위해 null로 설정
      setEndPoint(null);
      setHasRoute(false);
      setRouteOptions([]);
      setSelectedRouteType(null);
    } else {
      // 출발지와 도착지가 같은 경우: 경로 탐색 모드 해제 및 초기 상태 복원
      if (startPoint && startPoint.lat === place.lat && startPoint.lon === place.lon) {
        toast.error("출발지와 도착지가 같습니다. 다른 도착지를 선택해주세요.");
        setHasRoute(false);
        setRouteOptions([]);
        setSelectedRouteType(null);
        setEndPoint(null);
        setSearchMode(null);
        setRouteClearKey((prev) => prev + 1);
        return;
      }

      setEndPoint(place);
      setSearchMode(null);
      setHasRoute(true);
      setRouteOptions([]);
      setSelectedRouteType("walk");
    }
  };

  const handleMoveToPlace = (place: {
    lat: number;
    lon: number;
    name: string;
  }) => {
    setMapCenter({ lat: place.lat, lon: place.lon });
    setSelectedSearchPlace(place);
  };

  const handleClearSearchPlace = () => {
    setSelectedSearchPlace(null);
  };

  const handleCancelRoute = () => {
    setRouteClearKey((prev) => prev + 1);
    setHasRoute(false);
    setRouteOptions([]);
    setSelectedRouteType(null);
    setStartPoint(null);
    setEndPoint(null);
    setSearchMode(null);
  };

  const handleSwapPoints = () => {
    if (startPoint && endPoint) {
      const temp = startPoint;
      setStartPoint(endPoint);
      setEndPoint(temp);
      // 경로를 다시 계산하도록 상태 초기화
      setHasRoute(true);
      setRouteOptions([]);
      setSelectedRouteType("walk");
      setRouteClearKey((prev) => prev + 1);
    }
  };
  const handleEditStart = () => {
    setSearchMode("start");
    setEndPoint(null);
    setHasRoute(false);
  };

  const handleEditEnd = () => {
    setSearchMode("end");
  };

  // 경로 계산 후 자동으로 route_history에 저장
  const handleRoutesCalculated = useCallback(async (routes: Array<{
    type: "transit" | "walk" | "car";
    distance: number;
    duration: number;
    safePercentage: number;
    warningPercentage: number;
    dangerPercentage: number;
    barriers: any[];
    transitInfo?: any;
  }>) => {
    setRouteOptions(routes);
    
    // route_history에 자동 저장
    if (routes.length > 0 && endPoint) {
      // 출발지 정보: 사용자가 선택한 출발지가 있으면 그걸 사용, 없으면 현재 위치 사용
      const baseStartPoint = startPoint || (currentLocation ? {
        lat: currentLocation.lat,
        lon: currentLocation.lon,
        name: "",
      } : null);

      if (!baseStartPoint) return;

      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // 출발지와 도착지의 실제 주소를 가져오기
          const startName = baseStartPoint.name === "현위치" || !baseStartPoint.name
            ? await reverseGeocode(baseStartPoint.lat, baseStartPoint.lon)
            : baseStartPoint.name;
          
          const endName = endPoint.name === "현위치" || !endPoint.name
            ? await reverseGeocode(endPoint.lat, endPoint.lon)
            : endPoint.name;

          const firstRoute = routes[0];
          const { error } = await supabase
            .from("route_history")
            .insert({
              user_id: user.id,
              start_name: startName,
              start_lat: baseStartPoint.lat,
              start_lon: baseStartPoint.lon,
              end_name: endName,
              end_lat: endPoint.lat,
              end_lon: endPoint.lon,
              distance: firstRoute.distance,
              duration: firstRoute.duration,
            });

          if (error) {
            if (import.meta.env.DEV) console.error("경로 저장 실패:", error);
          }
        }
      } catch (error) {
        if (import.meta.env.DEV) console.error("경로 저장 오류:", error);
      }
    }
  }, [startPoint, endPoint, currentLocation]);
  
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* 캠페인 팝업 */}
      <CampaignPopup onAgree={handleCampaignAgree} />
      
      {/* 헤더 - 경로 탐색 중일 때는 경로 정보로 대체 */}
      {(!hasRoute || routeOptions.length === 0 || !selectedRouteType) ? (
        <div className="relative z-10">
          <div className={`${viewMode === "yellow" ? "bg-accent" : "bg-background"}`}>
            {/* 초기 상태: 출발지도 도착지도 선택 안 됨 */}
            {!startPoint && !endPoint && (
              <>
                <div className="flex items-center gap-3 px-4 py-3">
                  <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
                    <Menu className="h-6 w-6" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <SearchBar 
                      placeholder="장소 검색" 
                      variant={viewMode}
                      searchMode={null}
                      onSelectStart={place => handleSelectPlace(place, "start")} 
                      onSelectEnd={place => handleSelectPlace(place, "end")} 
                      onMoveToPlace={handleMoveToPlace}
                      onClearPlace={handleClearSearchPlace}
                    />
                  </div>
                </div>
                {viewMode === "yellow" && <div className="px-4 pb-4">
                    <WheelchairBadge />
                  </div>}
              </>
            )}
            
            {/* 출발지 또는 도착지가 선택되었을 때 */}
            {(startPoint || endPoint) && (
              <>
                {/* RouteSelector는 항상 표시 */}
                <RouteSelector
                  startPoint={startPoint}
                  endPoint={endPoint}
                  onStartClick={handleEditStart}
                  onEndClick={handleEditEnd}
                  onSwap={handleSwapPoints}
                  onCancel={handleCancelRoute}
                />
                
                {/* 검색 모드일 때: RouteSelector 아래에 SearchBar 표시 */}
                {searchMode && (
                  <div className="flex items-center gap-3 px-4 py-3 border-t">
                    <div className="flex-1 min-w-0">
                      <SearchBar 
                        placeholder={searchMode === "end" ? "도착지 검색" : "출발지 검색"} 
                        variant={viewMode}
                        searchMode={searchMode}
                        onSelectStart={place => handleSelectPlace(place, "start")} 
                        onSelectEnd={place => handleSelectPlace(place, "end")} 
                        onMoveToPlace={handleMoveToPlace}
                        onClearPlace={handleClearSearchPlace}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : routeOptions.length > 0 && selectedRouteType && (
        <div className="relative z-10 bg-background border-b">
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1">
              <RouteSelector
                startPoint={startPoint}
                endPoint={endPoint}
                onStartClick={handleEditStart}
                onEndClick={handleEditEnd}
                onSwap={handleSwapPoints}
                onCancel={handleCancelRoute}
              />
              
              {/* 거리 및 시간 정보 */}
              <div className="flex items-center gap-4 mt-2 px-2">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-sm font-medium text-foreground">
                    {`${(routeOptions.find(r => r.type === selectedRouteType)?.distance / 1000).toFixed(1)}km`}
                  </span>
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-foreground">
                    {(() => {
                      const durationInMinutes = Math.ceil((routeOptions.find(r => r.type === selectedRouteType)?.duration || 0) / 60);
                      const hours = Math.floor(durationInMinutes / 60);
                      const minutes = durationInMinutes % 60;
                      if (hours > 0) {
                        return minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`;
                      }
                      return `${minutes}분`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* 검색 모드일 때: SearchBar 표시 */}
          {searchMode && (
            <div className="flex items-center gap-3 px-4 py-3 border-t">
              <div className="flex-1 min-w-0">
                <SearchBar 
                  placeholder={searchMode === "end" ? "도착지 검색" : "출발지 검색"} 
                  variant={viewMode}
                  searchMode={searchMode}
                  onSelectStart={place => handleSelectPlace(place, "start")} 
                  onSelectEnd={place => handleSelectPlace(place, "end")} 
                  onMoveToPlace={handleMoveToPlace}
                  onClearPlace={handleClearSearchPlace}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <MapView
          key={routeClearKey}
          startPoint={startPoint}
          endPoint={endPoint}
          selectedRouteType={selectedRouteType}
          onRoutesCalculated={handleRoutesCalculated}
          center={mapCenter}
          onBarrierClick={(barrier: any) => {
            setSelectedBarrier(barrier);
            setBarrierSheetOpen(true);
          }}
          onPlaceClick={(place: { name: string; lat: number; lon: number }) => {
            setSelectedPlace(place);
            setPlaceReviewModalOpen(true);
          }}
          onUserLocationChange={(location) => {
            setCurrentLocation(location);
          }}
          clearKey={routeClearKey}
          selectedSearchPlace={selectedSearchPlace}
          hideFilterButton={!!selectedSearchPlace}
          isRouteSelecting={!!(startPoint || endPoint)}
        />

        {/* 후기 등록 버튼 - 장소 검색 중일 때 숨김 */}
        {!selectedSearchPlace && <ReviewButton onClick={() => setReviewModalOpen(true)} />}
      </div>

      {/* 사이드바 */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* 후기 등록 모달 */}
      <ReviewModal 
        open={reviewModalOpen} 
        onOpenChange={setReviewModalOpen}
        onPlaceSelect={(lat, lon) => setMapCenter({ lat, lon })}
      />
      
      {/* 장소 후기 모달 */}
      <PlaceReviewModal 
        open={placeReviewModalOpen} 
        onClose={() => {
          setPlaceReviewModalOpen(false);
          setSelectedPlace(null);
        }} 
        place={selectedPlace} 
      />

      {/* 배리어 상세 정보 시트 */}
      <BarrierDetailSheet
        open={barrierSheetOpen}
        onOpenChange={setBarrierSheetOpen}
        barrier={selectedBarrier}
      />
    </div>
  );
};

export default Index;