import { useMemo } from "react";
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
}

export interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string;
  barrier?: BarrierPoint;
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

      return supercluster.getClusters(bbox, Math.floor(zoom)) as ClusterFeature[];
    } catch (error) {
      console.error("Error getting clusters:", error);
      return [];
    }
  }, [supercluster, bounds, zoom]);

  // Function to get cluster expansion zoom
  const getClusterExpansionZoom = (clusterId: number): number => {
    try {
      return supercluster.getClusterExpansionZoom(clusterId);
    } catch {
      return zoom + 2;
    }
  };

  return { clusters, getClusterExpansionZoom, supercluster };
}
