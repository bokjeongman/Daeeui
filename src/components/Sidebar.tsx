import { X, Home, MapPin, FileText, MessageSquare, Settings } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Sidebar = ({ open, onOpenChange }: SidebarProps) => {
  const menuItems = [
    { icon: Home, label: "기능", disabled: false },
    { icon: MapPin, label: "내 경로", disabled: false },
    { icon: FileText, label: "휠체어 접근성 제보", disabled: false },
    { icon: MessageSquare, label: "슬거찾기", disabled: false },
    { icon: Settings, label: "설정", disabled: false },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            🦽 휠체어 경로 안내
          </SheetTitle>
        </SheetHeader>
        
        <div className="py-4">
          <div className="space-y-1 px-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-muted-foreground">
              기능
            </h3>
            {menuItems.slice(0, 4).map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start gap-3"
                disabled={item.disabled}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Button>
            ))}
          </div>
          
          <div className="mt-6 space-y-1 px-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-muted-foreground">
              범례
            </h3>
            <div className="space-y-2 px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-primary" />
                <span className="text-sm">안심 구간</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-secondary" />
                <span className="text-sm">경고 구간</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-destructive" />
                <span className="text-sm">위험 구간</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Sidebar;
