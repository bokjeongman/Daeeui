import { useState, useEffect } from "react";
import { MapPin, Upload, X } from "lucide-react";
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
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.error("사진 크기는 5MB 이하여야 합니다.");
        return;
      }
      setPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setPhoto(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
  };

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
      let photoUrl = null;

      // Upload photo if provided
      if (photo) {
        const fileExt = photo.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('accessibility-photos')
          .upload(fileName, photo);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('accessibility-photos')
          .getPublicUrl(fileName);

        photoUrl = publicUrl;
      }

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
          photo_url: photoUrl,
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
      handleRemovePhoto();
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
                <SelectItem value="accessible">접근 가능</SelectItem>
                <SelectItem value="partially_accessible">부분 접근 가능</SelectItem>
                <SelectItem value="not_accessible">접근 불가</SelectItem>
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

          {/* 사진 첨부 */}
          <div className="space-y-2">
            <Label htmlFor="photo">사진 첨부 (선택)</Label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="미리보기"
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                <input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <label htmlFor="photo" className="cursor-pointer flex flex-col items-center gap-2">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    클릭하여 사진 선택 (최대 5MB)
                  </span>
                </label>
              </div>
            )}
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
