import { useEffect, useRef } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface RoadViewProps {
  latitude: number;
  longitude: number;
  className?: string;
}

const RoadView = ({ latitude, longitude, className = "" }: RoadViewProps) => {
  const roadViewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roadViewRef.current) return;

    // Kakao Maps SDK가 로드될 때까지 대기
    const initRoadView = () => {
      if (window.kakao && window.kakao.maps) {
        const roadviewContainer = roadViewRef.current;
        const roadview = new window.kakao.maps.Roadview(roadviewContainer);
        const roadviewClient = new window.kakao.maps.RoadviewClient();
        const position = new window.kakao.maps.LatLng(latitude, longitude);

        roadviewClient.getNearestPanoId(position, 50, function(panoId: number) {
          if (panoId === null) {
            if (import.meta.env.DEV) console.log("로드뷰를 사용할 수 없는 위치입니다.");
          } else {
            roadview.setPanoId(panoId, position);
          }
        });
      } else {
        setTimeout(initRoadView, 100);
      }
    };

    initRoadView();
  }, [latitude, longitude]);

  return (
    <div 
      ref={roadViewRef} 
      className={`w-full h-full min-h-[400px] ${className}`}
    />
  );
};

export default RoadView;
