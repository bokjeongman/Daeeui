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
    const lastShown = localStorage.getItem("campaignPopupLastShown");

    console.log("캠페인 팝업 상태 확인:", { status, lastShown });

    // "다시는 보지 않기"를 선택한 경우
    if (status === "never") {
      console.log("팝업 표시 안 함: 다시는 보지 않기 선택됨");
      return;
    }

    // "나중에 할게요"를 선택한 경우 - 오늘 날짜와 비교
    if (status === "later" && lastShown) {
      const lastDate = new Date(lastShown);
      const today = new Date();
      
      console.log("나중에 할게요 확인:", { lastDate, today });
      
      // 같은 날이면 팝업 표시 안 함
      if (
        lastDate.getFullYear() === today.getFullYear() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getDate() === today.getDate()
      ) {
        console.log("팝업 표시 안 함: 오늘 이미 표시됨");
        return;
      }
    }

    // "지금 공유하기"를 선택한 경우
    if (status === "agreed") {
      console.log("팝업 표시 안 함: 이미 동의함");
      return;
    }

    // 그 외의 경우 팝업 표시
    console.log("캠페인 팝업 표시");
    setOpen(true);
  }, []);

  const handleAgree = () => {
    localStorage.setItem("campaignPopupStatus", "agreed");
    setOpen(false);
    onAgree();
  };

  const handleLater = () => {
    localStorage.setItem("campaignPopupStatus", "later");
    localStorage.setItem("campaignPopupLastShown", new Date().toISOString());
    setOpen(false);
    toast.info("나중에 다시 알려드리겠습니다.");
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
