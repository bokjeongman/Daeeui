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
      className={`fixed h-12 md:h-14 px-5 md:px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-50 font-semibold flex items-center gap-2 touch-target ${
        isMobile 
          ? 'bottom-6 left-4' 
          : 'bottom-6 left-6'
      }`}
    >
      <MessageSquarePlus className="h-5 w-5" />
      <span className="text-sm md:text-base">제보</span>
    </Button>
  );
};

export default ReviewButton;
