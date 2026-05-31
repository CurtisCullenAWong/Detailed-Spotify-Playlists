import type { Track } from "../data";

export type WorkspaceTrackCache = Record<string, Track[]>;

export const WORKSPACE_TRACK_CACHE_KEY = "spotify-manager-workspace-track-cache";
export const CACHE_META_KEY = "spotify-manager-workspace-track-cache-meta";
export const SEGMENT_PREFIX = "spotify-manager-workspace-track-cache:";

// Helper to get access order metadata
const getCacheMeta = (): string[] => {
  try {
    const meta = sessionStorage.getItem(CACHE_META_KEY);
    return meta ? JSON.parse(meta) : [];
  } catch {
    return [];
  }
};

// Helper to save access order metadata
const saveCacheMeta = (meta: string[]) => {
  try {
    sessionStorage.setItem(CACHE_META_KEY, JSON.stringify(meta));
  } catch {}
};

// Helper to update the access order of a key to make it most-recently-used
const touchKey = (key: string) => {
  const meta = getCacheMeta();
  const filtered = meta.filter(k => k !== key);
  filtered.push(key);
  saveCacheMeta(filtered);
};

export const readWorkspaceTrackCache = (): WorkspaceTrackCache => {
  const cache: WorkspaceTrackCache = {};
  try {
    // 1. Check for legacy combined cache to migrate or clear it
    const legacy = sessionStorage.getItem(WORKSPACE_TRACK_CACHE_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as WorkspaceTrackCache;
      // Migrate legacy cache keys to new segmented keys
      const keys = Object.keys(parsed);
      keys.forEach(k => {
        try {
          sessionStorage.setItem(SEGMENT_PREFIX + k, JSON.stringify(parsed[k]));
          touchKey(k);
        } catch {}
      });
      // Remove legacy key
      sessionStorage.removeItem(WORKSPACE_TRACK_CACHE_KEY);
    }

    // 2. Read segmented caches
    const meta = getCacheMeta();
    meta.forEach(key => {
      try {
        const stored = sessionStorage.getItem(SEGMENT_PREFIX + key);
        if (stored) {
          cache[key] = JSON.parse(stored);
        }
      } catch (e) {
        console.warn(`Failed to read cache segment for ${key}:`, e);
      }
    });
  } catch (err) {
    console.warn("Failed to load workspace track cache:", err);
  }
  return cache;
};

export const writeWorkspaceTrackCache = (cache: WorkspaceTrackCache) => {
  const keys = Object.keys(cache);
  if (keys.length === 0) return;

  const meta = getCacheMeta();
  const activeKeys = new Set(keys);
  
  // Sync the metadata keys list to keep active keys and any existing keys
  let updatedMeta = meta.filter(k => activeKeys.has(k) || sessionStorage.getItem(SEGMENT_PREFIX + k) !== null);
  
  // Add any new keys that aren't already tracked
  keys.forEach(k => {
    if (!updatedMeta.includes(k)) {
      updatedMeta.push(k);
    }
  });
  saveCacheMeta(updatedMeta);

  // Write each segment
  keys.forEach(key => {
    const value = cache[key];
    const segmentKey = SEGMENT_PREFIX + key;
    const valueStr = JSON.stringify(value);

    let success = false;
    let attempts = 0;
    while (!success && attempts < 10) {
      try {
        sessionStorage.setItem(segmentKey, valueStr);
        success = true;
        touchKey(key);
      } catch (error: any) {
        attempts++;
        if (error.name === "QuotaExceededError" || error.message?.includes("quota")) {
          const currentMeta = getCacheMeta();
          // Evict the oldest key in metadata that is not the current key we are writing
          const evictableKey = currentMeta.find(k => k !== key);
          
          if (evictableKey) {
            console.info(`SessionStorage quota exceeded. Evicting cache for playlist segment: ${evictableKey}`);
            try {
              sessionStorage.removeItem(SEGMENT_PREFIX + evictableKey);
            } catch {}
            // Remove from metadata list
            const nextMeta = currentMeta.filter(k => k !== evictableKey);
            saveCacheMeta(nextMeta);
            // Also remove from the active cache object to keep in-memory cache in sync
            if (cache[evictableKey]) {
              delete cache[evictableKey];
            }
          } else {
            console.warn("Failed to save workspace track cache: nothing left to evict", error);
            break;
          }
        } else {
          console.warn(`Failed to write cache segment for ${key}:`, error);
          break;
        }
      }
    }
  });
};
