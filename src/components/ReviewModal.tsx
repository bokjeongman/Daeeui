import { useState, useEffect } from "react";
import { MapPin, Upload, X, Search, Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPlaceSelect?: (lat: number, lon: number) => void;
}

interface AccessibilityItem {
  key: string;
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

const ReviewModal = ({ open, onOpenChange, onPlaceSelect }: ReviewModalProps) => {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const [accessibilityValues, setAccessibilityValues] = useState<Record<string, boolean | null>>({
    has_ramp: null,
    has_elevator: null,
    has_accessible_restroom: null,
    has_low_threshold: null,
    has_wide_door: null,
  });
  const [details, setDetails] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

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

  const resetForm = () => {
    setLocation("");
    setLatitude("");
    setLongitude("");
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
    setAccessibilityValues({
      has_ramp: null,
      has_elevator: null,
      has_accessible_restroom: null,
      has_low_threshold: null,
      has_wide_door: null,
    });
    setDetails("");
    setPhotos([]);
    photoPreviews.forEach(url => URL.revokeObjectURL(url));
    setPhotoPreviews([]);
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
        },
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
    if (onPlaceSelect) {
      onPlaceSelect(place.lat, place.lon);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    if (!location || !latitude || !longitude) {
      toast.error("장소를 검색하여 선택해주세요.");
      return;
    }

    const hasAnySelection = Object.values(accessibilityValues).some(v => v !== null);
    if (!hasAnySelection && !details.trim()) {
      toast.error("접근성 정보나 후기를 작성해주세요.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload photos
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
        location_name: location.trim(),
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        has_ramp: accessibilityValues.has_ramp,
        has_elevator: accessibilityValues.has_elevator,
        has_accessible_restroom: accessibilityValues.has_accessible_restroom,
        has_low_threshold: accessibilityValues.has_low_threshold,
        has_wide_door: accessibilityValues.has_wide_door,
        details: details.trim() || null,
        photo_urls: photoUrls.length > 0 ? photoUrls : null,
        accessibility_level: "good",
        category: "facility",
        status: "pending",
      });

      if (error) throw error;

      toast.success("제보가 성공적으로 등록되었습니다!");
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("제보 등록 실패:", error);
      toast.error("제보 등록에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const ContentBody = () => (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className="space-y-6 pr-2 pb-6">
        {/* 장소 검색 */}
        <div className="space-y-2">
          <Label htmlFor="search" className="font-semibold">장소 검색 *</Label>
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

          {showResults && searchResults.length > 0 && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
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

          {location && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
              <MapPin className="h-4 w-4 text-green-600" />
              <span className="font-medium text-green-700 dark:text-green-300">{location}</span>
            </div>
          )}
        </div>

        {/* 5개 접근성 항목 */}
        <div className="space-y-3">
          <Label className="font-semibold">접근성 정보 *</Label>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 알고 계신 정보만 선택해주세요. 모든 항목을 작성할 필요는 없습니다!
            </p>
          </div>
          
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
                  className={`h-10 ${accessibilityValues[item.key] === true ? "bg-green-500 hover:bg-green-600 text-white" : ""}`}
                  onClick={() => handleToggle(item.key, true)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  있어요
                </Button>
                <Button
                  type="button"
                  variant={accessibilityValues[item.key] === false ? "default" : "outline"}
                  className={`h-10 ${accessibilityValues[item.key] === false ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                  onClick={() => handleToggle(item.key, false)}
                >
                  <X className="h-4 w-4 mr-2" />
                  없어요
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* 추가 후기 */}
        <div className="space-y-2">
          <Label htmlFor="details" className="font-semibold">추가 후기 (선택)</Label>
          <Textarea
            id="details"
            placeholder="더 자세한 정보가 있다면 공유해주세요"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            rows={3}
            className="resize-none"
            maxLength={500}
          />
          <div className="text-right text-xs text-muted-foreground">{details.length} / 500</div>
        </div>

        {/* 사진 첨부 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">📸 사진 첨부 (최대 5장)</Label>
            <span className="text-sm text-green-600">정확한 정보 제공을 위해 추천</span>
          </div>
          <div className="border-2 border-dashed border-green-200 dark:border-green-800 rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer bg-green-50/30 dark:bg-green-950/20">
            <input
              id="photo-upload-review"
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="hidden"
              disabled={photos.length >= 5}
            />
            <label htmlFor="photo-upload-review" className="cursor-pointer flex flex-col items-center gap-3">
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
    </div>
  );

  const SubmitButtons = () => (
    <div className="flex gap-2 flex-shrink-0 pt-4 border-t bg-background">
      <Button
        type="button"
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="flex-1 h-12"
        disabled={isSubmitting}
      >
        취소
      </Button>
      <Button
        onClick={handleSubmit}
        className="flex-1 h-12 bg-green-500 hover:bg-green-600 text-white"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            제출 중...
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            제출하기
          </>
        )}
      </Button>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[90vh] flex flex-col">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-green-600" />
              접근성 정보 제보
            </DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 overflow-hidden px-4">
            <ContentBody />
          </div>
          <div className="flex-shrink-0 px-4 pb-4">
            <SubmitButtons />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="flex-shrink-0 p-6 pb-4">
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-green-600" />
            접근성 정보 제보
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-hidden px-6">
          <ContentBody />
        </div>
        <div className="flex-shrink-0 p-6 pt-0">
          <SubmitButtons />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
