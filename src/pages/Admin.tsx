import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MapPin, Loader2 } from "lucide-react";

interface Report {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  accessibility_level: string;
  category: string;
  details: string | null;
  status: string;
  created_at: string;
  user_id: string;
}

const Admin = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchReports();
  }, []);

  const checkAdminAndFetchReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      // 관리자 권한 확인
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("권한 확인 오류:", roleError);
        toast.error("권한 확인 중 오류가 발생했습니다.");
        navigate("/");
        return;
      }

      if (!roleData) {
        toast.error("관리자 권한이 없습니다.");
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchReports();
    } catch (error) {
      console.error("초기화 오류:", error);
      toast.error("페이지 로딩 중 오류가 발생했습니다.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from("accessibility_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("제보 목록 조회 실패:", error);
      toast.error("제보 목록을 불러오는데 실패했습니다.");
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: "approved" | "rejected") => {
    setProcessingIds(prev => new Set(prev).add(reportId));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("세션이 만료되었습니다. 다시 로그인해주세요.");
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("accessibility_reports")
        .update({
          status: newStatus,
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", reportId);

      if (error) throw error;

      toast.success(newStatus === "approved" ? "제보가 승인되었습니다." : "제보가 거부되었습니다.");
      await fetchReports();
    } catch (error) {
      console.error("상태 변경 실패:", error);
      toast.error("상태 변경에 실패했습니다.");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(reportId);
        return newSet;
      });
    }
  };

  const getAccessibilityBadge = (level: string) => {
    const variants: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      good: { label: "접근 용이", variant: "default" },
      moderate: { label: "보통", variant: "secondary" },
      difficult: { label: "접근 어려움", variant: "destructive" },
    };
    const config = variants[level] || { label: level, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      pending: { label: "대기중", className: "bg-yellow-500" },
      approved: { label: "승인됨", className: "bg-green-500" },
      rejected: { label: "거부됨", className: "bg-red-500" },
    };
    const config = variants[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      ramp: "경사로",
      elevator: "엘리베이터",
      curb: "턱",
      stairs: "계단",
      parking: "주차장",
      restroom: "화장실",
      entrance: "출입구",
      other: "기타",
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const pendingReports = reports.filter(r => r.status === "pending");
  const approvedReports = reports.filter(r => r.status === "approved");
  const rejectedReports = reports.filter(r => r.status === "rejected");

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">관리자 페이지</h1>
            <p className="text-muted-foreground mt-1">접근성 제보를 검토하고 승인/거부합니다</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/")}>
            메인으로
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">대기중</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingReports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">승인됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{approvedReports.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">거부됨</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rejectedReports.length}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {reports.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">제보된 내역이 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Card key={report.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{report.location_name}</CardTitle>
                      </div>
                      <CardDescription>
                        위도: {report.latitude.toFixed(6)}, 경도: {report.longitude.toFixed(6)}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(report.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium mb-1">접근성</p>
                        {getAccessibilityBadge(report.accessibility_level)}
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-1">분류</p>
                        <Badge variant="outline">{getCategoryLabel(report.category)}</Badge>
                      </div>
                    </div>
                    
                    {report.details && (
                      <div>
                        <p className="text-sm font-medium mb-1">상세 설명</p>
                        <p className="text-sm text-muted-foreground">{report.details}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-sm font-medium mb-1">제보 일시</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(report.created_at).toLocaleString("ko-KR")}
                      </p>
                    </div>

                    {report.status === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => handleStatusChange(report.id, "approved")}
                          disabled={processingIds.has(report.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {processingIds.has(report.id) ? "처리 중..." : "승인"}
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => handleStatusChange(report.id, "rejected")}
                          disabled={processingIds.has(report.id)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {processingIds.has(report.id) ? "처리 중..." : "거부"}
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
