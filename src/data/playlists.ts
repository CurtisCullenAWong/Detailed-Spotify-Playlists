// Playlist type definition and data

export interface Playlist {
  id: string | number;
  name: string;
  desc: string;
  tracks: number;
  cover: string;
  owner: "yours" | "followed";
  dateCreated?: string;
}

export const PLAYLISTS: Playlist[] = [];

export const LIKED_SONGS_COUNT = 0;
