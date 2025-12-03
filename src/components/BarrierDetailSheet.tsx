import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, AlertTriangle, Calendar, ShieldCheck } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useEffect, useState } from "react";
import { reverseGeocode } from "@/lib/utils";

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
  } | null;
}

const BarrierDetailSheet = ({ open, onOpenChange, barrier }: BarrierDetailSheetProps) => {
  const [address, setAddress] = useState<string>("");

  useEffect(() => {
    if (barrier && open) {
      reverseGeocode(barrier.latitude, barrier.longitude).then(setAddress);
    }
  }, [barrier, open]);

  if (!barrier) return null;

  const getSeverityBadge = () => {
    switch (barrier.severity) {
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

  const getCategoryText = () => {
    switch (barrier.type) {
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2 text-xl">
            <MapPin className="h-6 w-6 text-primary" />
            {barrier.name}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* 공공데이터 인증 뱃지 */}
          {barrier.accessibility_level === "verified" && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">[공공데이터 인증] 정부 공공데이터로 검증된 정보입니다</span>
            </div>
          )}

          {/* 접근성 정보 */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">접근성:</span>
              {getSeverityBadge()}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">분류:</span>
              <Badge variant="outline">{getCategoryText()}</Badge>
            </div>
          </div>

          {/* 위치 정보 */}
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">위치</p>
            <p className="text-sm font-medium">{barrier.name}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {address || "주소를 가져오는 중..."}
            </p>
          </div>

          {/* 등록 시각 */}
          {barrier.created_at && (
            <div className="bg-muted p-4 rounded-lg flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">등록 시각</p>
                <p className="text-sm font-medium">
                  {new Date(barrier.created_at).toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          )}

          {/* 상세 설명 */}
          {barrier.details && (
            <div>
              <h3 className="text-sm font-semibold mb-2">상세 정보</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {barrier.details}
              </p>
            </div>
          )}

          {/* 사진 갤러리 */}
          {barrier.photo_urls && barrier.photo_urls.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">사진</h3>
              <Carousel className="w-full">
                <CarouselContent>
                  {barrier.photo_urls.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                        <img
                          src={url}
                          alt={`${barrier.name} 사진 ${index + 1}`}
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg";
                          }}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {barrier.photo_urls.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {barrier.photo_urls.length}개의 사진
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BarrierDetailSheet;
