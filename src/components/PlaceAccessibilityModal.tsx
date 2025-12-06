import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { MapPin, Check, X, Upload, Info, User, ChevronRight, Loader2 } from "lucide-react";

interface PlaceAccessibilityModalProps {
  open: boolean;
  onClose: () => void;
  place: { name: string; lat: number; lon: number } | null;
}

interface AccessibilityReport {
  id: string;
  user_id: string;
  location_name: string;
  details: string | null;
  photo_urls: string[] | null;
  created_at: string;
  has_ramp: boolean | null;
  has_elevator: boolean | null;
  has_accessible_restroom: boolean | null;
  has_low_threshold: boolean | null;
  has_wide_door: boolean | null;
  accessibility_level?: string;
  nickname?: string;
}

interface AccessibilityItem {
  key: keyof Pick<AccessibilityReport, 'has_ramp' | 'has_elevator' | 'has_accessible_restroom' | 'has_low_threshold' | 'has_wide_door'>;
  label: string;
  description: string;
  icon: string;
}

const accessibilityItems: AccessibilityItem[] = [
  { key: 'has_ramp', label: '경사로', description: '휠체어 접근 가능한 경사로', icon: '♿' },
  { key: 'has_elevator', label: '엘리베이터', description: '층간 이동을 위한 승강기', icon: '🛗' },
  { key: 'has_accessible_restroom', label: '장애인 화장실', description: '장애인 전용 화장실 시설', icon: '🚻' },
  { key: 'has_low_threshold', label: '턱 (없음이 좋음)', description: '출입구나 내부의 단차', icon: '⚠️' },
  { key: 'has_wide_door', label: '넓은 출입문', description: '휠체어 통과 가능한 출입문', icon: '🚪' },
];

const PlaceAccessibilityModal = ({ open, onClose, place }: PlaceAccessibilityModalProps) => {
  const isMobile = useIsMobile();
  const [reviews, setReviews] = useState<AccessibilityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  const [accessibilityValues, setAccessibilityValues] = useState<Record<string, boolean | null>>({
    has_ramp: null,
    has_elevator: null,
    has_accessible_restroom: null,
    has_low_threshold: null,
    has_wide_door: null,
  });
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);

  useEffect(() => {
    if (place && open) {
      fetchReviews();
      resetForm();
    }
  }, [place, open]);

  const resetForm = () => {
    setAccessibilityValues({
      has_ramp: null,
      has_elevator: null,
      has_accessible_restroom: null,
      has_low_threshold: null,
      has_wide_door: null,
    });
    setAdditionalDetails("");
    setPhotos([]);
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews([]);
    setShowAllReviews(false);
  };

  const fetchReviews = async () => {
    if (!place) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("accessibility_reports")
        .select("*")
        .gte("latitude", place.lat - 0.0001)
        .lte("latitude", place.lat + 0.0001)
        .gte("longitude", place.lon - 0.0001)
        .lte("longitude", place.lon + 0.0001)
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      const userIds = [...new Set((data || []).filter(r => r.user_id).map(r => r.user_id))];
      let nicknameMap = new Map<string, string>();
      
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, nickname, email")
          .in("id", userIds);
        
        nicknameMap = new Map(profiles?.map(p => {
          let displayName = p.nickname;
          if (!displayName && p.email) {
            displayName = p.email.split('@')[0];
          }
          return [p.id, displayName || "사용자"];
        }) || []);
      }
      
      const reviewsWithNicknames = (data || []).map(r => ({
        ...r,
        nickname: r.accessibility_level === "public" ? "공공데이터" : nicknameMap.get(r.user_id) || "사용자"
      }));
      
      setReviews(reviewsWithNicknames);
    } catch (error) {
      if (import.meta.env.DEV) console.error("후기 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: string, value: boolean) => {
    setAccessibilityValues(prev => ({
      ...prev,
      [key]: prev[key] === value ? null : value
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 5) {
      toast.error("사진은 최대 5장까지 업로드할 수 있습니다.");
      return;
    }
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("각 사진의 크기는 5MB 이하여야 합니다.");
        return;
      }
    }
    setPhotos(prev => [...prev, ...files]);
    setPhotoPreviews(prev => [...prev, ...files.map(file => URL.createObjectURL(file))]);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    if (photoPreviews[index]) {
      URL.revokeObjectURL(photoPreviews[index]);
    }
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!place) {
      toast.error("장소 정보가 없습니다.");
      return;
    }
    
    const hasAnySelection = Object.values(accessibilityValues).some(v => v !== null);
    if (!hasAnySelection && !additionalDetails.trim()) {
      toast.error("접근성 정보나 후기를 작성해주세요.");
      return;
    }
    
    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("로그인이 필요합니다.");
        return;
      }
      
      const photoUrls: string[] = [];
      if (photos.length > 0) {
        for (const photo of photos) {
          const fileExt = photo.name.split(".").pop();
          const fileName = `${user.id}/${Date.now()}_${Math.random()}.${fileExt}`;
          const { error: uploadError } = await supabase.storage.from("accessibility-photos").upload(fileName, photo);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from("accessibility-photos").getPublicUrl(fileName);
          photoUrls.push(publicUrl);
        }
      }
      
      const { error } = await supabase.from("accessibility_reports").insert({
        user_id: user.id,
        location_name: place.name,
        latitude: place.lat,
        longitude: place.lon,
        has_ramp: accessibilityValues.has_ramp,
        has_elevator: accessibilityValues.has_elevator,
        has_accessible_restroom: accessibilityValues.has_accessible_restroom,
        has_low_threshold: accessibilityValues.has_low_threshold,
        has_wide_door: accessibilityValues.has_wide_door,
        details: additionalDetails.trim() || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        accessibility_level: "good",
        category: "facility",
        status: "approved",
      });
      
      if (error) throw error;
      toast.success("제보가 성공적으로 등록되었습니다!");
      resetForm();
      fetchReviews();
    } catch (error) {
      if (import.meta.env.DEV) console.error("제보 제출 실패:", error);
      toast.error("제보 등록에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 2);

  const formContent = (
    <div className="space-y-6 pb-6 pr-4">
      {/* 제보 입력 섹션 */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">접근성 정보를 알려주세요</h3>
          <Info className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            💡 알고 계신 정보만 선택해주세요. 모든 항목을 작성할 필요는 없습니다!
          </p>
        </div>
        
        {/* 5개 접근성 항목 */}
        <div className="space-y-3">
          {accessibilityItems.map((item) => (
            <div key={item.key} className="border rounded-lg p-4 bg-card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{item.icon}</span>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={accessibilityValues[item.key] === true ? "default" : "outline"}
                  className={`h-12 ${accessibilityValues[item.key] === true ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                  onClick={() => handleToggle(item.key, true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  있어요
                </Button>
                <Button
                  type="button"
                  variant={accessibilityValues[item.key] === false ? "default" : "outline"}
                  className={`h-12 ${accessibilityValues[item.key] === false ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                  onClick={() => handleToggle(item.key, false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  없어요
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {/* 추가 후기 작성 */}
        <div className="space-y-2">
          <h4 className="font-medium">추가 후기 작성</h4>
          <p className="text-sm text-muted-foreground">더 자세한 정보가 있다면 공유해주세요 (선택사항)</p>
          <Textarea
            placeholder="예시:
• 입구에 자동문이 있어서 편리해요
• 1층에만 경사로가 있고 2층은 계단만 있어요
• 화장실이 조금 좁아요"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            rows={4}
            className="resize-none"
            maxLength={500}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>💡 구체적일수록 도움이 됩니다</span>
            <span>{additionalDetails.length} / 500</span>
          </div>
        </div>
        
        {/* 사진 첨부 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">📸 사진 첨부 (최대 5장)</h4>
            <span className="text-sm text-green-600">정확한 정보 제공을 위해 추천</span>
          </div>
          <div className="border-2 border-dashed border-green-200 dark:border-green-800 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer bg-green-50/30 dark:bg-green-950/20">
            <input
              id="photo-upload-place"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="hidden"
              disabled={photos.length >= 5}
            />
            <label htmlFor="photo-upload-place" className="cursor-pointer flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-muted-foreground">
                클릭하여 사진 선택 (최대 5MB, {photos.length}/5장)
              </span>
            </label>
          </div>
          {photoPreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              {photoPreviews.map((preview, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={preview}
                    alt={`미리보기 ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => handleRemovePhoto(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* 기존 제보 내역 */}
      {reviews.length > 0 && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">기존 제보 내역</h4>
            {reviews.length > 2 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllReviews(!showAllReviews)}
                className="text-primary"
              >
                {showAllReviews ? "접기" : "더보기"}
                <ChevronRight className={`h-4 w-4 ml-1 transition-transform ${showAllReviews ? "rotate-90" : ""}`} />
              </Button>
            )}
          </div>
          
          <div className="space-y-3">
            {displayedReviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{review.nickname}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)}
                  </span>
                </div>
                
                {review.details && (
                  <p className="text-sm">{review.details}</p>
                )}
                
                <div className="flex flex-wrap gap-1">
                  {accessibilityItems.map(item => {
                    const value = review[item.key];
                    if (value === null) return null;
                    return (
                      <Badge
                        key={item.key}
                        variant="outline"
                        className={value ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}
                      >
                        {item.label}: {value ? "있음" : "없음"}
                      </Badge>
                    );
                  })}
                </div>
                
                {review.photo_urls && review.photo_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {review.photo_urls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`제보 사진 ${idx + 1}`}
                        className="h-16 w-16 object-cover rounded-lg border flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg";
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const submitButton = (
    <div className="pt-4 border-t bg-background">
      <Button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full h-12 bg-green-500 hover:bg-green-600 text-white"
      >
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            제출 중...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            제보 완료하기
          </>
        )}
      </Button>
      <p className="text-center text-sm text-muted-foreground mt-2">
        접근성 정보나 후기를 작성해주세요
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onClose}>
        <DrawerContent className="h-[85vh]">
          <DrawerHeader className="flex-shrink-0 pb-2">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              {place?.name || "장소"}
              {reviews.length > 0 && (
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  {reviews.length}건 제보
                </Badge>
              )}
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 overflow-hidden px-4">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <ScrollArea className="h-[calc(85vh-200px)]">
                {formContent}
              </ScrollArea>
            )}
          </div>
          <div className="flex-shrink-0 px-4 pb-4">
            {submitButton}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[85vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 p-6 pb-2">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            {place?.name || "장소"}
            {reviews.length > 0 && (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                {reviews.length}건 제보
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden px-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <ScrollArea className="h-[calc(85vh-200px)]">
              {formContent}
            </ScrollArea>
          )}
        </div>
        <div className="flex-shrink-0 p-6 pt-2">
          {submitButton}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlaceAccessibilityModal;
