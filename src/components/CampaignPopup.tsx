import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";

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
      <DialogContent className="sm:max-w-[360px] p-0 gap-0 overflow-hidden">
        {/* 닫기 버튼 */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </button>

        {/* 콘텐츠 */}
        <div className="flex flex-col items-center px-6 pt-8 pb-6">
          {/* 제목 */}
          <h2 className="text-xl font-bold text-foreground mb-6">접근성 정보 공유</h2>

          {/* 아이콘 */}
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* 휠체어 사용자 */}
              <circle cx="35" cy="14" r="5" fill="#5C4033"/>
              <path d="M30 22C30 22 32 24 35 24C38 24 40 22 40 22" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/>
              <rect x="31" y="24" width="8" height="12" rx="2" fill="#4CAF50"/>
              <circle cx="28" cy="42" r="8" stroke="#5C4033" strokeWidth="3" fill="none"/>
              <circle cx="28" cy="42" r="4" fill="#5C4033"/>
              <path d="M35 30V38H42" stroke="#5C4033" strokeWidth="2" strokeLinecap="round"/>
              {/* 경사로 */}
              <path d="M8 48L24 32" stroke="#8B7355" strokeWidth="4" strokeLinecap="round"/>
              <path d="M6 50L26 30" stroke="#A0522D" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>

          {/* 설명 */}
          <p className="text-center text-muted-foreground mb-6">
            자주 가는 장소의 접근성 정보를<br />공유해주세요
          </p>

          {/* 버튼 */}
          <Button
            onClick={handleAgree}
            className="w-full h-14 text-lg font-medium bg-green-500 hover:bg-green-600 text-white rounded-xl shadow-lg"
          >
            지금 공유하기
          </Button>
        </div>

        {/* 하단 체크박스 */}
        <div className="flex items-center justify-center gap-2 py-4 border-t bg-muted/30">
          <Checkbox
            id="hideForToday"
            checked={hideForToday}
            onCheckedChange={(checked) => setHideForToday(checked === true)}
          />
          <label
            htmlFor="hideForToday"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            오늘 하루동안 이 창을 보지 않음
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPopup;
