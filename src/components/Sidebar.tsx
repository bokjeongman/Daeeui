import { MapPin, FileText, MessageSquare } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const Sidebar = ({ open, onOpenChange }: SidebarProps) => {
  const menuItems = [
    { icon: MapPin, label: "내 경로", disabled: false },
    { icon: FileText, label: "휠체어 접근성 제보", disabled: false, highlight: true },
    { icon: MessageSquare, label: "즐겨찾기", disabled: false },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">🦽 휠체어 경로 안내</SheetTitle>
        </SheetHeader>

        <div className="py-4">
          <div className="space-y-1 px-3">
            <h3 className="px-3 py-2 text-sm font-semibold text-muted-foreground">메뉴</h3>
            {menuItems.map((item) => (
              <Button 
                key={item.label} 
                variant={item.highlight ? "default" : "ghost"} 
                className={`w-full justify-start gap-3 ${item.highlight ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                disabled={item.disabled}
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
