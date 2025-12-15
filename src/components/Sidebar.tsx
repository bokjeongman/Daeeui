import { useState, useEffect } from "react";
import { MapPin, FileText, MessageSquare, User, LogOut, Download } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    { icon: Download, label: "앱 설치 안내", disabled: false, path: "/install" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다.");
    onOpenChange(false);
    navigate("/auth");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b">
          <div className="flex items-center justify-between gap-1">
            <SheetTitle className="flex items-center gap-1.5 flex-1 min-w-0 text-sm">
              <span className="text-base">🦽</span>
              <span className="truncate">{nickname || "휠체어 경로 안내"}</span>
            </SheetTitle>
            <div className="flex items-center shrink-0">
              {nickname && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive hover:text-destructive active:scale-95 touch-manipulation h-8 w-8 p-0"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="active:scale-95 touch-manipulation h-8 w-8 p-0"
              >
                <span className="text-base font-medium">✕</span>
              </Button>
            </div>
          </div>
        </SheetHeader>

        <div className="py-4 flex-1">
          <div className="space-y-1 px-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-muted-foreground">메뉴</h3>
            {menuItems.map((item) => (
              <Button 
                key={item.label} 
                variant="ghost" 
                className="w-full justify-start gap-3 active:scale-[0.98] touch-manipulation"
                disabled={item.disabled}
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Tech for Impact Footer */}
        <div className="p-4 border-t-2 border-primary/20 mt-auto bg-gradient-to-t from-primary/5 to-transparent">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground/70 tracking-wide">kakao</span>
              <span className="text-primary/50">|</span>
              <a 
                href="https://techforimpact.io/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm font-bold text-primary hover:text-primary/80 transition-colors tracking-wider hover:underline"
              >
                TECH FOR IMPACT
              </a>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              본 서비스는 카카오임팩트 재단의 지원과<br />
              <span className="font-medium text-foreground/60">테크포임팩트 커뮤니티</span>의 기여로 개발되었습니다.
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
