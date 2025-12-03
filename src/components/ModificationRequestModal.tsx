import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, Edit, Trash2 } from "lucide-react";

interface ModificationRequestModalProps {
  open: boolean;
  onClose: () => void;
  report: {
    id: string;
    details: string | null;
    photo_urls?: string[];
    location_name: string;
  };
}

const ModificationRequestModal = ({ open, onClose, report }: ModificationRequestModalProps) => {
  const [requestType, setRequestType] = useState<"MODIFY" | "DELETE">("MODIFY");
  const [reason, setReason] = useState("");
  const [proposedDetails, setProposedDetails] = useState(report.details || "");
  const [proposedPhotos, setProposedPhotos] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files).slice(0, 5 - proposedPhotos.length);
      setProposedPhotos(prev => [...prev, ...newFiles]);
    }
  };

  const removePhoto = (index: number) => {
    setProposedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async (): Promise<string[]> => {
    if (proposedPhotos.length === 0) return [];
    
    const uploadedUrls: string[] = [];
    for (const file of proposedPhotos) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `modification-requests/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('accessibility-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('accessibility-photos')
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error("요청 사유를 입력해주세요.");
      return;
    }

    if (requestType === "MODIFY" && !proposedDetails.trim()) {
      toast.error("수정할 내용을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("로그인이 필요합니다.");
        return;
      }

      let photoUrls: string[] = [];
      if (requestType === "MODIFY" && proposedPhotos.length > 0) {
        setUploading(true);
        photoUrls = await uploadPhotos();
        setUploading(false);
      }

      const { error } = await supabase.from("modification_requests").insert({
        report_id: report.id,
        requester_id: session.user.id,
        request_type: requestType,
        reason: reason.trim(),
        proposed_details: requestType === "MODIFY" ? proposedDetails.trim() : null,
        proposed_photo_urls: requestType === "MODIFY" && photoUrls.length > 0 ? photoUrls : null,
      });

      if (error) throw error;

      toast.success("수정 요청이 제출되었습니다. 관리자 검토 후 처리됩니다.");
      onClose();
      resetForm();
    } catch (error) {
      console.error("수정 요청 제출 실패:", error);
      toast.error("수정 요청 제출에 실패했습니다.");
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const resetForm = () => {
    setRequestType("MODIFY");
    setReason("");
    setProposedDetails(report.details || "");
    setProposedPhotos([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>제보 수정 요청</DialogTitle>
          <DialogDescription>
            {report.location_name}에 대한 수정 또는 삭제를 요청합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 요청 유형 선택 */}
          <div className="space-y-3">
            <Label>요청 유형</Label>
            <RadioGroup value={requestType} onValueChange={(v) => setRequestType(v as "MODIFY" | "DELETE")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MODIFY" id="modify" />
                <Label htmlFor="modify" className="flex items-center gap-2 cursor-pointer">
                  <Edit className="h-4 w-4" />
                  내용 수정 요청
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="DELETE" id="delete" />
                <Label htmlFor="delete" className="flex items-center gap-2 cursor-pointer">
                  <Trash2 className="h-4 w-4" />
                  삭제 요청
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 요청 사유 */}
          <div className="space-y-2">
            <Label htmlFor="reason">요청 사유 *</Label>
            <Textarea
              id="reason"
              placeholder="수정/삭제를 요청하는 이유를 입력해주세요"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* 수정 요청일 경우 수정 내용 입력 */}
          {requestType === "MODIFY" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="proposedDetails">수정할 내용 *</Label>
                <Textarea
                  id="proposedDetails"
                  placeholder="수정할 상세 내용을 입력해주세요"
                  value={proposedDetails}
                  onChange={(e) => setProposedDetails(e.target.value)}
                  rows={4}
                />
              </div>

              {/* 사진 업로드 */}
              <div className="space-y-2">
                <Label>사진 첨부 (선택, 최대 5장)</Label>
                <div className="flex flex-wrap gap-2">
                  {proposedPhotos.map((file, index) => (
                    <div key={index} className="relative w-20 h-20">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`첨부 ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {proposedPhotos.length < 5 && (
                    <label className="w-20 h-20 border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || uploading}>
            {(submitting || uploading) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {uploading ? "업로드 중..." : "요청 제출"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModificationRequestModal;