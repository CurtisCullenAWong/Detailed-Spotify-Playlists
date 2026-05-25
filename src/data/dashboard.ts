// Dashboard statistics and metrics data

export interface KeyDataIndicator {
  label: string;
  value: string;
  sub: string;
  color: string;
}

export const KEY_DATA_INDICATORS: KeyDataIndicator[] = [
  { label: "Total Tracks", value: "2,847", sub: "+124 this month", color: "text-[#1DB954]" },
  { label: "Playlists", value: "38", sub: "8 smart rules active", color: "text-blue-400" },
  { label: "Avg. BPM", value: "112", sub: "across all libraries", color: "text-purple-400" },
  { label: "Total Duration", value: "187 hrs", sub: "Synced 2 min ago", color: "text-amber-400" },
];

export interface AggregateStats {
  label: string;
  value: string;
  iconName: string;
  color: string;
}

export const AGGREGATE_STATS: AggregateStats[] = [
  { label: "Source Playlists", value: "8", iconName: "ListMusic", color: "text-blue-400" },
  { label: "Unique Tracks", value: "18", iconName: "Music2", color: "text-[#1DB954]" },
  { label: "Unique Artists", value: "4", iconName: "Mic2", color: "text-purple-400" },
  { label: "Avg. BPM", value: "112", iconName: "Zap", color: "text-amber-400" },
  { label: "Duplicates Removed", value: "143", iconName: "Check", color: "text-emerald-400" },
];
