import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export reverseGeocode from tmap.ts for backwards compatibility
export { reverseGeocode } from "./tmap";
