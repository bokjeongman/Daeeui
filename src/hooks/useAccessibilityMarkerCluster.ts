import { useMemo, useCallback } from "react";
import Supercluster from "supercluster";

export interface AccessibilityReport {
  id: string;
  lat: number;
  lon: number;
  location_name: string;
  has_ramp: boolean | null;
  has_elevator: boolean | null;
  has_accessible_restroom: boolean | null;
  has_low_threshold: boolean | null;
  has_wide_door: boolean | null;
  details?: string;
  photo_urls?: string[];
  created_at?: string;
  accessibility_level?: string;
  user_id?: string;
  reports?: AccessibilityReport[];
  reportCount?: number;
}

export interface AccessibilityClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string;
  report?: AccessibilityReport;
  // 도넛 차트용 통계
  accessibilityStats?: {
    yesCount: number;
    noCount: number;
    totalResponses: number;
  };
}

export interface AccessibilityClusterFeature {
  type: "Feature";
  properties: AccessibilityClusterProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
}

interface PointFeature {
  type: "Feature";
  properties: {
    cluster: boolean;
    report: AccessibilityReport;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export interface AccessibilityFilter {
  hasRamp: boolean;
  hasElevator: boolean;
  hasAccessibleRestroom: boolean;
  hasLowThreshold: boolean;
  hasWideDoor: boolean;
  publicData: boolean;
}

// 5가지 항목에 대한 Yes/No 통계 계산
function calculateAccessibilityStats(reports: AccessibilityReport[]) {
  let yesCount = 0;
  let noCount = 0;
  
  const keys: (keyof Pick<AccessibilityReport, 'has_ramp' | 'has_elevator' | 'has_accessible_restroom' | 'has_low_threshold' | 'has_wide_door'>)[] = [
    'has_ramp', 'has_elevator', 'has_accessible_restroom', 'has_low_threshold', 'has_wide_door'
  ];
  
  reports.forEach(report => {
    keys.forEach(key => {
      const value = report[key];
      if (value !== null && value !== undefined) {
        // 턱(has_low_threshold)은 값을 반전시킴 - 턱이 없으면(false) 좋음(yesCount++)
        if (key === 'has_low_threshold') {
          if (value === false) yesCount++;
          else if (value === true) noCount++;
        } else {
          if (value === true) yesCount++;
          else if (value === false) noCount++;
        }
      }
    });
  });
  
  return {
    yesCount,
    noCount,
    totalResponses: yesCount + noCount
  };
}

export function useAccessibilityMarkerCluster(
  reports: AccessibilityReport[],
  bounds: { west: number; south: number; east: number; north: number } | null,
  zoom: number,
  filter: AccessibilityFilter
) {
  // Create supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster<{ cluster: boolean; report: AccessibilityReport }>({
      radius: 60,
      maxZoom: 18,
      minZoom: 0,
      minPoints: 3,
    });

    // Filter reports based on filter state
    const filteredReports = reports.filter((report) => {
      // 공공데이터 필터
      if (report.accessibility_level === "public") {
        return filter.publicData;
      }
      
      // 개별 항목 필터 (하나라도 해당하면 표시)
      let matchesFilter = false;
      
      if (filter.hasRamp && report.has_ramp === true) matchesFilter = true;
      if (filter.hasElevator && report.has_elevator === true) matchesFilter = true;
      if (filter.hasAccessibleRestroom && report.has_accessible_restroom === true) matchesFilter = true;
      if (filter.hasLowThreshold && report.has_low_threshold === true) matchesFilter = true;
      if (filter.hasWideDoor && report.has_wide_door === true) matchesFilter = true;
      
      // 모든 필터가 꺼져있으면 모두 표시
      const allFiltersOff = !filter.hasRamp && !filter.hasElevator && !filter.hasAccessibleRestroom && !filter.hasLowThreshold && !filter.hasWideDoor;
      
      return allFiltersOff || matchesFilter;
    });

    // Convert reports to GeoJSON features
    const points: PointFeature[] = filteredReports.map((report) => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        report: report,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [report.lon, report.lat] as [number, number],
      },
    }));

    cluster.load(points);
    return cluster;
  }, [reports, filter]);

  // 클러스터 내 접근성 통계 계산
  const getClusterAccessibilityStats = useCallback((clusterId: number) => {
    try {
      const leaves = supercluster.getLeaves(clusterId, Infinity);
      const allReports: AccessibilityReport[] = [];
      
      leaves.forEach((leaf: any) => {
        const report = leaf.properties.report;
        if (report) {
          allReports.push(report);
          // 그룹화된 제보도 포함
          if (report.reports) {
            allReports.push(...report.reports);
          }
        }
      });
      
      return calculateAccessibilityStats(allReports);
    } catch {
      return { yesCount: 0, noCount: 0, totalResponses: 0 };
    }
  }, [supercluster]);

  // Get clusters for current bounds and zoom
  const clusters = useMemo(() => {
    if (!bounds) return [];

    try {
      const bbox: [number, number, number, number] = [
        bounds.west,
        bounds.south,
        bounds.east,
        bounds.north,
      ];

      const rawClusters = supercluster.getClusters(bbox, Math.floor(zoom));
      
      // 클러스터에 접근성 통계 추가
      return rawClusters.map((feature: any) => {
        if (feature.properties.cluster && feature.properties.cluster_id !== undefined) {
          const stats = getClusterAccessibilityStats(feature.properties.cluster_id);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              accessibilityStats: stats,
            },
          };
        } else {
          // 개별 마커에도 통계 추가
          const report = feature.properties.report;
          if (report) {
            const reportsToAnalyze = report.reports ? [report, ...report.reports] : [report];
            const stats = calculateAccessibilityStats(reportsToAnalyze);
            return {
              ...feature,
              properties: {
                ...feature.properties,
                accessibilityStats: stats,
              },
            };
          }
        }
        return feature;
      }) as AccessibilityClusterFeature[];
    } catch (error) {
      console.error("Error getting clusters:", error);
      return [];
    }
  }, [supercluster, bounds, zoom, getClusterAccessibilityStats]);

  // Function to get cluster expansion zoom
  const getClusterExpansionZoom = useCallback((clusterId: number): number => {
    try {
      return supercluster.getClusterExpansionZoom(clusterId);
    } catch {
      return zoom + 2;
    }
  }, [supercluster, zoom]);

  return { clusters, getClusterExpansionZoom, supercluster, getClusterAccessibilityStats };
}
