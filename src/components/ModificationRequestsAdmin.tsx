import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Edit, Trash2, AlertTriangle, ArrowRight } from "lucide-react";

interface ModificationRequest {
  id: string;
  report_id: string;
  requester_id: string;
  request_type: "MODIFY" | "DELETE";
  reason: string;
  proposed_details: string | null;
  proposed_photo_urls: string[] | null;
  status: string;
  created_at: string;
  requester_nickname?: string;
  original_report?: {
    location_name: string;
    details: string | null;
    photo_urls: string[] | null;
    accessibility_level: string;
  };
}

const ModificationRequestsAdmin = () => {
  const [requests, setRequests] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    request: ModificationRequest | null;
    action: "approve" | "reject";
  }>({ open: false, request: null, action: "approve" });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("modification_requests")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 요청자 닉네임과 원본 제보 정보 가져오기
      const requestsWithDetails = await Promise.all(
        (data || []).map(async (req) => {
          // 요청자 닉네임
          const { data: profile } = await supabase
            .from("profiles")
            .select("nickname, email")
            .eq("id", req.requester_id)
            .single();

          // 원본 제보 정보
          const { data: report } = await supabase
            .from("accessibility_reports")
            .select("location_name, details, photo_urls, accessibility_level")
            .eq("id", req.report_id)
            .single();

          return {
            ...req,
            request_type: req.request_type as "MODIFY" | "DELETE",
            requester_nickname: profile?.nickname || profile?.email?.split("@")[0] || "사용자",
            original_report: report || undefined,
          };
        })
      );

      setRequests(requestsWithDetails);
    } catch (error) {
      console.error("수정 요청 목록 조회 실패:", error);
      toast.error("수정 요청 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (request: ModificationRequest, action: "approve" | "reject") => {
    setConfirmDialog({ open: true, request, action });
  };

  const executeAction = async () => {
    const { request, action } = confirmDialog;
    if (!request) return;

    setProcessingId(request.id);
    setConfirmDialog({ open: false, request: null, action: "approve" });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("세션이 만료되었습니다.");
        return;
      }

      if (action === "approve") {
        if (request.request_type === "MODIFY") {
          // 수정 요청 승인: 원본 데이터 업데이트
          const updateData: any = {
            updated_at: new Date().toISOString(),
          };
          if (request.proposed_details) {
            updateData.details = request.proposed_details;
          }
          if (request.proposed_photo_urls && request.proposed_photo_urls.length > 0) {
            updateData.photo_urls = request.proposed_photo_urls;
          }

          const { error: updateError } = await supabase
            .from("accessibility_reports")
            .update(updateData)
            .eq("id", request.report_id);

          if (updateError) throw updateError;
        } else if (request.request_type === "DELETE") {
          // 삭제 요청 승인: 원본 데이터 삭제 (또는 status를 deleted로)
          const { error: deleteError } = await supabase
            .from("accessibility_reports")
            .update({ status: "deleted" })
            .eq("id", request.report_id);

          if (deleteError) throw deleteError;
        }
      }

      // 수정 요청 상태 업데이트
      const { error } = await supabase
        .from("modification_requests")
        .update({
          status: action === "approve" ? "approved" : "rejected",
          reviewed_by: session.user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", request.id);

      if (error) throw error;

      toast.success(
        action === "approve"
          ? request.request_type === "DELETE"
            ? "삭제 요청이 승인되어 제보가 삭제되었습니다."
            : "수정 요청이 승인되어 원본이 업데이트되었습니다."
          : "요청이 거절되었습니다."
      );

      await fetchRequests();
    } catch (error) {
      console.error("요청 처리 실패:", error);
      toast.error("요청 처리에 실패했습니다.");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      pending: { label: "대기중", className: "bg-yellow-500" },
      approved: { label: "승인", className: "bg-green-500" },
      rejected: { label: "거절", className: "bg-red-500" },
    };
    const { label, className } = config[status] || { label: status, className: "bg-gray-500" };
    return <Badge className={className}>{label}</Badge>;
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">수정/삭제 요청 관리</h2>
        {pendingCount > 0 && (
          <Badge variant="destructive">{pendingCount}개 대기중</Badge>
        )}
      </div>

      {requests.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            수정/삭제 요청이 없습니다.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} className={request.status === "pending" ? "border-primary" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {request.request_type === "MODIFY" ? (
                        <Edit className="h-5 w-5 text-blue-500" />
                      ) : (
                        <Trash2 className="h-5 w-5 text-red-500" />
                      )}
                      {request.request_type === "MODIFY" ? "수정 요청" : "삭제 요청"}
                      {getStatusBadge(request.status)}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      요청자: {request.requester_nickname} • {new Date(request.created_at).toLocaleString("ko-KR")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* 원본 제보 정보 */}
                {request.original_report && (
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm font-medium mb-1">원본 제보: {request.original_report.location_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.original_report.details || "상세 내용 없음"}
                    </p>
                  </div>
                )}

                {/* 요청 사유 */}
                <div>
                  <p className="text-sm font-medium mb-1">요청 사유</p>
                  <p className="text-sm bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
                    {request.reason}
                  </p>
                </div>

                {/* 수정 요청일 경우 제안된 내용 */}
                {request.request_type === "MODIFY" && (
                  <div className="space-y-3">
                    {request.proposed_details && (
                      <div>
                        <p className="text-sm font-medium mb-1 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          제안된 수정 내용
                        </p>
                        <p className="text-sm bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
                          {request.proposed_details}
                        </p>
                      </div>
                    )}

                    {request.proposed_photo_urls && request.proposed_photo_urls.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">제안된 사진</p>
                        <Carousel className="w-full max-w-xs">
                          <CarouselContent>
                            {request.proposed_photo_urls.map((url, index) => (
                              <CarouselItem key={index}>
                                <div className="aspect-video relative rounded-lg overflow-hidden bg-muted">
                                  <img
                                    src={url}
                                    alt={`제안 사진 ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              </CarouselItem>
                            ))}
                          </CarouselContent>
                          {request.proposed_photo_urls.length > 1 && (
                            <>
                              <CarouselPrevious className="-left-12" />
                              <CarouselNext className="-right-12" />
                            </>
                          )}
                        </Carousel>
                      </div>
                    )}
                  </div>
                )}

                {/* 액션 버튼 */}
                {request.status === "pending" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={() => handleAction(request, "approve")}
                      disabled={processingId === request.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {processingId === request.id ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      승인
                    </Button>
                    <Button
                      onClick={() => handleAction(request, "reject")}
                      disabled={processingId === request.id}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      거절
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 확인 다이얼로그 */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {confirmDialog.action === "approve" ? "요청 승인 확인" : "요청 거절 확인"}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.action === "approve" ? (
                confirmDialog.request?.request_type === "DELETE" ? (
                  "이 요청을 승인하면 원본 제보가 삭제됩니다. 계속하시겠습니까?"
                ) : (
                  "이 요청을 승인하면 원본 제보의 내용이 제안된 내용으로 덮어쓰기됩니다. 계속하시겠습니까?"
                )
              ) : (
                "이 요청을 거절하시겠습니까?"
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
              취소
            </Button>
            <Button
              onClick={executeAction}
              className={confirmDialog.action === "approve" ? "bg-green-600 hover:bg-green-700" : ""}
              variant={confirmDialog.action === "reject" ? "destructive" : "default"}
            >
              {confirmDialog.action === "approve" ? "승인" : "거절"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ModificationRequestsAdmin;