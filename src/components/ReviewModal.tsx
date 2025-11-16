import { useState, useEffect } from "react";
import { MapPin } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReviewModal = ({ open, onOpenChange }: ReviewModalProps) => {
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }
    
    if (!location || !latitude || !longitude || !accessibility || !category) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("accessibility_reports")
        .insert({
          user_id: user.id,
          location_name: location,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          accessibility_level: accessibility,
          category: category,
          details: details || null,
        });

      if (error) throw error;

      toast.success("제보가 성공적으로 등록되었습니다! 관리자 검토 후 지도에 반영됩니다.");
      onOpenChange(false);
      
      // 폼 초기화
      setLocation("");
      setLatitude("");
      setLongitude("");
      setAccessibility("");
      setCategory("");
      setDetails("");
    } catch (error: any) {
      console.error("제보 등록 실패:", error);
      toast.error("제보 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            휠체어 접근성 정보 제보
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 위치 */}
          <div className="space-y-2">
            <Label htmlFor="location">
              위치명 *
            </Label>
            <div className="relative">
              <Input
                id="location"
                placeholder="예: 서울역"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pr-10"
              />
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* 좌표 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">위도 *</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                placeholder="37.5665"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">경도 *</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                placeholder="126.9780"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
              />
            </div>
          </div>

          {/* 접근성 선택 */}
          <div className="space-y-2">
            <Label htmlFor="accessibility">
              접근성 선택 *
            </Label>
            <Select value={accessibility} onValueChange={setAccessibility}>
              <SelectTrigger id="accessibility">
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="good">접근 용이</SelectItem>
                <SelectItem value="moderate">보통</SelectItem>
                <SelectItem value="difficult">접근 어려움</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 분류 종류 */}
          <div className="space-y-2">
            <Label htmlFor="category">
              분류 종류 *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ramp">경사로</SelectItem>
                <SelectItem value="elevator">엘리베이터</SelectItem>
                <SelectItem value="curb">턱</SelectItem>
                <SelectItem value="stairs">계단</SelectItem>
                <SelectItem value="parking">주차장</SelectItem>
                <SelectItem value="restroom">화장실</SelectItem>
                <SelectItem value="entrance">출입구</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 상세 설명 */}
          <div className="space-y-2">
            <Label htmlFor="details">상세 설명 (선택)</Label>
            <Textarea
              id="details"
              placeholder="접근성에 대한 상세한 설명을 입력해주세요"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              취소
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? "제출 중..." : "제출하기"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
