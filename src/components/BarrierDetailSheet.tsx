import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Calendar, ShieldCheck, User } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  } | null;
}

const BarrierDetailSheet = ({ open, onOpenChange, barrier }: BarrierDetailSheetProps) => {
  const [address, setAddress] = useState<string>("");
  const [reportsWithNicknames, setReportsWithNicknames] = useState<ReportData[]>([]);

  useEffect(() => {
    if (barrier && open) {
      reverseGeocode(barrier.latitude, barrier.longitude).then(setAddress);
      
      // 작성자 닉네임 가져오기
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
        }];
        
        // user_id가 있는 제보들의 닉네임 가져오기
        const userIds = [...new Set(reports.filter(r => r.user_id).map(r => r.user_id))];
        
        if (userIds.length > 0) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, nickname, email")
            .in("id", userIds);
          
          // 닉네임이 없으면 이메일 앞부분 사용
          const nicknameMap = new Map(profiles?.map(p => {
            let displayName = p.nickname;
            if (!displayName && p.email) {
              // 이메일 앞부분 사용 (@ 앞)
              displayName = p.email.split('@')[0];
            }
            return [p.id, displayName || "사용자"];
          }) || []);
          
          const reportsWithNames = reports.map(r => {
            if (r.accessibility_level === "verified") {
              return { ...r, nickname: "공공데이터" };
            }
            if (r.user_id) {
              const nickname = nicknameMap.get(r.user_id);
              return { ...r, nickname: nickname || "사용자" };
            }
            return { ...r, nickname: "사용자" };
          });
          
          // 최신순 정렬
          reportsWithNames.sort((a, b) => {
            const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
            const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
            return dateB - dateA;
          });
          
          setReportsWithNicknames(reportsWithNames);
        } else {
          const reportsWithNames = reports.map(r => ({
            ...r,
            nickname: r.accessibility_level === "verified" ? "공공데이터" : "사용자"
          }));
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "verified":
        return <Badge className="bg-blue-500 text-white">공공데이터 인증</Badge>;
      case "safe":
        return <Badge className="bg-green-500 text-white">양호</Badge>;
      case "warning":
        return <Badge className="bg-yellow-500 text-white">보통</Badge>;
      case "danger":
        return <Badge className="bg-red-500 text-white">어려움</Badge>;
      default:
        return <Badge>알 수 없음</Badge>;
    }
  };

  const getCategoryText = (type: string) => {
    switch (type) {
      case "ramp":
        return "경사로";
      case "elevator":
        return "엘리베이터";
      case "curb":
        return "턱";
      case "stairs":
        return "계단";
      case "parking":
        return "주차장";
      case "restroom":
        return "화장실";
      case "entrance":
        return "출입구";
      default:
        return "기타";
    }
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-hidden flex flex-col">
        <SheetHeader className="mb-4 flex-shrink-0">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-6 w-6 text-primary" />
            {barrier.name}
            {hasMultipleReports && (
              <Badge variant="secondary" className="ml-2">
                {reportsWithNicknames.length}개 제보
              </Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {/* 제보 목록 */}
            {reportsWithNicknames.map((report, index) => (
              <div 
                key={report.id || index} 
                className={`rounded-lg border bg-card p-4 space-y-4 ${
                  hasMultipleReports ? 'shadow-sm' : ''
                }`}
              >
                {/* 작성자 정보 */}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{report.nickname}</span>
                  {report.accessibility_level === "verified" && (
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                  )}
                </div>

                {/* 상세 정보 (상단, 크게) + 등록 시각 */}
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

                {/* 접근성 정보 및 분류 */}
                <div className="flex gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">접근성:</span>
                    {getSeverityBadge(report.severity)}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">분류:</span>
                    <Badge variant="outline">{getCategoryText(report.type)}</Badge>
                  </div>
                </div>

                {/* 사진 갤러리 */}
                {report.photo_urls && report.photo_urls.length > 0 && (
                  <div>
                    <Carousel className="w-full">
                      <CarouselContent>
                        {report.photo_urls.map((url, photoIndex) => (
                          <CarouselItem key={photoIndex}>
                            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                              <img
                                src={url}
                                alt={`${report.name} 사진 ${photoIndex + 1}`}
                                className="object-cover w-full h-full"
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

            {/* 위치 정보 (맨 아래) */}
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p className="text-sm text-muted-foreground mb-1">위치</p>
              <p className="text-sm font-medium">{barrier.name}</p>
              <p className="text-sm text-muted-foreground mt-2">
                {address || "주소를 가져오는 중..."}
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default BarrierDetailSheet;