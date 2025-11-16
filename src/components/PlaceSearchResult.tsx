import { useState, useEffect } from "react";
import { MapPin, Star } from "lucide-react";
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
}

const PlaceSearchResult = ({ results, onSelect, onClose }: PlaceSearchResultProps) => {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleAddToFavorites = async (place: Place) => {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      navigate("/auth");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("favorites")
        .insert({
          user_id: user.id,
          place_name: place.name,
          latitude: place.lat,
          longitude: place.lon,
          address: place.address,
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("이미 즐겨찾기에 추가된 장소입니다.");
        } else {
          throw error;
        }
      } else {
        toast.success("즐겨찾기에 추가되었습니다.");
      }
    } catch (error: any) {
      if (import.meta.env.DEV) console.error("즐겨찾기 추가 실패:", error);
      toast.error("즐겨찾기 추가에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  if (selectedPlace) {
    return (
      <div className="absolute top-full left-0 right-0 z-20 bg-background border-t shadow-lg">
        <Card className="m-2 p-4">
          <div className="flex items-start gap-3 mb-4">
            <MapPin className="h-6 w-6 text-primary mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg mb-1">{selectedPlace.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedPlace.address}</p>
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="default"
              className="flex-1"
              onClick={() => {
                onSelect(selectedPlace, "start");
                setSelectedPlace(null);
              }}
            >
              출발
            </Button>
            <Button
              variant="default"
              size="default"
              className="flex-1"
              onClick={() => {
                onSelect(selectedPlace, "end");
                setSelectedPlace(null);
              }}
            >
              도착
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full mb-2"
            onClick={() => handleAddToFavorites(selectedPlace)}
            disabled={isSaving}
          >
            <Star className="h-4 w-4 mr-2" />
            {isSaving ? "추가 중..." : "즐겨찾기 추가"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setSelectedPlace(null)}
          >
            다른 장소 선택
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 right-0 z-20 bg-background border-t shadow-lg max-h-96 overflow-y-auto">
      {results.map((place) => (
        <Card
          key={place.id}
          className="m-2 p-3 hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => setSelectedPlace(place)}
        >
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">{place.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{place.address}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PlaceSearchResult;
