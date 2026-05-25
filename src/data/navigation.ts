// Navigation and UI configuration data

import type { LucideIcon } from "lucide-react";

export interface NavItem {
  icon: LucideIcon;
  label: string;
  id: "dashboard" | "workspace" | "api" | "search" | "libraries";
}

// Navigation items will be dynamically created in components
// This file exports types for consistency

export interface ColumnDefinition {
  id: "title" | "artist" | "album" | "genre" | "releaseYear" | "dateAdded" | "bpm" | "energy" | "popularity" | "duration" | "danceability" | "valence" | "acousticness" | "instrumentalness" | "speechiness" | "liveness" | "loudness";
  label: string;
}

export const ALL_COLUMNS: ColumnDefinition[] = [
  { id: "title", label: "Title" },
  { id: "artist", label: "Artist" },
  { id: "album", label: "Album" },
  { id: "genre", label: "Genre" },
  { id: "releaseYear", label: "Year" },
  { id: "dateAdded", label: "Date Added" },
  { id: "bpm", label: "BPM" },
  { id: "energy", label: "Energy" },
  { id: "popularity", label: "Popularity" },
  { id: "danceability", label: "Danceability" },
  { id: "valence", label: "Valence" },
  { id: "acousticness", label: "Acousticness" },
  { id: "instrumentalness", label: "Instrumentalness" },
  { id: "speechiness", label: "Speechiness" },
  { id: "liveness", label: "Liveness" },
  { id: "loudness", label: "Loudness" },
  { id: "duration", label: "Time" },
];

export type GroupByOption = "artist" | "album" | "genre" | "releaseYear" | "none";

export const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  artist: "Artist",
  album: "Album",
  genre: "Genre",
  releaseYear: "Release Year",
  none: "None",
};

export interface SearchFilter {
  key: "all" | "tracks" | "artists" | "playlists" | "albums";
  label: string;
}

export const SEARCH_FILTERS: SearchFilter[] = [
  { key: "all", label: "All" },
  { key: "tracks", label: "Tracks" },
  { key: "artists", label: "Artists" },
  { key: "albums", label: "Albums" },
  { key: "playlists", label: "Playlists" },
];
