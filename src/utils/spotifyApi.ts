// Spotify Web API Client (Mock Static Mode)

import { getAccessToken, logout } from "./spotifyAuth";
import type { Track, Playlist, Artist } from "../data";
import { TRACKS, PLAYLISTS, TOP_ARTISTS, RECENTLY_PLAYED, LIKED_SONGS_COUNT } from "../data";

let _deprecatedApisEnabled = true;

export function setDeprecatedApisEnabled(enabled: boolean): void {
  _deprecatedApisEnabled = enabled;
}

export function getDeprecatedApisEnabled(): boolean {
  return _deprecatedApisEnabled;
}

// In-memory mutable state for playlists & tracks
let mockPlaylists: Playlist[] = [...PLAYLISTS];
let mockTracks: Track[] = [...TRACKS];

// Map playlistId -> Track[]
const mockPlaylistTracksMap: Record<string, Track[]> = {
  liked: mockTracks.slice(0, 10),
  "pl-1": mockTracks.slice(0, 8),
  "pl-2": mockTracks.slice(4, 12),
  "pl-3": mockTracks.slice(2, 10),
  "pl-4": mockTracks.slice(1, 14),
  "pl-5": mockTracks.slice(6, 15),
  "pl-6": mockTracks.slice(0, 6),
};

// In-memory playback state
let mockPlaybackState: any = {
  is_playing: true,
  progress_ms: 45000,
  shuffle_state: false,
  repeat_state: "off",
  device: {
    id: "mock-device-1",
    name: "Web Player (Demo)",
    type: "Computer",
    volume_percent: 75,
  },
  item: {
    id: mockTracks[0].id,
    name: mockTracks[0].title,
    artists: [{ id: mockTracks[0].artistId, name: mockTracks[0].artist }],
    album: {
      id: mockTracks[0].albumId,
      name: mockTracks[0].album,
      images: [{ url: mockTracks[0].cover }],
      release_date: mockTracks[0].releaseDate,
    },
    duration_ms: mockTracks[0].durationMs,
    uri: `spotify:track:${mockTracks[0].id}`,
  },
  context: {
    uri: "spotify:playlist:liked",
  },
};

function notifyPlaybackChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("spotify-playback-trigger"));
  }
}

export async function spotifyFetch(path: string, options: RequestInit = {}): Promise<any> {
  return Promise.resolve(null);
}

export async function enrichTracks(tracks: any[], signal?: AbortSignal): Promise<Track[]> {
  return (tracks || []).map((t) => {
    if (t.title && t.duration) return t as Track;
    return {
      id: t.id || "track-mock",
      title: t.name || t.title || "Untitled Track",
      artist: t.artists?.map((a: any) => a.name).join(", ") || t.artist || "Unknown Artist",
      artistId: t.artists?.[0]?.id || t.artistId || "artist-1",
      album: t.album?.name || t.album || "Unknown Album",
      albumId: t.album?.id || t.albumId || "album-1",
      cover: t.album?.images?.[0]?.url || t.cover || "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
      genre: t.genre || "Pop",
      releaseYear: t.releaseYear || (t.album?.release_date ? new Date(t.album.release_date).getFullYear() : 2024),
      releaseDate: t.releaseDate || t.album?.release_date || "2024-01-01",
      dateAdded: t.dateAdded || "2024-02-01",
      trackNumber: t.track_number ?? t.trackNumber ?? 1,
      bpm: t.bpm ?? 120,
      energy: t.energy ?? 0.8,
      popularity: t.popularity ?? 85,
      danceability: t.danceability ?? 0.7,
      valence: t.valence ?? 0.6,
      acousticness: t.acousticness ?? 0.2,
      instrumentalness: t.instrumentalness ?? 0.1,
      speechiness: t.speechiness ?? 0.05,
      liveness: t.liveness ?? 0.15,
      loudness: t.loudness ?? -6.0,
      duration: t.duration || "3:30",
      durationMs: t.durationMs || t.duration_ms || 210000,
    };
  });
}

// 1. Current User Profile
export async function getCurrentUser(): Promise<{ displayName: string; imageUrl: string; id: string }> {
  return Promise.resolve({
    displayName: "Curtis Cullen",
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    id: "curtiscullen",
  });
}

// 2. Playlists
export async function getUserPlaylists(currentUserId: string): Promise<Playlist[]> {
  return Promise.resolve([...mockPlaylists]);
}

// 3. Playlist Tracks
export async function getPlaylistTracks(
  playlistId: string | number,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  onStream?: (tracks: Track[]) => void
): Promise<Track[]> {
  const key = String(playlistId);
  const tracks = mockPlaylistTracksMap[key] || mockTracks.slice(0, 10);
  if (onProgress) onProgress(100);
  if (onStream) onStream(tracks);
  return Promise.resolve([...tracks]);
}

export async function getRawPlaylistTracks(
  playlistId: string | number,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  onChunk?: (items: any[]) => Promise<void> | void
): Promise<any[]> {
  const key = String(playlistId);
  const tracks = mockPlaylistTracksMap[key] || mockTracks.slice(0, 10);
  const rawItems = tracks.map((t, idx) => ({
    id: t.id,
    name: t.title,
    artists: [{ id: t.artistId || "artist-1", name: t.artist }],
    album: { id: t.albumId || "album-1", name: t.album, images: [{ url: t.cover }] },
    duration_ms: t.durationMs,
    popularity: t.popularity,
    added_at: "2024-02-01T12:00:00Z",
    rowKey: `${key}:${idx}`,
  }));
  if (onProgress) onProgress(100);
  if (onChunk) await onChunk(rawItems);
  return Promise.resolve(rawItems);
}

export async function getMultiPlaylistTracks(
  playlistIds: (string | number)[],
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
  onStream?: (tracks: Track[]) => void
): Promise<Track[]> {
  const allTracks: Track[] = [];
  const seen = new Set<string>();

  for (const pid of playlistIds) {
    const key = String(pid);
    const tracks = mockPlaylistTracksMap[key] || mockTracks;
    for (const t of tracks) {
      if (!seen.has(String(t.id))) {
        seen.add(String(t.id));
        allTracks.push(t);
      }
    }
  }

  if (onProgress) onProgress(100);
  if (onStream) onStream(allTracks);
  return Promise.resolve(allTracks);
}

// 4. Liked Songs Count
export async function getLikedSongsCount(): Promise<number> {
  const liked = mockPlaylistTracksMap["liked"] || [];
  return Promise.resolve(liked.length || LIKED_SONGS_COUNT);
}

// 5. Recently Played
export async function getRecentlyPlayed(): Promise<any[]> {
  return Promise.resolve(
    RECENTLY_PLAYED.map((rp, idx) => ({
      ...rp,
      id: rp.id || `track-${idx + 1}`,
      uri: rp.uri || `spotify:track:${rp.id || idx + 1}`,
    }))
  );
}

// 6. Top Artists
export async function getTopArtists(): Promise<Artist[]> {
  return Promise.resolve([...TOP_ARTISTS]);
}

// 7. Search
export async function searchSpotify(query: string): Promise<{
  tracks: Track[];
  artists: Artist[];
  playlists: Playlist[];
  albums: any[];
}> {
  const q = query.toLowerCase().trim();
  if (!q) {
    return Promise.resolve({
      tracks: mockTracks.slice(0, 6),
      artists: TOP_ARTISTS.slice(0, 4),
      playlists: mockPlaylists.slice(0, 4),
      albums: [],
    });
  }

  const filteredTracks = mockTracks.filter(
    (t) => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q) || t.album.toLowerCase().includes(q)
  );

  const filteredArtists = TOP_ARTISTS.filter(
    (a) => a.name.toLowerCase().includes(q) || a.genre.toLowerCase().includes(q)
  );

  const filteredPlaylists = mockPlaylists.filter(
    (p) => p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q)
  );

  const albumsMap = new Map<string, any>();
  mockTracks.forEach((t) => {
    if (t.album.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q)) {
      if (!albumsMap.has(t.album)) {
        albumsMap.set(t.album, {
          id: t.albumId || `album-${t.id}`,
          album: t.album,
          artist: t.artist,
          releaseYear: t.releaseYear,
          releaseDate: t.releaseDate,
          cover: t.cover,
        });
      }
    }
  });

  return Promise.resolve({
    tracks: filteredTracks,
    artists: filteredArtists,
    playlists: filteredPlaylists,
    albums: Array.from(albumsMap.values()),
  });
}

// 8. Player Controls
export async function getPlayerState(): Promise<any> {
  return Promise.resolve(mockPlaybackState);
}

export async function playTrack(params: {
  deviceId?: string;
  contextUri?: string;
  uris?: string[];
  offset?: { position: number } | { uri: string };
  positionMs?: number;
}): Promise<void> {
  let targetTrack: Track | undefined;

  if (params.uris && params.uris.length > 0) {
    const pos = typeof params.offset === "object" && "position" in params.offset ? params.offset.position : 0;
    const uri = params.uris[pos] || params.uris[0];
    const trackId = uri.replace("spotify:track:", "");
    targetTrack = mockTracks.find((t) => String(t.id) === String(trackId));
  } else if (params.contextUri) {
    const plId = params.contextUri.replace("spotify:playlist:", "");
    const playlistTracks = mockPlaylistTracksMap[plId] || mockTracks;
    targetTrack = playlistTracks[0];
  }

  if (!targetTrack) {
    targetTrack = mockTracks[0];
  }

  mockPlaybackState = {
    ...mockPlaybackState,
    is_playing: true,
    progress_ms: params.positionMs ?? 0,
    item: {
      id: targetTrack.id,
      name: targetTrack.title,
      artists: [{ id: targetTrack.artistId || "artist-1", name: targetTrack.artist }],
      album: {
        id: targetTrack.albumId || "album-1",
        name: targetTrack.album,
        images: [{ url: targetTrack.cover }],
        release_date: targetTrack.releaseDate,
      },
      duration_ms: targetTrack.durationMs,
      uri: `spotify:track:${targetTrack.id}`,
    },
  };

  notifyPlaybackChange();
  return Promise.resolve();
}

export async function pauseTrack(deviceId?: string): Promise<void> {
  mockPlaybackState = {
    ...mockPlaybackState,
    is_playing: false,
  };
  notifyPlaybackChange();
  return Promise.resolve();
}

export async function skipToNext(deviceId?: string): Promise<void> {
  const currentId = mockPlaybackState?.item?.id;
  const currentIdx = mockTracks.findIndex((t) => String(t.id) === String(currentId));
  const nextTrack = mockTracks[(currentIdx + 1) % mockTracks.length];

  return playTrack({ uris: [`spotify:track:${nextTrack.id}`] });
}

export async function skipToPrevious(deviceId?: string): Promise<void> {
  const currentId = mockPlaybackState?.item?.id;
  const currentIdx = mockTracks.findIndex((t) => String(t.id) === String(currentId));
  const prevIdx = currentIdx <= 0 ? mockTracks.length - 1 : currentIdx - 1;
  const prevTrack = mockTracks[prevIdx];

  return playTrack({ uris: [`spotify:track:${prevTrack.id}`] });
}

export async function setPlayerVolume(volumePercent: number, deviceId?: string): Promise<void> {
  if (mockPlaybackState?.device) {
    mockPlaybackState.device.volume_percent = volumePercent;
  }
  notifyPlaybackChange();
  return Promise.resolve();
}

export async function seekPosition(positionMs: number, deviceId?: string): Promise<void> {
  mockPlaybackState.progress_ms = positionMs;
  notifyPlaybackChange();
  return Promise.resolve();
}

export async function toggleShuffle(state: boolean, deviceId?: string): Promise<void> {
  mockPlaybackState.shuffle_state = state;
  notifyPlaybackChange();
  return Promise.resolve();
}

export async function toggleRepeat(state: "track" | "context" | "off", deviceId?: string): Promise<void> {
  mockPlaybackState.repeat_state = state;
  notifyPlaybackChange();
  return Promise.resolve();
}

// 9. Playlist CRUD Operations
export async function addTracksToPlaylist(playlistId: string | number, trackUris: string[]): Promise<void> {
  const key = String(playlistId);
  if (!mockPlaylistTracksMap[key]) {
    mockPlaylistTracksMap[key] = [];
  }

  const addedTracks: Track[] = [];
  for (const uri of trackUris) {
    const trackId = uri.replace("spotify:track:", "");
    const found = mockTracks.find((t) => String(t.id) === String(trackId));
    if (found) {
      addedTracks.push(found);
    }
  }

  mockPlaylistTracksMap[key].push(...addedTracks);

  const pl = mockPlaylists.find((p) => String(p.id) === key);
  if (pl) {
    pl.tracks = mockPlaylistTracksMap[key].length;
  }

  return Promise.resolve();
}

export async function removeTracksFromPlaylist(playlistId: string | number, trackUris: string[]): Promise<void> {
  const key = String(playlistId);
  if (mockPlaylistTracksMap[key]) {
    const removeSet = new Set(trackUris.map((u) => u.replace("spotify:track:", "")));
    mockPlaylistTracksMap[key] = mockPlaylistTracksMap[key].filter((t) => !removeSet.has(String(t.id)));

    const pl = mockPlaylists.find((p) => String(p.id) === key);
    if (pl) {
      pl.tracks = mockPlaylistTracksMap[key].length;
    }
  }
  return Promise.resolve();
}

export async function createPlaylist(details: {
  name: string;
  description?: string;
  public?: boolean;
  collaborative?: boolean;
}): Promise<any> {
  const newId = `pl-${Date.now()}`;
  const newPlaylist: Playlist = {
    id: newId,
    name: details.name,
    desc: details.description || "",
    tracks: 0,
    cover: "bg-gradient-to-br from-emerald-600 to-teal-800",
    owner: "yours",
    dateCreated: new Date().toISOString(),
  };

  mockPlaylists.unshift(newPlaylist);
  mockPlaylistTracksMap[newId] = [];

  return Promise.resolve({
    id: newId,
    name: newPlaylist.name,
    description: newPlaylist.desc,
    images: [],
  });
}

export async function getPlaylistSnapshotId(playlistId: string | number): Promise<string | null> {
  return Promise.resolve("snapshot-mock-1");
}

export async function reorderPlaylistTracks(
  playlistId: string | number,
  initialTrackIds: string[],
  desiredTrackIds: string[],
  snapshotId: string | null = null,
  onProgress?: (progress: number) => void
): Promise<void> {
  const key = String(playlistId);
  if (mockPlaylistTracksMap[key]) {
    const trackMap = new Map(mockPlaylistTracksMap[key].map((t) => [String(t.id), t]));
    const reordered: Track[] = [];
    for (const id of desiredTrackIds) {
      const found = trackMap.get(String(id));
      if (found) reordered.push(found);
    }
    mockPlaylistTracksMap[key] = reordered;
  }
  if (onProgress) onProgress(100);
  return Promise.resolve();
}

export async function updatePlaylistDetails(
  playlistId: string | number,
  details: { name: string; description?: string; public?: boolean; collaborative?: boolean }
): Promise<any> {
  const key = String(playlistId);
  const pl = mockPlaylists.find((p) => String(p.id) === key);
  if (pl) {
    if (details.name) pl.name = details.name;
    if (details.description !== undefined) pl.desc = details.description;
  }
  return Promise.resolve({ id: key, ...details });
}

export async function uploadPlaylistCoverImage(playlistId: string | number, base64JpegData: string): Promise<void> {
  const key = String(playlistId);
  const pl = mockPlaylists.find((p) => String(p.id) === key);
  if (pl) {
    pl.cover = `data:image/jpeg;base64,${base64JpegData}`;
  }
  return Promise.resolve();
}

export async function unfollowPlaylist(playlistId: string | number): Promise<void> {
  const key = String(playlistId);
  mockPlaylists = mockPlaylists.filter((p) => String(p.id) !== key);
  delete mockPlaylistTracksMap[key];
  return Promise.resolve();
}

export async function removePlaylistTracksByPosition(
  playlistId: string | number,
  tracksWithPositions: { uri: string; positions: number[] }[],
  snapshotId?: string | null
): Promise<string | null> {
  const key = String(playlistId);
  if (mockPlaylistTracksMap[key]) {
    const removePositions = new Set(tracksWithPositions.flatMap((t) => t.positions));
    mockPlaylistTracksMap[key] = mockPlaylistTracksMap[key].filter((_, idx) => !removePositions.has(idx));
    const pl = mockPlaylists.find((p) => String(p.id) === key);
    if (pl) {
      pl.tracks = mockPlaylistTracksMap[key].length;
    }
  }
  return Promise.resolve("snapshot-mock-2");
}

// 10. Detail Views (Track, Artist, Album, Audio Features)
export async function getTrack(trackId: string): Promise<any> {
  const found = mockTracks.find((t) => String(t.id) === String(trackId)) || mockTracks[0];
  return Promise.resolve({
    id: found.id,
    name: found.title,
    uri: `spotify:track:${found.id}`,
    duration_ms: found.durationMs,
    popularity: found.popularity,
    track_number: found.trackNumber || 1,
    disc_number: 1,
    external_urls: { spotify: "https://open.spotify.com" },
    artists: [{ id: found.artistId || "artist-1", name: found.artist }],
    album: {
      id: found.albumId || "album-1",
      name: found.album,
      release_date: found.releaseDate,
      total_tracks: 10,
      images: [{ url: found.cover }],
    },
  });
}

export async function getArtist(artistId: string): Promise<any> {
  const found = TOP_ARTISTS.find((a) => String(a.id) === String(artistId)) || TOP_ARTISTS[0];
  return Promise.resolve({
    id: found.id,
    name: found.name,
    uri: found.uri || `spotify:artist:${found.id}`,
    genres: found.genres || [found.genre.toLowerCase()],
    popularity: found.popularity || 90,
    followers: found.followers || { total: 1500000 },
    images: [{ url: found.cover }],
    external_urls: { spotify: "https://open.spotify.com" },
  });
}

export async function getArtistTopTracks(artistId: string, market = "US"): Promise<any> {
  const artistObj = TOP_ARTISTS.find((a) => String(a.id) === String(artistId)) || TOP_ARTISTS[0];
  const artistTracks = mockTracks.filter((t) => t.artist.toLowerCase().includes(artistObj.name.toLowerCase()));
  const list = artistTracks.length > 0 ? artistTracks : mockTracks.slice(0, 8);

  const mapped = list.map((t) => ({
    id: t.id,
    name: t.title,
    uri: `spotify:track:${t.id}`,
    duration_ms: t.durationMs,
    popularity: t.popularity,
    artists: [{ id: artistObj.id, name: t.artist }],
    album: {
      id: t.albumId || "album-1",
      name: t.album,
      images: [{ url: t.cover }],
    },
  }));

  return Promise.resolve({ tracks: mapped });
}

export async function getArtistAlbums(artistId: string, limit = 20): Promise<any> {
  const artistObj = TOP_ARTISTS.find((a) => String(a.id) === String(artistId)) || TOP_ARTISTS[0];
  const albumsMap = new Map<string, any>();

  mockTracks.forEach((t) => {
    if (!albumsMap.has(t.album)) {
      albumsMap.set(t.album, {
        id: t.albumId || `album-${t.id}`,
        name: t.album,
        album_type: "album",
        release_date: t.releaseDate,
        images: [{ url: t.cover }],
        uri: `spotify:album:${t.albumId || t.id}`,
      });
    }
  });

  return Promise.resolve({ items: Array.from(albumsMap.values()) });
}

export async function getTrackAudioFeatures(trackId: string): Promise<any> {
  const found = mockTracks.find((t) => String(t.id) === String(trackId)) || mockTracks[0];
  return Promise.resolve({
    id: found.id,
    tempo: found.bpm || 120,
    energy: found.energy || 0.75,
    danceability: found.danceability || 0.65,
    valence: found.valence || 0.55,
    acousticness: found.acousticness || 0.15,
    instrumentalness: found.instrumentalness || 0.05,
    liveness: found.liveness || 0.12,
    loudness: found.loudness || -6.0,
    speechiness: found.speechiness || 0.04,
  });
}

export async function getAlbum(albumId: string): Promise<any> {
  const matchingTrack = mockTracks.find((t) => String(t.albumId) === String(albumId)) || mockTracks[0];
  const albumTracks = mockTracks.filter((t) => t.album === matchingTrack.album);
  const list = albumTracks.length > 0 ? albumTracks : [matchingTrack];

  return Promise.resolve({
    id: albumId,
    name: matchingTrack.album,
    uri: `spotify:album:${albumId}`,
    release_date: matchingTrack.releaseDate,
    label: "Demo Records",
    images: [{ url: matchingTrack.cover }],
    external_urls: { spotify: "https://open.spotify.com" },
    artists: [{ id: matchingTrack.artistId || "artist-1", name: matchingTrack.artist }],
    tracks: {
      items: list.map((t, idx) => ({
        id: t.id,
        name: t.title,
        uri: `spotify:track:${t.id}`,
        duration_ms: t.durationMs,
        track_number: idx + 1,
        artists: [{ id: t.artistId || "artist-1", name: t.artist }],
      })),
    },
  });
}
