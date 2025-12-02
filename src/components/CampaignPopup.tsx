import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface CampaignPopupProps {
  onAgree: () => void;
}

const CampaignPopup = ({ onAgree }: CampaignPopupProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // localStorage에서 사용자 선택 확인
    const status = localStorage.getItem("campaignPopupStatus");

    console.log("캠페인 팝업 상태 확인:", { status });

    // "다시는 보지 않기"를 선택한 경우에만 팝업 표시 안 함
    if (status === "never") {
      console.log("팝업 표시 안 함: 다시는 보지 않기 선택됨");
      return;
    }

    // 그 외 모든 경우 팝업 표시
    console.log("캠페인 팝업 표시");
    setOpen(true);
  }, []);

  const handleAgree = () => {
    setOpen(false);
    onAgree();
  };

  const handleLater = () => {
    setOpen(false);
  };

  const handleNever = () => {
    localStorage.setItem("campaignPopupStatus", "never");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">접근성 정보 공유</DialogTitle>
          <DialogDescription className="text-center text-base pt-4">
            자주 가는 장소의 접근성 정보를 공유해 주세요.
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button
            onClick={handleAgree}
            className="w-full"
            size="lg"
          >
            지금 공유하기
          </Button>
          <Button
            onClick={handleLater}
            variant="outline"
            className="w-full"
            size="lg"
          >
            나중에 할게요
          </Button>
          <Button
            onClick={handleNever}
            variant="ghost"
            className="w-full"
            size="lg"
          >
            다시는 보지 않기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPopup;
