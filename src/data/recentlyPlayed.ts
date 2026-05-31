// Recently played type definition and data

export interface RecentlyPlayedItem {
  title: string;
  artist: string;
  cover: string;
  ago: string;
}

export const RECENTLY_PLAYED: RecentlyPlayedItem[] = [];
