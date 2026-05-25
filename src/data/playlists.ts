// Playlist type definition and data

export interface Playlist {
  id: string | number;
  name: string;
  desc: string;
  tracks: number;
  cover: string;
  owner: "yours" | "followed";
}

export const PLAYLISTS: Playlist[] = [
  { id: 1, name: "Late Night Drives", desc: "Mellow vibes for the road", tracks: 47, cover: "bg-gradient-to-br from-blue-900 to-indigo-950", owner: "yours" },
  { id: 2, name: "Deep Focus", desc: "Instrumental productivity beats", tracks: 62, cover: "bg-gradient-to-br from-emerald-900 to-teal-950", owner: "yours" },
  { id: 3, name: "Workout Fuel", desc: "High-BPM energy anthology", tracks: 88, cover: "bg-gradient-to-br from-red-900 to-orange-950", owner: "yours" },
  { id: 4, name: "Sunday Morning", desc: "Slow jazz and acoustic sets", tracks: 33, cover: "bg-gradient-to-br from-amber-900 to-yellow-950", owner: "followed" },
  { id: 5, name: "Throwback 00s", desc: "Early 2000s indie and alt", tracks: 124, cover: "bg-gradient-to-br from-purple-900 to-violet-950", owner: "yours" },
  { id: 6, name: "Electronic Spectrum", desc: "Curated electronic anthology", tracks: 76, cover: "bg-gradient-to-br from-cyan-900 to-blue-950", owner: "followed" },
  { id: 7, name: "Road Trip Mix", desc: "Cross-genre travel companion", tracks: 59, cover: "bg-gradient-to-br from-pink-900 to-rose-950", owner: "yours" },
  { id: 8, name: "Chill Hip-Hop", desc: "Lofi, boom-bap and beats", tracks: 41, cover: "bg-gradient-to-br from-slate-700 to-zinc-900", owner: "followed" },
];

export const LIKED_SONGS_COUNT = 2847;
