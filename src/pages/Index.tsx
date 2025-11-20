import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { MapPin, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
const Index = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [placeReviewModalOpen, setPlaceReviewModalOpen] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<{
    name: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [selectedBarrier, setSelectedBarrier] = useState<any>(null);
  const [barrierDetailOpen, setBarrierDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"default" | "yellow">("default");
  const [hasRoute, setHasRoute] = useState(false);
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

  // 로그인 체크
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
  const handleSelectPlace = (place: {
    lat: number;
    lon: number;
    name: string;
  }, type: "start" | "end") => {
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
      setSelectedRouteType("walk");
    }
  };

  const handleMoveToPlace = (place: {
    lat: number;
    lon: number;
    name: string;
  }) => {
    setMapCenter({ lat: place.lat, lon: place.lon });
  };
  return <div className="h-screen flex flex-col overflow-hidden">
      {/* 헤더 */}
      <div className="relative z-10">
        <div className={`${viewMode === "yellow" ? "bg-accent" : "bg-background"}`}>
          <div className="flex items-center gap-3 px-4 py-3">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="shrink-0">
              <Menu className="h-6 w-6" />
            </Button>
            <div className="flex-1 min-w-0">
              <SearchBar placeholder={searchMode === "end" ? "도착지 검색" : "장소 검색"} variant={viewMode} onSelectStart={place => handleSelectPlace(place, "start")} onSelectEnd={place => handleSelectPlace(place, "end")} onMoveToPlace={handleMoveToPlace} />
            </div>
          </div>
          {viewMode === "yellow" && <div className="px-4 pb-4">
              <WheelchairBadge />
            </div>}
        </div>
      </div>

      {/* 지도 영역 */}
      <div className="flex-1 relative">
        <MapView 
          startPoint={startPoint} 
          endPoint={endPoint} 
          selectedRouteType={selectedRouteType} 
          onRoutesCalculated={setRouteOptions} 
          center={mapCenter}
          onBarrierClick={(barrier: any) => {
            setSelectedBarrier(barrier);
            setBarrierDetailOpen(true);
          }} 
          onPlaceClick={(place: {
            name: string;
            lat: number;
            lon: number;
          }) => {
            setSelectedPlace(place);
            setPlaceReviewModalOpen(true);
          }} 
        />
        
        {/* 후기 등록 버튼 */}
        <ReviewButton onClick={() => setReviewModalOpen(true)} />
      </div>

      {/* 하단 경로 정보 - 경로 탐색 후에만 표시 */}
      {hasRoute && routeOptions.length > 0 && selectedRouteType && <div className="relative z-10 bg-background rounded-t-3xl border-t shadow-lg max-h-[50vh] overflow-y-auto">
          <div className="p-4">
            <RouteInfo variant={viewMode} distance={`${(routeOptions.find(r => r.type === selectedRouteType)?.distance / 1000).toFixed(1)} km`} duration={`${Math.ceil(routeOptions.find(r => r.type === selectedRouteType)?.duration / 60)}분`} safePercentage={routeOptions.find(r => r.type === selectedRouteType)?.safePercentage || 0} warningPercentage={routeOptions.find(r => r.type === selectedRouteType)?.warningPercentage || 0} dangerPercentage={routeOptions.find(r => r.type === selectedRouteType)?.dangerPercentage || 0} transitInfo={routeOptions.find(r => r.type === selectedRouteType)?.transitInfo} startPoint={startPoint} endPoint={endPoint} rawDistance={routeOptions.find(r => r.type === selectedRouteType)?.distance} rawDuration={routeOptions.find(r => r.type === selectedRouteType)?.duration} showButton={false} />
          </div>
        </div>}

      {/* 사이드바 */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />

      {/* 후기 등록 모달 */}
      <ReviewModal 
        open={reviewModalOpen} 
        onOpenChange={setReviewModalOpen}
        onPlaceSelect={(lat, lon) => setMapCenter({ lat, lon })}
      />
      
      {/* 장소 후기 모달 */}
      <PlaceReviewModal open={placeReviewModalOpen} onClose={() => {
      setPlaceReviewModalOpen(false);
      setSelectedPlace(null);
    }} place={selectedPlace} />

      {/* 배리어 상세 정보 Dialog */}
      <Dialog open={barrierDetailOpen} onOpenChange={setBarrierDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              배리어 상세 정보
            </DialogTitle>
          </DialogHeader>
          {selectedBarrier && <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">{selectedBarrier.name}</h3>
                <div className="flex items-center gap-2">
                  {selectedBarrier.severity === "safe" && <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
                      양호
                    </Badge>}
                  {selectedBarrier.severity === "warning" && <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                      보통
                    </Badge>}
                  {selectedBarrier.severity === "danger" && <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
                      어려움
                    </Badge>}
                  <Badge variant="outline">{selectedBarrier.type}</Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>위도: {selectedBarrier.lat?.toFixed(6)}, 경도: {selectedBarrier.lon?.toFixed(6)}</span>
              </div>

              {selectedBarrier.details && <div className="space-y-1">
                  <h4 className="font-medium text-sm">상세 정보</h4>
                  <p className="text-sm text-muted-foreground">{selectedBarrier.details}</p>
                </div>}

              {selectedBarrier.photo_urls && selectedBarrier.photo_urls.length > 0 && <div className="space-y-1">
                  <h4 className="font-medium text-sm">사진</h4>
                  {selectedBarrier.photo_urls.length === 1 ? <img src={selectedBarrier.photo_urls[0]} alt={selectedBarrier.name} className="w-full rounded-lg border" /> : <Carousel className="w-full">
                      <CarouselContent>
                        {selectedBarrier.photo_urls.map((url: string, index: number) => <CarouselItem key={index}>
                            <img src={url} alt={`${selectedBarrier.name} ${index + 1}`} className="w-full rounded-lg border" />
                          </CarouselItem>)}
                      </CarouselContent>
                      <CarouselPrevious />
                      <CarouselNext />
                    </Carousel>}
                </div>}
            </div>}
        </DialogContent>
      </Dialog>
    </div>;
};
export default Index;