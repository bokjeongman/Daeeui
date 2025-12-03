import { useMemo, useCallback, useRef } from "react";
import Supercluster from "supercluster";

export interface BarrierPoint {
  id: string;
  lat: number;
  lon: number;
  type: string;
  severity: string;
  name: string;
  details?: string;
  photo_urls?: string[];
  created_at?: string;
  accessibility_level?: string;
  user_id?: string;
  reports?: any[];
  reportCount?: number;
}

export interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string;
  barrier?: BarrierPoint;
  // 클러스터 내 접근성 레벨 통계
  severityCounts?: {
    safe: number;
    warning: number;
    danger: number;
    verified: number;
  };
  dominantSeverity?: string;
}

export interface ClusterFeature {
  type: "Feature";
  properties: ClusterProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number]; // [lon, lat]
  };
}

interface PointFeature {
  type: "Feature";
  properties: {
    cluster: boolean;
    barrier: BarrierPoint;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

export function useMarkerCluster(
  barriers: BarrierPoint[],
  bounds: { west: number; south: number; east: number; north: number } | null,
  zoom: number,
  filter: { safe: boolean; warning: boolean; danger: boolean }
) {
  // Create supercluster instance
  const supercluster = useMemo(() => {
    const cluster = new Supercluster<{ cluster: boolean; barrier: BarrierPoint }>({
      radius: 60,
      maxZoom: 18,
      minZoom: 0,
      minPoints: 3,
    });

    // Filter barriers based on filter state
    const filteredBarriers = barriers.filter((barrier) => {
      if (barrier.severity === "safe" && !filter.safe) return false;
      if (barrier.severity === "warning" && !filter.warning) return false;
      if (barrier.severity === "danger" && !filter.danger) return false;
      if (barrier.severity === "verified" && !filter.safe) return false;
      return true;
    });

    // Convert barriers to GeoJSON features
    const points: PointFeature[] = filteredBarriers.map((barrier) => ({
      type: "Feature" as const,
      properties: {
        cluster: false,
        barrier: barrier,
      },
      geometry: {
        type: "Point" as const,
        coordinates: [barrier.lon, barrier.lat] as [number, number],
      },
    }));

    cluster.load(points);
    return cluster;
  }, [barriers, filter]);

  // 클러스터 내 접근성 레벨 통계 계산
  const getClusterSeverityStats = useCallback((clusterId: number) => {
    try {
      const leaves = supercluster.getLeaves(clusterId, Infinity);
      const counts = { safe: 0, warning: 0, danger: 0, verified: 0 };
      
      leaves.forEach((leaf: any) => {
        const severity = leaf.properties.barrier?.severity;
        if (severity === "safe") counts.safe++;
        else if (severity === "warning") counts.warning++;
        else if (severity === "danger") counts.danger++;
        else if (severity === "verified") counts.verified++;
      });

      // dominant severity 결정 (위험 > 보통 > 양호/인증)
      let dominantSeverity = "safe";
      const total = counts.safe + counts.warning + counts.danger + counts.verified;
      
      if (total > 0) {
        const dangerRatio = counts.danger / total;
        const warningRatio = counts.warning / total;
        
        if (dangerRatio >= 0.3) {
          dominantSeverity = "danger";
        } else if (warningRatio >= 0.3 || counts.danger > 0) {
          dominantSeverity = "warning";
        } else if (counts.verified > counts.safe) {
          dominantSeverity = "verified";
        }
      }

      return { counts, dominantSeverity };
    } catch {
      return { counts: { safe: 0, warning: 0, danger: 0, verified: 0 }, dominantSeverity: "safe" };
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
          const stats = getClusterSeverityStats(feature.properties.cluster_id);
          return {
            ...feature,
            properties: {
              ...feature.properties,
              severityCounts: stats.counts,
              dominantSeverity: stats.dominantSeverity,
            },
          };
        }
        return feature;
      }) as ClusterFeature[];
    } catch (error) {
      console.error("Error getting clusters:", error);
      return [];
    }
  }, [supercluster, bounds, zoom, getClusterSeverityStats]);

  // Function to get cluster expansion zoom
  const getClusterExpansionZoom = useCallback((clusterId: number): number => {
    try {
      return supercluster.getClusterExpansionZoom(clusterId);
    } catch {
      return zoom + 2;
    }
  }, [supercluster, zoom]);

  return { clusters, getClusterExpansionZoom, supercluster, getClusterSeverityStats };
}
