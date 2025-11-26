import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MapPin, Trash2, Navigation, Loader2, ArrowLeft } from "lucide-react";

interface Favorite {
  id: string;
  place_name: string;
  latitude: number;
  longitude: number;
  address: string | null;
  created_at: string;
}

const Favorites = () => {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetchFavorites();
  }, []);

  const checkUserAndFetchFavorites = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchFavorites();
    } catch (error) {
      if (import.meta.env.DEV) console.error("초기화 오류:", error);
      toast.error("페이지 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&format=json&callback=result&coordType=WGS84GEO&addressType=A10&lon=${lon}&lat=${lat}&appKey=KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT`
      );
      const data = await response.json();
      
      if (data.addressInfo) {
        const addr = data.addressInfo;
        return `${addr.city_do || ''} ${addr.gu_gun || ''} ${addr.eup_myun || ''} ${addr.adminDong || ''} ${addr.ri || ''}`.trim();
      }
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    } catch (error) {
      if (import.meta.env.DEV) console.error("역지오코딩 실패:", error);
      return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
    }
  };

  const fetchFavorites = async () => {
    try {
      const { data, error } = await supabase
        .from("favorites")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // 각 즐겨찾기에 대해 역지오코딩으로 주소 가져오기
      const favoritesWithAddress = await Promise.all(
        (data || []).map(async (favorite) => {
          if (!favorite.address) {
            const address = await reverseGeocode(Number(favorite.latitude), Number(favorite.longitude));
            return { ...favorite, address };
          }
          return favorite;
        })
      );
      
      setFavorites(favoritesWithAddress);
    } catch (error) {
      if (import.meta.env.DEV) console.error("즐겨찾기 조회 실패:", error);
      toast.error("즐겨찾기를 불러오는데 실패했습니다.");
    }
  };

  const handleDelete = async (favoriteId: string) => {
    setDeletingIds(prev => new Set(prev).add(favoriteId));
    
    try {
      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("id", favoriteId);

      if (error) throw error;

      toast.success("즐겨찾기가 삭제되었습니다.");
      await fetchFavorites();
    } catch (error) {
      if (import.meta.env.DEV) console.error("삭제 실패:", error);
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(favoriteId);
        return newSet;
      });
    }
  };

  const handleNavigate = (favorite: Favorite) => {
    // 도착지로 설정하고 메인 페이지로 이동
    navigate("/", {
      state: {
        destination: {
          name: favorite.place_name,
          lat: Number(favorite.latitude),
          lon: Number(favorite.longitude),
          address: favorite.address,
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">즐겨찾기</h1>
            <p className="text-muted-foreground mt-1">저장된 장소를 빠르게 찾아보세요</p>
          </div>
        </div>

        {favorites.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-2">
                즐겨찾기가 없습니다
              </p>
              <p className="text-sm text-muted-foreground text-center">
                장소 검색 후 별표 아이콘을 눌러 즐겨찾기에 추가하세요
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{favorite.place_name}</CardTitle>
                      </div>
                      <CardDescription>
                        {favorite.address || `위도: ${Number(favorite.latitude).toFixed(6)}, 경도: ${Number(favorite.longitude).toFixed(6)}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleNavigate(favorite)}
                    >
                      <Navigation className="h-4 w-4 mr-2" />
                      경로 검색
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => handleDelete(favorite.id)}
                      disabled={deletingIds.has(favorite.id)}
                    >
                      {deletingIds.has(favorite.id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    추가일: {new Date(favorite.created_at).toLocaleDateString("ko-KR")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Favorites;
