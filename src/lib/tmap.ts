import { supabase } from "@/lib/supabase";

interface TmapProxyRequest {
  endpoint: "reverseGeocode" | "poiSearch" | "poiSearchAround" | "pedestrianRoute";
  params: Record<string, string | number>;
  body?: Record<string, any>;
}

/**
 * Call Tmap API through the secure edge function proxy.
 * This keeps the API key server-side and prevents client-side exposure.
 */
async function callTmapProxy<T>(request: TmapProxyRequest): Promise<T> {
  const { data, error } = await supabase.functions.invoke("tmap-proxy", {
    body: request,
  });

  if (error) {
    throw new Error(`Tmap proxy error: ${error.message}`);
  }

  return data as T;
}

/**
 * Reverse geocode coordinates to an address string
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const data = await callTmapProxy<any>({
      endpoint: "reverseGeocode",
      params: { lat, lon },
    });

    if (data.addressInfo) {
      const addr = data.addressInfo;
      const fullAddress = `${addr.city_do || ""} ${addr.gu_gun || ""} ${addr.eup_myun || ""} ${addr.adminDong || ""} ${addr.ri || ""}`.trim();

      // Add building name or lot number if available
      if (addr.buildingName) {
        return `${fullAddress} ${addr.buildingName}`.trim();
      } else if (addr.bunji) {
        return `${fullAddress} ${addr.bunji}`.trim();
      }

      return fullAddress;
    }
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  } catch (error) {
    if (import.meta.env.DEV) console.error("역지오코딩 실패:", error);
    return `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
  }
}

/**
 * Search for POIs by keyword
 */
export async function searchPOI(searchKeyword: string, count = 10): Promise<any[]> {
  try {
    const data = await callTmapProxy<any>({
      endpoint: "poiSearch",
      params: { searchKeyword, count },
    });

    if (data.searchPoiInfo?.pois?.poi) {
      return data.searchPoiInfo.pois.poi.map((poi: any, index: number) => ({
        id: index,
        name: poi.name,
        address: `${poi.upperAddrName} ${poi.middleAddrName} ${poi.lowerAddrName}`,
        lat: parseFloat(poi.noorLat),
        lon: parseFloat(poi.noorLon),
      }));
    }
    return [];
  } catch (error) {
    if (import.meta.env.DEV) console.error("POI 검색 실패:", error);
    return [];
  }
}

/**
 * Search for POIs around a location
 */
export async function searchPOIAround(
  centerLat: number,
  centerLon: number,
  radius = 50,
  count = 1
): Promise<any[]> {
  try {
    const data = await callTmapProxy<any>({
      endpoint: "poiSearchAround",
      params: { centerLat, centerLon, radius, count },
    });

    if (data.searchPoiInfo?.pois?.poi) {
      return data.searchPoiInfo.pois.poi.map((poi: any) => ({
        name: poi.name,
        lat: parseFloat(poi.noorLat),
        lon: parseFloat(poi.noorLon),
      }));
    }
    return [];
  } catch (error) {
    if (import.meta.env.DEV) console.error("주변 POI 검색 실패:", error);
    return [];
  }
}

/**
 * Get pedestrian route between two points
 */
export async function getPedestrianRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  startName = "현재 위치",
  endName = "목적지"
): Promise<any> {
  try {
    const data = await callTmapProxy<any>({
      endpoint: "pedestrianRoute",
      params: {},
      body: {
        startX: startLon.toString(),
        startY: startLat.toString(),
        endX: endLon.toString(),
        endY: endLat.toString(),
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName,
        endName,
      },
    });

    return data;
  } catch (error) {
    if (import.meta.env.DEV) console.error("보행자 경로 조회 실패:", error);
    throw error;
  }
}
