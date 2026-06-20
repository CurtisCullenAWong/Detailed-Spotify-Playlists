# Spotify Playlist Manager and Workspace

A personal, power-user workspace to organize, sort, group, and clean up your Spotify music library. This app connects directly to your Spotify account to analyze song metadata and audio features, letting you restructure your playlists locally before syncing them back in bulk.

---

## Table of Contents

- [Overview](#overview)
- [Core Features: Detailed Song Organization](#core-features-detailed-song-organization)
  - [Customizable Workspace Grid](#customizable-workspace-grid)
  - [Multi-Level Grouping and Subgrouping](#multi-level-grouping-and-subgrouping)
  - [Visual Drag-and-Drop Reordering](#visual-drag-and-drop-reordering)
  - [Advanced Sorting (Metadata and Audio Features)](#advanced-sorting-metadata-and-audio-features)
  - [Deduplication and Overlap Cleaning](#deduplication-and-overlap-cleaning)
  - [Virtual Compilation Playlists](#virtual-compilation-playlists)
  - [Safe Live-Sync back to Spotify](#safe-live-sync-back-to-spotify)
- [Getting Started: Installation and Setup](#getting-started-installation-and-setup)
  - [Prerequisites](#prerequisites)
  - [Local Installation](#local-installation)
  - [Environment Setup](#environment-setup)
  - [Available Scripts](#available-scripts)
- [How It Works: Architectural Details](#how-it-works-architectural-details)
  - [Client-Side Authentication (PKCE Flow)](#client-side-authentication-pkce-flow)
  - [Smart Cache and LRU Eviction](#smart-cache-and-lru-eviction)
  - [API Telemetry Flags and Fallbacks](#api-telemetry-flags-and-fallbacks)
  - [Smart Playback Polling](#smart-playback-polling)

---

## Overview

If you have ever tried to organize a playlist with thousands of songs on the official Spotify app, you know how limited it is. You cannot group songs by genre, you cannot easily find duplicate versions of songs, and sorting by technical characteristics like BPM or energy is non-existent. 

This workspace is built to solve that. It is a client-side web application that connects to your Spotify account and gives you a powerful table interface to curate your music. You can organize your songs, create nested folders, sort by tempo, find duplicates, and build compiler views across your entire library before committing any changes back to your account.

---

## Core Features: Detailed Song Organization

Here is a look at what you can do with your music library inside the workspace:

### Customizable Workspace Grid
Your music is rendered in a highly interactive table. You can customize the view to fit your workflow:
- **Choose Your Columns:** Hide or show metadata fields like Title, Artist, Album, Genre, Release Date, and Date Added.
- **Rearrange Columns:** Drag and drop column headers to reorder them horizontally.
- **Inspect Audio Metrics:** View technical details for each song, including BPM, Popularity, Energy, Danceability, Valence (Happiness), Acousticness, Instrumentalness, Liveness, Speechiness, and Loudness.

### Multi-Level Grouping and Subgrouping
Instead of scrolling through a single long playlist, you can organize your songs into clean, hierarchical folders:
1. **Primary Grouping:** Group your playlist by Artist, Album, Genre, or Release Year.
2. **Sub-Grouping:** Add a nested layer of organization (e.g., group by **Artist**, and then by **Album** under each artist).
3. **Collapsible Folders:** Expand or collapse groups to clean up your screen and focus on the tracks you want to edit.

### Visual Drag-and-Drop Reordering
Fine-tune your playlist order visually:
- **Move Individual Songs:** Drag a track up or down to change its position in the list.
- **Move Entire Groups:** Drag a group header (such as a whole album or artist folder) to move all of its songs at once.

### Advanced Sorting (Metadata and Audio Features)
Sort your playlists and groups using any audio attribute:
- **Flat Sorting:** Sort your entire playlist by standard columns or audio characteristics. For example, sort by **BPM** to build a workout mix, or sort by **Valence** to arrange your songs from saddest to happiest.
- **Group Sorting:** Sort your grouped folders by alphabetical name, track count (largest to smallest), average duration, average release date, or average audio metric (e.g., sort your Artist folders by their average song popularity).

### Deduplication and Overlap Cleaning
Clean up bloated playlists with targeted cleaning tools:
- **Show Song Overlap:** Isolates songs that share similar titles and artists. This helps you catch and remove duplicate versions of the same song (such as live recordings, radio edits, and album versions) that standard deduplicators miss.
- **Remove Duplicates:** Automatically finds exact track duplicates in your playlist and deletes them in a single click, keeping the first occurrence.

### Virtual Compilation Playlists
Merge tracks from different sources without modifying the original playlists:
- **All My Songs:** Combines your Liked Songs and all playlists you own into a single workspace.
- **All Followed Songs:** Combines tracks from all playlists you follow.
- **All Songs:** Merges every single song in your library into one searchable grid.

### Safe Live-Sync back to Spotify
All your sorting, reordering, and deduplication actions happen locally first. When you are happy with how your playlist looks, click **Save Playlist Order** to write the sequence directly to Spotify's servers in a clean, batched operation.

---

## Getting Started: Installation and Setup

### Prerequisites
- **Node.js**: Version 18.x or higher.
- **Package Manager**: `pnpm` is recommended (the project is set up with a pnpm workspace), but standard `npm` or `yarn` works too.
- **Spotify Developer Account**: To register your local application and get a Client ID.

### Local Installation
1. Clone this repository and enter the directory:
   ```bash
   git clone <repository-url>
   cd Spotify
   ```
2. Install the dependencies:
   ```bash
   pnpm install
   # or
   npm install
   ```

### Environment Setup
Create a `.env.local` file in the root directory and add your Spotify Client ID and callback URL:
```env
VITE_SPOTIFY_CLIENT_ID=your_spotify_client_id_here
VITE_SPOTIFY_REDIRECT_URI=http://localhost:5173
```
> [!IMPORTANT]
> Make sure the Redirect URI defined in your `.env.local` is also added under the **Redirect URIs** section of your app settings on the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard).

### Available Scripts
- **Start Development Server**: Runs the app locally with hot-reloading:
  ```bash
  pnpm run dev
  # or
  npm run dev
  ```
- **Build for Production**: Compiles and optimizes the app for production static hosting:
  ```bash
  pnpm run build
  # or
  npm run build
  ```
  The build artifacts will be output to the `dist/` folder.

---

## How It Works: Architectural Details

### Client-Side Authentication (PKCE Flow)
The app runs completely client-side. It connects to the Spotify API using **Authorization Code Flow with Proof Key for Code Exchange (PKCE)**. 
- You do not need a backend server to hide a client secret; keys and verifiers are generated in the browser.
- Tokens are stored in browser local storage, and the app handles token refreshing silently behind the scenes.

### Smart Cache and LRU Eviction
Fetching thousands of songs with Spotify's pagination can quickly run into API rate limits. To prevent this, track listings are cached in browser session storage:
- To avoid browser storage limit exceptions (`QuotaExceededError`) on large libraries, the cache is managed by a custom **Least Recently Used (LRU)** eviction manager.
- If storage quotas are reached, the manager automatically ejects the oldest cached playlists to make room for new ones.

### API Telemetry Flags and Fallbacks
Following Spotify's recent Web API changes, access to legacy endpoints like audio features (`/v1/audio-features`) may be restricted depending on your developer account access levels. The app is built to handle this gracefully:
- You can turn off restricted features under user preferences.
- When disabled, the app bypasses these API requests entirely and shows clean `"-"` placeholders in the grid, protecting the app from crashing and respecting the API limitations.

### Smart Playback Polling
To keep the player state and progress bar in sync with your active device without spamming Spotify's servers, the app uses an adaptive polling loop:
- **Visibility-Aware:** Polling is completely suspended when the browser tab is in the background.
- **Adaptive Rates:** Polling dynamically shifts intervals: 4 seconds when a song is playing, 15 seconds when paused, and 20 seconds when the player is idle.
- **Triggered Polls:** Interacting with playback controls (play, pause, skip) triggers a poll after a short 600ms delay, giving the Spotify backend time to update before fetching the fresh state.
