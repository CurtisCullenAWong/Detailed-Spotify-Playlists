# Spotify Playlist Manager and Workspace

This application is a client-side dashboard and utility tool designed for managing, grouping, sorting, and synchronizing Spotify playlists and track libraries. It integrates directly with the Spotify Web API to execute metadata updates and track reordering operations.

---

## Functional Overview and User Context

The application provides a structured workspace to address limitations in the default Spotify client regarding sorting, grouping, and batch operations on large music libraries.

### Core Capabilities

- **Tabular Workspace Grid**: View and interact with tracks in a tabular interface. Tracks can be sorted by standard metadata (Title, Artist, Album, Release Year, Date Added) and Spotify audio features (BPM, Popularity, Energy, Danceability, Valence, Acousticness, Instrumentalness, Liveness, Loudness).
- **Library Grouping**: Group tracks in a playlist by Artist, Album, Genre, or Release Year.
- **Track Reordering**: Adjust the order of tracks within the workspace table and synchronize the new sequence back to the active Spotify playlist.
- **Enriched Audio Attributes**: Inspect technical audio metrics of tracks. When the optional Spotify audio-features endpoints are enabled via preference settings, the interface displays relative levels for variables such as energy, acousticness, and valence. If disabled, the application displays placeholders to prevent rendering incorrect fallback values.
- **Segmented Storage Cache**: Playlist track listings are cached in the browser's session storage. This cache loads data locally during a session, minimizing redundant network requests to avoid Spotify API rate limits.

---

## Technical Stack

The client-side architecture consists of the following components:

- **Framework**: React combined with TypeScript for compile-time type safety.
- **Build System**: Vite for module bundling and fast refresh in development.
- **Styling**: Tailwind CSS for interface layouts.
- **Icons**: Lucide React.
- **Notifications**: Sonner toast library for feedback on background API synchronization.
- **Authentication**: Spotify OAuth 2.0 Authorization Code Flow with Proof Key for Code Exchange (PKCE), executing fully client-side inside the browser.

---

## Setup and Installation

### Prerequisites

- **Node.js**: Version 18.x or higher is recommended.
- **Package Manager**: Supports `npm`, `yarn`, or `pnpm`. The project includes a `pnpm-workspace.yaml`, making `pnpm` the recommended package manager.

### Installation Steps

1. Clone the repository and navigate to the project root directory:
   ```bash
   cd Spotify
   ```

2. Install the package dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

3. Configure Environment Variables:
   Create a `.env` file in the root directory and define the Spotify client credentials and callback location:
   ```env
   VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173
   ```
   *Note: Ensure the Redirect URI configured above matches the URI registered in your application settings on the Spotify Developer Dashboard.*

4. Run the Local Development Server:
   ```bash
   pnpm run dev
   # or
   npm run dev
   ```

5. Access the Application:
   Navigate to the local URL (default is `http://localhost:5173`) in a web browser, and complete the authentication prompt with your Spotify account.

---

## Production Build

To compile and optimize the client-side files for deployment to a static web server:

```bash
pnpm run build
# or
npm run build
```

The optimized assets are output to the `dist/` directory.

---

## Architecture Details

### Caching and Session Storage
Track listings for fetched playlists are stored under individual session storage keys (prefixed with `spotify-manager-workspace-track-cache:`). This design divides the cache payload to stay under browser quotas.

### Least Recently Used Eviction
To prevent runtime storage exceptions when caching large libraries, a custom Least Recently Used (LRU) cache manager tracks access history. If the browser throws a `QuotaExceededError` during cache writes, the manager automatically evicts the oldest playlist segments from session storage until the operation succeeds.

### Fallback Placeholders
When the deprecated Spotify audio-feature APIs are disabled, properties such as BPM and energy are set to `undefined` instead of using static default constants. The UI identifies these `undefined` values and renders a simple `"-"` placeholder to accurately represent the lack of active telemetry.
