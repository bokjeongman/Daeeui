import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import PlaceSearchResult from "./PlaceSearchResult";

interface SearchBarProps {
  placeholder?: string;
  variant?: "default" | "yellow";
  searchMode?: "start" | "end" | null;
  onSelectStart?: (place: { lat: number; lon: number; name: string }) => void;
  onSelectEnd?: (place: { lat: number; lon: number; name: string }) => void;
  onMoveToPlace?: (place: { lat: number; lon: number; name: string }) => void;
  onClearPlace?: () => void;
}

const SearchBar = ({ 
  placeholder = "장소 검색", 
  variant = "default",
  searchMode = null,
  onSelectStart,
  onSelectEnd,
  onMoveToPlace,
  onClearPlace
}: SearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      // T Map POI 통합 검색 API
      const response = await fetch(
        `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(query)}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=10`,
        {
          headers: {
            appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`API 오류: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        setSearchResults([]);
        return;
      }

      const data = JSON.parse(text);
      
      if (data.searchPoiInfo?.pois?.poi) {
        const results = data.searchPoiInfo.pois.poi.map((poi: any, index: number) => ({
          id: index,
          name: poi.name,
          address: poi.upperAddrName + " " + poi.middleAddrName + " " + poi.lowerAddrName,
          lat: parseFloat(poi.noorLat),
          lon: parseFloat(poi.noorLon),
        }));
        setSearchResults(results);
        setShowResults(true);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("POI 검색 실패:", error);
      setSearchResults([]);
    }
  };

  const handleSelectPlace = (place: any, type: "start" | "end") => {
    const selectedPlace = {
      lat: place.lat,
      lon: place.lon,
      name: place.name
    };
    
    if (type === "start" && onSelectStart) {
      onSelectStart(selectedPlace);
    } else if (type === "end" && onSelectEnd) {
      onSelectEnd(selectedPlace);
    }
    
    setShowResults(false);
    setSearchQuery("");
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
          onClose={() => {
            setShowResults(false);
            setSearchQuery("");
            if (onClearPlace) onClearPlace();
          }}
          onMoveToPlace={onMoveToPlace}
          onClearPlace={onClearPlace}
          searchMode={searchMode}
        />
      )}
    </div>
  );
};

export default SearchBar;
