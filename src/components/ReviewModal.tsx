import { useState } from "react";
import { X, MapPin, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReviewModal = ({ open, onOpenChange }: ReviewModalProps) => {
  const [location, setLocation] = useState("");
  const [accessibility, setAccessibility] = useState("");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!location || !accessibility || !category) {
      toast.error("필수 항목을 모두 입력해주세요.");
      return;
    }

    toast.success("후기가 성공적으로 등록되었습니다!");
    onOpenChange(false);
    
    // 폼 초기화
    setLocation("");
    setAccessibility("");
    setCategory("");
    setDetails("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            휠체어 접근성 정보 제보
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 위치 */}
          <div className="space-y-2">
            <Label htmlFor="location" className="required">
              위치 *
            </Label>
            <div className="relative">
              <Input
                id="location"
                placeholder="주소 검색"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
              >
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* 접근성 선택 */}
          <div className="space-y-2">
            <Label htmlFor="accessibility" className="required">
              접근성 선택 (필수)
            </Label>
            <p className="text-sm text-muted-foreground">
              예: 경사대트로 적음
            </p>
            <Select value={accessibility} onValueChange={setAccessibility}>
              <SelectTrigger id="accessibility">
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">접근 용이</SelectItem>
                <SelectItem value="moderate">보통</SelectItem>
                <SelectItem value="difficult">접근 어려움</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 분류 종류 */}
          <div className="space-y-2">
            <Label htmlFor="category" className="required">
              분류 종류 *
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="category">
                <SelectValue placeholder="선택하세요" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ramp">경사로</SelectItem>
                <SelectItem value="elevator">엘리베이터</SelectItem>
                <SelectItem value="curb">턱</SelectItem>
                <SelectItem value="parking">장애인 주차</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 남기는 말 */}
          <div className="space-y-2">
            <Label htmlFor="details">
              남기는 말
            </Label>
            <p className="text-sm text-muted-foreground">
              예: 건물 선택 파트 상세한 정보를 알려주세요
            </p>
            <Textarea
              id="details"
              placeholder="접근성 문제에 대한 상세한 정보를 알려주세요."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="min-h-24 resize-none"
              maxLength={50}
            />
            <p className="text-xs text-muted-foreground text-right">
              {details.length}/50
            </p>
          </div>

          {/* 사진 업로드 */}
          <div className="space-y-2">
            <Label htmlFor="photo">사진 (선택)</Label>
            <p className="text-sm text-muted-foreground">
              과음 선택: 선택된 파일을 없음
            </p>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                사진을 업로드하려면 클릭하세요
              </p>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              취소
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background"
            >
              제출
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewModal;
