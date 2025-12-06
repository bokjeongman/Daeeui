import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface ReviewButtonProps {
  onClick?: () => void;
}

const ReviewButton = ({ onClick }: ReviewButtonProps) => {
  const isMobile = useIsMobile();
  
  return (
    <Button
      onClick={onClick}
      className={`fixed h-11 sm:h-12 md:h-14 px-4 sm:px-5 md:px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl z-50 font-semibold flex items-center gap-2 touch-target active:scale-95 transition-transform ${
        isMobile 
          ? 'bottom-20 left-3' 
          : 'bottom-6 left-6'
      }`}
    >
      <MessageSquarePlus className="h-5 w-5" />
      <span className="text-sm md:text-base whitespace-nowrap">제보</span>
    </Button>
  );
};

export default ReviewButton;
