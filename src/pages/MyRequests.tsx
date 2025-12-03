import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, CheckCircle, XCircle, Trash2, Edit, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ModificationRequest {
  id: string;
  report_id: string;
  request_type: string;
  reason: string;
  proposed_details: string | null;
  proposed_photo_urls: string[] | null;
  status: string;
  created_at: string;
  reviewed_at: string | null;
  report?: {
    location_name: string;
    details: string | null;
  };
}

const MyRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ModificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const checkAuthAndFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      fetchRequests();
    };
    checkAuthAndFetch();
  }, [navigate]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("modification_requests")
        .select(`
          *,
          report:accessibility_reports(location_name, details)
        `)
        .eq("requester_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error("Failed to fetch requests:", error);
      toast.error("요청 목록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRequest = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from("modification_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("요청이 취소되었습니다.");
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error("Failed to cancel request:", error);
      toast.error("요청 취소에 실패했습니다.");
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary" className="flex items-center gap-1"><Clock className="h-3 w-3" />대기중</Badge>;
      case "approved":
        return <Badge className="bg-green-500 flex items-center gap-1"><CheckCircle className="h-3 w-3" />승인됨</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />거절됨</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">내 수정/삭제 요청</h1>
      </header>

      <main className="p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>제출한 수정/삭제 요청이 없습니다.</p>
          </div>
        ) : (
          requests.map((request) => (
            <Card key={request.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {request.request_type === "MODIFY" ? (
                        <Edit className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-500" />
                      )}
                      {request.request_type === "MODIFY" ? "수정 요청" : "삭제 요청"}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {request.report?.location_name || "알 수 없는 위치"}
                    </p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">요청 사유</p>
                  <p className="text-sm">{request.reason}</p>
                </div>

                {request.request_type === "MODIFY" && request.proposed_details && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">제안한 수정 내용</p>
                    <p className="text-sm bg-muted p-2 rounded">{request.proposed_details}</p>
                  </div>
                )}

                {request.proposed_photo_urls && request.proposed_photo_urls.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">첨부 사진</p>
                    <div className="flex gap-2 flex-wrap">
                      {request.proposed_photo_urls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`첨부 ${idx + 1}`}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(request.created_at)}
                  </p>
                  {request.status === "pending" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === request.id}
                        >
                          {deletingId === request.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-1" />
                              취소
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>요청 취소</AlertDialogTitle>
                          <AlertDialogDescription>
                            이 수정/삭제 요청을 취소하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>아니오</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleCancelRequest(request.id)}>
                            예, 취소합니다
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
};

export default MyRequests;
