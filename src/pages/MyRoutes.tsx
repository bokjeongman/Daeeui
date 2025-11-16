import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Navigation, Loader2, ArrowLeft, Clock } from "lucide-react";

interface RouteHistory {
  id: string;
  start_name: string;
  start_lat: number;
  start_lon: number;
  end_name: string;
  end_lat: number;
  end_lon: number;
  distance: number | null;
  duration: number | null;
  created_at: string;
}

const MyRoutes = () => {
  const [routes, setRoutes] = useState<RouteHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetchRoutes();
  }, []);

  const checkUserAndFetchRoutes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchRoutes();
    } catch (error) {
      console.error("초기화 오류:", error);
      toast.error("페이지 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data, error } = await supabase
        .from("route_history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRoutes(data || []);
    } catch (error) {
      console.error("경로 기록 조회 실패:", error);
      toast.error("경로 기록을 불러오는데 실패했습니다.");
    }
  };

  const handleNavigate = (route: RouteHistory) => {
    navigate("/", {
      state: {
        startPoint: {
          name: route.start_name,
          lat: Number(route.start_lat),
          lon: Number(route.start_lon),
        },
        destination: {
          name: route.end_name,
          lat: Number(route.end_lat),
          lon: Number(route.end_lon),
        }
      }
    });
  };

  const formatDistance = (meters: number | null) => {
    if (!meters) return "알 수 없음";
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "알 수 없음";
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}시간 ${remainingMinutes}분`;
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
            <h1 className="text-3xl font-bold">내 경로</h1>
            <p className="text-muted-foreground mt-1">최근 검색한 경로를 확인하세요</p>
          </div>
        </div>

        {routes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Navigation className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-2">
                경로 기록이 없습니다
              </p>
              <p className="text-sm text-muted-foreground text-center">
                경로를 검색하면 여기에 기록됩니다
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {routes.map((route) => (
              <Card key={route.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-3">경로 정보</CardTitle>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <Badge variant="outline" className="mt-0.5">출발</Badge>
                          <div className="flex-1">
                            <p className="font-medium">{route.start_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(route.start_lat).toFixed(5)}, {Number(route.start_lon).toFixed(5)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <Badge variant="default" className="mt-0.5">도착</Badge>
                          <div className="flex-1">
                            <p className="font-medium">{route.end_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {Number(route.end_lat).toFixed(5)}, {Number(route.end_lon).toFixed(5)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4 mb-3">
                    {route.distance && (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDistance(route.distance)}</span>
                      </div>
                    )}
                    {route.duration && (
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDuration(route.duration)}</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="default"
                    className="w-full"
                    onClick={() => handleNavigate(route)}
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    다시 검색
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(route.created_at).toLocaleString("ko-KR")}
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

export default MyRoutes;
