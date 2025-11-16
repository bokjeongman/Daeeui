import { MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Place {
  id: number;
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface PlaceSearchResultProps {
  results: Place[];
  onSelect: (place: Place, type: "start" | "end") => void;
  onClose: () => void;
}

const PlaceSearchResult = ({ results, onSelect, onClose }: PlaceSearchResultProps) => {
  return (
    <div className="absolute top-full left-0 right-0 z-20 bg-background border-t shadow-lg max-h-96 overflow-y-auto">
      {results.map((place) => (
        <Card key={place.id} className="m-2 p-4 hover:bg-muted/50 transition-colors">
          <div className="flex items-start gap-3">
            <MapPin className="h-5 w-5 text-primary mt-1 shrink-0" />
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-base truncate">{place.name}</h3>
              <p className="text-sm text-muted-foreground truncate">{place.address}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onSelect(place, "start")}
            >
              출발
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onSelect(place, "end")}
            >
              도착
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default PlaceSearchResult;
