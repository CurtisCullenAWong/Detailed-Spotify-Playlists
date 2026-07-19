// Playlist type definition and mock data

export interface Playlist {
  id: string | number;
  name: string;
  desc: string;
  tracks: number;
  cover: string;
  owner: "yours" | "followed";
  dateCreated?: string;
}

export const PLAYLISTS: Playlist[] = [
  {
    id: "pl-1",
    name: "Chill Vibes & Lo-Fi",
    desc: "Relaxing beats to code, study, and unwind to.",
    tracks: 15,
    cover: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=300&auto=format&fit=crop&q=80",
    owner: "yours",
    dateCreated: "2024-01-10T12:00:00.000Z",
  },
  {
    id: "pl-2",
    name: "Synthwave Nights",
    desc: "Retrofuturistic synthwave, darksynth, and cyberpunk grooves.",
    tracks: 12,
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
    owner: "yours",
    dateCreated: "2024-02-01T12:00:00.000Z",
  },
  {
    id: "pl-3",
    name: "Deep Focus & Code",
    desc: "Flow state electronic tracks designed for maximum productivity.",
    tracks: 18,
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    owner: "yours",
    dateCreated: "2024-02-15T12:00:00.000Z",
  },
  {
    id: "pl-4",
    name: "Top Hits 2026",
    desc: "The hottest global chart toppers and trending anthems.",
    tracks: 25,
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    owner: "followed",
    dateCreated: "2024-03-01T12:00:00.000Z",
  },
  {
    id: "pl-5",
    name: "Classic Rock Essentials",
    desc: "Timeless guitar solos and rock anthems from legendary bands.",
    tracks: 14,
    cover: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&auto=format&fit=crop&q=80",
    owner: "followed",
    dateCreated: "2024-03-10T12:00:00.000Z",
  },
  {
    id: "pl-6",
    name: "Jazz & Coffee",
    desc: "Smooth acoustic jazz and warm vinyl melodies.",
    tracks: 10,
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    owner: "followed",
    dateCreated: "2024-03-20T12:00:00.000Z",
  },
];

export const LIKED_SONGS_COUNT = 15;
