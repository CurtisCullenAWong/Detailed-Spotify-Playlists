// API endpoint definitions parsed dynamically from Spotify API.json
import spotifyApiData from "../../Spotify API.json";

export interface QueryParamInfo {
  key: string;
  value?: string;
  description?: string;
}

export interface HeaderInfo {
  key: string;
  value?: string;
  description?: string;
}

export interface ApiEndpoint {
  method: string;
  path: string;
  desc: string;
  params?: string; // Keep for backward compatibility
  queryParams?: QueryParamInfo[];
  headers?: HeaderInfo[];
  body?: string;
  deprecated?: boolean;
}

export interface ApiSection {
  name: string;
  endpoints: ApiEndpoint[];
}

function parseApiSections(): ApiSection[] {
  const sectionsMap: Record<string, ApiEndpoint[]> = {};

  function traverse(item: any, parentName: string) {
    if (item.request) {
      // It's a request endpoint
      const method = item.request.method || "GET";
      const name = item.name || "";
      
      // Determine path
      let path = "";
      if (item.request.url) {
        if (typeof item.request.url === "string") {
          path = item.request.url;
        } else if (item.request.url.raw) {
          path = item.request.url.raw;
        }
      }
      
      // Clean up path: remove base_url and query parameters
      path = path.replace(/^\{\{base_url\}\}/, "");
      path = path.replace(/^https?:\/\/[^\/]+/, "");
      const qIndex = path.indexOf("?");
      if (qIndex !== -1) {
        path = path.substring(0, qIndex);
      }
      // Convert {{param}} to {param} for display readability
      path = path.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, "{$1}");
      if (!path.startsWith("/")) {
        path = "/" + path;
      }
      
      const desc = item.request.description || "";
      
      // Extract query parameters
      const queryParams: QueryParamInfo[] = [];
      if (item.request.url && typeof item.request.url === "object" && Array.isArray(item.request.url.query)) {
        item.request.url.query.forEach((q: any) => {
          if (q.key) {
            queryParams.push({
              key: q.key,
              value: q.value || undefined,
              description: q.description || undefined
            });
          }
        });
      }
      
      const params = queryParams.map(q => q.key).filter(Boolean).join(", ");
      
      // Extract headers
      const headers: HeaderInfo[] = [];
      if (item.request.header && Array.isArray(item.request.header)) {
        item.request.header.forEach((h: any) => {
          if (h.key && !h.disabled) {
            headers.push({
              key: h.key,
              value: h.value || undefined,
              description: h.description || undefined
            });
          }
        });
      }
      
      // Extract body
      let body: string | undefined;
      if (item.request.body && item.request.body.mode === "raw" && item.request.body.raw) {
        body = item.request.body.raw;
      }
      
      const deprecated = name.toLowerCase().includes("deprecated");
      
      const endpoint: ApiEndpoint = {
        method,
        path,
        desc,
        params: params || undefined,
        queryParams: queryParams.length > 0 ? queryParams : undefined,
        headers: headers.length > 0 ? headers : undefined,
        body: body || undefined,
        deprecated
      };
      
      // Categorize
      let category = parentName;
      // Skip top-level method groupings (e.g. "GET Requests") to use cleaner nested categories
      if (
        category === "GET Requests" || 
        category === "PUT Requests" || 
        category === "POST Requests" || 
        category === "DELETE Requests" ||
        !category
      ) {
        category = "General";
      }
      
      if (!sectionsMap[category]) {
        sectionsMap[category] = [];
      }
      sectionsMap[category].push(endpoint);
    } else if (item.item && Array.isArray(item.item)) {
      for (const child of item.item) {
        traverse(child, item.name || parentName);
      }
    }
  }

  if (spotifyApiData && Array.isArray((spotifyApiData as any).item)) {
    for (const topItem of (spotifyApiData as any).item) {
      traverse(topItem, "");
    }
  }

  // Pre-defined category ordering for Spotify layout consistency
  const preferredOrder = [
    "User Profiles & Activity",
    "Catalog Information",
    "User Library",
    "Playlists",
    "Player & Playback",
    "Experimental"
  ];
  
  const sections: ApiSection[] = [];
  
  // Add preferred categories in order if they have endpoints
  for (const name of preferredOrder) {
    if (sectionsMap[name] && sectionsMap[name].length > 0) {
      sections.push({
        name,
        endpoints: sectionsMap[name]
      });
      delete sectionsMap[name];
    }
  }
  
  // Add any remaining categories (like "General")
  for (const [name, endpoints] of Object.entries(sectionsMap)) {
    if (endpoints && endpoints.length > 0) {
      sections.push({
        name,
        endpoints
      });
    }
  }
  
  return sections;
}

export const API_SECTIONS: ApiSection[] = parseApiSections();
