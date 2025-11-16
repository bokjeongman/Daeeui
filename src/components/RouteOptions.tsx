import { Bus, Car, Footprints, Clock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface RouteOption {
  type: "transit" | "walk" | "car";
  distance: number;
  duration: number;
  safePercentage: number;
  warningPercentage: number;
  dangerPercentage?: number;
}

interface RouteOptionsProps {
  options: RouteOption[];
  selectedType: "transit" | "walk" | "car" | null;
  onSelectRoute: (type: "transit" | "walk" | "car") => void;
}

const RouteOptions = ({ options, selectedType, onSelectRoute }: RouteOptionsProps) => {
  const getIcon = (type: RouteOption["type"]) => {
    switch (type) {
      case "transit":
        return <Bus className="h-5 w-5" />;
      case "walk":
        return <Footprints className="h-5 w-5" />;
      case "car":
        return <Car className="h-5 w-5" />;
    }
  };

  const getLabel = (type: RouteOption["type"]) => {
    switch (type) {
      case "transit":
        return "대중교통";
      case "walk":
        return "도보";
      case "car":
        return "자동차";
    }
  };

  const getColor = (type: RouteOption["type"]) => {
    switch (type) {
      case "transit":
        return "bg-blue-500";
      case "walk":
        return "bg-green-500";
      case "car":
        return "bg-purple-500";
    }
  };

  return (
    <div className="space-y-3 p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-3">경로 옵션</h3>
      {options.map((option) => (
        <Card
          key={option.type}
          className={`p-4 cursor-pointer transition-all hover:shadow-md ${
            selectedType === option.type
              ? "ring-2 ring-primary bg-accent/50"
              : "hover:bg-accent/20"
          }`}
          onClick={() => onSelectRoute(option.type)}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${getColor(option.type)} text-white`}>
                {getIcon(option.type)}
              </div>
              <span className="font-semibold">{getLabel(option.type)}</span>
            </div>
            <Badge variant={selectedType === option.type ? "default" : "outline"}>
              추천
            </Badge>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="font-medium">{(option.distance / 1000).toFixed(1)}km</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="font-medium">{Math.ceil(option.duration / 60)}분</span>
            </div>
          </div>

          <div className="mt-3 flex gap-2">
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">{option.safePercentage}%</span>
            </div>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span className="text-muted-foreground">{option.warningPercentage}%</span>
            </div>
            {option.dangerPercentage > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-muted-foreground">{option.dangerPercentage}%</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};

export default RouteOptions;
