import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SaveRouteButtonProps {
  startPoint: { lat: number; lon: number; name: string };
  endPoint: { lat: number; lon: number; name: string };
  distance: number;
  duration: number;
}

const SaveRouteButton = ({ startPoint, endPoint, distance, duration }: SaveRouteButtonProps) => {
  const handleSaveRoute = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("경로를 저장하려면 로그인이 필요합니다.");
        return;
      }

      const { error } = await supabase
        .from("route_history")
        .insert({
          user_id: user.id,
          start_name: startPoint.name,
          start_lat: startPoint.lat,
          start_lon: startPoint.lon,
          end_name: endPoint.name,
          end_lat: endPoint.lat,
          end_lon: endPoint.lon,
          distance,
          duration,
        });

      if (error) throw error;

      toast.success("경로가 저장되었습니다!");
    } catch (error) {
      if (import.meta.env.DEV) console.error("경로 저장 실패:", error);
      toast.error("경로 저장에 실패했습니다.");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSaveRoute}
      className="gap-2"
    >
      <Bookmark className="h-4 w-4" />
      경로 저장
    </Button>
  );
};

export default SaveRouteButton;
