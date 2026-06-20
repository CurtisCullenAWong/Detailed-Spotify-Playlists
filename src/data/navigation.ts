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
  id: "title" | "artist" | "firstArtist" | "album" | "genre" | "firstGenre" | "releaseYear" | "releaseDate" | "dateAdded" | "bpm" | "energy" | "popularity" | "duration" | "danceability" | "valence" | "acousticness" | "instrumentalness" | "speechiness" | "liveness" | "loudness" | "trackNumber";
  label: string;
  groupable?: boolean;
}

export const ALL_COLUMNS: ColumnDefinition[] = [
  { id: "title", label: "Title" },
  { id: "trackNumber", label: "Track #" },
  { id: "firstArtist", label: "Artist", groupable: true },
  { id: "artist", label: "Artists", groupable: true },
  { id: "album", label: "Album", groupable: true },
  { id: "firstGenre", label: "Genre", groupable: true },
  { id: "genre", label: "Genres", groupable: true },
  { id: "releaseYear", label: "Year", groupable: true },
  { id: "releaseDate", label: "Release Date" },
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

export type GroupByOption = "artist" | "firstArtist" | "album" | "genre" | "firstGenre" | "releaseYear" | "none";

export const GROUP_BY_LABELS: Record<GroupByOption, string> = {
  artist: "Artists",
  firstArtist: "Artist",
  album: "Album",
  genre: "Genres",
  firstGenre: "Genre",
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
