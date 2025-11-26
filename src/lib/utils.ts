import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    const response = await fetch(
      `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&format=json&callback=result&coordType=WGS84GEO&addressType=A10&lon=${lon}&lat=${lat}&appKey=KZDXJtx63R735Qktn8zkkaJv4tbaUqDc1lXzyjLT`
    );
    const data = await response.json();
    
    if (data.addressInfo) {
      const addr = data.addressInfo;
      const fullAddress = `${addr.city_do || ''} ${addr.gu_gun || ''} ${addr.eup_myun || ''} ${addr.adminDong || ''} ${addr.ri || ''}`.trim();
      
      // 건물명이나 번지가 있으면 추가
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
