// Recently played type definition and mock data

export interface RecentlyPlayedItem {
  id?: string;
  title: string;
  artist: string;
  cover: string;
  ago: string;
  uri?: string;
}

export const RECENTLY_PLAYED: RecentlyPlayedItem[] = [
  {
    id: "track-1",
    uri: "spotify:track:track-1",
    title: "Blinding Lights",
    artist: "The Weeknd",
    cover: "https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&auto=format&fit=crop&q=80",
    ago: "12m ago",
  },
  {
    id: "track-2",
    uri: "spotify:track:track-2",
    title: "Resonance",
    artist: "HOME",
    cover: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=300&auto=format&fit=crop&q=80",
    ago: "45m ago",
  },
  {
    id: "track-3",
    uri: "spotify:track:track-3",
    title: "Midnight City",
    artist: "M83",
    cover: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=300&auto=format&fit=crop&q=80",
    ago: "2h ago",
  },
  {
    id: "track-4",
    uri: "spotify:track:track-4",
    title: "Get Lucky",
    artist: "Daft Punk ft. Pharrell Williams",
    cover: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&auto=format&fit=crop&q=80",
    ago: "5h ago",
  },
  {
    id: "track-5",
    uri: "spotify:track:track-5",
    title: "The Less I Know The Better",
    artist: "Tame Impala",
    cover: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=300&auto=format&fit=crop&q=80",
    ago: "Yesterday",
  },
  {
    id: "track-6",
    uri: "spotify:track:track-6",
    title: "A Walk",
    artist: "Tycho",
    cover: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=300&auto=format&fit=crop&q=80",
    ago: "2d ago",
  },
];
