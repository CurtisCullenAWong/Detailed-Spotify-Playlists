// Artist type definition and data

export interface Artist {
  id?: string;
  uri?: string;
  name: string;
  genre: string;
  plays: string;
  cover: string;
}

export const TOP_ARTISTS: Artist[] = [
  { name: "Daft Punk", genre: "Electronic", plays: "847", cover: "bg-gradient-to-br from-yellow-700 to-orange-900" },
  { name: "The Weeknd", genre: "Synth-pop", plays: "621", cover: "bg-gradient-to-br from-red-800 to-purple-950" },
  { name: "Dua Lipa", genre: "Dance-pop", plays: "543", cover: "bg-gradient-to-br from-fuchsia-800 to-pink-950" },
  { name: "Billie Eilish", genre: "Alt-pop", plays: "412", cover: "bg-gradient-to-br from-lime-900 to-emerald-950" },
  { name: "Tame Impala", genre: "Psychedelic", plays: "389", cover: "bg-gradient-to-br from-sky-700 to-blue-950" },
];
