// Spotify Web API Client

import { getAccessToken, logout } from "./spotifyAuth";
import type { Track, Playlist, Artist } from "../data";

const BASE_URL = "https://api.spotify.com/v1";

// --- Deprecated-API Feature Flag ---
// Controls whether the deprecated /audio-features and /artists (genre) calls are made.
// Defaults to false (safe). Call setDeprecatedApisEnabled(true) to opt-in.
let _deprecatedApisEnabled = false;
let rateLimitResetTime = 0;

async function checkRateLimit(signal?: AbortSignal | null): Promise<void> {
  const now = Date.now();
  if (now < rateLimitResetTime) {
    const waitMs = rateLimitResetTime - now;
    console.warn(`Rate limit active. Waiting ${waitMs}ms before sending request...`);
    let timeoutId: any;
    const sleepPromise = new Promise<void>((resolve, reject) => {
      timeoutId = setTimeout(resolve, waitMs);
      if (signal) {
        signal.addEventListener("abort", () => {
          clearTimeout(timeoutId);
          reject(new DOMException("The user aborted a request.", "AbortError"));
        });
      }
    });
    try {
      await sleepPromise;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export function setDeprecatedApisEnabled(enabled: boolean): void {
  _deprecatedApisEnabled = enabled;
}

export function getDeprecatedApisEnabled(): boolean {
  return _deprecatedApisEnabled;
}

// --- Shared sleep helper ---
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

type PlaylistProgressCallback = (progress: number) => void;

const inFlightRequests = new Map<string, Promise<any>>();

function buildRequestKey(url: string, options: RequestInit): string {
  const method = (options.method || "GET").toUpperCase();
  const body = typeof options.body === "string" ? options.body : options.body ? "[body]" : "";
  return `${method} ${url} ${body}`;
}

function readPlaylistTrackTotal(tracks: unknown): number {
  if (typeof tracks === "number") {
    return Number.isFinite(tracks) ? tracks : 0;
  }

  if (typeof tracks === "string") {
    const parsed = Number(tracks);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (tracks && typeof tracks === "object") {
    const trackData = tracks as { total?: unknown; count?: unknown };
    if (typeof trackData.total === "number" && Number.isFinite(trackData.total)) {
      return trackData.total;
    }
    if (typeof trackData.count === "number" && Number.isFinite(trackData.count)) {
      return trackData.count;
    }
  }

  return 0;
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string | number | null | undefined): T[] {
  const seen = new Set<string>();
  const uniqueItems: T[] = [];

  for (const item of items) {
    const key = getKey(item);
    if (!key) {
      uniqueItems.push(item);
      continue;
    }

    const normalizedKey = String(key);
    if (seen.has(normalizedKey)) continue;
    seen.add(normalizedKey);
    uniqueItems.push(item);
  }

  return uniqueItems;
}

// --- API Fetch Wrapper with 401 Auto-Retry + 429 Exponential Backoff ---

export async function spotifyFetch(path: string, options: RequestInit = {}): Promise<any> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("No active Spotify session. Please log in.");
  }

  await checkRateLimit(options.signal);
  if (options.signal?.aborted) {
    throw new DOMException("The user aborted a request.", "AbortError");
  }

  const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
  const requestKey = buildRequestKey(url, options);
  const existingRequest = inFlightRequests.get(requestKey);
  if (existingRequest) {
    return existingRequest;
  }

  const headers = new Headers(options.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const requestPromise = (async () => {
    try {
      // Exponential backoff for rate limiting (up to 3 retries)
      let response = await fetch(url, { ...options, headers });
      for (let attempt = 0; attempt < 3 && response.status === 429; attempt++) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "2", 10);
        const waitMs = Math.max(retryAfter * 1000, 1000 * Math.pow(2, attempt));
        rateLimitResetTime = Date.now() + waitMs;
        console.warn(`Rate limited by Spotify. Waiting ${waitMs}ms before retry (attempt ${attempt + 1})...`);
        
        let timeoutId: any;
        const retrySleep = new Promise<void>((resolve, reject) => {
          timeoutId = setTimeout(resolve, waitMs);
          if (options.signal) {
            options.signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              reject(new DOMException("The user aborted a request.", "AbortError"));
            });
          }
        });
        try {
          await retrySleep;
        } finally {
          clearTimeout(timeoutId);
        }
        
        response = await fetch(url, { ...options, headers });
      }

      if (response.status === 401) {
        // Access token might have expired. Try to get it again, which triggers auto-refresh
        const newToken = await getAccessToken();
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          const retryResponse = await fetch(url, { ...options, headers });
          if (retryResponse.status === 204) return null;
          if (!retryResponse.ok) {
            const errorBody = await retryResponse.text().catch(() => "");
            throw new Error(`Spotify API error (${retryResponse.status}): ${retryResponse.statusText}. ${errorBody}`);
          }
          return retryResponse.json();
        } else {
          logout();
          throw new Error("Session expired. Please log in again.");
        }
      }

      if (response.status === 204) {
        return null;
      }

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`Spotify API error (${response.status}): ${response.statusText}. ${errorBody}`);
      }

      const text = await response.text();
      return text ? JSON.parse(text) : null;
    } finally {
      inFlightRequests.delete(requestKey);
    }
  })();

  inFlightRequests.set(requestKey, requestPromise);
  return requestPromise;
}

// --- Full Paginator: fetches all pages from a Spotify paged endpoint ---
// Works with any endpoint returning { items, next, total } shaped responses.
async function fetchAllPages<T>(
  firstPagePath: string,
  itemMapper: (item: any) => T,
  delayMs = 100,
  onProgress?: PlaylistProgressCallback,
  signal?: AbortSignal,
  onChunk?: (items: T[]) => Promise<void> | void
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = firstPagePath.startsWith("http")
    ? firstPagePath
    : `${BASE_URL}${firstPagePath}`;
  let totalItems: number | null = null;

  while (nextUrl) {
    if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
    const data = await spotifyFetch(nextUrl, { signal });
    if (!data?.items) break;
    totalItems = typeof data.total === "number" ? data.total : totalItems;

    const chunkResults = [];
    for (const item of data.items) {
      if (item == null) continue; // skip nulls Spotify sends for deleted items
      try {
        const mapped = itemMapper(item);
        results.push(mapped);
        chunkResults.push(mapped);
      } catch (err) {
        console.warn("fetchAllPages: skipping malformed item from Spotify:", err, item);
      }
    }

    if (onChunk && chunkResults.length > 0) {
      await onChunk(chunkResults);
    }

    nextUrl = data.next ?? null;
    if (onProgress && totalItems && totalItems > 0) {
      onProgress(Math.min(100, Math.round((results.length / totalItems) * 100)));
    }
    if (nextUrl) {
      if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      let timeoutId: any;
      const sleepPromise = new Promise<void>((resolve, reject) => {
        timeoutId = setTimeout(resolve, delayMs);
        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      });
      try {
        await sleepPromise;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  if (onProgress) onProgress(100);
  return results;
}

// --- Dynamic Relative Time Formatter ---

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

import { formatDuration } from "./formatters";

// --- Track Enrichment Helper (Batch fetch audio features & artist genres) ---

export async function enrichTracks(tracks: any[], signal?: AbortSignal): Promise<Track[]> {
  const validTracks = (tracks || []).filter(t => t !== null && t !== undefined);
  if (validTracks.length === 0) return [];

  const trackIds = validTracks.map(t => t.id).filter(id => !!id);
  const artistIds = Array.from(new Set(validTracks.flatMap(t => t.artists?.map((a: any) => a.id) || []))).filter(id => !!id) as string[];

  // 1. Fetch Audio Features (deprecated endpoint — only if feature flag is on)
  const featuresMap = new Map<string, any>();
  if (_deprecatedApisEnabled) {
    for (let i = 0; i < trackIds.length; i += 50) {
      if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      const chunk = trackIds.slice(i, i + 50);
      try {
        const data = await spotifyFetch(`/audio-features?ids=${chunk.join(",")}`, { signal });
        data.audio_features?.forEach((f: any) => {
          if (f) featuresMap.set(f.id, f);
        });
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        console.warn("Failed to fetch audio features chunk:", err);
      }
      if (i + 50 < trackIds.length) {
        if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
        let timeoutId: any;
        const sleepPromise = new Promise<void>((resolve, reject) => {
          timeoutId = setTimeout(resolve, 200);
          if (signal) {
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              reject(new DOMException("The user aborted a request.", "AbortError"));
            });
          }
        });
        try {
          await sleepPromise;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  }

  // 2. Fetch Artists for Genre mapping (deprecated endpoint — only if feature flag is on)
  const genresMap = new Map<string, string>();
  if (_deprecatedApisEnabled) {
    for (let i = 0; i < artistIds.length; i += 50) {
      if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      const chunk = artistIds.slice(i, i + 50);
      try {
        const data = await spotifyFetch(`/artists?ids=${chunk.join(",")}`, { signal });
        data.artists?.forEach((a: any) => {
          if (a && a.genres && a.genres.length > 0) {
            genresMap.set(a.id, a.genres[0]);
          }
        });
      } catch (err: any) {
        if (err.name === "AbortError") throw err;
        console.warn("Failed to fetch artists chunk:", err);
      }
      if (i + 50 < artistIds.length) {
        if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
        let timeoutId: any;
        const sleepPromise = new Promise<void>((resolve, reject) => {
          timeoutId = setTimeout(resolve, 100);
          if (signal) {
            signal.addEventListener("abort", () => {
              clearTimeout(timeoutId);
              reject(new DOMException("The user aborted a request.", "AbortError"));
            });
          }
        });
        try {
          await sleepPromise;
        } finally {
          clearTimeout(timeoutId);
        }
      }
    }
  }

  // 3. Map tracks with enriched values
  return validTracks.map((t, idx) => {
    const features = featuresMap.get(t.id);
    const primaryArtistId = t.artists?.[0]?.id;
    const rawGenre = (_deprecatedApisEnabled && primaryArtistId) ? genresMap.get(primaryArtistId) : undefined;
    const genre = rawGenre || "-";

    return {
      id: t.id,
      title: t.name,
      artist: t.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
      album: t.album?.name || "Unknown Album",
      cover: t.album?.images?.[0]?.url || "",
      genre: genre === "-" ? "-" : genre.split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
      releaseYear: t.album?.release_date ? new Date(t.album.release_date).getFullYear() : 2024,
      releaseDate: t.album?.release_date || "",
      dateAdded: t.added_at ? t.added_at.split("T")[0] : new Date().toISOString().split("T")[0],
      bpm: features?.tempo ? Math.round(features.tempo) : undefined,
      energy: features?.energy !== undefined ? Number(features.energy.toFixed(3)) : undefined,
      popularity: t.popularity ?? 0,
      danceability: features?.danceability !== undefined ? Number(features.danceability.toFixed(3)) : undefined,
      valence: features?.valence !== undefined ? Number(features.valence.toFixed(3)) : undefined,
      acousticness: features?.acousticness !== undefined ? Number(features.acousticness.toFixed(3)) : undefined,
      instrumentalness: features?.instrumentalness !== undefined ? Number(features.instrumentalness.toFixed(3)) : undefined,
      speechiness: features?.speechiness !== undefined ? Number(features.speechiness.toFixed(3)) : undefined,
      liveness: features?.liveness !== undefined ? Number(features.liveness.toFixed(3)) : undefined,
      loudness: features?.loudness !== undefined ? Number(features.loudness.toFixed(1)) : undefined,
      duration: formatDuration(t.duration_ms),
      durationMs: t.duration_ms,
    };
  });
}

// --- Specific Spotify API Functions ---

// 1. Current User Profile
export async function getCurrentUser(): Promise<{ displayName: string; imageUrl: string; id: string }> {
  const data = await spotifyFetch("/me");
  return {
    displayName: data.display_name,
    imageUrl: data.images?.[0]?.url || "",
    id: data.id,
  };
}

// 2. Playlists (User's and followed ones) — fully paginated
export async function getUserPlaylists(currentUserId: string): Promise<Playlist[]> {
  const playlists = await fetchAllPages<Playlist>(
    "/me/playlists?limit=50",
    (pl) => ({
      id: pl.id,
      name: pl.name || "Untitled Playlist",
      desc: pl.description || "No description",
      tracks: readPlaylistTrackTotal(pl.tracks ?? pl.items),
      cover: pl.images?.[0]?.url || "bg-gradient-to-br from-slate-700 to-zinc-900",
      owner: pl.owner?.id === currentUserId ? "yours" : "followed",
    }),
    120 // 120ms between pages to stay safely under rate limits
  );

  const deduped = dedupeByKey(playlists, playlist => playlist.id);

  // Load or initialize creation dates
  let dateMap: Record<string, string> = {};
  try {
    const stored = localStorage.getItem("spotify-playlist-creation-dates");
    if (stored) dateMap = JSON.parse(stored);
  } catch (e) {
    console.warn("Failed to load playlist creation dates", e);
  }

  let updated = false;
  const enriched = deduped.map((pl, index) => {
    const key = String(pl.id);
    if (!dateMap[key]) {
      // Mock a creation date that preserves order: older playlists created earlier
      const date = new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toISOString();
      dateMap[key] = date;
      updated = true;
    }
    return {
      ...pl,
      dateCreated: dateMap[key],
    };
  });

  if (updated) {
    try {
      localStorage.setItem("spotify-playlist-creation-dates", JSON.stringify(dateMap));
    } catch (e) {
      console.warn("Failed to save playlist creation dates", e);
    }
  }

  return enriched;
}

// 3. Playlist Tracks or Liked Songs (single playlist, enriched)
export async function getPlaylistTracks(
  playlistId: string | number,
  onProgress?: PlaylistProgressCallback,
  signal?: AbortSignal,
  onStream?: (tracks: Track[]) => void
): Promise<Track[]> {
  const accumulated: Track[] = [];
  const items = await getRawPlaylistTracks(playlistId, onProgress, signal, onStream ? async (chunk) => {
    try {
      const enriched = await enrichTracks(chunk, signal);
      accumulated.push(...enriched);
      onStream([...accumulated]);
    } catch (e) {
      console.warn("enriching chunk failed", e);
    }
  } : undefined);
  
  if (onStream) return accumulated;
  return await enrichTracks(items, signal);
}

// 3a. Fetch raw (un-enriched) track items for a single playlist — fully paginated
export async function getRawPlaylistTracks(
  playlistId: string | number,
  onProgress?: PlaylistProgressCallback,
  signal?: AbortSignal,
  onChunk?: (items: any[]) => Promise<void> | void
): Promise<any[]> {
  const resolvePlaylistTrack = (entry: any) => entry?.track ?? entry?.item ?? null;

  if (playlistId === "liked") {
    let totalAdded = 0;
    const seen = new Set<string>();
    const items = await fetchAllPages<any>(
      "/me/tracks?limit=50",
      (i) => ({ ...i.track, added_at: i.added_at }),
      150,
      onProgress,
      signal,
      onChunk ? async (chunk) => {
        const uniqueItems = [];
        for (const item of chunk) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            uniqueItems.push({ ...item, rowKey: `${String(playlistId)}:${totalAdded++}` });
          }
        }
        if (uniqueItems.length > 0) await onChunk(uniqueItems);
      } : undefined
    );
    const retSeen = new Set<string>();
    const uniqueItems: any[] = [];
    for (const item of items) {
      if (item?.id && !retSeen.has(item.id)) {
        retSeen.add(item.id);
        uniqueItems.push(item);
      }
    }
    return uniqueItems.map((item, index) => ({ ...item, rowKey: `${String(playlistId)}:${index}` }));
  } else {
    let totalAdded = 0;
    const seen = new Set<string>();
    const items = await fetchAllPages<any>(
      `/playlists/${playlistId}/items?limit=50`,
      (i) => {
        const track = resolvePlaylistTrack(i);
        if (!track) return null as any; // will be filtered below
        return { ...track, added_at: i.added_at };
      },
      150,
      onProgress,
      signal,
      onChunk ? async (chunk) => {
        const uniqueItems = [];
        for (const item of chunk) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            uniqueItems.push({ ...item, rowKey: `${String(playlistId)}:${totalAdded++}` });
          }
        }
        if (uniqueItems.length > 0) await onChunk(uniqueItems);
      } : undefined
    );
    const retSeen = new Set<string>();
    const uniqueItems: any[] = [];
    for (const item of items) {
      if (item?.id && !retSeen.has(item.id)) {
        retSeen.add(item.id);
        uniqueItems.push(item);
      }
    }
    return uniqueItems.map((item, index) => ({ ...item, rowKey: `${String(playlistId)}:${index}` }));
  }
}

// 3b. Fetch multiple playlists sequentially and enrich all tracks in ONE pass
export async function getMultiPlaylistTracks(
  playlistIds: (string | number)[],
  onProgress?: PlaylistProgressCallback,
  signal?: AbortSignal,
  onStream?: (tracks: Track[]) => void
): Promise<Track[]> {
  const allRaw: any[] = [];
  const allEnriched: Track[] = [];
  const seen = new Set<string>();
  const playlistCount = Math.max(playlistIds.length, 1);

  for (let i = 0; i < playlistIds.length; i++) {
    if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
    try {
      const items = await getRawPlaylistTracks(playlistIds[i], (playlistPercent) => {
        if (onProgress) {
          const overall = Math.min(100, Math.round(((i + playlistPercent / 100) / playlistCount) * 100));
          onProgress(overall);
        }
      }, signal, onStream ? async (chunk) => {
        const uniqueChunk = [];
        for (const item of chunk) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            uniqueChunk.push(item);
          }
        }
        if (uniqueChunk.length > 0) {
          try {
            const enriched = await enrichTracks(uniqueChunk, signal);
            allEnriched.push(...enriched);
            onStream([...allEnriched]);
          } catch (e) {
            console.warn("enriching chunk failed", e);
          }
        }
      } : undefined);
      
      if (!onStream) {
        for (const item of items) {
          if (item?.id && !seen.has(item.id)) {
            seen.add(item.id);
            allRaw.push(item);
          }
        }
      }
    } catch (err: any) {
      if (err.name === "AbortError") throw err;
      console.warn(`Failed to load tracks for playlist ${playlistIds[i]}:`, err);
    }
    // Small pause between playlist fetches to avoid hammering the API
    if (i < playlistIds.length - 1) {
      if (signal?.aborted) throw new DOMException("The user aborted a request.", "AbortError");
      let timeoutId: any;
      const sleepPromise = new Promise<void>((resolve, reject) => {
        timeoutId = setTimeout(resolve, 150);
        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            reject(new DOMException("The user aborted a request.", "AbortError"));
          });
        }
      });
      try {
        await sleepPromise;
      } finally {
        clearTimeout(timeoutId);
      }
    }
  }

  if (onProgress) onProgress(100);
  if (onStream) return allEnriched;
  return await enrichTracks(allRaw, signal);
}

// 4. Get Liked Songs count
export async function getLikedSongsCount(): Promise<number> {
  const data = await spotifyFetch("/me/tracks?limit=1");
  return data?.total ?? 0;
}

// 5. Recently Played Tracks
export async function getRecentlyPlayed(): Promise<any[]> {
  const data = await spotifyFetch("/me/player/recently-played?limit=6");
  if (!data?.items?.length) return [];
  const recentlyPlayed = data.items
    .filter((item: any) => item?.track?.name)
    .map((item: any) => ({
      title: item.track.name,
      ago: formatRelativeTime(item.played_at),
      cover: item.track.album?.images?.[0]?.url || "bg-gradient-to-br from-blue-900 to-indigo-950",
      uri: item.track.uri,
    }));

  return dedupeByKey(recentlyPlayed, item => item.uri);
}

// 6. Top Artists
export async function getTopArtists(): Promise<Artist[]> {
  // time_range: medium_term = last 6 months (API spec default). limit=50 is the max.
  const data = await spotifyFetch("/me/top/artists?time_range=medium_term&limit=50&offset=0");
  if (!data?.items?.length) return [];
  const topArtists = data.items
    .filter((artist: any) => artist?.id)
    .map((artist: any, index: number) => ({
      id: artist.id,
      uri: artist.uri,
      name: artist.name,
      genre: artist.genres?.[0]?.toUpperCase() || "POP",
      plays: String((50 - index) * 20 + Math.round((artist.popularity ?? 0) / 10)), // Mock play count descending with payload rank
      cover: artist.images?.[0]?.url || "bg-gradient-to-br from-orange-400 to-pink-500",
    }));

  return dedupeByKey(topArtists, artist => artist.id);
}

// 7. Search
export async function searchSpotify(query: string): Promise<{
  tracks: Track[];
  artists: Artist[];
  playlists: Playlist[];
  albums: any[];
}> {
  const data = await spotifyFetch(`/search?q=${encodeURIComponent(query)}&type=track,artist,playlist,album&limit=10`);

  // Map Spotify entities
  const tracks = data.tracks?.items ? Array.from(
    new Map(
      (await enrichTracks(data.tracks.items.filter((item: any) => item !== null && item !== undefined))).map(track => [String(track.id), track])
    ).values()
  ) : [];

  const artists = data.artists?.items
    ?.filter((a: any) => a !== null && a !== undefined)
    .map((a: any) => ({
      id: a.id,
      uri: a.uri,
      name: a.name,
      genre: a.genres?.[0]?.toUpperCase() || "GENRE",
      plays: Math.round(a.popularity * 15),
      cover: a.images?.[0]?.url || "bg-gradient-to-br from-orange-400 to-pink-500",
    })) || [];

  const playlists = data.playlists?.items
    ?.filter((p: any) => p !== null && p !== undefined)
    .map((p: any) => ({
      id: p.id,
      name: p.name,
      desc: p.description || "",
      tracks: readPlaylistTrackTotal(p.tracks),
      cover: p.images?.[0]?.url || "bg-gradient-to-br from-slate-700 to-zinc-900",
      owner: "yours" as const, // Default search playlists as yours
    })) || [];

  const albums = data.albums?.items
    ?.filter((a: any) => a !== null && a !== undefined)
    .map((a: any) => ({
      id: a.id,
      album: a.name,
      artist: a.artists?.map((art: any) => art.name).join(", "),
      releaseYear: a.release_date ? new Date(a.release_date).getFullYear() : 2024,
      releaseDate: a.release_date || "",
      cover: a.images?.[0]?.url || "bg-gradient-to-br from-slate-700 to-zinc-900",
    })) || [];

  return { tracks, artists, playlists, albums };
}

// 8. Player API
function notifyPlaybackChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("spotify-playback-trigger"));
  }
}

export async function getPlayerState(): Promise<any> {
  return await spotifyFetch("/me/player");
}

export async function playTrack(params: {
  deviceId?: string;
  contextUri?: string;
  uris?: string[];
  offset?: { position: number } | { uri: string };
  positionMs?: number;
}): Promise<void> {
  const body: any = {};
  if (params.contextUri) body.context_uri = params.contextUri;
  if (params.uris) body.uris = params.uris;
  if (params.offset) body.offset = params.offset;
  if (params.positionMs) body.position_ms = params.positionMs;

  const query = params.deviceId ? `?device_id=${params.deviceId}` : "";
  await spotifyFetch(`/me/player/play${query}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  notifyPlaybackChange();
}

export async function pauseTrack(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await spotifyFetch(`/me/player/pause${query}`, { method: "PUT" });
  notifyPlaybackChange();
}

export async function skipToNext(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await spotifyFetch(`/me/player/next${query}`, { method: "POST" });
  notifyPlaybackChange();
}

export async function skipToPrevious(deviceId?: string): Promise<void> {
  const query = deviceId ? `?device_id=${deviceId}` : "";
  await spotifyFetch(`/me/player/previous${query}`, { method: "POST" });
  notifyPlaybackChange();
}

export async function setPlayerVolume(volumePercent: number, deviceId?: string): Promise<void> {
  const queryParams = new URLSearchParams({ volume_percent: String(volumePercent) });
  if (deviceId) queryParams.set("device_id", deviceId);
  await spotifyFetch(`/me/player/volume?${queryParams.toString()}`, { method: "PUT" });
  notifyPlaybackChange();
}

export async function seekPosition(positionMs: number, deviceId?: string): Promise<void> {
  const queryParams = new URLSearchParams({ position_ms: String(positionMs) });
  if (deviceId) queryParams.set("device_id", deviceId);
  await spotifyFetch(`/me/player/seek?${queryParams.toString()}`, { method: "PUT" });
  notifyPlaybackChange();
}

export async function toggleShuffle(state: boolean, deviceId?: string): Promise<void> {
  const queryParams = new URLSearchParams({ state: String(state) });
  if (deviceId) queryParams.set("device_id", deviceId);
  await spotifyFetch(`/me/player/shuffle?${queryParams.toString()}`, { method: "PUT" });
  notifyPlaybackChange();
}

export async function toggleRepeat(state: "track" | "context" | "off", deviceId?: string): Promise<void> {
  const queryParams = new URLSearchParams({ state });
  if (deviceId) queryParams.set("device_id", deviceId);
  await spotifyFetch(`/me/player/repeat?${queryParams.toString()}`, { method: "PUT" });
  notifyPlaybackChange();
}

// 9. Playlist Management
export async function addTracksToPlaylist(playlistId: string | number, trackUris: string[]): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/items`, {
    method: "POST",
    body: JSON.stringify({ uris: trackUris }),
  });
}

export async function removeTracksFromPlaylist(playlistId: string | number, trackUris: string[]): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/items`, {
    method: "DELETE",
    body: JSON.stringify({
      tracks: trackUris.map(uri => ({ uri })),
    }),
  });
}

export async function createPlaylist(
  details: { name: string; description?: string; public?: boolean; collaborative?: boolean }
): Promise<any> {
  return await spotifyFetch("/me/playlists", {
    method: "POST",
    body: JSON.stringify(details),
  });
}

export async function getPlaylistSnapshotId(playlistId: string | number): Promise<string | null> {
  if (playlistId === "liked") return null;

  const data = await spotifyFetch(`/playlists/${playlistId}?fields=snapshot_id`);
  return data?.snapshot_id ?? null;
}

export async function reorderPlaylistTracks(
  playlistId: string | number,
  initialTrackIds: string[],
  desiredTrackIds: string[],
  snapshotId: string | null = null,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (desiredTrackIds.length < 2) return;

  const workingOrder = [...initialTrackIds];
  let currentSnapshotId = snapshotId;
  let moveCount = 0;

  // Pre-calculate the total moves needed to calculate accurate progress
  let totalMovesNeeded = 0;
  const tempWorkingOrder = [...initialTrackIds];
  for (let targetIndex = 0; targetIndex < desiredTrackIds.length; targetIndex++) {
    const desiredTrackId = desiredTrackIds[targetIndex];
    if (tempWorkingOrder[targetIndex] === desiredTrackId) continue;
    const currentIndex = tempWorkingOrder.indexOf(desiredTrackId);
    if (currentIndex === -1) continue;
    totalMovesNeeded++;
    const [movedTrackId] = tempWorkingOrder.splice(currentIndex, 1);
    tempWorkingOrder.splice(targetIndex, 0, movedTrackId);
  }

  if (totalMovesNeeded === 0) {
    if (onProgress) onProgress(100);
    return;
  }

  for (let targetIndex = 0; targetIndex < desiredTrackIds.length; targetIndex++) {
    const desiredTrackId = desiredTrackIds[targetIndex];
    if (workingOrder[targetIndex] === desiredTrackId) continue;

    const currentIndex = workingOrder.indexOf(desiredTrackId);
    if (currentIndex === -1) continue;

    const payload: Record<string, unknown> = {
      range_start: currentIndex,
      insert_before: targetIndex,
      range_length: 1,
    };

    if (currentSnapshotId) {
      payload.snapshot_id = currentSnapshotId;
    }

    const response = await spotifyFetch(`/playlists/${playlistId}/items`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (response?.snapshot_id) {
      currentSnapshotId = response.snapshot_id;
    }

    const [movedTrackId] = workingOrder.splice(currentIndex, 1);
    workingOrder.splice(targetIndex, 0, movedTrackId);

    moveCount++;
    if (onProgress) {
      onProgress(Math.round((moveCount / totalMovesNeeded) * 100));
    }
  }
  if (onProgress) onProgress(100);
}

// 10. Update Playlist Details
export async function updatePlaylistDetails(
  playlistId: string | number,
  details: { name: string; description?: string; public?: boolean; collaborative?: boolean }
): Promise<any> {
  return await spotifyFetch(`/playlists/${playlistId}`, {
    method: "PUT",
    body: JSON.stringify(details),
  });
}

// 11. Upload Custom Playlist Cover Image
export async function uploadPlaylistCoverImage(
  playlistId: string | number,
  base64JpegData: string
): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/images`, {
    method: "PUT",
    headers: {
      "Content-Type": "image/jpeg",
    },
    body: base64JpegData,
  });
}

// 12. Unfollow Playlist (Delete)
export async function unfollowPlaylist(playlistId: string | number): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}/followers`, {
    method: "DELETE",
  });
}
