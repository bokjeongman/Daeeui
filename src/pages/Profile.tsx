import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, MapPin, Clock, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle, LogOut } from "lucide-react";

interface AccessibilityReport {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  accessibility_level: string;
  category: string;
  details: string | null;
  photo_urls: string[];
  status: string;
  created_at: string;
  reviewed_at: string | null;
  address?: string;
}

interface Stats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}

const Profile = () => {
  const [user, setUser] = useState<any>(null);
  const [reports, setReports] = useState<AccessibilityReport[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, pending: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [nickname, setNickname] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserAndFetchData();
  }, []);

  const checkUserAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      setUser(session.user);
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", session.user.id)
        .single();
      setNickname(profile?.nickname || null);
      
      await fetchReports(session.user.id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("초기화 오류:", error);
      toast.error("페이지 로딩 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocodeLocal = async (lat: number, lon: number): Promise<string> => {
    const { reverseGeocode } = await import("@/lib/tmap");
    return reverseGeocode(lat, lon);
  };

  const fetchReports = async (userId: string) => {
    try {
      // Supabase 기본 1000개 제한 우회를 위한 페이지네이션
      let allData: any[] = [];
      let from = 0;
      const pageSize = 1000;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("accessibility_reports")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          allData = [...allData, ...data];
          from += pageSize;
          hasMore = data.length === pageSize;
        } else {
          hasMore = false;
        }
      }

      // 통계는 전체 데이터로 계산
      setStats({
        total: allData.length,
        approved: allData.filter(r => r.status === "approved").length,
        pending: allData.filter(r => r.status === "pending").length,
        rejected: allData.filter(r => r.status === "rejected").length,
      });

      // 최근 50개만 주소 변환 (성능 최적화)
      const recentReports = allData.slice(0, 50);
      const reportsWithAddress = await Promise.all(
        recentReports.map(async (report) => {
          const address = await reverseGeocodeLocal(report.latitude, report.longitude);
          return { ...report, address };
        })
      );
      
      setReports(reportsWithAddress);
    } catch (error) {
      if (import.meta.env.DEV) console.error("제보 조회 실패:", error);
      toast.error("제보 내역을 불러오는데 실패했습니다.");
    }
  };

  const getAccessibilityBadge = (level: string) => {
    switch (level) {
      case "accessible":
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            접근 가능
          </Badge>
        );
      case "partially_accessible":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
            부분 접근 가능
          </Badge>
        );
      case "not_accessible":
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            접근 불가
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">알 수 없음</Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20">
            <CheckCircle className="h-3 w-3 mr-1" />
            승인됨
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20">
            <XCircle className="h-3 w-3 mr-1" />
            거부됨
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
            <AlertCircle className="h-3 w-3 mr-1" />
            검토 중
          </Badge>
        );
    }
  };

  const categoryLabels: Record<string, string> = {
    ramp: "경사로",
    elevator: "엘리베이터",
    parking: "주차",
    restroom: "화장실",
    entrance: "출입구",
    etc: "기타",
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
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{nickname ? `${nickname}의 프로필` : "내 프로필"}</h1>
            <p className="text-muted-foreground mt-1">제보 활동 내역 및 통계</p>
          </div>
        </div>

        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {nickname || "사용자 정보"}
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={async () => {
                  await supabase.auth.signOut();
                  toast.success("로그아웃 되었습니다.");
                  navigate("/");
                }}
                className="text-destructive hover:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                로그아웃
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">이메일: {user?.email}</p>
            {user?.last_sign_in_at && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-4 w-4" />
                최근 로그인: {new Date(user.last_sign_in_at).toLocaleString("ko-KR")}
              </p>
            )}
            {user?.created_at && (
              <p className="text-sm text-muted-foreground">
                가입일: {new Date(user.created_at).toLocaleDateString("ko-KR")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>총 제보 수</CardDescription>
              <CardTitle className="text-3xl">{stats.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>승인된 제보</CardDescription>
              <CardTitle className="text-3xl text-green-600 dark:text-green-400">{stats.approved}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>검토 중</CardDescription>
              <CardTitle className="text-3xl text-yellow-600 dark:text-yellow-400">{stats.pending}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>거부됨</CardDescription>
              <CardTitle className="text-3xl text-red-600 dark:text-red-400">{stats.rejected}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>제보 내역</CardTitle>
            <CardDescription>
              {stats.total > 50 
                ? `최근 50개 표시 (전체 ${stats.total}개)`
                : "최근 제보한 접근성 정보"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>아직 제보 내역이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-lg">{report.location_name}</h3>
                            {getAccessibilityBadge(report.accessibility_level)}
                            {getStatusBadge(report.status)}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {report.address || `위도: ${Number(report.latitude).toFixed(6)}, 경도: ${Number(report.longitude).toFixed(6)}`}
                            </span>
                            <Badge variant="outline">{categoryLabels[report.category] || report.category}</Badge>
                          </div>

                          {report.details && (
                            <p className="text-sm text-muted-foreground mt-2">{report.details}</p>
                          )}

                          {report.photo_urls && report.photo_urls.length > 0 && (
                            <div className="mt-2">
                              {report.photo_urls.length === 1 ? (
                                <img 
                                  src={report.photo_urls[0]} 
                                  alt="제보 사진" 
                                  className="w-full max-w-md h-48 object-cover rounded-lg border"
                                />
                              ) : (
                                <div className="grid grid-cols-2 gap-2">
                                  {report.photo_urls.map((url: string, idx: number) => (
                                    <img 
                                      key={idx}
                                      src={url} 
                                      alt={`제보 사진 ${idx + 1}`} 
                                      className="w-full h-32 object-cover rounded-lg border"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            제보일: {new Date(report.created_at).toLocaleString("ko-KR")}
                          </div>

                          {report.reviewed_at && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <CheckCircle className="h-3 w-3" />
                              검토일: {new Date(report.reviewed_at).toLocaleString("ko-KR")}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
