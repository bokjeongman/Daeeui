import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  placeholder?: string;
  variant?: "default" | "yellow";
}

const SearchBar = ({ 
  placeholder = "목적지", 
  variant = "default" 
}: SearchBarProps) => {
  return (
    <div className={`w-full ${variant === "yellow" ? "bg-accent p-4" : "p-4 bg-background"}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-10 h-12 text-base bg-background border-border"
        />
      </div>
    </div>
  );
};

export default SearchBar;
