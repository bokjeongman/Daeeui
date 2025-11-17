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

    // 자동 재생 시작 시 처음부터
    setCurrentPathIndex(0);
    const startPoint = routePath[0];
    if (onPositionChange) {
      onPositionChange(startPoint.lat, startPoint.lon);
    }

    // 2초마다 다음 지점으로 이동
    const interval = 2000;
    const step = Math.max(1, Math.floor(routePath.length / 50)); // 최대 50개 지점만 표시
    let currentIndex = 0;

    autoPlayIntervalRef.current = setInterval(() => {
      currentIndex += step;
      
      if (currentIndex >= routePath.length) {
        // 경로 끝에 도달
        if (autoPlayIntervalRef.current) {
          clearInterval(autoPlayIntervalRef.current);
          autoPlayIntervalRef.current = null;
        }
        if (onAutoPlayEnd) {
          onAutoPlayEnd();
        }
        setCurrentPathIndex(0);
        return;
      }

      const nextPoint = routePath[currentIndex];
      if (onPositionChange) {
        onPositionChange(nextPoint.lat, nextPoint.lon);
      }
      setCurrentPathIndex(currentIndex);
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
