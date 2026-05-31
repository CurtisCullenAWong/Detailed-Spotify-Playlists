import { playTrack } from "./spotifyApi";
import type { Track, Playlist } from "../data";

export const getPlaylistTrackCount = (playlist: Playlist): number => {
  const tracks = playlist.tracks as unknown;

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
};

export const buildTrackUri = (trackId: string | number) => `spotify:track:${trackId}`;

export const isUrlOrData = (str: string) => {
  if (!str) return false;
  return str.startsWith("http") || str.startsWith("data:");
};

export const getPlaybackTrackId = (item: any): string | null => {
  if (!item) return null;
  if (item.id !== undefined && item.id !== null) return String(item.id);
  if (typeof item.uri === "string") {
    const uriParts = item.uri.split(":");
    return uriParts[uriParts.length - 1] || null;
  }
  return null;
};

export const playTrackSequence = async (tracks: Pick<Track, "id">[], startIndex: number): Promise<void> => {
  if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length) return;
  await playTrack({
    uris: tracks.map(track => buildTrackUri(track.id)),
    offset: { position: startIndex },
  });
};
