import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, Trash2, MapPin, Calendar, MessageSquare, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { z } from "zod";
import { reverseGeocode } from "@/lib/utils";

interface Review {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  accessibility_level: string;
  category: string;
  details: string | null;
  status: string;
  created_at: string;
  address?: string;
}

const editReviewSchema = z.object({
  details: z.string().trim().min(1, "상세 내용을 입력해주세요.").max(2000, "상세 내용은 2000자 이하여야 합니다."),
  accessibility_level: z.enum(["good", "moderate", "difficult"], { errorMap: () => ({ message: "유효한 접근성 수준을 선택해주세요." }) }),
});

const MyReviews = () => {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editedDetails, setEditedDetails] = useState("");
  const [editedLevel, setEditedLevel] = useState("");
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [roadViewReview, setRoadViewReview] = useState<Review | null>(null);
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    checkUserAndFetchReviews();
  }, []);

  const checkUserAndFetchReviews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("로그인이 필요합니다.");
        navigate("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user.id)
        .single();
      setNickname(profile?.nickname || null);

      await fetchReviews(user.id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("사용자 확인 실패:", error);
      toast.error("사용자 정보를 확인할 수 없습니다.");
    }
  };

  const fetchReviews = async (userId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("accessibility_reports")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // 각 리뷰에 대해 역지오코딩으로 주소 가져오기
      const reviewsWithAddress = await Promise.all(
        (data || []).map(async (review) => {
          const address = await reverseGeocode(review.latitude, review.longitude);
          return { ...review, address };
        })
      );

      setReviews(reviewsWithAddress);
    } catch (error) {
      if (import.meta.env.DEV) console.error("후기 조회 실패:", error);
      toast.error("후기를 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };


  const handleEdit = (review: Review) => {
    setEditingReview(review);
    setEditedDetails(review.details || "");
    setEditedLevel(review.accessibility_level);
  };

  const handleSaveEdit = async () => {
    if (!editingReview) return;

    try {
      // Validate input
      const validationResult = editReviewSchema.safeParse({
        details: editedDetails,
        accessibility_level: editedLevel,
      });

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0];
        toast.error(firstError.message);
        return;
      }

      const { error } = await supabase
        .from("accessibility_reports")
        .update({
          details: editedDetails.trim(),
          accessibility_level: editedLevel,
          status: "pending", // 수정 시 다시 승인 대기
        })
        .eq("id", editingReview.id);

      if (error) throw error;

      toast.success("후기가 수정되었습니다. 관리자 승인 후 반영됩니다.");
      setEditingReview(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await fetchReviews(user.id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("후기 수정 실패:", error);
      toast.error("후기 수정에 실패했습니다.");
    }
  };

  const handleDelete = async () => {
    if (!deletingReviewId) return;

    try {
      const { error } = await supabase
        .from("accessibility_reports")
        .delete()
        .eq("id", deletingReviewId);

      if (error) throw error;

      toast.success("후기가 삭제되었습니다.");
      setDeletingReviewId(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await fetchReviews(user.id);
    } catch (error) {
      if (import.meta.env.DEV) console.error("후기 삭제 실패:", error);
      toast.error("후기 삭제에 실패했습니다.");
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case "good": return "bg-green-500";
      case "moderate": return "bg-yellow-500";
      case "difficult": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "good": return "양호";
      case "moderate": return "보통";
      case "difficult": return "어려움";
      default: return level;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return { label: "승인 대기", color: "bg-yellow-500" };
      case "approved": return { label: "승인됨", color: "bg-green-500" };
      case "rejected": return { label: "거부됨", color: "bg-red-500" };
      default: return { label: status, color: "bg-gray-500" };
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 px-4 py-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold">{nickname ? `${nickname}의 후기` : "내 후기"}</h1>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="container mx-auto p-4 pb-20 max-w-2xl">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-20 w-full" />
              </Card>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">작성한 후기가 없습니다</h3>
            <p className="text-muted-foreground mb-4">
              장소의 접근성 정보를 공유해보세요!
            </p>
            <Button onClick={() => navigate("/")}>
              지도로 돌아가기
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => {
              const statusInfo = getStatusLabel(review.status);
              return (
                <Card key={review.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{review.location_name}</h3>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getLevelColor(review.accessibility_level)}>
                          {getLevelLabel(review.accessibility_level)}
                        </Badge>
                        <Badge variant="outline">{review.category}</Badge>
                        <Badge className={statusInfo.color}>
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(review)}
                        disabled={review.status === "approved"}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingReviewId(review.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {review.details && (
                    <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                      {review.details}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(review.created_at).toLocaleDateString('ko-KR')}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {review.address || `${review.latitude.toFixed(6)}, ${review.longitude.toFixed(6)}`}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setRoadViewReview(review)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    로드뷰 보기
                  </Button>

                  {review.status === "approved" && (
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      승인된 후기는 수정할 수 없습니다
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 수정 다이얼로그 */}
      <Dialog open={!!editingReview} onOpenChange={() => setEditingReview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>후기 수정</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">접근성 수준</label>
              <div className="flex gap-2">
                {[
                  { value: "good", label: "양호" },
                  { value: "moderate", label: "보통" },
                  { value: "difficult", label: "어려움" }
                ].map((level) => (
                  <Button
                    key={level.value}
                    variant={editedLevel === level.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditedLevel(level.value)}
                    className={editedLevel === level.value ? getLevelColor(level.value) : ""}
                  >
                    {level.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">상세 내용</label>
              <Textarea
                value={editedDetails}
                onChange={(e) => setEditedDetails(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="이 장소의 접근성에 대해 자세히 알려주세요."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingReview(null)}>
              취소
            </Button>
            <Button onClick={handleSaveEdit}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingReviewId} onOpenChange={() => setDeletingReviewId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>후기를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              이 작업은 되돌릴 수 없습니다. 후기가 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 로드뷰 다이얼로그 */}
      <Dialog open={roadViewReview !== null} onOpenChange={(open) => !open && setRoadViewReview(null)}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle>{roadViewReview?.location_name} - 로드뷰</DialogTitle>
          </DialogHeader>
          {roadViewReview && (
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`https://map.kakao.com/link/roadview/${roadViewReview.latitude},${roadViewReview.longitude}`}
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

export default MyReviews;
