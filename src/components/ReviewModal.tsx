import { useState, useEffect } from "react";
import { MapPin, Upload, X, Search } from "lucide-react";
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
import { z } from "zod";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const reportSchema = z.object({
  location_name: z.string().trim().min(1, "장소명을 입력해주세요.").max(200, "장소명은 200자 이하여야 합니다."),
  latitude: z.number().min(-90, "위도는 -90에서 90 사이여야 합니다.").max(90, "위도는 -90에서 90 사이여야 합니다."),
  longitude: z.number().min(-180, "경도는 -180에서 180 사이여야 합니다.").max(180, "경도는 -180에서 180 사이여야 합니다."),
  accessibility_level: z.enum(["good", "moderate", "difficult"], { errorMap: () => ({ message: "접근성 수준을 선택해주세요." }) }),
  category: z.string().trim().min(1, "카테고리를 선택해주세요.").max(50, "카테고리는 50자 이하여야 합니다."),
  details: z.string().trim().min(1, "상세 내용을 입력해주세요.").max(2000, "상세 내용은 2000자 이하여야 합니다."),
});

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
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      const response = await fetch(
        `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(query)}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=10`,
        {
          headers: {
            appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
          },
        }
      );

      const data = await response.json();
      
      if (data.searchPoiInfo?.pois?.poi) {
        const results = data.searchPoiInfo.pois.poi.map((poi: any, index: number) => ({
          id: index,
          name: poi.name,
          address: poi.upperAddrName + " " + poi.middleAddrName + " " + poi.lowerAddrName,
          lat: parseFloat(poi.noorLat),
          lon: parseFloat(poi.noorLon),
        }));
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("POI 검색 실패:", error);
      setSearchResults([]);
    }
  };

  const handleSelectPlace = (place: any) => {
    setLocation(place.name);
    setLatitude(place.lat.toString());
    setLongitude(place.lon.toString());
    setShowResults(false);
    setSearchQuery("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    try {
      // Parse and validate coordinates
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);

      if (isNaN(lat) || isNaN(lon)) {
        toast.error("올바른 좌표를 입력해주세요.");
        return;
      }

      // Validate all input
      const validationResult = reportSchema.safeParse({
        location_name: location,
        latitude: lat,
        longitude: lon,
        accessibility_level: accessibility,
        category: category,
        details: details,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      setIsSubmitting(true);

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
          location_name: location.trim(),
          latitude: lat,
          longitude: lon,
          accessibility_level: accessibility,
          category: category.trim(),
          details: details.trim() || null,
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
      setSearchQuery("");
      setSearchResults([]);
      setShowResults(false);
      handleRemovePhoto();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("제보 등록 실패:", error);
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
          {/* 장소 검색 */}
          <div className="space-y-2">
            <Label htmlFor="search">
              장소 검색 *
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="장소명을 검색하세요"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setShowResults(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            
            {/* 검색 결과 */}
            {showResults && searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectPlace(result)}
                    className="w-full p-3 text-left hover:bg-accent transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-muted-foreground">{result.address}</div>
                  </button>
                ))}
              </div>
            )}

            {/* 선택된 장소 표시 */}
            {location && (
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="font-medium">{location}</span>
              </div>
            )}
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
                <SelectItem value="good">양호</SelectItem>
                <SelectItem value="moderate">보통</SelectItem>
                <SelectItem value="difficult">어려움</SelectItem>
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
