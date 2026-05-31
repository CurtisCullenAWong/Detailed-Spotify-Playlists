import type { Track } from "../data";

export const sameTrackOrder = (left: string[], right: string[]): boolean =>
  left.length === right.length && left.every((trackId, index) => trackId === right[index]);

export const getTrackOrderKey = (track: Track): string => track.rowKey ?? String(track.id);

export const applyTrackOrder = (tracks: Track[], trackOrder: string[]): Track[] => {
  const trackMap = new Map(tracks.map(track => [getTrackOrderKey(track), track] as const));
  const ordered = trackOrder.map(id => trackMap.get(id)).filter(Boolean) as Track[];
  const orderedIds = new Set(trackOrder);

  for (const track of tracks) {
    if (!orderedIds.has(getTrackOrderKey(track))) {
      ordered.push(track);
    }
  }

  return ordered;
};
