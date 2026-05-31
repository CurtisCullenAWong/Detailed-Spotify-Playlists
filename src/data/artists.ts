// Artist type definition and data

export interface Artist {
  id?: string;
  uri?: string;
  name: string;
  genre: string;
  plays: string;
  cover: string;
}

export const TOP_ARTISTS: Artist[] = [];
