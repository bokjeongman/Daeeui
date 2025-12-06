import { useState, useEffect } from "react";
import { MapPin, Star, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Place {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface PlaceSearchResultProps {
  results: Place[];
  onSelect: (place: Place, type: "start" | "end") => void;
  onClose: () => void;
  onMoveToPlace?: (place: { lat: number; lon: number; name: string }) => void;
  onClearPlace?: () => void;
  searchMode?: "start" | "end" | null;
}

const PlaceSearchResult = ({ results, onSelect, onClose, onMoveToPlace, onClearPlace, searchMode }: PlaceSearchResultProps) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
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

  // 즐겨찾기 상태 확인
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      if (!user || !selectedPlace) {
        setIsFavorited(false);
        return;
      }

      try {
        const { data } = await supabase
          .from("favorites")
          .select("id")
          .eq("user_id", user.id)
          .eq("place_name", selectedPlace.name)
          .eq("latitude", selectedPlace.lat)
          .eq("longitude", selectedPlace.lon)
          .single();

        setIsFavorited(!!data);
      } catch (error) {
        setIsFavorited(false);
      }
    };

    checkFavoriteStatus();
  }, [user, selectedPlace]);

  const handleToggleFavorite = async (place: Place) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    setIsSaving(true);
    try {
      // 이미 즐겨찾기에 있는지 확인
      const { data: existingFavorite } = await supabase
        .from("favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("place_name", place.name)
        .eq("latitude", place.lat)
        .eq("longitude", place.lon)
        .single();

      if (existingFavorite) {
        // 즐겨찾기 삭제
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("id", existingFavorite.id);

        if (error) throw error;
        setIsFavorited(false);
        toast.success("즐겨찾기에서 제거되었습니다.");
      } else {
        // 즐겨찾기 추가
        const { error } = await supabase
          .from("favorites")
          .insert({
            user_id: user.id,
            place_name: place.name,
            latitude: place.lat,
            longitude: place.lon,
            address: place.address,
          });

        if (error) throw error;
        setIsFavorited(true);
        toast.success("즐겨찾기에 추가되었습니다.");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("즐겨찾기 처리 실패:", error);
      toast.error("즐겨찾기 처리에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedPlace) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t shadow-lg pb-safe">
        <Card className="m-0 p-4 rounded-none border-0 border-t relative">
          {/* 우상단 버튼들 */}
          <div className="absolute top-3 right-3 flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className={`h-11 w-11 rounded-full shadow-md touch-manipulation active:scale-95 ${
                isFavorited 
                  ? 'bg-green-500 hover:bg-green-600 border-green-500' 
                  : 'bg-background'
              }`}
              onClick={() => handleToggleFavorite(selectedPlace)}
              disabled={isSaving}
            >
              <Star className={`h-5 w-5 ${isFavorited ? 'fill-white text-white' : ''}`} />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-full bg-background shadow-md touch-manipulation active:scale-95"
              onClick={() => {
                setSelectedPlace(null);
                onClose();
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-start gap-3 mb-4 pr-24">
            <MapPin className="h-6 w-6 text-primary mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1">{selectedPlace.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {/* searchMode가 지정되어 있으면 해당 버튼만 표시하고 자동 선택 */}
            {searchMode ? (
              <Button
                variant="default"
                size="default"
                className="flex-1 h-12 bg-primary active:scale-[0.98] touch-manipulation"
                onClick={() => {
                  onSelect(selectedPlace, searchMode);
                  setSelectedPlace(null);
                  onClose();
                }}
              >
                {searchMode === "start" ? "출발지로 설정" : "도착지로 설정"}
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="default"
                  className="flex-1 h-12 active:scale-[0.98] touch-manipulation"
                  onClick={() => {
                    onSelect(selectedPlace, "start");
                    setSelectedPlace(null);
                    onClose();
                  }}
                >
                  출발
                </Button>
                <Button
                  variant="default"
                  size="default"
                  className="flex-1 h-12 bg-primary active:scale-[0.98] touch-manipulation"
                  onClick={() => {
                    onSelect(selectedPlace, "end");
                    setSelectedPlace(null);
                    onClose();
                  }}
                >
                  도착
                </Button>
              </>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="fixed left-0 right-0 z-50 bg-background border-t shadow-lg max-h-[50vh] overflow-y-auto overscroll-contain"
      style={{ top: 'auto', bottom: 'auto', marginTop: '0' }}
      onTouchStart={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="sticky top-0 right-0 z-10 flex justify-end p-2 bg-background border-b">
        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center bg-background border rounded-full shadow-md hover:bg-muted active:scale-95 touch-manipulation text-lg font-bold"
        >
          ✕
        </button>
      </div>
      <div className="pb-safe">
        {results.map((place) => (
          <Card
            key={place.id}
            className="mx-2 mb-2 p-4 hover:bg-muted/50 active:bg-muted active:scale-[0.98] transition-all cursor-pointer touch-manipulation"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (onMoveToPlace) {
                onMoveToPlace({ lat: place.lat, lon: place.lon, name: place.name });
              }
              setSelectedPlace(place);
            }}
          >
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-base">{place.name}</h3>
                <p className="text-sm text-muted-foreground truncate">{place.address}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlaceSearchResult;
