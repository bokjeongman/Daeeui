import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, MapPin, Clock, ArrowLeft, Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface AccessibilityReport {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  accessibility_level: string;
  category: string;
  details: string | null;
  photo_url: string | null;
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
      await fetchReports(session.user.id);
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
        `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&lat=${lat}&lon=${lon}&coordType=WGS84GEO&addressType=A10`,
        {
          method: "GET",
          headers: {
            appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
          },
        }
      );
      const data = await response.json();
      if (data.addressInfo) {
        const fullAddress = data.addressInfo.fullAddress || "";
        return fullAddress.replace(/^[^,]+,\s*/, "");
      }
      return `위도: ${lat.toFixed(6)}, 경도: ${lon.toFixed(6)}`;
    } catch (error) {
      return `위도: ${lat.toFixed(6)}, 경도: ${lon.toFixed(6)}`;
    }
  };

  const fetchReports = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("accessibility_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const reportsData = data || [];
      
      // 각 제보에 대해 주소 변환
      const reportsWithAddress = await Promise.all(
        reportsData.map(async (report) => {
          const address = await reverseGeocode(report.latitude, report.longitude);
          return { ...report, address };
        })
      );
      
      setReports(reportsWithAddress);

      // Calculate statistics
      setStats({
        total: reportsWithAddress.length,
        approved: reportsWithAddress.filter(r => r.status === "approved").length,
        pending: reportsWithAddress.filter(r => r.status === "pending").length,
        rejected: reportsWithAddress.filter(r => r.status === "rejected").length,
      });
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
            <h1 className="text-3xl font-bold">내 프로필</h1>
            <p className="text-muted-foreground mt-1">제보 활동 내역 및 통계</p>
          </div>
        </div>

        {/* User Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              사용자 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">이메일: {user?.email}</p>
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
            <CardDescription>최근 제보한 접근성 정보</CardDescription>
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

                          {report.photo_url && (
                            <div className="mt-2">
                              <img 
                                src={report.photo_url} 
                                alt="제보 사진" 
                                className="w-full max-w-md h-48 object-cover rounded-lg border"
                              />
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
