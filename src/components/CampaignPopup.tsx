import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import wheelchairRampIcon from "@/assets/wheelchair-ramp-icon.png";

interface CampaignPopupProps {
  onAgree: () => void;
}

const CampaignPopup = ({ onAgree }: CampaignPopupProps) => {
  const [open, setOpen] = useState(false);
  const [hideForToday, setHideForToday] = useState(false);

  useEffect(() => {
    // 이번 세션에서 이미 팝업을 본 경우 표시하지 않음
    const shownThisSession = sessionStorage.getItem("campaignPopupShownThisSession");
    if (shownThisSession === "true") {
      return;
    }

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

    // 팝업 표시 및 세션에 기록
    setOpen(true);
    sessionStorage.setItem("campaignPopupShownThisSession", "true");
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

  // 체크박스 상태 변경 시 바로 팝업 닫기
  const handleHideForTodayChange = (checked: boolean) => {
    if (checked) {
      // 내일 자정까지 숨기기 설정 후 바로 닫기
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      localStorage.setItem("campaignPopupHideUntil", tomorrow.toISOString());
      setOpen(false);
    } else {
      setHideForToday(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[380px] p-0 gap-0 overflow-hidden rounded-lg border border-l-4 border-l-green-400 border-gray-200 shadow-lg bg-white">
        {/* 콘텐츠 */}
        <div className="flex flex-col items-center px-8 pt-8 pb-6">
          {/* 제목 */}
          <h2 className="text-xl font-bold text-gray-900 mb-6">접근성 정보 공유 캠페인</h2>

          {/* 아이콘 */}
          <div className="w-28 h-28 rounded-full overflow-hidden mb-6 bg-[#d4edda]">
            <img src={wheelchairRampIcon} alt="휠체어 경사로" className="w-full h-full object-cover" />
          </div>

          {/* 설명 */}
          <p className="text-center text-gray-600 mb-6 text-base leading-relaxed">
            자주 가는 장소의 접근성 정보를
            <br />
            공유해주세요
          </p>

          {/* 버튼 */}
          <Button
            onClick={handleAgree}
            className="w-full h-12 text-base font-medium bg-[#22c55e] hover:bg-[#16a34a] text-white rounded-full shadow-md"
          >
            지금 공유하기
          </Button>
        </div>

        {/* 하단 체크박스 - 클릭 시 바로 닫힘 */}
        <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-100">
          <Checkbox
            id="hideForToday"
            checked={hideForToday}
            onCheckedChange={handleHideForTodayChange}
            className="border-gray-400 data-[state=checked]:bg-gray-500 data-[state=checked]:border-gray-500 h-4 w-4"
          />
          <label 
            htmlFor="hideForToday" 
            className="text-sm text-gray-500 cursor-pointer select-none"
            onClick={() => handleHideForTodayChange(true)}
          >
            오늘 하루동안 이 창을 보지 않음
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CampaignPopup;
