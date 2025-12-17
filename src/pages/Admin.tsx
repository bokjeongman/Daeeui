import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { CheckCircle2, XCircle, MapPin, Loader2, Search, Filter, Eye } from "lucide-react";

interface Report {
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
  user_id: string;
  address?: string;
}

const Admin = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [roadViewReport, setRoadViewReport] = useState<Report | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchReports();
  }, []);

  useEffect(() => {
    let filtered = [...reports];
    if (searchQuery) {
      filtered = filtered.filter((r) => r.location_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        r.category.toLowerCase().includes(searchQuery.toLowerCase()) || r.details?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (statusFilter !== "all") filtered = filtered.filter((r) => r.status === statusFilter);
    if (levelFilter !== "all") filtered = filtered.filter((r) => r.accessibility_level === levelFilter);
    setFilteredReports(filtered);
  }, [reports, searchQuery, statusFilter, levelFilter]);

  const checkAdminAndFetchReports = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }
      const { data: roleData, error: roleError } = await supabase.from("user_roles").select("role")
        .eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      if (roleError || !roleData) {
        toast.error("관리자 권한이 없습니다.");
        navigate("/");
        return;
      }
      setIsAdmin(true);
      await fetchReports();
    } catch (error) {
      if (import.meta.env.DEV) console.error("초기화 오류:", error);
      toast.error("페이지 로딩 중 오류가 발생했습니다.");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase.from("accessibility_reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      
      // 각 제보에 대해 역지오코딩으로 주소 가져오기
      const reportsWithAddress = await Promise.all(
        (data || []).map(async (report) => {
          const address = await reverseGeocodeLocal(report.latitude, report.longitude);
          return { ...report, address };
        })
      );
      
      setReports(reportsWithAddress);
    } catch (error) {
      if (import.meta.env.DEV) console.error("제보 목록 조회 실패:", error);
      toast.error("제보 목록을 불러오는데 실패했습니다.");
    }
  };

  const reverseGeocodeLocal = async (lat: number, lon: number): Promise<string> => {
    const { reverseGeocode } = await import("@/lib/tmap");
    return reverseGeocode(lat, lon);
  };

  const handleStatusChange = async (reportId: string, newStatus: "approved" | "rejected") => {
    setProcessingIds(prev => new Set(prev).add(reportId));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("세션이 만료되었습니다.");
        navigate("/auth");
        return;
      }
      const { error } = await supabase.from("accessibility_reports").update({
        status: newStatus, reviewed_by: session.user.id, reviewed_at: new Date().toISOString()
      }).eq("id", reportId);
      if (error) throw error;
      toast.success(newStatus === "approved" ? "제보가 승인되었습니다." : "제보가 거부되었습니다.");
      await fetchReports();
    } catch (error) {
      if (import.meta.env.DEV) console.error("상태 변경 실패:", error);
      toast.error("상태 변경에 실패했습니다.");
    } finally {
      setProcessingIds(prev => { const newSet = new Set(prev); newSet.delete(reportId); return newSet; });
    }
  };

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (selectedReports.size === 0) { toast.error("선택된 제보가 없습니다."); return; }
    if (!confirm(`선택한 ${selectedReports.size}개의 제보를 ${action === "approve" ? "승인" : "거부"}하시겠습니까?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("세션이 만료되었습니다."); return; }
      const updates = Array.from(selectedReports).map((reportId) => supabase.from("accessibility_reports").update({
        status: action === "approve" ? "approved" : "rejected", reviewed_by: session.user.id, reviewed_at: new Date().toISOString()
      }).eq("id", reportId));
      await Promise.all(updates);
      toast.success(`${selectedReports.size}개의 제보가 ${action === "approve" ? "승인" : "거부"}되었습니다.`);
      setSelectedReports(new Set());
      await fetchReports();
    } catch (error) {
      if (import.meta.env.DEV) console.error("일괄 처리 실패:", error);
      toast.error("일괄 처리에 실패했습니다.");
    }
  };

  const getAccessibilityBadge = (level: string) => {
    const config: Record<string, { label: string; className: string }> = {
      good: { label: "양호", className: "bg-green-500" }, moderate: { label: "보통", className: "bg-yellow-500" },
      difficult: { label: "어려움", className: "bg-red-500" }
    };
    const { label, className } = config[level] || { label: level, className: "bg-gray-500" };
    return <Badge className={className}>{label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: "대기중", className: "bg-yellow-500" }, approved: { label: "승인", className: "bg-green-500" },
      rejected: { label: "거부", className: "bg-red-500" }
    };
    const { label, className } = config[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={className}>{label}</Badge>;
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!isAdmin) return null;

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">관리자 대시보드</h1>
      
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" />검색 및 필터</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="장소명, 카테고리 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인</SelectItem>
                <SelectItem value="rejected">거부</SelectItem>
              </SelectContent>
            </Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 수준</SelectItem>
                <SelectItem value="good">양호</SelectItem>
                <SelectItem value="moderate">보통</SelectItem>
                <SelectItem value="difficult">어려움</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      {selectedReports.size > 0 && (
        <Card className="mb-6 border-primary">
          <CardContent className="flex items-center justify-between py-4">
            <span className="font-medium">{selectedReports.size}개 선택됨</span>
            <div className="flex gap-2">
              <Button onClick={() => handleBulkAction("approve")} className="bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="h-4 w-4 mr-2" />일괄 승인
              </Button>
              <Button onClick={() => handleBulkAction("reject")} variant="destructive">
                <XCircle className="h-4 w-4 mr-2" />일괄 거부
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="space-y-4">
        {filteredReports.map((report) => (
          <Card key={report.id}>
            <CardHeader>
              <div className="flex items-start gap-3">
                {report.status === "pending" && <Checkbox checked={selectedReports.has(report.id)} 
                  onCheckedChange={() => setSelectedReports(prev => { const s = new Set(prev); s.has(report.id) ? s.delete(report.id) : s.add(report.id); return s; })} className="mt-1" />}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2"><CardTitle>{report.location_name}</CardTitle>{getStatusBadge(report.status)}</div>
                  <CardDescription className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {report.address || `${report.latitude.toFixed(6)}, ${report.longitude.toFixed(6)}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-2">{getAccessibilityBadge(report.accessibility_level)}</div>
              {report.details && <p className="text-sm mb-3">{report.details}</p>}
              
              {/* 제보 사진 캐러셀 */}
              {report.photo_urls && report.photo_urls.length > 0 && (
                <div className="mb-4">
                  <Carousel className="w-full max-w-xs mx-auto">
                    <CarouselContent>
                      {report.photo_urls.map((url, index) => (
                        <CarouselItem key={index}>
                          <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                            <img
                              src={url}
                              alt={`제보 사진 ${index + 1}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    {report.photo_urls.length > 1 && (
                      <>
                        <CarouselPrevious className="-left-12" />
                        <CarouselNext className="-right-12" />
                      </>
                    )}
                  </Carousel>
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    {report.photo_urls.length}장의 사진
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoadViewReport(report)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  로드뷰 보기
                </Button>
              </div>
              
              {report.status === "pending" && (
                <div className="flex gap-2">
                  <Button onClick={() => handleStatusChange(report.id, "approved")} disabled={processingIds.has(report.id)} className="bg-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-2" />승인
                  </Button>
                  <Button onClick={() => handleStatusChange(report.id, "rejected")} disabled={processingIds.has(report.id)} variant="destructive">
                    <XCircle className="h-4 w-4 mr-2" />거부
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 로드뷰 다이얼로그 */}
      <Dialog open={roadViewReport !== null} onOpenChange={(open) => !open && setRoadViewReport(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{roadViewReport?.location_name} - 로드뷰</DialogTitle>
          </DialogHeader>
          {roadViewReport && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://map.kakao.com/link/roadview/${roadViewReport.latitude},${roadViewReport.longitude}`}
                className="w-full h-full border-0 rounded-lg"
                title="Kakao Road View"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;