// Artist type definition and mock data

export interface Artist {
  id?: string;
  uri?: string;
  name: string;
  genre: string;
  plays: string;
  cover: string;
  followers?: { total: number };
  popularity?: number;
  genres?: string[];
}

export const TOP_ARTISTS: Artist[] = [
  {
    id: "artist-1",
    uri: "spotify:artist:artist-1",
    name: "The Weeknd",
    genre: "SYNTHWAVE",
    plays: "4,820",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    followers: { total: 85400000 },
    popularity: 98,
    genres: ["synthwave", "pop", "r&b"],
  },
  {
    id: "artist-2",
    uri: "spotify:artist:artist-2",
    name: "HOME",
    genre: "CHILLWAVE",
    plays: "3,410",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    followers: { total: 1250000 },
    popularity: 88,
    genres: ["chillwave", "synthwave", "ambient"],
  },
  {
    id: "artist-3",
    uri: "spotify:artist:artist-3",
    name: "M83",
    genre: "INDIE ELECTRONIC",
    plays: "2,980",
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
    followers: { total: 3420000 },
    popularity: 91,
    genres: ["indie electronic", "shoegaze", "synthpop"],
  },
  {
    id: "artist-4",
    uri: "spotify:artist:artist-4",
    name: "Daft Punk",
    genre: "ELECTRONIC",
    plays: "2,750",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    followers: { total: 12800000 },
    popularity: 94,
    genres: ["electronic", "french house", "disco"],
  },
  {
    id: "artist-5",
    uri: "spotify:artist:artist-5",
    name: "Tame Impala",
    genre: "PSYCHEDELIC POP",
    plays: "2,430",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    followers: { total: 9850000 },
    popularity: 93,
    genres: ["psychedelic pop", "neo-psychedelia", "indie rock"],
  },
  {
    id: "artist-6",
    uri: "spotify:artist:artist-6",
    name: "Tycho",
    genre: "AMBIENT",
    plays: "1,940",
    cover: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=300&auto=format&fit=crop&q=80",
    followers: { total: 890000 },
    popularity: 82,
    genres: ["ambient", "downtempo", "chillwave"],
  },
];
