// Track type definition and data

export interface Track {
  id: string | number;
  rowKey?: string;
  title: string;
  artist: string;
  album: string;
  cover?: string;
  genre: string;
  releaseYear: number;
  releaseDate?: string;
  dateAdded: string;
  trackNumber?: number;
  bpm?: number;
  energy?: number;
  popularity: number;
  danceability?: number;
  valence?: number;
  acousticness?: number;
  instrumentalness?: number;
  speechiness?: number;
  liveness?: number;
  loudness?: number;
  duration: string;
  durationMs: number;
}

export const TRACKS: Track[] = [
];
