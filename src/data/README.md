# Data Directory

This directory contains all dummy/mock data used throughout the application, organized by domain for easier endpoint implementation.

## Structure

```
/src/data/
├── index.ts              # Central export file - import from here
├── tracks.ts             # Track data and Track interface
├── playlists.ts          # Playlist data and Playlist interface
├── artists.ts            # Artist data and Artist interface
├── recentlyPlayed.ts     # Recently played tracks data
├── api.ts                # API endpoint definitions (Spotify Web API)
├── search.ts             # Search-related data (browse categories)
├── navigation.ts         # Navigation items, column definitions, filters
├── dashboard.ts          # Dashboard metrics and statistics
├── derived.ts            # Computed/derived data from base data
└── README.md             # This file
```

## Usage

Import all data from the central index file:

```typescript
import {
  TRACKS,
  PLAYLISTS,
  LIKED_SONGS_COUNT,
  TOP_ARTISTS,
  RECENTLY_PLAYED,
  API_SECTIONS,
  BROWSE_CATEGORIES,
} from "../data";

// Import types
import type { Track, Playlist, Artist } from "../data";
```

## Data Files

### tracks.ts
- **Export:** `TRACKS: Track[]`
- **Type:** `Track` interface
- **Contains:** 18 sample tracks with properties like title, artist, album, genre, BPM, energy, duration, etc.
- **Endpoint mapping:** `/me/tracks`, `/tracks/{id}`, `/search?type=track`

### playlists.ts
- **Exports:** 
  - `PLAYLISTS: Playlist[]` (8 playlists)
  - `LIKED_SONGS_COUNT: number` (2847)
- **Type:** `Playlist` interface
- **Contains:** User playlists with owner property ("yours" | "followed")
- **Endpoint mapping:** `/me/playlists`, `/playlists/{id}`

### artists.ts
- **Export:** `TOP_ARTISTS: Artist[]`
- **Type:** `Artist` interface
- **Contains:** 5 top artists with play counts and genre information
- **Endpoint mapping:** `/me/top/artists`, `/artists/{id}`

### recentlyPlayed.ts
- **Export:** `RECENTLY_PLAYED: RecentlyPlayedItem[]`
- **Type:** `RecentlyPlayedItem` interface
- **Contains:** 6 recently played tracks with timestamps
- **Endpoint mapping:** `/me/player/recently-played`

### api.ts
- **Export:** `API_SECTIONS: ApiSection[]`
- **Types:** `ApiEndpoint`, `ApiSection` interfaces
- **Contains:** Complete Spotify Web API endpoint reference organized by category:
  - User Profiles & Activity (3 endpoints)
  - Catalog Information (12 endpoints, 6 deprecated)
  - User Library (7 endpoints, 2 deprecated)
  - Playlists (10 endpoints, 1 deprecated)
  - Player & Playback (15 endpoints)
- **Deprecated endpoints:** Marked with `deprecated: true` flag (9 total)
  - `/tracks` - Bulk fetch (use individual endpoints)
  - `/albums` - Bulk fetch (use individual endpoints)
  - `/artists` - Bulk fetch (use individual endpoints)
  - `/audio-features/{id}` - Single track audio features
  - `/audio-features` - Multiple tracks audio features
  - `/audio-analysis/{id}` - Detailed audio analysis
  - `/me/tracks/contains` - Check saved tracks
  - `/me/albums/contains` - Check saved albums
  - `/playlists/{id}/tracks` - Get playlist tracks (use `/playlists/{id}/items`)
- **Use case:** API Reference page, documentation

### search.ts
- **Export:** `BROWSE_CATEGORIES: BrowseCategory[]`
- **Type:** `BrowseCategory` interface
- **Contains:** 8 music genre categories for browse functionality
- **Endpoint mapping:** `/browse/categories` (conceptual)

### navigation.ts
- **Exports:**
  - `ALL_COLUMNS: ColumnDefinition[]` - Table column definitions (9 columns)
  - `GROUP_BY_LABELS: Record<GroupByOption, string>` - Labels for grouping options
  - `SEARCH_FILTERS: SearchFilter[]` - Search filter options (5 filters)
- **Types:** `NavItem`, `ColumnDefinition`, `GroupByOption`, `SearchFilter`
- **Contains:** UI configuration data for navigation, table columns, and filters
- **Use case:** Workspace table configuration, search filters

### dashboard.ts
- **Exports:**
  - `KEY_DATA_INDICATORS: KeyDataIndicator[]` - Dashboard KPI cards (4 indicators)
  - `AGGREGATE_STATS: AggregateStats[]` - Library statistics (5 stats)
- **Types:** `KeyDataIndicator`, `AggregateStats`
- **Contains:** Dashboard metrics, statistics, and KPI data
- **Use case:** Dashboard page, All Libraries page

### derived.ts
- **Export:** `ALL_ARTISTS: DerivedArtist[]`
- **Type:** `DerivedArtist` interface
- **Contains:** All unique artists computed from TRACKS data with metadata
- **Computed from:** TRACKS + TOP_ARTISTS
- **Use case:** Search page, All Libraries page, artist filtering

## API Endpoint Implementation Guide

When implementing real API endpoints, replace imports from `/src/data` with actual API calls:

### Before (using dummy data):
```typescript
import { TRACKS } from "../data";

function MyComponent() {
  const tracks = TRACKS;
  // ...
}
```

### After (using real API):
```typescript
import { useState, useEffect } from "react";
import type { Track } from "../data"; // Keep types

function MyComponent() {
  const [tracks, setTracks] = useState<Track[]>([]);
  
  useEffect(() => {
    fetch("/api/me/tracks")
      .then(res => res.json())
      .then(data => setTracks(data.items));
  }, []);
  // ...
}
```

## Notes

- All data is currently static and used for UI development/testing
- Types are defined alongside data to ensure consistency
- The central `index.ts` file provides a single import point
- When migrating to real APIs, keep the type definitions and replace data imports with API calls
- Owner property in playlists: "yours" = user-created, "followed" = followed from others
