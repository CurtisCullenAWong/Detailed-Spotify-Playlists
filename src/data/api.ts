// API endpoint definitions parsed from Spotify API.json

export interface ApiEndpoint {
  method: string;
  path: string;
  desc: string;
  params?: string;
  body?: string;
  deprecated?: boolean;
}

export interface ApiSection {
  name: string;
  endpoints: ApiEndpoint[];
}

export const API_SECTIONS: ApiSection[] = [
  {
    name: "User Profiles & Activity",
    endpoints: [
      { method: "GET", path: "/me", desc: "Get detailed profile information about the current user." },
      { method: "GET", path: "/me/top/artists", desc: "Get the current user's top artists. Use time_range to switch between short_term (last 4 weeks), medium_term (last 6 months), or long_term (all time).", params: "time_range, limit, offset" },
      { method: "GET", path: "/me/top/tracks", desc: "Get the current user's top tracks. Supports the same time_range, limit, and offset parameters as top artists.", params: "time_range, limit, offset" },
    ],
  },
  {
    name: "Catalog Information",
    endpoints: [
      { method: "GET", path: "/albums/{id}", desc: "Fetch a single album by ID. Use the market parameter to apply content restrictions for a specific country (ISO 3166-1 alpha-2).", params: "market" },
      { method: "GET", path: "/albums/{id}/tracks", desc: "Retrieve a page of tracks for a specific album. Use limit and offset for pagination through large track lists.", params: "market, limit, offset" },
      { method: "GET", path: "/artists/{id}", desc: "Get Spotify catalog information for a single artist identified by their Spotify ID." },
      { method: "GET", path: "/artists/{id}/albums", desc: "Get a paginated list of an artist's albums. Use include_groups to filter by release type (album, single, appears_on, compilation).", params: "include_groups, market, limit, offset" },
      { method: "GET", path: "/search", desc: "Search for tracks, albums, artists, playlists, shows, or episodes. The 'q' parameter supports field filters: album:, artist:, track:, year:, genre:, isrc:, upc:.", params: "q, type, market, limit, offset, include_external" },
      { method: "GET", path: "/tracks", desc: "Fetch multiple tracks by comma-separated IDs.", params: "ids, market", deprecated: true },
      { method: "GET", path: "/albums", desc: "Fetch multiple albums by comma-separated IDs.", params: "ids, market", deprecated: true },
      { method: "GET", path: "/artists", desc: "Fetch multiple artists by comma-separated Spotify IDs.", params: "ids", deprecated: true },
      { method: "GET", path: "/audio-features/{id}", desc: "Get audio feature data (tempo, energy, danceability, etc.) for a single track.", deprecated: true },
      { method: "GET", path: "/audio-features", desc: "Fetch audio features for multiple tracks at once.", params: "ids", deprecated: true },
      { method: "GET", path: "/tracks/{id}", desc: "Get Spotify catalog information for a single track.", params: "market" },
      { method: "GET", path: "/audio-analysis/{id}", desc: "Returns detailed audio analysis (sections, segments, beats) for a single track.", deprecated: true },
    ],
  },
  {
    name: "User Library",
    endpoints: [
      { method: "GET", path: "/me/albums", desc: "Get a list of the albums saved in the current user's library.", params: "limit, offset, market" },
      { method: "GET", path: "/me/tracks", desc: "Get a list of tracks saved in the current user's Liked Songs.", params: "limit, offset, market" },
      { method: "GET", path: "/me/library/contains", desc: "Check if one or more items are in the current user's library. Pass IDs and the type of content.", params: "ids, type" },
      { method: "GET", path: "/me/tracks/contains", desc: "Check if the current user has one or more tracks saved.", params: "ids", deprecated: true },
      { method: "GET", path: "/me/albums/contains", desc: "Check if the current user has one or more albums saved.", params: "ids", deprecated: true },
      { method: "PUT", path: "/me/library", desc: "Save one or more items to the current user's library.", body: '{ "ids": [...], "type": "track" }' },
      { method: "DELETE", path: "/me/library", desc: "Remove one or more items from the current user's library.", body: '{ "ids": [...], "type": "track" }' },
    ],
  },
  {
    name: "Playlists",
    endpoints: [
      { method: "GET", path: "/me/playlists", desc: "Get a list of the playlists owned or followed by the current user.", params: "limit, offset" },
      { method: "GET", path: "/playlists/{id}", desc: "Get a playlist by its Spotify ID. Use fields to request only specific properties and reduce response size.", params: "market, fields" },
      { method: "GET", path: "/playlists/{id}/items", desc: "Get full details of the items of a playlist. Use limit and offset for pagination through large playlists.", params: "market, limit, offset, fields" },
      { method: "GET", path: "/playlists/{id}/images", desc: "Get the current image associated with a specific playlist." },
      { method: "GET", path: "/playlists/{id}/tracks", desc: "Get tracks in a playlist.", params: "market, limit, offset", deprecated: true },
      { method: "POST", path: "/me/playlists", desc: "Create a new playlist for the current user.", body: '{ "name", "description", "public", "collaborative" }' },
      { method: "POST", path: "/playlists/{id}/items", desc: "Add one or more items to a playlist. Optionally specify a position.", body: '{ "uris": [...], "position": 0 }' },
      { method: "PUT", path: "/playlists/{id}", desc: "Update playlist metadata: name, description, public/private, collaborative flag.", body: '{ "name", "description", "public", "collaborative" }' },
      { method: "PUT", path: "/playlists/{id}/items", desc: "Reorder items in a playlist or replace all items with a new set of URIs.", body: '{ "range_start", "insert_before", "range_length", "snapshot_id" }' },
      { method: "DELETE", path: "/playlists/{id}/items", desc: "Remove one or more items from a playlist. Optionally provide snapshot_id.", body: '{ "tracks": [{ "uri" }], "snapshot_id" }' },
    ],
  },
  {
    name: "Player & Playback",
    endpoints: [
      { method: "GET", path: "/me/player", desc: "Get information about the user's current playback state (device, progress, track, etc.).", params: "market, additional_types" },
      { method: "GET", path: "/me/player/currently-playing", desc: "Get the object currently being played on the user's Spotify account.", params: "market, additional_types" },
      { method: "GET", path: "/me/player/devices", desc: "Get information about a user's available Spotify Connect devices." },
      { method: "GET", path: "/me/player/queue", desc: "Get the list of objects that make up the user's queue." },
      { method: "GET", path: "/me/player/recently-played", desc: "Get tracks from the current user's recently played tracks.", params: "limit, before, after" },
      { method: "PUT", path: "/me/player", desc: "Transfer playback to another device.", body: '{ "device_ids": [...], "play": true }' },
      { method: "PUT", path: "/me/player/play", desc: "Start or resume playback on a specific device.", params: "device_id", body: '{ "context_uri", "offset", "position_ms" }' },
      { method: "PUT", path: "/me/player/pause", desc: "Pause playback on the user's account.", params: "device_id" },
      { method: "PUT", path: "/me/player/seek", desc: "Seek to a specific position in the currently playing track.", params: "position_ms, device_id" },
      { method: "PUT", path: "/me/player/repeat", desc: "Set the repeat mode: track, context, or off.", params: "state, device_id" },
      { method: "PUT", path: "/me/player/shuffle", desc: "Toggle shuffle on or off for the user's playback.", params: "state, device_id" },
      { method: "PUT", path: "/me/player/volume", desc: "Set the volume for the user's current playback device (0–100).", params: "volume_percent, device_id" },
      { method: "POST", path: "/me/player/next", desc: "Skip to the next track in the user's queue.", params: "device_id" },
      { method: "POST", path: "/me/player/previous", desc: "Skip to the previous track in the user's queue.", params: "device_id" },
      { method: "POST", path: "/me/player/queue", desc: "Add an item to the end of the user's current playback queue.", params: "uri, device_id" },
    ],
  },
];
