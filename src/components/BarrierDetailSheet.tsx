import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, User, X, Check, XIcon } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReportData {
  id: string;
  name: string;
  type: string;
  severity: string;
  details: string;
  photo_urls?: string[];
  latitude: number;
  longitude: number;
  created_at?: string;
  accessibility_level?: string;
  user_id?: string;
  nickname?: string;
  reportId?: string;
  has_ramp?: boolean | null;
  has_elevator?: boolean | null;
  has_accessible_restroom?: boolean | null;
  has_low_threshold?: boolean | null;
  has_wide_door?: boolean | null;
}

interface BarrierDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  barrier: {
    name: string;
    type: string;
    severity: string;
    details: string;
    photo_urls?: string[];
    latitude: number;
    longitude: number;
    created_at?: string;
    accessibility_level?: string;
    reports?: ReportData[];
    reportCount?: number;
    has_ramp?: boolean | null;
    has_elevator?: boolean | null;
    has_accessible_restroom?: boolean | null;
    has_low_threshold?: boolean | null;
    has_wide_door?: boolean | null;
  } | null;
}

// 접근성 항목 컴포넌트
const AccessibilityItem = ({ label, value, inverted = false }: { label: string; value: boolean | null | undefined; inverted?: boolean }) => {
  if (value === null || value === undefined) return null;
  
  // inverted가 true면 값을 반전시킴 (턱의 경우: false=좋음, true=나쁨)
  const displayValue = inverted ? !value : value;
  
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${displayValue ? 'bg-green-500' : 'bg-red-500'}`}>
        {displayValue ? (
          <Check className="h-3 w-3 text-white" />
        ) : (
          <XIcon className="h-3 w-3 text-white" />
        )}
      </div>
      <span className="text-sm">{label}</span>
    </div>
  );
};

const BarrierDetailSheet = ({ open, onOpenChange, barrier }: BarrierDetailSheetProps) => {
  const [address, setAddress] = useState<string>("");
  const [reportsWithNicknames, setReportsWithNicknames] = useState<ReportData[]>([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (barrier && open) {
      reverseGeocode(barrier.latitude, barrier.longitude).then(setAddress);
      
      const fetchNicknames = async () => {
        const reports = barrier.reports || [{
          id: "single",
          name: barrier.name,
          type: barrier.type,
          severity: barrier.severity,
          details: barrier.details,
          photo_urls: barrier.photo_urls,
          latitude: barrier.latitude,
          longitude: barrier.longitude,
          created_at: barrier.created_at,
          accessibility_level: barrier.accessibility_level,
          user_id: (barrier as any).user_id,
          has_ramp: barrier.has_ramp,
          has_elevator: barrier.has_elevator,
          has_accessible_restroom: barrier.has_accessible_restroom,
          has_low_threshold: barrier.has_low_threshold,
          has_wide_door: barrier.has_wide_door,
        }];
        
        const userIds = [...new Set(reports.filter(r => r.user_id).map(r => r.user_id))];
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, nickname, email")
            .in("id", userIds);
          
          const nicknameMap = new Map(profiles?.map(p => {
            let displayName = p.nickname;
            if (!displayName && p.email) {
              displayName = p.email.split('@')[0];
            }
            return [p.id, displayName || "사용자"];
          }) || []);
          
          const reportsWithNames = reports.map(r => {
            const reportId = r.id !== "single" ? r.id : (barrier as any).reportId || (barrier as any).id;
            if (r.accessibility_level === "public") {
              return { ...r, nickname: "공공데이터", reportId };
            }
            if (r.user_id) {
              const nickname = nicknameMap.get(r.user_id);
              return { ...r, nickname: nickname || "사용자", reportId };
            }
            return { ...r, nickname: "사용자", reportId };
          });
          
          reportsWithNames.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          setReportsWithNicknames(reportsWithNames);
        } else {
          const reportsWithNames = reports.map(r => {
            const reportId = r.id !== "single" ? r.id : (barrier as any).reportId || (barrier as any).id;
            return {
              ...r,
              nickname: r.accessibility_level === "public" ? "공공데이터" : "사용자",
              reportId
            };
          });
          reportsWithNames.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          setReportsWithNicknames(reportsWithNames);
        }
      };
      
      fetchNicknames();
    }
  }, [barrier, open]);

  if (!barrier) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hasMultipleReports = reportsWithNicknames.length > 1;

  // 접근성 항목들의 유무 확인
  const hasAccessibilityInfo = (report: ReportData) => {
    return report.has_ramp !== null && report.has_ramp !== undefined ||
           report.has_elevator !== null && report.has_elevator !== undefined ||
           report.has_accessible_restroom !== null && report.has_accessible_restroom !== undefined ||
           report.has_low_threshold !== null && report.has_low_threshold !== undefined ||
           report.has_wide_door !== null && report.has_wide_door !== undefined;
  };

  const ContentBody = () => (
    <ScrollArea className="h-full w-full [&_[data-radix-scroll-area-scrollbar]]:bg-muted [&_[data-radix-scroll-area-thumb]]:bg-border">
      <div className="space-y-4 pr-4 pb-6">
        {reportsWithNicknames.map((report, index) => (
          <div 
            key={report.id || index} 
            className={`rounded-lg border bg-card p-4 space-y-4 ${
              hasMultipleReports ? 'shadow-sm' : ''
            }`}
          >
            {/* 작성자 정보 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{report.nickname}</span>
                {report.accessibility_level === "public" && (
                  <Badge className="bg-blue-500 text-white text-xs">공공데이터</Badge>
                )}
              </div>
            </div>

            {/* 5가지 접근성 항목 표시 */}
            {hasAccessibilityInfo(report) && (
              <div className="grid grid-cols-2 gap-2 p-3 bg-muted/50 rounded-lg">
                <AccessibilityItem label="경사로" value={report.has_ramp} />
                <AccessibilityItem label="엘리베이터" value={report.has_elevator} />
                <AccessibilityItem label="장애인 화장실" value={report.has_accessible_restroom} />
                <AccessibilityItem label="턱" value={report.has_low_threshold} inverted />
                <AccessibilityItem label="넓은 출입문" value={report.has_wide_door} />
              </div>
            )}

            {/* 상세 정보 + 등록 시각 */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                {report.details ? (
                  <p className="text-base leading-relaxed">
                    {report.details}
                  </p>
                ) : (
                  <p className="text-base text-muted-foreground italic">
                    상세 정보가 없습니다
                  </p>
                )}
              </div>
              {report.created_at && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(report.created_at)}
                  </p>
                </div>
              )}
            </div>

            {/* 사진 갤러리 - 이미지 사이즈 수정 */}
            {report.photo_urls && report.photo_urls.length > 0 && (
              <div>
                <Carousel className="w-full">
                  <CarouselContent>
                    {report.photo_urls.map((url, photoIndex) => (
                      <CarouselItem key={photoIndex}>
                        <div className="relative aspect-video w-full max-h-[200px] overflow-hidden rounded-lg bg-muted">
                          <img
                            src={url}
                            alt={`${report.name} 사진 ${photoIndex + 1}`}
                            className="object-contain w-full h-full"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg";
                            }}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  {report.photo_urls.length > 1 && (
                    <>
                      <CarouselPrevious className="left-2" />
                      <CarouselNext className="right-2" />
                    </>
                  )}
                </Carousel>
                {report.photo_urls.length > 1 && (
                  <p className="text-xs text-muted-foreground text-center mt-2">
                    {report.photo_urls.length}개의 사진
                  </p>
                )}
              </div>
            )}
          </div>
        ))}

        {/* 위치 정보 */}
        <div className="bg-muted p-4 rounded-lg mt-4">
          <p className="text-sm text-muted-foreground mb-1">위치</p>
          <p className="text-sm font-medium">{barrier.name}</p>
          <p className="text-sm text-muted-foreground mt-2">
            {address || "주소를 가져오는 중..."}
          </p>
        </div>
      </div>
    </ScrollArea>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[85vh] flex flex-col">
          <DrawerHeader className="mb-2 flex-shrink-0">
            <DrawerTitle className="flex items-center justify-between pr-2">
              <div className="flex items-center gap-2 text-xl font-semibold">
                <MapPin className="h-6 w-6 text-primary" />
                {barrier.name}
                {hasMultipleReports && (
                  <Badge variant="secondary" className="ml-2">
                    {reportsWithNicknames.length}개 제보
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 z-50"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
              >
                <X className="h-5 w-5" />
              </Button>
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-4 pb-4">
            <ContentBody />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="mb-4 flex-shrink-0">
          <SheetTitle className="flex items-center justify-between pr-2">
            <div className="flex items-center gap-2 text-xl font-semibold">
              <MapPin className="h-6 w-6 text-primary" />
              {barrier.name}
              {hasMultipleReports && (
                <Badge variant="secondary" className="ml-2">
                  {reportsWithNicknames.length}개 제보
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 z-50"
              onClick={(e) => {
                e.stopPropagation();
                onOpenChange(false);
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 min-h-0">
          <ContentBody />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BarrierDetailSheet;