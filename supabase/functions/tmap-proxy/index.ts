import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMAP_API_KEY = Deno.env.get("TMAP_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TmapProxyRequest {
  endpoint: "reverseGeocode" | "poiSearch" | "poiSearchAround" | "pedestrianRoute";
  params: Record<string, string | number>;
  body?: Record<string, any>;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!TMAP_API_KEY) {
    console.error("TMAP_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "TMAP_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { endpoint, params, body }: TmapProxyRequest = await req.json();
    console.log(`Tmap proxy request: ${endpoint}`, params);

    let url: string;
    let method = "GET";
    let requestBody: string | undefined;

    switch (endpoint) {
      case "reverseGeocode": {
        const { lat, lon } = params;
        url = `https://apis.openapi.sk.com/tmap/geo/reversegeocoding?version=1&format=json&coordType=WGS84GEO&addressType=A10&lon=${lon}&lat=${lat}`;
        break;
      }
      case "poiSearch": {
        const { searchKeyword, count = 10 } = params;
        url = `https://apis.openapi.sk.com/tmap/pois?version=1&searchKeyword=${encodeURIComponent(String(searchKeyword))}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=${count}`;
        break;
      }
      case "poiSearchAround": {
        const { centerLon, centerLat, radius = 50, count = 1 } = params;
        url = `https://apis.openapi.sk.com/tmap/pois/search/around?version=1&centerLon=${centerLon}&centerLat=${centerLat}&radius=${radius}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&count=${count}`;
        break;
      }
      case "pedestrianRoute": {
        url = "https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1";
        method = "POST";
        requestBody = JSON.stringify(body);
        break;
      }
      default:
        return new Response(
          JSON.stringify({ error: "Invalid endpoint" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    console.log(`Calling Tmap API: ${method} ${url}`);

    const headers: Record<string, string> = {
      appKey: TMAP_API_KEY,
    };
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    console.log(`Tmap API response status: ${response.status}`);
    
    // 응답 텍스트를 먼저 가져와서 안전하게 파싱
    const responseText = await response.text();
    
    // 빈 응답 처리
    if (!responseText || responseText.trim() === "") {
      console.error("Tmap API returned empty response");
      return new Response(
        JSON.stringify({ error: "Empty response from Tmap API", searchPoiInfo: { pois: { poi: [] } } }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // JSON 파싱 시도
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse Tmap response:", responseText.substring(0, 200));
      return new Response(
        JSON.stringify({ error: "Invalid JSON from Tmap API", rawResponse: responseText.substring(0, 100) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Tmap proxy error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
