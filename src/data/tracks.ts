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
  dateAdded: string;
  bpm: number;
  energy: number;
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
  { id: 1, title: "Get Lucky", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-14", bpm: 116, energy: 0.82, popularity: 96, duration: "6:07", durationMs: 367000 },
  { id: 2, title: "Instant Crush", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-14", bpm: 121, energy: 0.61, popularity: 82, duration: "5:37", durationMs: 337000 },
  { id: 3, title: "Lose Yourself to Dance", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-15", bpm: 100, energy: 0.74, popularity: 85, duration: "5:53", durationMs: 353000 },
  { id: 4, title: "Give Life Back to Music", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-15", bpm: 103, energy: 0.88, popularity: 78, duration: "4:34", durationMs: 274000 },
  { id: 5, title: "Within", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-16", bpm: 120, energy: 0.32, popularity: 71, duration: "3:45", durationMs: 225000 },
  { id: 6, title: "Fragments of Time", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-16", bpm: 100, energy: 0.55, popularity: 69, duration: "4:38", durationMs: 278000 },
  { id: 7, title: "Motherboard", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-17", bpm: 65, energy: 0.28, popularity: 64, duration: "5:42", durationMs: 342000 },
  { id: 8, title: "Beyond", artist: "Daft Punk", album: "Random Access Memories", genre: "Electronic", releaseYear: 2013, dateAdded: "2024-01-17", bpm: 120, energy: 0.45, popularity: 66, duration: "4:50", durationMs: 290000 },
  { id: 9, title: "Blinding Lights", artist: "The Weeknd", album: "After Hours", genre: "Synth-pop", releaseYear: 2019, dateAdded: "2024-02-03", bpm: 171, energy: 0.73, popularity: 99, duration: "3:20", durationMs: 200000 },
  { id: 10, title: "Save Your Tears", artist: "The Weeknd", album: "After Hours", genre: "Synth-pop", releaseYear: 2020, dateAdded: "2024-02-03", bpm: 118, energy: 0.59, popularity: 94, duration: "3:36", durationMs: 216000 },
  { id: 11, title: "Heartless", artist: "The Weeknd", album: "After Hours", genre: "Synth-pop", releaseYear: 2019, dateAdded: "2024-02-04", bpm: 89, energy: 0.51, popularity: 86, duration: "3:18", durationMs: 198000 },
  { id: 12, title: "In Your Eyes", artist: "The Weeknd", album: "After Hours", genre: "Synth-pop", releaseYear: 2020, dateAdded: "2024-02-04", bpm: 127, energy: 0.68, popularity: 84, duration: "3:58", durationMs: 238000 },
  { id: 13, title: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", genre: "Dance-pop", releaseYear: 2020, dateAdded: "2024-02-18", bpm: 103, energy: 0.76, popularity: 92, duration: "3:23", durationMs: 203000 },
  { id: 14, title: "Don't Start Now", artist: "Dua Lipa", album: "Future Nostalgia", genre: "Dance-pop", releaseYear: 2019, dateAdded: "2024-02-18", bpm: 124, energy: 0.79, popularity: 90, duration: "3:27", durationMs: 207000 },
  { id: 15, title: "Physical", artist: "Dua Lipa", album: "Future Nostalgia", genre: "Dance-pop", releaseYear: 2020, dateAdded: "2024-02-19", bpm: 127, energy: 0.84, popularity: 87, duration: "3:13", durationMs: 193000 },
  { id: 16, title: "Happier Than Ever", artist: "Billie Eilish", album: "Happier Than Ever", genre: "Alt-pop", releaseYear: 2021, dateAdded: "2024-03-01", bpm: 76, energy: 0.35, popularity: 88, duration: "4:58", durationMs: 298000 },
  { id: 17, title: "bad guy", artist: "Billie Eilish", album: "WHEN WE ALL FALL ASLEEP", genre: "Alt-pop", releaseYear: 2019, dateAdded: "2024-03-01", bpm: 135, energy: 0.56, popularity: 95, duration: "3:14", durationMs: 194000 },
  { id: 18, title: "Oxytocin", artist: "Billie Eilish", album: "Happier Than Ever", genre: "Alt-pop", releaseYear: 2021, dateAdded: "2024-03-02", bpm: 145, energy: 0.71, popularity: 79, duration: "3:28", durationMs: 208000 },
];
