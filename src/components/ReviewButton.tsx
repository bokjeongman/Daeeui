import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewButtonProps {
  onClick?: () => void;
}

const ReviewButton = ({ onClick }: ReviewButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-24 right-6 h-14 px-6 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg z-50 font-semibold flex items-center gap-2"
    >
      <MessageSquarePlus className="h-5 w-5" />
      <span>제보</span>
    </Button>
  );
};

export default ReviewButton;
