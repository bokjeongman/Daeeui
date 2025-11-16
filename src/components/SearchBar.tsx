import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import PlaceSearchResult from "./PlaceSearchResult";

interface SearchBarProps {
  placeholder?: string;
  variant?: "default" | "yellow";
  onRouteCreate?: () => void;
}

const SearchBar = ({ 
  placeholder = "장소 검색", 
  variant = "default",
  onRouteCreate
}: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // TODO: T Map POI 검색 API 연동
    if (query.trim()) {
      // 임시 더미 데이터
      setSearchResults([
        { id: 1, name: "서울역", address: "서울특별시 중구 봉래동2가", lat: 37.5547, lon: 126.9707 },
        { id: 2, name: "강남역", address: "서울특별시 강남구 역삼동", lat: 37.4979, lon: 127.0276 },
      ]);
      setShowResults(true);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  };

  const handleSelectPlace = (place: any, type: "start" | "end") => {
    console.log(`Selected ${type}:`, place);
    setShowResults(false);
    setSearchQuery("");
    
    if (type === "end" && onRouteCreate) {
      onRouteCreate();
    }
  };

  return (
    <div className={`w-full ${variant === "yellow" ? "bg-accent" : "bg-background"}`}>
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 pr-10 h-12 text-base bg-background border-border"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowResults(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {showResults && searchResults.length > 0 && (
        <PlaceSearchResult
          results={searchResults}
          onSelect={handleSelectPlace}
          onClose={() => setShowResults(false)}
        />
      )}
    </div>
  );
};

export default SearchBar;
