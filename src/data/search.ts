// Search-related data

export interface BrowseCategory {
  label: string;
  color: string;
}

export const BROWSE_CATEGORIES: BrowseCategory[] = [
  { label: "Electronic", color: "bg-gradient-to-br from-cyan-800 to-blue-950" },
  { label: "Synth-pop", color: "bg-gradient-to-br from-purple-800 to-violet-950" },
  { label: "Dance-pop", color: "bg-gradient-to-br from-pink-800 to-rose-950" },
  { label: "Alt-pop", color: "bg-gradient-to-br from-lime-800 to-emerald-950" },
  { label: "Hip-Hop", color: "bg-gradient-to-br from-amber-800 to-orange-950" },
  { label: "Jazz", color: "bg-gradient-to-br from-blue-800 to-indigo-950" },
  { label: "Indie", color: "bg-gradient-to-br from-red-800 to-orange-950" },
  { label: "Psychedelic", color: "bg-gradient-to-br from-fuchsia-800 to-purple-950" },
];
