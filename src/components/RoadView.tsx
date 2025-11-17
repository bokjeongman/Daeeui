import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    kakao: any;
  }
}

interface RoadViewProps {
  latitude: number;
  longitude: number;
  routePath?: Array<{ lat: number; lon: number }> | null;
  autoPlay?: boolean;
  onPositionChange?: (lat: number, lon: number) => void;
  onAutoPlayEnd?: () => void;
  className?: string;
}

const RoadView = ({ 
  latitude, 
  longitude, 
  routePath,
  autoPlay = false,
  onPositionChange,
  onAutoPlayEnd,
  className = "" 
}: RoadViewProps) => {
  const roadViewRef = useRef<HTMLDivElement>(null);
  const roadviewInstanceRef = useRef<any>(null);
  const roadviewClientRef = useRef<any>(null);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);

  // 로드뷰 초기화
  useEffect(() => {
    if (!roadViewRef.current) return;

    const initRoadView = () => {
      if (window.kakao && window.kakao.maps) {
        const roadviewContainer = roadViewRef.current;
        const roadview = new window.kakao.maps.Roadview(roadviewContainer);
        const roadviewClient = new window.kakao.maps.RoadviewClient();
        
        roadviewInstanceRef.current = roadview;
        roadviewClientRef.current = roadviewClient;

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

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, []);

  // 위치가 변경될 때 로드뷰 업데이트
  useEffect(() => {
    if (!roadviewInstanceRef.current || !roadviewClientRef.current) return;

    const position = new window.kakao.maps.LatLng(latitude, longitude);
    roadviewClientRef.current.getNearestPanoId(position, 50, function(panoId: number) {
      if (panoId !== null) {
        roadviewInstanceRef.current.setPanoId(panoId, position);
      }
    });
  }, [latitude, longitude]);

  // 경로 자동 재생
  useEffect(() => {
    // 기존 interval 정리
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }

    if (!autoPlay || !routePath || routePath.length === 0) {
      setCurrentPathIndex(0);
      return;
    }

    // 경로의 시작점으로 이동
    if (currentPathIndex === 0 && routePath.length > 0) {
      const startPoint = routePath[0];
      if (onPositionChange) {
        onPositionChange(startPoint.lat, startPoint.lon);
      }
    }

    // 2초마다 다음 지점으로 이동 (경로 간격에 따라 조정)
    const interval = 2000;
    const step = Math.max(1, Math.floor(routePath.length / 50)); // 최대 50개 지점만 표시

    autoPlayIntervalRef.current = setInterval(() => {
      setCurrentPathIndex((prevIndex) => {
        const nextIndex = prevIndex + step;
        
        if (nextIndex >= routePath.length) {
          // 경로 끝에 도달
          if (autoPlayIntervalRef.current) {
            clearInterval(autoPlayIntervalRef.current);
            autoPlayIntervalRef.current = null;
          }
          if (onAutoPlayEnd) {
            onAutoPlayEnd();
          }
          return 0;
        }

        const nextPoint = routePath[nextIndex];
        if (onPositionChange) {
          onPositionChange(nextPoint.lat, nextPoint.lon);
        }

        return nextIndex;
      });
    }, interval);

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
    };
  }, [autoPlay, routePath, onPositionChange, onAutoPlayEnd]);

  return (
    <div 
      ref={roadViewRef} 
      className={`w-full h-full min-h-[400px] ${className}`}
    />
  );
};

export default RoadView;
