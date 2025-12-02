import { useState, useEffect, useCallback } from "react";

interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationError {
  code: number;
  message: string;
}

interface UseGeolocationWatchReturn {
  position: LocationCoordinates | null;
  error: LocationError | null;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
}

export const useGeolocationWatch = (
  options: PositionOptions = {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  }
): UseGeolocationWatchReturn => {
  const [position, setPosition] = useState<LocationCoordinates | null>(null);
  const [error, setError] = useState<LocationError | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setPosition({
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      timestamp: pos.timestamp,
    });
    setError(null);
    console.log("📍 위치 업데이트:", {
      lat: pos.coords.latitude,
      lon: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
    });
  }, []);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let errorMessage = "위치 정보를 가져올 수 없습니다.";
    
    switch (err.code) {
      case err.PERMISSION_DENIED:
        errorMessage = "위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.";
        break;
      case err.POSITION_UNAVAILABLE:
        errorMessage = "위치 정보를 사용할 수 없습니다.";
        break;
      case err.TIMEOUT:
        errorMessage = "위치 정보 요청 시간이 초과되었습니다.";
        break;
    }

    setError({
      code: err.code,
      message: errorMessage,
    });
    console.error("❌ 위치 추적 오류:", errorMessage);
  }, []);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError({
        code: -1,
        message: "이 브라우저는 위치 정보를 지원하지 않습니다.",
      });
      return;
    }

    if (watchId !== null) {
      console.log("⚠️ 이미 위치 추적 중입니다.");
      return;
    }

    console.log("🚀 위치 추적 시작");
    const id = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );
    
    setWatchId(id);
    setIsTracking(true);
  }, [watchId, handleSuccess, handleError, options]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      console.log("🛑 위치 추적 중지");
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      setIsTracking(false);
    }
  }, [watchId]);

  // 컴포넌트 언마운트 시 자동으로 추적 중지
  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return {
    position,
    error,
    isTracking,
    startTracking,
    stopTracking,
  };
};
