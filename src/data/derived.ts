// Derived data computed from base data
// This file contains data that is calculated from other data sources

import { TRACKS } from "./tracks";
import { TOP_ARTISTS } from "./artists";

export interface DerivedArtist {
  name: string;
  genre: string;
  trackCount: number;
  cover: string;
}

// Compute all unique artists from tracks with their metadata
export const ALL_ARTISTS: DerivedArtist[] = Array.from(
  new Set(TRACKS.map(t => t.artist))
).map(name => ({
  name,
  genre: TRACKS.find(t => t.artist === name)!.genre,
  trackCount: TRACKS.filter(t => t.artist === name).length,
  cover: TOP_ARTISTS.find(a => a.name === name)?.cover ?? "bg-gradient-to-br from-slate-700 to-zinc-900",
}));
