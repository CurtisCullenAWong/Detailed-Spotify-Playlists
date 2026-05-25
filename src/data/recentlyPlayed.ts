// Recently played type definition and data

export interface RecentlyPlayedItem {
  title: string;
  artist: string;
  cover: string;
  ago: string;
}

export const RECENTLY_PLAYED: RecentlyPlayedItem[] = [
  { title: "Blinding Lights", artist: "The Weeknd", cover: "bg-gradient-to-br from-red-800 to-orange-900", ago: "3 min ago" },
  { title: "Get Lucky", artist: "Daft Punk", cover: "bg-gradient-to-br from-violet-800 to-purple-950", ago: "18 min ago" },
  { title: "Levitating", artist: "Dua Lipa", cover: "bg-gradient-to-br from-blue-800 to-cyan-950", ago: "41 min ago" },
  { title: "bad guy", artist: "Billie Eilish", cover: "bg-gradient-to-br from-lime-900 to-green-950", ago: "1 hr ago" },
  { title: "Physical", artist: "Dua Lipa", cover: "bg-gradient-to-br from-pink-800 to-rose-950", ago: "2 hr ago" },
  { title: "Heartless", artist: "The Weeknd", cover: "bg-gradient-to-br from-slate-700 to-slate-900", ago: "3 hr ago" },
];
