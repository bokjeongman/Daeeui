import { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2, AlertCircle, Navigation, Filter, Star, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import RoadView from "./RoadView";
import { useGeolocationWatch } from "@/hooks/useGeolocationWatch";
import { useMarkerCluster, BarrierPoint, ClusterFeature } from "@/hooks/useMarkerCluster";

// T Map 타입 선언
declare global {
  interface Window {
    Tmapv2: any;
  }
}

// MapView component for route planning and navigation
interface MapViewProps {
  startPoint?: {
    lat: number;
    lon: number;
    name: string;
  } | null;
  endPoint?: {
    lat: number;
    lon: number;
    name: string;
  } | null;
  selectedRouteType?: "transit" | "walk" | "car" | null;
  onBarrierClick?: (barrier: any) => void;
  onPlaceClick?: (place: { name: string; lat: number; lon: number }) => void;
  onRoutesCalculated?: (
    routes: Array<{
      type: "transit" | "walk" | "car";
      distance: number;
      duration: number;
      safePercentage: number;
      warningPercentage: number;
      dangerPercentage: number;
      barriers: {
        type: string;
        severity: string;
        name: string;
      }[];
      transitInfo?: {
        legs: Array<{
          mode: string;
          route: string;
          from: string;
          to: string;
          distance: number;
          time: number;
        }>;
        transfers: number;
      };
    }>,
  ) => void;
  className?: string;
  center?: {
    lat: number;
    lon: number;
  } | null;
  onUserLocationChange?: (location: { lat: number; lon: number }) => void;
  clearKey?: number;
  selectedSearchPlace?: {
    lat: number;
    lon: number;
    name: string;
  } | null;
  hideFilterButton?: boolean;
}
const MapView = ({
  startPoint,
  endPoint,
  selectedRouteType,
  onRoutesCalculated,
  onBarrierClick,
  onPlaceClick,
  className,
  center,
  onUserLocationChange,
  clearKey,
  selectedSearchPlace,
  hideFilterButton = false,
  isRouteSelecting = false,
}: MapViewProps & { isRouteSelecting?: boolean }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [barrierData, setBarrierData] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [filter, setFilter] = useState({
    safe: true,
    warning: true,
    danger: true,
  });
  const [showFilter, setShowFilter] = useState(false);
  const [previousDuration, setPreviousDuration] = useState<number | null>(null);
  const [routeUpdateTrigger, setRouteUpdateTrigger] = useState(0);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentMarkerRef = useRef<any>(null);
  const accuracyCircleRef = useRef<any>(null);
  const watchIdRef = useRef<number | null>(null);
  const routeLayerRef = useRef<any[]>([]);
  const markersRef = useRef<any[]>([]);
  const barrierMarkersRef = useRef<any[]>([]);
  const favoriteMarkersRef = useRef<any[]>([]);
  const arrowMarkersRef = useRef<any[]>([]);
  const searchPlaceMarkerRef = useRef<any>(null);
  const [transitDetails, setTransitDetails] = useState<any>(null);
  const hasInitializedPositionRef = useRef(false);
  const [isMobile] = useState(() =>
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  );
  const [pathHistory, setPathHistory] = useState<Array<{ lat: number; lon: number }>>([]);
  const pathHistoryPolylineRef = useRef<any>(null);
  
  // 클러스터링을 위한 상태
  const [mapZoom, setMapZoom] = useState(16);
  const [mapBounds, setMapBounds] = useState<{ west: number; south: number; east: number; north: number } | null>(null);
  const clusterMarkersRef = useRef<any[]>([]);

  // useGeolocationWatch 훅 사용
  const { 
    position: geoPosition, 
    error: geoError, 
    isTracking, 
    startTracking, 
    stopTracking 
  } = useGeolocationWatch();

  // 실시간 위치 추적 시작 (버튼 클릭 시 호출)
  const getCurrentLocation = () => {
    if (!isTracking) {
      startTracking();
      // 나침반 추적 시작 (모바일만)
      if (isMobile) {
        startCompassTracking();
      }
    }
    
    // 현재 위치로 지도 중심 이동
    if (map && window.Tmapv2 && userLocation) {
      hasInitializedPositionRef.current = false;
      const centerPos = new window.Tmapv2.LatLng(userLocation.lat, userLocation.lon);
      map.setCenter(centerPos);
      map.setZoom(16);
    }
  };

  // 나침반 추적 시작 (iOS 권한 요청 포함)
  const startCompassTracking = async () => {
    if (!isMobile) return;

    // iOS 13+ DeviceOrientationEvent 권한 요청
    if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === "granted") {
          window.addEventListener("deviceorientationabsolute", handleOrientation, true);
          window.addEventListener("deviceorientation", handleOrientation, true);
        }
      } catch (error) {
        console.log("나침반 권한 요청 실패:", error);
      }
    } else {
      // 권한 요청이 필요 없는 경우 (Android 등)
      window.addEventListener("deviceorientationabsolute", handleOrientation, true);
      window.addEventListener("deviceorientation", handleOrientation, true);
    }
  };

  const handleOrientation = (event: DeviceOrientationEvent) => {
    if (event.alpha !== null) {
      // alpha는 0-360도 값, 북쪽이 0도
      setHeading(360 - event.alpha);
    } else if ((event as any).webkitCompassHeading !== undefined) {
      // iOS Safari용
      setHeading((event as any).webkitCompassHeading);
    }
  };

  // useGeolocationWatch의 위치 정보를 userLocation에 동기화
  useEffect(() => {
    if (geoPosition) {
      const location = { lat: geoPosition.latitude, lon: geoPosition.longitude };
      setUserLocation(location);
      
      // 위치 변경 콜백 호출
      if (onUserLocationChange) {
        onUserLocationChange(location);
      }

      // 경로 히스토리에 추가 (10m 이상 이동했을 때만)
      setPathHistory((prev) => {
        if (prev.length === 0) {
          return [location];
        }
        const lastPoint = prev[prev.length - 1];
        const distance = calculateDistance(lastPoint.lat, lastPoint.lon, location.lat, location.lon);
        
        // 10m 이상 이동했을 때만 기록
        if (distance > 10) {
          return [...prev, location];
        }
        return prev;
      });

      setLoading(false);
    }
  }, [geoPosition, onUserLocationChange]);

  // useGeolocationWatch의 에러 처리
  useEffect(() => {
    if (geoError) {
      setError(geoError.message);
      toast.error(geoError.message);
      setLoading(false);
    }
  }, [geoError]);

  // 컴포넌트 마운트 시 자동 추적 시작
  useEffect(() => {
    if (!isTracking) {
      startTracking();
      // 나침반 추적 시작 (모바일만)
      if (isMobile) {
        startCompassTracking();
      }
    }
  }, []);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      stopTracking();
      window.removeEventListener("deviceorientationabsolute", handleOrientation, true);
      window.removeEventListener("deviceorientation", handleOrientation, true);
    };
  }, []);

  // 제보된 배리어 데이터 가져오기 (모든 제보 표시 - 페이지네이션으로 1000개 제한 해제)
  useEffect(() => {
    const fetchApprovedReports = async () => {
      try {
        // Supabase 기본 1000개 제한 우회를 위한 페이지네이션
        let allData: any[] = [];
        let from = 0;
        const pageSize = 1000;
        let hasMore = true;

        while (hasMore) {
          const { data, error } = await supabase
            .from("accessibility_reports")
            .select("*")
            .range(from, from + pageSize - 1);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            allData = [...allData, ...data];
            from += pageSize;
            hasMore = data.length === pageSize;
          } else {
            hasMore = false;
          }
        }

        console.log("🔍 가져온 제보 데이터:", allData.length, "개");

        // 제보 데이터를 barrierData 형식으로 변환
        const rawBarriers = allData.map((report) => {
          let severity = "safe";
          if (report.accessibility_level === "verified") {
            severity = "verified";
          } else if (report.accessibility_level === "difficult") {
            severity = "danger";
          } else if (report.accessibility_level === "moderate") {
            severity = "warning";
          }
          return {
            id: report.id,
            lat: Number(report.latitude),
            lon: Number(report.longitude),
            latitude: Number(report.latitude),
            longitude: Number(report.longitude),
            type: report.category,
            severity: severity,
            name: report.location_name,
            details: report.details,
            photo_urls: report.photo_urls || [],
            created_at: report.created_at,
            accessibility_level: report.accessibility_level,
            user_id: report.user_id,
          };
        });

        // 같은 위치의 제보들을 그룹화 (위도/경도 소수점 5자리까지 동일하면 같은 장소로 취급)
        const locationMap = new Map<string, any[]>();
        rawBarriers.forEach((barrier) => {
          const locationKey = `${barrier.lat.toFixed(5)},${barrier.lon.toFixed(5)}`;
          if (!locationMap.has(locationKey)) {
            locationMap.set(locationKey, []);
          }
          locationMap.get(locationKey)!.push(barrier);
        });

        // 그룹화된 데이터를 대표 마커로 변환 (가장 위험한 등급 우선)
        const severityPriority: Record<string, number> = {
          danger: 4,
          warning: 3,
          safe: 2,
          verified: 1,
        };

        const groupedBarriers = Array.from(locationMap.values()).map((reports) => {
          // 가장 위험한 등급 찾기
          reports.sort((a, b) => 
            (severityPriority[b.severity] || 0) - (severityPriority[a.severity] || 0)
          );
          
          const representative = reports[0];
          
          return {
            ...representative,
            reports: reports, // 모든 제보 포함
            reportCount: reports.length,
          };
        });

        setBarrierData(groupedBarriers);
      } catch (error) {
        if (import.meta.env.DEV) console.error("제보 데이터 로딩 실패:", error);
      }
    };
    fetchApprovedReports();

    // 실시간 변경 사항 구독 (모든 제보 포함)
    const channel = supabase
      .channel("accessibility_reports_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "accessibility_reports",
        },
        (payload) => {
          console.log("배리어 데이터 변경 감지:", payload);
          fetchApprovedReports();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 즐겨찾기 데이터 가져오기
  useEffect(() => {
    const fetchFavorites = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      try {
        const { data, error } = await supabase.from("favorites").select("*").eq("user_id", session.user.id);
        if (error) throw error;
        setFavorites(data || []);
      } catch (error) {
        if (import.meta.env.DEV) console.error("즐겨찾기 데이터 로딩 실패:", error);
      }
    };
    fetchFavorites();

    // 실시간 업데이트 구독
    const channel = supabase
      .channel("favorites_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "favorites",
        },
        () => {
          fetchFavorites();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // 이전 bounds/zoom 값을 저장하는 ref
  const prevBoundsRef = useRef<string>("");
  const prevZoomRef = useRef<number>(16);

  // 지도 bounds/zoom 업데이트 함수 (무한 루프 방지)
  const updateMapBoundsAndZoom = useCallback((mapInstance: any) => {
    if (!mapInstance || !window.Tmapv2) return;
    
    try {
      const bounds = mapInstance.getBounds();
      const zoom = mapInstance.getZoom();
      
      if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();
        const newBounds = {
          west: sw.lng(),
          south: sw.lat(),
          east: ne.lng(),
          north: ne.lat(),
        };
        
        // 변경 여부 확인 (문자열 비교로 성능 최적화)
        const boundsKey = `${newBounds.west.toFixed(4)},${newBounds.south.toFixed(4)},${newBounds.east.toFixed(4)},${newBounds.north.toFixed(4)}`;
        
        if (boundsKey !== prevBoundsRef.current) {
          prevBoundsRef.current = boundsKey;
          setMapBounds(newBounds);
        }
      }
      
      if (zoom !== prevZoomRef.current) {
        prevZoomRef.current = zoom;
        setMapZoom(zoom);
      }
    } catch (error) {
      if (import.meta.env.DEV) console.error("Bounds 업데이트 실패:", error);
    }
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !window.Tmapv2) {
      return;
    }
    try {
      // 새 맵 생성 전 기존 마커 refs 정리
      if (currentMarkerRef.current) {
        try {
          currentMarkerRef.current.setMap(null);
        } catch (e) {}
        currentMarkerRef.current = null;
      }
      if (accuracyCircleRef.current) {
        try {
          accuracyCircleRef.current.setMap(null);
        } catch (e) {}
        accuracyCircleRef.current = null;
      }
      if (searchPlaceMarkerRef.current) {
        try {
          searchPlaceMarkerRef.current.setMap(null);
        } catch (e) {}
        searchPlaceMarkerRef.current = null;
      }

      const tmapInstance = new window.Tmapv2.Map(mapRef.current, {
        center: new window.Tmapv2.LatLng(37.5665, 126.978),
        // 서울시청 기본 위치
        width: "100%",
        height: "100%",
        zoom: 16,
      });

      // 지도 드래그 시 자동 중심 이동 비활성화
      tmapInstance.addListener("dragstart", () => {
        hasInitializedPositionRef.current = true;
      });

      // 클러스터링을 위한 이벤트 리스너 (debounce 적용 - 300ms로 증가)
      let updateTimeout: NodeJS.Timeout | null = null;
      const debouncedUpdate = () => {
        if (updateTimeout) clearTimeout(updateTimeout);
        updateTimeout = setTimeout(() => {
          updateMapBoundsAndZoom(tmapInstance);
        }, 300);
      };
      
      tmapInstance.addListener("zoom_changed", debouncedUpdate);
      tmapInstance.addListener("dragend", debouncedUpdate);

      setMap(tmapInstance);
      setLoading(false);
      
      // 초기 bounds 설정
      setTimeout(() => {
        updateMapBoundsAndZoom(tmapInstance);
      }, 100);

      // 지도 클릭 이벤트 - POI 검색
      tmapInstance.addListener("click", async (evt: any) => {
        const lat = evt.latLng.lat();
        const lon = evt.latLng.lng();

        // POI 검색 (장소 후기용)
        if (!onPlaceClick) return;
        try {
          // 클릭한 위치 주변의 POI 검색
          const response = await fetch(
            `https://apis.openapi.sk.com/tmap/pois/search/around?version=1&centerLon=${lon}&centerLat=${lat}&radius=50&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=1`,
            {
              headers: {
                appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
              },
            },
          );
          if (!response.ok) return;
          const text = await response.text();
          if (!text) return;
          const data = JSON.parse(text);
          if (data.searchPoiInfo?.pois?.poi && data.searchPoiInfo.pois.poi.length > 0) {
            const poi = data.searchPoiInfo.pois.poi[0];
            onPlaceClick({
              name: poi.name,
              lat: parseFloat(poi.noorLat),
              lon: parseFloat(poi.noorLon),
            });
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error("POI 검색 실패:", error);
        }
      });
    } catch (err) {
      if (import.meta.env.DEV) console.error("지도 초기화 실패:", err);
      setError("지도를 불러오는데 실패했습니다.");
      setLoading(false);
    }
  }, [updateMapBoundsAndZoom]);

  // 제보 모달에서 장소 선택 시 지도 중심 이동
  useEffect(() => {
    if (!map || !center) return;

    const targetPosition = new window.Tmapv2.LatLng(center.lat, center.lon);
    map.setCenter(targetPosition);
    map.setZoom(17);
  }, [map, center]);

  // 검색된 장소에 파란색 핀 표시
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 기존 검색 장소 마커 제거
    if (searchPlaceMarkerRef.current) {
      searchPlaceMarkerRef.current.setMap(null);
      searchPlaceMarkerRef.current = null;
    }

    // selectedSearchPlace가 없으면 종료
    if (!selectedSearchPlace) return;

    try {
      const position = new window.Tmapv2.LatLng(selectedSearchPlace.lat, selectedSearchPlace.lon);

      // 파란색 핀 SVG 생성
      const bluePinIcon = `
        <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="pin-shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <!-- 핀 본체 -->
          <path d="M20 2 C11 2 4 9 4 18 C4 28 20 46 20 46 C20 46 36 28 36 18 C36 9 29 2 20 2 Z" 
                fill="#3b82f6" stroke="white" stroke-width="2" filter="url(#pin-shadow)"/>
          <!-- 내부 원 -->
          <circle cx="20" cy="18" r="6" fill="white"/>
        </svg>
      `;

      const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bluePinIcon)}`;

      const marker = new window.Tmapv2.Marker({
        position: position,
        map: map,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(40, 50),
        title: selectedSearchPlace.name,
        zIndex: 999,
      });

      searchPlaceMarkerRef.current = marker;

      // 지도 중심을 검색 장소로 이동
      map.setCenter(position);
      map.setZoom(17);
    } catch (error) {
      if (import.meta.env.DEV) console.error("검색 장소 마커 생성 실패:", error);
    }
  }, [map, selectedSearchPlace]);

  // 사용자 위치가 변경되면 현재 위치 마커 표시 (위치만 업데이트, 마커 재생성 방지)
  useEffect(() => {
    if (!map || !userLocation || !window.Tmapv2) return;
    const { lat, lon } = userLocation;
    const position = new window.Tmapv2.LatLng(lat, lon);

    // 기존 마커가 있고 맵에 연결되어 있으면 위치만 업데이트
    if (currentMarkerRef.current) {
      try {
        // 마커가 유효한 맵에 연결되어 있는지 확인
        const markerMap = currentMarkerRef.current.getMap();
        if (markerMap && markerMap === map) {
          currentMarkerRef.current.setPosition(position);
          return;
        } else {
          // 마커가 다른 맵에 연결되어 있거나 맵이 없으면 제거
          currentMarkerRef.current.setMap(null);
          currentMarkerRef.current = null;
        }
      } catch (e) {
        // 마커 상태 확인 실패 시 마커 재생성
        currentMarkerRef.current = null;
      }
    }

    // 기존 정확도 원 제거
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setMap(null);
    }

    // 최초 1회만 마커 생성
    let svgIcon;
    if (isMobile) {
      const rotation = heading !== null ? heading : 0;
      svgIcon = `
        <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow-mobile" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.5"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="28" cy="28" r="24" fill="#3b82f6" fill-opacity="0.2" filter="url(#shadow-mobile)"/>
          <circle cx="28" cy="28" r="18" fill="white" stroke="#3b82f6" stroke-width="3"/>
          <circle cx="28" cy="28" r="14" fill="#3b82f6"/>
          <g transform="rotate(${rotation} 28 28)">
            <path d="M28 14 L32 28 L28 26 L24 28 Z" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
          </g>
        </svg>
      `;
    } else {
      svgIcon = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.4"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <circle cx="20" cy="20" r="16" fill="white" filter="url(#shadow)" stroke="#3b82f6" stroke-width="2"/>
          <circle cx="20" cy="20" r="12" fill="#3b82f6"/>
        </svg>
      `;
    }

    const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcon)}`;
    const markerSize = isMobile ? 56 : 40;

    const marker = new window.Tmapv2.Marker({
      position: position,
      map: map,
      icon: iconUrl,
      iconSize: new window.Tmapv2.Size(markerSize, markerSize),
      title: "현재 위치",
      zIndex: 1000,
    });
    currentMarkerRef.current = marker;

    // 데스크톱에서만 최초 1회 자동 중심 이동
    if (!isMobile && !startPoint && !endPoint && !hasInitializedPositionRef.current) {
      map.setCenter(position);
      map.setZoom(16);
      hasInitializedPositionRef.current = true;
    }
  }, [map, userLocation, isMobile]);

  // 모바일 나침반 방향 업데이트 (마커 재생성 없이 아이콘만 변경)
  useEffect(() => {
    if (!isMobile || !currentMarkerRef.current || heading === null) return;
    
    const svgIcon = `
      <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-mobile" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        <circle cx="28" cy="28" r="24" fill="#3b82f6" fill-opacity="0.2" filter="url(#shadow-mobile)"/>
        <circle cx="28" cy="28" r="18" fill="white" stroke="#3b82f6" stroke-width="3"/>
        <circle cx="28" cy="28" r="14" fill="#3b82f6"/>
        <g transform="rotate(${heading} 28 28)">
          <path d="M28 14 L32 28 L28 26 L24 28 Z" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        </g>
      </svg>
    `;
    const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgIcon)}`;
    currentMarkerRef.current.setIcon(iconUrl);
  }, [heading, isMobile]);

  // 실시간 이동 경로 표시 (노란색)
  useEffect(() => {
    if (!map || !window.Tmapv2 || pathHistory.length < 2) return;

    // 기존 경로 히스토리 폴리라인 제거
    if (pathHistoryPolylineRef.current) {
      pathHistoryPolylineRef.current.setMap(null);
    }

    // 경로 히스토리를 Tmap LatLng 배열로 변환
    const pathPoints = pathHistory.map(
      (point) => new window.Tmapv2.LatLng(point.lat, point.lon)
    );

    // 노란색 폴리라인으로 지나간 경로 표시
    const polyline = new window.Tmapv2.Polyline({
      path: pathPoints,
      strokeColor: "#fbbf24", // 노란색
      strokeWeight: 5,
      strokeOpacity: 0.8,
      map: map,
      zIndex: 45, // 경로보다 낮게, 배리어보다는 높게
    });

    pathHistoryPolylineRef.current = polyline;
  }, [map, pathHistory]);

  // 클러스터 훅 사용
  const { clusters, getClusterExpansionZoom } = useMarkerCluster(
    barrierData as BarrierPoint[],
    mapBounds,
    mapZoom,
    filter
  );

  // 클러스터 마커용 SVG 생성 함수 (접근성 레벨별 색상)
  const getClusterIcon = useCallback((count: number, dominantSeverity?: string, severityCounts?: { safe: number; warning: number; danger: number; verified: number }) => {
    // 클러스터 크기에 따른 기본 크기
    let size = 48;
    if (count >= 100) {
      size = 64;
    } else if (count >= 30) {
      size = 56;
    } else if (count >= 10) {
      size = 52;
    }

    // 접근성 레벨에 따른 색상
    let color = "#22c55e"; // 기본: 안전 (초록)
    let borderColor = "#16a34a";
    
    if (dominantSeverity === "danger") {
      color = "#ef4444"; // 위험 (빨강)
      borderColor = "#dc2626";
    } else if (dominantSeverity === "warning") {
      color = "#f59e0b"; // 보통 (노랑/주황)
      borderColor = "#d97706";
    } else if (dominantSeverity === "verified") {
      color = "#3b82f6"; // 인증 (파랑)
      borderColor = "#2563eb";
    }

    const fontSize = count >= 100 ? 16 : count >= 10 ? 14 : 13;
    const uniqueId = `cluster-${count}-${Date.now()}`;

    // 접근성 비율 표시를 위한 도넛 차트
    let chartSegments = "";
    if (severityCounts) {
      const total = severityCounts.safe + severityCounts.warning + severityCounts.danger + severityCounts.verified;
      if (total > 0) {
        const outerRadius = size / 2 - 3;
        const innerRadius = size / 2 - 10;
        const cx = size / 2;
        const cy = size / 2;
        let startAngle = -90;
        
        const segments = [
          { count: severityCounts.danger, color: "#ef4444" },
          { count: severityCounts.warning, color: "#f59e0b" },
          { count: severityCounts.verified, color: "#3b82f6" },
          { count: severityCounts.safe, color: "#22c55e" },
        ];
        
        segments.forEach(seg => {
          if (seg.count > 0) {
            const angle = (seg.count / total) * 360;
            const endAngle = startAngle + angle;
            
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;
            
            const x1Outer = cx + outerRadius * Math.cos(startRad);
            const y1Outer = cy + outerRadius * Math.sin(startRad);
            const x2Outer = cx + outerRadius * Math.cos(endRad);
            const y2Outer = cy + outerRadius * Math.sin(endRad);
            const x1Inner = cx + innerRadius * Math.cos(startRad);
            const y1Inner = cy + innerRadius * Math.sin(startRad);
            const x2Inner = cx + innerRadius * Math.cos(endRad);
            const y2Inner = cy + innerRadius * Math.sin(endRad);
            
            const largeArc = angle > 180 ? 1 : 0;
            
            chartSegments += `<path d="M${x1Outer},${y1Outer} A${outerRadius},${outerRadius} 0 ${largeArc},1 ${x2Outer},${y2Outer} L${x2Inner},${y2Inner} A${innerRadius},${innerRadius} 0 ${largeArc},0 ${x1Inner},${y1Inner} Z" fill="${seg.color}"/>`;
            startAngle = endAngle;
          }
        });
      }
    }

    return `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="cluster-shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.35"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="cluster-grad-${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${color}"/>
            <stop offset="100%" style="stop-color:${borderColor}"/>
          </linearGradient>
        </defs>
        <!-- 외곽 원 -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 3}" fill="url(#cluster-grad-${uniqueId})" stroke="white" stroke-width="3" filter="url(#cluster-shadow-${uniqueId})"/>
        <!-- 도넛 차트 세그먼트 -->
        ${chartSegments}
        <!-- 중앙 흰색 원 -->
        <circle cx="${size/2}" cy="${size/2}" r="${size/3}" fill="white"/>
        <!-- 숫자 -->
        <text x="${size/2}" y="${size/2 + fontSize/3}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" fill="${color}" text-anchor="middle">${count}</text>
      </svg>
    `;
  }, []);

  // 카테고리별 SVG 픽토그램 생성 함수 (reportCount로 +N 뱃지 추가)
  const getCategoryIcon = useCallback((category: string, severity: string, uniqueId: string, reportCount?: number) => {
    // SVG ID에 사용할 수 있도록 uniqueId 정리 (특수문자 제거)
    const safeId = uniqueId.replace(/[^a-zA-Z0-9]/g, '_');
    
    // 기본 초록색 - 모든 공공데이터는 초록색 (safe 포함 모든 경우)
    let fillColor = "#22c55e";
    let borderColor = "#16a34a";
    
    // severity에 따른 색상 (verified, warning, danger만 다른 색상, 나머지는 전부 초록색)
    if (severity === "verified") {
      fillColor = "#3b82f6";
      borderColor = "#2563eb";
    } else if (severity === "warning") {
      fillColor = "#f59e0b";
      borderColor = "#d97706";
    } else if (severity === "danger") {
      fillColor = "#ef4444";
      borderColor = "#dc2626";
    }
    // else: safe, 빈값, 기타 모든 경우 → 초록색 유지

    // 추가 제보 뱃지 (+N)
    const extraCount = (reportCount || 1) - 1;
    const badgeSvg = extraCount > 0 ? `
      <circle cx="34" cy="8" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
      <text x="34" y="12" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="white" text-anchor="middle">+${extraCount > 9 ? '9+' : extraCount}</text>
    ` : '';

    const viewBox = extraCount > 0 ? "0 0 48 48" : "0 0 40 40";
    const width = extraCount > 0 ? 52 : 44;
    const height = extraCount > 0 ? 52 : 44;
    const cx = extraCount > 0 ? 20 : 20;
    const cy = extraCount > 0 ? 24 : 20;

    // 인증된 장소 - 체크 마크
    if (severity === "verified") {
      return `
        <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="barrier-shadow-${safeId}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
              <feOffset dx="0" dy="3" result="offsetblur"/>
              <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
              <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <linearGradient id="verified-grad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#60a5fa"/>
              <stop offset="100%" style="stop-color:#2563eb"/>
            </linearGradient>
          </defs>
          <circle cx="${cx}" cy="${cy}" r="16" fill="url(#verified-grad-${safeId})" stroke="white" stroke-width="3" filter="url(#barrier-shadow-${safeId})"/>
          <!-- 체크 마크 -->
          <path d="M${cx - 6} ${cy} L${cx - 1} ${cy + 5} L${cx + 8} ${cy - 6}" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          ${badgeSvg}
        </svg>
      `;
    }

    let iconContent = "";
    switch (category) {
      case "ramp":
        // 경사로 - 깔끔한 경사면 표현
        iconContent = `
          <!-- 경사면 바닥 -->
          <polygon points="${cx - 10},${cy + 8} ${cx + 10},${cy + 8} ${cx + 10},${cy - 6}" fill="white" opacity="0.25"/>
          <!-- 경사면 선 -->
          <path d="M${cx - 10} ${cy + 8} L${cx + 10} ${cy - 6}" stroke="white" stroke-width="3" stroke-linecap="round"/>
          <!-- 바닥선 -->
          <path d="M${cx - 10} ${cy + 8} L${cx + 10} ${cy + 8}" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <!-- 각도 표시 -->
          <path d="M${cx + 6} ${cy + 8} L${cx + 6} ${cy + 2}" stroke="white" stroke-width="1.5" opacity="0.7"/>
        `;
        break;
      case "elevator":
        // 엘리베이터 - 박스 + 상하 화살표
        iconContent = `
          <!-- 엘리베이터 박스 -->
          <rect x="${cx - 8}" y="${cy - 10}" width="16" height="20" rx="2" fill="none" stroke="white" stroke-width="2.5"/>
          <!-- 중앙 분리선 -->
          <line x1="${cx}" y1="${cy - 8}" x2="${cx}" y2="${cy + 8}" stroke="white" stroke-width="1.5" opacity="0.5"/>
          <!-- 위 화살표 -->
          <path d="M${cx - 4} ${cy + 2} L${cx - 4} ${cy - 5}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M${cx - 6.5} ${cy - 2} L${cx - 4} ${cy - 5} L${cx - 1.5} ${cy - 2}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 아래 화살표 -->
          <path d="M${cx + 4} ${cy - 2} L${cx + 4} ${cy + 5}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M${cx + 1.5} ${cy + 2} L${cx + 4} ${cy + 5} L${cx + 6.5} ${cy + 2}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        break;
      case "curb":
        // 턱/단차 - 명확한 단차 표현
        iconContent = `
          <!-- 단차 형태 -->
          <path d="M${cx - 10} ${cy + 6} L${cx - 2} ${cy + 6} L${cx - 2} ${cy - 4} L${cx + 10} ${cy - 4}" stroke="white" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <!-- 높이 표시 -->
          <path d="M${cx + 4} ${cy - 4} L${cx + 4} ${cy + 6}" stroke="white" stroke-width="1.5" stroke-dasharray="2,2" opacity="0.7"/>
          <!-- 위아래 화살표 -->
          <path d="M${cx + 2} ${cy - 1} L${cx + 4} ${cy - 4} L${cx + 6} ${cy - 1}" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
          <path d="M${cx + 2} ${cy + 3} L${cx + 4} ${cy + 6} L${cx + 6} ${cy + 3}" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        `;
        break;
      case "stairs":
        // 계단 - 명확한 계단 형태
        iconContent = `
          <!-- 계단 4단 -->
          <path d="M${cx - 9} ${cy + 9} L${cx - 9} ${cy + 4} L${cx - 4} ${cy + 4} L${cx - 4} ${cy - 1} L${cx + 1} ${cy - 1} L${cx + 1} ${cy - 6} L${cx + 6} ${cy - 6} L${cx + 6} ${cy - 11} L${cx + 11} ${cy - 11}" 
                stroke="white" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        break;
      case "parking":
        // 주차장 - P 마크
        iconContent = `
          <!-- P 텍스트 -->
          <text x="${cx}" y="${cy + 7}" font-family="Arial, sans-serif" font-size="22" font-weight="bold" fill="white" text-anchor="middle">P</text>
        `;
        break;
      case "restroom":
        // 화장실 - 남녀 심볼
        iconContent = `
          <!-- 남자 (왼쪽) -->
          <circle cx="${cx - 5}" cy="${cy - 7}" r="3" fill="white"/>
          <path d="M${cx - 5} ${cy - 4} L${cx - 5} ${cy + 3}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M${cx - 9} ${cy - 1} L${cx - 1} ${cy - 1}" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M${cx - 5} ${cy + 3} L${cx - 8} ${cy + 9} M${cx - 5} ${cy + 3} L${cx - 2} ${cy + 9}" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <!-- 여자 (오른쪽) -->
          <circle cx="${cx + 5}" cy="${cy - 7}" r="3" fill="white"/>
          <path d="M${cx + 5} ${cy - 4} L${cx + 5} ${cy}" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
          <path d="M${cx + 1} ${cy} L${cx + 9} ${cy} L${cx + 7} ${cy + 9} M${cx + 3} ${cy + 9} L${cx + 5} ${cy}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        break;
      case "entrance":
        // 출입구 - 문과 화살표
        iconContent = `
          <!-- 문 프레임 -->
          <rect x="${cx - 7}" y="${cy - 10}" width="14" height="20" rx="1" fill="none" stroke="white" stroke-width="2.5"/>
          <!-- 문 손잡이 -->
          <circle cx="${cx + 3}" cy="${cy + 2}" r="2" fill="white"/>
          <!-- 진입 화살표 -->
          <path d="M${cx - 12} ${cy} L${cx - 4} ${cy}" stroke="white" stroke-width="2" stroke-linecap="round"/>
          <path d="M${cx - 7} ${cy - 3} L${cx - 4} ${cy} L${cx - 7} ${cy + 3}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        `;
        break;
      default:
        // 기본 - 위치 핀 (초록색으로 표시)
        iconContent = `
          <!-- 위치 핀 -->
          <circle cx="${cx}" cy="${cy - 2}" r="5" fill="white"/>
          <path d="M${cx} ${cy + 10} L${cx - 4} ${cy + 2} Q${cx - 8} ${cy - 6} ${cx} ${cy - 10} Q${cx + 8} ${cy - 6} ${cx + 4} ${cy + 2} Z" 
                fill="none" stroke="white" stroke-width="2" opacity="0.5"/>
        `;
        break;
    }

    return `
      <svg width="${width}" height="${height}" viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="barrier-shadow-${safeId}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="3" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.4"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="marker-grad-${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:${fillColor}"/>
            <stop offset="100%" style="stop-color:${borderColor}"/>
          </linearGradient>
        </defs>
        <circle cx="${cx}" cy="${cy}" r="16" fill="url(#marker-grad-${safeId})" stroke="white" stroke-width="3" filter="url(#barrier-shadow-${safeId})"/>
        ${iconContent}
        ${badgeSvg}
      </svg>
    `;
  }, []);

  // 클러스터 키 생성 함수 (변경 감지용)
  const getClusterKey = useCallback((clusters: ClusterFeature[]) => {
    return clusters.map(f => {
      const [lon, lat] = f.geometry.coordinates;
      if (f.properties.cluster) {
        return `c:${lat.toFixed(4)},${lon.toFixed(4)},${f.properties.point_count}`;
      }
      return `b:${f.properties.barrier?.id}`;
    }).join('|');
  }, []);

  // 이전 클러스터 키 저장
  const prevClusterKeyRef = useRef<string>("");

  // 클러스터 및 개별 마커 표시
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 클러스터 키 비교로 실제 변경 여부 확인
    const currentKey = getClusterKey(clusters);
    if (currentKey === prevClusterKeyRef.current && clusters.length > 0) {
      return; // 변경 없으면 스킵
    }
    prevClusterKeyRef.current = currentKey;

    // 기존 마커 제거
    barrierMarkersRef.current.forEach((marker) => marker.setMap(null));
    barrierMarkersRef.current = [];
    clusterMarkersRef.current.forEach((marker) => marker.setMap(null));
    clusterMarkersRef.current = [];

    if (clusters.length === 0) return;

    clusters.forEach((feature, index) => {
      const [lon, lat] = feature.geometry.coordinates;
      const position = new window.Tmapv2.LatLng(lat, lon);

      if (feature.properties.cluster) {
        // 클러스터 마커
        const count = feature.properties.point_count || 0;
        const clusterId = feature.properties.cluster_id;
        const dominantSeverity = feature.properties.dominantSeverity;
        const severityCounts = feature.properties.severityCounts;
        const iconSvg = getClusterIcon(count, dominantSeverity, severityCounts);
        const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`;
        
        const size = count >= 100 ? 64 : count >= 30 ? 56 : count >= 10 ? 52 : 48;

        const marker = new window.Tmapv2.Marker({
          position: position,
          map: map,
          icon: iconUrl,
          iconSize: new window.Tmapv2.Size(size, size),
          title: `${count}개 마커`,
          zIndex: 150,
        });

        // 클러스터 클릭 시 확대
        const handleClusterClick = () => {
          if (clusterId !== undefined) {
            const expansionZoom = getClusterExpansionZoom(clusterId);
            map.setCenter(position);
            map.setZoom(Math.min(expansionZoom, 18));
          }
        };

        marker.addListener("click", handleClusterClick);
        marker.addListener("touchend", handleClusterClick);
        clusterMarkersRef.current.push(marker);
      } else {
        // 개별 마커
        const barrier = feature.properties.barrier;
        if (!barrier) return;

        const uniqueId = `${barrier.type}-${barrier.id}`;
        const reportCount = barrier.reportCount || 1;
        const iconSvg = getCategoryIcon(barrier.type, barrier.severity, uniqueId, reportCount);
        const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvg)}`;
        // 뱃지가 있으면 마커 크기 증가 (모바일은 축소)
        const hasExtraReports = reportCount > 1;
        const markerSize = isMobile ? (hasExtraReports ? 28 : 24) : (hasExtraReports ? 52 : 44);

        const marker = new window.Tmapv2.Marker({
          position: position,
          map: map,
          icon: iconUrl,
          iconSize: new window.Tmapv2.Size(markerSize, markerSize),
          title: barrier.name,
          zIndex: 100,
        });

        const handleMarkerClick = () => {
          if (onBarrierClick) {
            onBarrierClick(barrier);
          }
        };

        marker.addListener("click", handleMarkerClick);
        marker.addListener("touchend", handleMarkerClick);
        barrierMarkersRef.current.push(marker);
      }
    });
  }, [map, clusters, getClusterKey, getClusterIcon, getCategoryIcon, getClusterExpansionZoom, onBarrierClick, isMobile]);

  // 즐겨찾기 마커 표시 - 지도에 표시하지 않음 (사용자 요청에 따라 비활성화)
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 기존 즐겨찾기 마커 제거
    favoriteMarkersRef.current.forEach((marker) => marker.setMap(null));
    favoriteMarkersRef.current = [];

    // 즐겨찾기 마커 생성 비활성화 - 지도에 표시하지 않음
    // 추후 필요시 아래 코드 활성화
    /*
    favorites.forEach((favorite) => {
      const position = new window.Tmapv2.LatLng(Number(favorite.latitude), Number(favorite.longitude));
      const uniqueId = `star-${favorite.id}`;

      // 별표 SVG 아이콘 - 개선된 디자인
      const starIcon = `
        <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <filter id="star-shadow-${uniqueId}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
              <feOffset dx="0" dy="2" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.35"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <linearGradient id="star-grad-${uniqueId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#fcd34d"/>
              <stop offset="100%" style="stop-color:#f59e0b"/>
            </linearGradient>
          </defs>
          <!-- 원형 배경 -->
          <circle cx="20" cy="20" r="17" fill="white" stroke="#f59e0b" stroke-width="2.5" filter="url(#star-shadow-${uniqueId})"/>
          <!-- 별 아이콘 -->
          <path d="M20 6 L23.5 14.5 L32.5 14.5 L25.5 20.5 L28 29.5 L20 24 L12 29.5 L14.5 20.5 L7.5 14.5 L16.5 14.5 Z" 
                fill="url(#star-grad-${uniqueId})" 
                stroke="#d97706" 
                stroke-width="1"/>
        </svg>
      `;
      const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(starIcon)}`;
      
      const marker = new window.Tmapv2.Marker({
        position: position,
        map: map,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(40, 40),
        title: favorite.place_name,
        zIndex: 80,
      });

      // 마커 클릭 이벤트 - 장소 후기 열기
      marker.addListener("click", () => {
        if (onPlaceClick) {
          onPlaceClick({
            name: favorite.place_name,
            lat: Number(favorite.latitude),
            lon: Number(favorite.longitude),
          });
        }
      });
      favoriteMarkersRef.current.push(marker);
    });
    */
  }, [map, favorites]);

  // userLocation을 ref로 저장하여 의존성 배열에서 제거 (API 중복 호출 방지)
  const userLocationRef = useRef(userLocation);
  useEffect(() => {
    userLocationRef.current = userLocation;
  }, [userLocation]);

  // 마지막으로 요청한 경로 정보 저장 (중복 호출 방지)
  const lastRouteRequestRef = useRef<string>("");

  // 도보 경로 탐색 (TMap API 1회만 호출)
  useEffect(() => {
    if (!map || !window.Tmapv2) return;

    // 경로 제거 함수
    const clearRoutes = () => {
      if (routeLayerRef.current && routeLayerRef.current.length) {
        routeLayerRef.current.forEach((layer: any) => layer.setMap(null));
        routeLayerRef.current = [];
      }
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      arrowMarkersRef.current.forEach((marker) => marker.setMap(null));
      arrowMarkersRef.current = [];
    };

    // endPoint가 없거나 selectedRouteType이 없으면 경로 제거
    if (!endPoint || !selectedRouteType) {
      clearRoutes();
      lastRouteRequestRef.current = "";
      return;
    }

    // 출발지 결정: startPoint가 있으면 사용, 없으면 현재 위치 사용
    const start = startPoint || userLocationRef.current;
    if (!start) {
      toast.error("출발지를 설정해주세요.");
      return;
    }

    // 동일한 경로 요청인지 확인 (중복 호출 방지)
    const routeKey = `${start.lat.toFixed(6)},${start.lon.toFixed(6)}-${endPoint.lat.toFixed(6)},${endPoint.lon.toFixed(6)}`;
    if (routeKey === lastRouteRequestRef.current) {
      console.log("⏭️ 동일한 경로 - API 호출 생략");
      return;
    }
    lastRouteRequestRef.current = routeKey;

    console.log("✅ 도보 경로 API 호출", { 
      start: { lat: start.lat, lon: start.lon },
      end: { lat: endPoint.lat, lon: endPoint.lon }
    });

    const calculateRoute = async () => {
      try {
        clearRoutes();

        const requestBody = {
          startX: start.lon.toString(),
          startY: start.lat.toString(),
          endX: endPoint.lon.toString(),
          endY: endPoint.lat.toString(),
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          startName: startPoint?.name || "현재 위치",
          endName: endPoint.name,
        };

        const response = await fetch("https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1", {
          method: "POST",
          headers: {
            appKey: "KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        if (data.error) {
          console.warn("API 에러:", data.error);
          // 429 할당량 초과 에러 처리
          if (data.error.code === "QUOTA_EXCEEDED" || response.status === 429) {
            toast.error("API 일일 할당량을 초과했습니다. 잠시 후 다시 시도해주세요.", {
              description: "TMap API 사용량이 한도에 도달했습니다.",
              duration: 5000,
            });
          } else {
            toast.error("도보 경로를 찾을 수 없습니다.");
          }
          return;
        }

        if (!data.features) {
          toast.error("경로를 찾을 수 없습니다.");
          return;
        }

        // 경로 데이터 처리
        const lineStrings: any[] = [];
        let totalDistance = 0;
        let totalTime = 0;

        data.features.forEach((feature: any) => {
          if (feature.geometry.type === "LineString") {
            feature.geometry.coordinates.forEach((coord: any) => {
              lineStrings.push(new window.Tmapv2.LatLng(coord[1], coord[0]));
            });
          }
          if (feature.properties) {
            if (feature.properties.distance) totalDistance += feature.properties.distance;
            if (feature.properties.time) totalTime += feature.properties.time;
          }
        });

        // 첫 번째 feature의 총 정보 사용
        const firstFeature = data.features[0];
        if (firstFeature?.properties) {
          totalDistance = firstFeature.properties.totalDistance || totalDistance;
          totalTime = firstFeature.properties.totalTime || totalTime;
        }

        // 경로 근처의 배리어 찾기
        const nearbyBarriers = barrierData.filter((barrier) => {
          return lineStrings.some((point) => {
            const distance = calculateDistance(point.lat(), point.lng(), barrier.latitude, barrier.longitude);
            return distance < 0.05;
          });
        });

        // 안전도 계산
        const dangerCount = nearbyBarriers.filter((b) => b.severity === "danger").length;
        const warningCount = nearbyBarriers.filter((b) => b.severity === "warning").length;
        const totalBarriers = dangerCount + warningCount;
        let dangerPercentage = 0, warningPercentage = 0, safePercentage = 100;
        if (totalBarriers > 0) {
          dangerPercentage = (dangerCount / totalBarriers) * 100;
          warningPercentage = (warningCount / totalBarriers) * 100;
          safePercentage = 100 - dangerPercentage - warningPercentage;
        }

        const routeResult = {
          type: "walk" as const,
          distance: totalDistance,
          duration: totalTime,
          safePercentage,
          warningPercentage,
          dangerPercentage,
          barriers: nearbyBarriers,
          lineStrings,
        };

        console.log("✅ 경로 계산 완료:", { distance: totalDistance, duration: totalTime });

        // 콜백 호출
        if (onRoutesCalculated) {
          onRoutesCalculated([routeResult]);
        }

        // 경로 그리기
        const routeSegments = createRouteSegments(lineStrings);
        const createdPolylines: any[] = [];
        routeSegments.forEach((segment) => {
          const polyline = new window.Tmapv2.Polyline({
            path: segment.path,
            strokeColor: segment.color,
            strokeWeight: 6,
            map: map,
          });
          createdPolylines.push(polyline);
        });
        routeLayerRef.current = createdPolylines;

        // 화살표 마커 추가
        addArrowMarkers(lineStrings);

        // 출발지 마커 (초록색)
        if (startPoint) {
          const startIconSvg = `
            <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="start-shadow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
                  <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <path d="M18 0 C8 0 0 8 0 18 C0 28 18 48 18 48 C18 48 36 28 36 18 C36 8 28 0 18 0 Z" fill="#22c55e" stroke="white" stroke-width="3" filter="url(#start-shadow)"/>
              <circle cx="18" cy="18" r="10" fill="white"/>
              <text x="18" y="23" text-anchor="middle" font-size="16" font-weight="bold" fill="#22c55e">S</text>
            </svg>
          `;
          const startMarker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(startPoint.lat, startPoint.lon),
            icon: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(startIconSvg)}`,
            iconSize: new window.Tmapv2.Size(36, 48),
            map: map,
            title: "출발",
            zIndex: 90,
          });
          markersRef.current.push(startMarker);
        }

        // 도착지 마커 (빨간색)
        const endIconSvg = `
          <svg width="36" height="48" viewBox="0 0 36 48" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="end-shadow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                <feOffset dx="0" dy="2" result="offsetblur"/>
                <feComponentTransfer><feFuncA type="linear" slope="0.4"/></feComponentTransfer>
                <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <path d="M18 0 C8 0 0 8 0 18 C0 28 18 48 18 48 C18 48 36 28 36 18 C36 8 28 0 18 0 Z" fill="#ef4444" stroke="white" stroke-width="3" filter="url(#end-shadow)"/>
            <circle cx="18" cy="18" r="10" fill="white"/>
            <text x="18" y="23" text-anchor="middle" font-size="16" font-weight="bold" fill="#ef4444">E</text>
          </svg>
        `;
        const endMarker = new window.Tmapv2.Marker({
          position: new window.Tmapv2.LatLng(endPoint.lat, endPoint.lon),
          icon: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(endIconSvg)}`,
          iconSize: new window.Tmapv2.Size(36, 48),
          map: map,
          title: "도착",
          zIndex: 90,
        });
        markersRef.current.push(endMarker);

        // 지도 범위 조정
        const bounds = new window.Tmapv2.LatLngBounds();
        lineStrings.forEach((point: any) => bounds.extend(point));
        map.fitBounds(bounds);

      } catch (error) {
        console.error("경로 탐색 실패:", error);
        toast.error("경로를 찾을 수 없습니다.");
      }
    };

    calculateRoute();
  }, [map, startPoint, endPoint, selectedRouteType, clearKey]);

  // 실시간 교통 정보 자동 업데이트 (자동차 경로가 선택되었을 때만)
  useEffect(() => {
    // 기존 interval 정리
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    // 자동차 경로가 선택되었을 때만 실시간 업데이트 시작
    if (selectedRouteType === "car" && map && endPoint) {
      toast.info("🚗 실시간 교통 정보 업데이트 시작", {
        description: "30초마다 경로를 자동 업데이트합니다.",
      });

      // 30초마다 경로 재탐색
      updateIntervalRef.current = setInterval(() => {
        setRouteUpdateTrigger((prev) => prev + 1);
      }, 30000);
    }

    // cleanup
    return () => {
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
        updateIntervalRef.current = null;
      }
    };
  }, [selectedRouteType, map, endPoint]);

  // 화살표 마커 추가 함수 (이미지 참조 스타일)
  const addArrowMarkers = (path: any[]) => {
    // 기존 화살표 제거
    arrowMarkersRef.current.forEach((marker) => marker.setMap(null));
    arrowMarkersRef.current = [];

    // 경로 길이에 따라 화살표 간격 조정 (약 100m마다)
    const arrowInterval = Math.max(8, Math.floor(path.length / 12));
    for (let i = arrowInterval; i < path.length; i += arrowInterval) {
      const prevPoint = path[i - 1];
      const currentPoint = path[i];

      // 화살표 방향 계산
      const angle = calculateBearing(prevPoint.lat(), prevPoint.lng(), currentPoint.lat(), currentPoint.lng());

      // 네이버 지도 스타일 화살표 SVG 생성 (흰색 화살표)
      const arrowSvg = `
        <svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${angle}deg);">
          <defs>
            <filter id="arrow-shadow-${i}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceAlpha" stdDeviation="1.5"/>
              <feOffset dx="0" dy="1" result="offsetblur"/>
              <feComponentTransfer>
                <feFuncA type="linear" slope="0.3"/>
              </feComponentTransfer>
              <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <path d="M16 8 L16 24 M16 8 L11 13 M16 8 L21 13" 
                stroke="white" 
                stroke-width="3.5" 
                stroke-linecap="round" 
                stroke-linejoin="round" 
                fill="none"
                filter="url(#arrow-shadow-${i})"/>
        </svg>
      `;

      const iconUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(arrowSvg)}`;

      const arrowMarker = new window.Tmapv2.Marker({
        position: currentPoint,
        icon: iconUrl,
        iconSize: new window.Tmapv2.Size(32, 32),
        map: map,
        zIndex: 50, // 경로 위에 표시되도록
      });
      arrowMarkersRef.current.push(arrowMarker);
    }
  };

  // 방향 계산 함수 (bearing)
  const calculateBearing = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  };

  // 교통수단별 기본 색상
  const getRouteColor = (routeType: "transit" | "walk" | "car" | null | undefined) => {
    switch (routeType) {
      case "transit":
        return "#3b82f6";
      // 파란색
      case "walk":
        return "#3b82f6";
      // 파란색
      case "car":
        return "#ef4444";
      // 빨간색
      default:
        return "#3b82f6";
      // 기본 파란색
    }
  };

  // 경로 세그먼트 생성 (배리어 근처는 다른 색상)
  const createRouteSegments = (path: any[]) => {
    const segments: {
      path: any[];
      color: string;
    }[] = [];
    let currentSegment: any[] = [];
    const baseColor = getRouteColor(selectedRouteType);
    let currentColor = baseColor; // 선택된 교통수단 색상

    path.forEach((point, index) => {
      // 배리어와의 거리 계산하여 색상 결정
      const nearbyBarrier = barrierData.find((barrier) => {
        const distance = calculateDistance(point.lat(), point.lng(), barrier.lat, barrier.lon);
        return distance < 20; // 20m 이내
      });
      let segmentColor = baseColor; // 선택된 교통수단 색상
      if (nearbyBarrier) {
        if (nearbyBarrier.severity === "warning") {
          segmentColor = "#f59e0b"; // 경고 (주황색)
        } else if (nearbyBarrier.severity === "danger") {
          segmentColor = "#ef4444"; // 위험 (빨간색)
        }
      }
      if (segmentColor !== currentColor && currentSegment.length > 0) {
        segments.push({
          path: [...currentSegment],
          color: currentColor,
        });
        currentSegment = [point];
        currentColor = segmentColor;
      } else {
        currentSegment.push(point);
      }
      if (index === path.length - 1 && currentSegment.length > 0) {
        segments.push({
          path: currentSegment,
          color: currentColor,
        });
      }
    });
    return segments.length > 0
      ? segments
      : [
          {
            path,
            color: currentColor,
          },
        ];
  };

  // 두 지점 간 거리 계산 (하버사인 공식, 미터 단위)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371000; // 지구 반지름 (m)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };
  if (!window.Tmapv2) {
    return (
      <div className="relative w-full h-full bg-muted/30 flex items-center justify-center">
        <div className="text-center space-y-4 p-8">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">T Map API를 불러올 수 없습니다</p>
            <p className="text-sm text-muted-foreground max-w-md">페이지를 새로고침해주세요.</p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      {/* 지도 컨테이너 */}
      <div ref={mapRef} className="w-full h-full" />

      {/* 로딩 오버레이 */}
      {loading && userLocation === null && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <p className="text-lg font-medium">위치 정보를 가져오는 중...</p>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && !loading && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 max-w-sm w-full px-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
            <Button onClick={getCurrentLocation} size="sm" className="w-full" variant="outline">
              다시 시도
            </Button>
          </div>
        </div>
      )}

      {/* 로드뷰 버튼 (상단 우측 - 여백 조정) */}
      <div className="absolute top-4 right-6 md:right-8 z-50 pointer-events-auto">
        <Button
          size="icon"
          variant="outline"
          onClick={() => {
            if (map) {
              const center = map.getCenter();
              const lat = center._lat;
              const lon = center._lng;
              window.open(
                `https://map.kakao.com/?urlX=${lon}&urlY=${lat}&urlLevel=3&map_type=TYPE_MAP&map_hybrid=false`,
                "_blank",
              );
            }
          }}
          title="카카오맵 로드뷰 열기"
          className="shadow-lg h-11 w-11 md:h-12 md:w-12 rounded-full px-0 bg-background border-2 border-border"
        >
          <Eye className="h-5 w-5" />
        </Button>
      </div>

      {/* 하단 버튼 그룹 컨테이너 - 필터, 현위치 버튼 */}
      <div 
        className={`absolute right-4 md:right-6 z-50 pointer-events-auto flex flex-col items-center gap-3 transition-all duration-300 ${
          isMobile
            ? isRouteSelecting
              ? "bottom-6"
              : "bottom-6"
            : isRouteSelecting
              ? "bottom-6"
              : "bottom-6"
        }`}
      >
        {/* 현재 위치 버튼 */}
        <Button
          onClick={getCurrentLocation}
          size="lg"
          className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90 text-primary-foreground border-4 border-background touch-target"
          title="현재 위치"
          disabled={loading}
        >
          {loading && userLocation === null ? (
            <Loader2 className="h-5 w-5 md:h-6 md:w-6 animate-spin" />
          ) : (
            <Navigation className="h-5 w-5 md:h-6 md:w-6" />
          )}
        </Button>

        {/* 필터 버튼 - 장소 검색 중이 아닐 때만 표시 */}
        {!hideFilterButton && (
          <div className="relative">
            <Button
              onClick={() => setShowFilter(!showFilter)}
              size="lg"
              title="필터"
              className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-xl bg-background hover:bg-muted text-foreground border-2 border-border touch-target"
            >
              <Filter className="h-5 w-5 md:h-6 md:w-6" />
            </Button>
            {showFilter && (
              <div className="absolute bottom-full right-0 mb-2 bg-background border-2 border-border rounded-lg shadow-xl p-3 space-y-2 min-w-[160px]">
                <div className="text-sm font-semibold mb-2 text-foreground">접근성 필터</div>
                <button
                  onClick={() =>
                    setFilter({
                      ...filter,
                      safe: !filter.safe,
                    })
                  }
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors touch-target"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      filter.safe ? "bg-green-500 border-green-500" : "border-muted-foreground"
                    }`}
                  >
                    {filter.safe && <div className="text-white text-xs text-center leading-none">✓</div>}
                  </div>
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    안심
                  </Badge>
                </button>
                <button
                  onClick={() =>
                    setFilter({
                      ...filter,
                      warning: !filter.warning,
                    })
                  }
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors touch-target"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      filter.warning ? "bg-yellow-500 border-yellow-500" : "border-muted-foreground"
                    }`}
                  >
                    {filter.warning && <div className="text-white text-xs text-center leading-none">✓</div>}
                  </div>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                    경고
                  </Badge>
                </button>
                <button
                  onClick={() =>
                    setFilter({
                      ...filter,
                      danger: !filter.danger,
                    })
                  }
                  className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted transition-colors touch-target"
                >
                  <div
                    className={`w-4 h-4 rounded border-2 ${
                      filter.danger ? "bg-red-500 border-red-500" : "border-muted-foreground"
                    }`}
                  >
                    {filter.danger && <div className="text-white text-xs text-center leading-none">✓</div>}
                  </div>
                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                    위험
                  </Badge>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
export default MapView;
