import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ReviewButtonProps {
  onClick?: () => void;
}

const ReviewButton = ({ onClick }: ReviewButtonProps) => {
  return (
    <Button
      onClick={onClick}
      className="fixed bottom-24 right-6 h-14 w-14 rounded-full bg-secondary hover:bg-secondary/90 shadow-lg z-50"
      size="icon"
    >
      <Plus className="h-6 w-6" />
    </Button>
  );
};

export default ReviewButton;
