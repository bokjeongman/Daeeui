import { useState, useEffect } from "react";
import { MapPin, FileText, MessageSquare, User, Star } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Sidebar = ({ open, onOpenChange }: SidebarProps) => {
  const navigate = useNavigate();
  const [nickname, setNickname] = useState<string | null>(null);

  useEffect(() => {
    const fetchNickname = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", session.user.id)
          .single();
        setNickname(data?.nickname || null);
      }
    };
    if (open) fetchNickname();
  }, [open]);

  const menuItems = [
    { icon: MapPin, label: "내 경로", disabled: false, path: "/my-routes" },
    { icon: MessageSquare, label: "즐겨찾기", disabled: false, path: "/favorites" },
    { icon: FileText, label: "내 후기", disabled: false, path: "/my-reviews" },
    { icon: User, label: "내 프로필", disabled: false, path: "/profile" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">🦽 {nickname || "휠체어 경로 안내"}</SheetTitle>
        </SheetHeader>

        <div className="py-4">
          <div className="space-y-1 px-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-muted-foreground">메뉴</h3>
            {menuItems.map((item) => (
              <Button 
                key={item.label} 
                variant="ghost" 
                className="w-full justify-start gap-3"
                disabled={item.disabled}
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
