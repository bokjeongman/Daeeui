import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// NOTE: In some preview/build contexts, Vite env vars can fail to be injected.
// To avoid a blank screen, we fall back to known project values (URL + publishable key).
// These are not secrets.
const FALLBACK_SUPABASE_URL = "https://qewzkjoyygyiygpymejj.supabase.co";
const FALLBACK_SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFld3pram95eWd5aXlncHltZWpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyNTUwODgsImV4cCI6MjA3ODgzMTA4OH0.T7LD13QSa-LbU_LTBgGWRjlSh3olK7ubso_sL3S2j0M";

function safeUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  if (!url.trim()) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function safeKey(key: unknown): string | null {
  if (typeof key !== "string") return null;
  const k = key.trim();
  return k ? k : null;
}

function getSupabaseConfig() {
  const url =
    safeUrl(import.meta.env.VITE_SUPABASE_URL) ??
    safeUrl((globalThis as any).__APP_ENV__?.VITE_SUPABASE_URL) ??
    FALLBACK_SUPABASE_URL;

  const key =
    safeKey(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    safeKey((globalThis as any).__APP_ENV__?.VITE_SUPABASE_PUBLISHABLE_KEY) ??
    FALLBACK_SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}

const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
