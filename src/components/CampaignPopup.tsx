import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import wheelchairRampIcon from "@/assets/wheelchair-ramp-icon.png";

interface CampaignPopupProps {
  onAgree: () => void;
}

const CampaignPopup = ({ onAgree }: CampaignPopupProps) => {
  const [open, setOpen] = useState(false);
  const [hideForToday, setHideForToday] = useState(false);

  useEffect(() => {
    // localStorage에서 사용자 선택 확인
    const status = localStorage.getItem("campaignPopupStatus");
    const hideUntil = localStorage.getItem("campaignPopupHideUntil");

    // "다시는 보지 않기"를 선택한 경우
    if (status === "never") {
      return;
    }

    // "하루동안 보지 않음"을 선택한 경우
    if (hideUntil) {
      const hideUntilDate = new Date(hideUntil);
      const now = new Date();
      if (now < hideUntilDate) {
        return;
      }
      // 기간이 지났으면 localStorage 정리
      localStorage.removeItem("campaignPopupHideUntil");
    }

    // 그 외 모든 경우 팝업 표시
    setOpen(true);
  }, []);

  const handleAgree = () => {
    if (hideForToday) {
      // 내일 자정까지 숨기기
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem("campaignPopupHideUntil", tomorrow.toISOString());
    }
    setOpen(false);
    onAgree();
  };

  const handleClose = () => {
    if (hideForToday) {
      // 내일 자정까지 숨기기
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem("campaignPopupHideUntil", tomorrow.toISOString());
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[340px] p-0 gap-0 overflow-hidden rounded-2xl border-0 shadow-xl">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-5 w-5 text-muted-foreground" />
          <span className="sr-only">Close</span>
        </button>

        {/* 콘텐츠 */}
        <div className="flex flex-col items-center px-8 pt-10 pb-8 bg-background">
          {/* 제목 */}
          <h2 className="text-xl font-bold text-foreground mb-8">접근성 정보 공유</h2>

          {/* 아이콘 */}
          <div className="w-28 h-28 rounded-full overflow-hidden mb-8">
            <img 
              src={wheelchairRampIcon} 
              alt="휠체어 경사로" 
              className="w-full h-full object-cover"
            />
          </div>

          {/* 설명 */}
          <p className="text-center text-muted-foreground mb-8 text-base leading-relaxed">
            자주 가는 장소의 접근성 정보를<br />공유해주세요
          </p>

          {/* 버튼 */}
          <Button
            onClick={handleAgree}
            className="w-full h-14 text-lg font-semibold bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-lg"
          >
            지금 공유하기
          </Button>
        </div>

        {/* 하단 체크박스 */}
        <div className="flex items-center justify-center gap-2 py-4 bg-background border-t border-border/50">
          <Checkbox
            id="hideForToday"
            checked={hideForToday}
            onCheckedChange={(checked) => setHideForToday(checked === true)}
            className="border-muted-foreground/50 data-[state=checked]:bg-muted-foreground data-[state=checked]:border-muted-foreground"
          />
          <label
            htmlFor="hideForToday"
            className="text-sm text-muted-foreground cursor-pointer select-none"
          >
            오늘 하루동안 이 창을 보지 않음
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPopup;
