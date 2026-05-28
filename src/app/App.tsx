import React, { useState, useRef, useEffect } from "react";
import {
  Home,
  Search,
  Library,
  ListMusic,
  Heart,
  Plus,
  Play,
  Pause,
  Music2,
  RefreshCw,
  Columns3,
  Trash2,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Zap,
  ChevronDown,
  ChevronRight,
  GripVertical,
  X,
  Check,
  Clock,
  MoreHorizontal,
  Code2,
  TrendingUp,
  Mic2,
  RadioTower,
  Laptop2,
  Grid3x3,
  Grid2x2,
  Rows3,
  ArrowUpDown,
  LogOut,
  Pencil,
  Camera,
} from "lucide-react";

import { toast } from "sonner";

// Import data from centralized data directory
import {
  API_SECTIONS,
  BROWSE_CATEGORIES,
  ALL_COLUMNS,
  GROUP_BY_LABELS,
  SEARCH_FILTERS,
} from "../data";
import type { Track, Playlist, Artist, GroupByOption, ApiEndpoint } from "../data";
import { loadPreferences, savePreferences, PreferenceUpdaters } from "../utils/userPreferences";
import { isAuthenticatedSync, logout, handleRedirectCallback } from "../utils/spotifyAuth";
import {
  getCurrentUser,
  getUserPlaylists,
  getPlaylistTracks,
  getMultiPlaylistTracks,
  getLikedSongsCount,
  getRecentlyPlayed,
  getTopArtists,
  searchSpotify,
  getPlayerState,
  playTrack,
  pauseTrack,
  skipToNext,
  skipToPrevious,
  setPlayerVolume,
  seekPosition,
  toggleShuffle,
  toggleRepeat,
  addTracksToPlaylist,
  removeTracksFromPlaylist,
  getPlaylistSnapshotId,
  reorderPlaylistTracks,
  spotifyFetch,
  setDeprecatedApisEnabled,
  updatePlaylistDetails,
  uploadPlaylistCoverImage,
} from "../utils/spotifyApi";
import Login from "./components/Login";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";

const getInitials = (name: string) => {
  if (!name) return "SP";
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const buildTrackUri = (trackId: string | number) => `spotify:track:${trackId}`;

const isUrlOrData = (str: string) => {
  if (!str) return false;
  return str.startsWith("http") || str.startsWith("data:");
};

const getPlaybackTrackId = (item: any): string | null => {
  if (!item) return null;
  if (item.id !== undefined && item.id !== null) return String(item.id);
  if (typeof item.uri === "string") {
    const uriParts = item.uri.split(":");
    return uriParts[uriParts.length - 1] || null;
  }
  return null;
};

const playTrackSequence = async (tracks: Pick<Track, "id">[], startIndex: number): Promise<void> => {
  if (tracks.length === 0 || startIndex < 0 || startIndex >= tracks.length) return;
  await playTrack({
    uris: tracks.map(track => buildTrackUri(track.id)),
    offset: { position: startIndex },
  });
};


// ─── Types ────────────────────────────────────────────────────────────────────

type Page = "dashboard" | "workspace" | "api" | "search" | "libraries";

// ─── Method Badge ─────────────────────────────────────────────────────────────

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-emerald-900/60 text-emerald-400 border-emerald-800",
    POST: "bg-blue-900/60 text-blue-400 border-blue-800",
    PUT: "bg-amber-900/60 text-amber-400 border-amber-800",
    DELETE: "bg-red-900/60 text-red-400 border-red-800",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border font-mono ${colors[method] ?? "bg-[#282828] text-[#B3B3B3]"}`}>
      {method}
    </span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({
  page,
  setPage,
  collapsed,
  onToggleCollapse,
  playlists,
  likedSongsCount,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playingPlaylistId,
}: {
  page: Page;
  setPage: (p: Page) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  playlists: Playlist[];
  likedSongsCount: number;
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  currentUser: any;
  playingPlaylistId: string | number | null;
}) {
  const preferences = loadPreferences();
  const [, setLibraryDropdownOpen] = useState(false);
  const [selectedLibraryView] = useState<"all" | "yours" | "followed">(preferences.libraryView);
  const libraryDropdownRef = useRef<HTMLDivElement>(null);
  const [] = useState<{ top: number; right: number } | null>(null);

  // Save library view preference when it changes
  useEffect(() => {
    PreferenceUpdaters.setLibraryView(selectedLibraryView);
  }, [selectedLibraryView]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (libraryDropdownRef.current && !libraryDropdownRef.current.contains(e.target as Node)) {
        setLibraryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const NAV = [
    { icon: Home, label: "Home", id: "dashboard" as Page },
    { icon: Search, label: "Search", id: "search" as Page },
  ];

  // Filter playlists based on selected view
  const filteredPlaylists =
    selectedLibraryView === "all"
      ? playlists
      : playlists.filter(pl => pl.owner === selectedLibraryView);

  if (collapsed) {
    return (
      <aside className="hidden md:flex flex-col h-full w-[60px] shrink-0 bg-[#121212] border-r border-[#282828] select-none items-center py-4 gap-2 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button onClick={onToggleCollapse} aria-label="Toggle sidebar" className="w-9 h-9 flex items-center justify-center mb-2 shrink-0 hover:scale-105 transition-all overflow-hidden">
          <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
        </button>
        {NAV.map(({ icon: Icon, label, id }) => (
          <button key={label} onClick={() => setPage(id)} title={label}
            className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${id === page ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
            <Icon size={18} />
          </button>
        ))}

        {/* Separator */}
        <div className="w-6 h-px bg-[#282828] my-1" />

        {/* Liked Songs Icon */}
        <button
          onClick={() => { setSelectedPlaylistId("liked"); setPage("workspace"); }}
          title="Liked Songs"
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all bg-gradient-to-br from-[#450af5] to-[#c4efd9] hover:brightness-110 shrink-0 relative ${selectedPlaylistId === "liked" ? "ring-2 ring-[#1DB954]" : ""}`}>
          <Heart size={14} className="text-white fill-white" />
          {playingPlaylistId === "liked" && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          )}
        </button>

        {/* All My Songs Icon */}
        <button
          onClick={() => { setSelectedPlaylistId("all_my"); setPage("workspace"); }}
          title="All My Songs"
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all bg-gradient-to-br from-blue-600 to-indigo-700 hover:brightness-110 shrink-0 relative ${selectedPlaylistId === "all_my" ? "ring-2 ring-[#1DB954]" : ""}`}>
          <ListMusic size={14} className="text-white" />
          {playingPlaylistId === "all_my" && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          )}
        </button>

        {/* All Followed Songs Icon */}
        <button
          onClick={() => { setSelectedPlaylistId("all_followed"); setPage("workspace"); }}
          title="All Followed Songs"
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all bg-gradient-to-br from-purple-600 to-violet-700 hover:brightness-110 shrink-0 relative ${selectedPlaylistId === "all_followed" ? "ring-2 ring-[#1DB954]" : ""}`}>
          <RadioTower size={14} className="text-white" />
          {playingPlaylistId === "all_followed" && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          )}
        </button>

        {/* All Songs Icon */}
        <button
          onClick={() => { setSelectedPlaylistId("all_songs"); setPage("workspace"); }}
          title="All Songs"
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-all bg-gradient-to-br from-emerald-600 to-teal-700 hover:brightness-110 shrink-0 relative ${selectedPlaylistId === "all_songs" ? "ring-2 ring-[#1DB954]" : ""}`}>
          <Music2 size={14} className="text-white" />
          {playingPlaylistId === "all_songs" && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
          )}
        </button>

        {/* Playlist Icons - scrollable */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full flex flex-col items-center gap-2 px-1.5 no-scrollbar">
          {filteredPlaylists.map((pl) => (
            <button
              key={pl.id}
              onClick={() => { setSelectedPlaylistId(pl.id); setPage("workspace"); }}
              title={pl.name}
              className={`w-9 h-9 rounded-md shrink-0 hover:brightness-110 transition-all relative ${selectedPlaylistId === pl.id ? "ring-2 ring-[#1DB954]" : ""}`}
              style={isUrlOrData(pl.cover) ? { backgroundImage: `url(${pl.cover})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
            >
              {!isUrlOrData(pl.cover) && <div className={`w-full h-full rounded-md ${pl.cover}`} />}
              {playingPlaylistId === pl.id && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#1DB954] animate-pulse" />
              )}
            </button>
          ))}
        </div>

        <div className="h-px w-6 bg-[#282828] my-1" />
        <button onClick={() => setPage("api")} title="API Reference"
          className={`w-9 h-9 flex items-center justify-center rounded-md transition-colors ${page === "api" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
          <Code2 size={18} />
        </button>
      </aside>
    );
  }

  return (
    <aside className="hidden md:flex flex-col h-full w-[260px] shrink-0 bg-[#121212] border-r border-[#282828] select-none overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Brand */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <button onClick={onToggleCollapse} aria-label="Toggle sidebar" className="w-8 h-8 flex items-center justify-center shrink-0 hover:scale-105 transition-all overflow-hidden">
            <img src="/favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
          </button>
          <span className="text-white font-bold text-[15px] tracking-tight">Spotify Manager</span>
          <button onClick={onToggleCollapse} className="ml-auto text-[#B3B3B3] hover:text-white transition-colors p-1 rounded hover:bg-[#282828]">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Primary Nav */}
      <nav className="px-3 space-y-0.5">
        {NAV.map(({ icon: Icon, label, id }) => (
          <button key={label} onClick={() => setPage(id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${id === page ? "text-white bg-[#1a1a1a]" : "text-[#B3B3B3] hover:text-white"}`}>
            <Icon size={20} className={id === page ? "text-white" : "text-[#B3B3B3]"} />
            {label}
          </button>
        ))}
      </nav>

      {/* Library Panel */}
      <div className="mt-2 pt-2 border-t border-[#282828] flex-1 overflow-hidden flex flex-col min-h-0">
        <LibraryPlaylists
          onOpen={() => setPage("workspace")}
          selectedView={selectedLibraryView}
          playlists={playlists}
          likedSongsCount={likedSongsCount}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
          playingPlaylistId={playingPlaylistId}
        />

        {/* API Reference link */}
        <div className="px-4 pb-3 pt-2 border-t border-[#282828] mt-auto">
          <button onClick={() => setPage("api")}
            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${page === "api" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
            <Code2 size={14} />
            API Reference
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Page 1: Dashboard ────────────────────────────────────────────────────────

function Dashboard({
  setPage,
  currentUser,
  playlists,
  likedSongsCount,
  recentlyPlayed,
  topArtists,
  setSelectedPlaylistId,
  playbackState,
  setPlaybackState,
  onPlayPlaylist,
  setSearchQuery,
  enableDeprecatedApis,
  onToggleDeprecatedApis,
}: {
  setPage: (p: Page) => void;
  currentUser: any;
  playlists: Playlist[];
  likedSongsCount: number;
  recentlyPlayed: any[];
  topArtists: Artist[];
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  playbackState: any;
  setPlaybackState?: React.Dispatch<React.SetStateAction<any>>;
  onPlayPlaylist?: (playlistId: string | number) => Promise<void>;
  setSearchQuery?: (query: string) => void;
  enableDeprecatedApis: boolean;
  onToggleDeprecatedApis: () => void;
}) {
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | number | null>(null);
  const preferences = loadPreferences();
  const [libraryView, setLibraryView] = useState<"all" | "yours" | "followed">(preferences.libraryView);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);
  const headerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    PreferenceUpdaters.setLibraryView(libraryView);
  }, [libraryView]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target as Node)) {
        setHeaderDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const libraryViewLabels = { all: "All Playlists", yours: "My Playlists", followed: "Followed" };

  const filteredPlaylists =
    libraryView === "all"
      ? playlists
      : playlists.filter(pl => pl.owner === libraryView);

  const activeDevice = playbackState?.device?.name || "None";
  const indicators = [
    {
      label: "Total Playlists",
      value: playlists.length.toString(),
      sub: "User & followed collections",
      color: "text-[#1DB954]",
      onClick: () => setPage("libraries")
    },
    {
      label: "Saved Songs",
      value: likedSongsCount.toLocaleString(),
      sub: "In your Liked Songs library",
      color: "text-violet-400",
      onClick: () => {
        setSelectedPlaylistId("liked");
        setPage("workspace");
      }
    },
    {
      label: "Active Device",
      value: activeDevice,
      sub: playbackState?.device?.type || "No active device",
      color: activeDevice !== "None" ? "text-emerald-400" : "text-[#B3B3B3]",
      onClick: async () => {
        try {
          const nextState = await getPlayerState();
          if (setPlaybackState) setPlaybackState(nextState);
          toast.success(nextState?.device?.name ? `Active device: ${nextState.device.name}` : "No active device found");
        } catch (err) {
          toast.error("Failed to check active device");
        }
      }
    },
    {
      label: "Playback Status",
      value: playbackState?.is_playing ? "Playing" : "Stopped",
      sub: playbackState?.item ? playbackState.item.name : "No active track",
      color: playbackState?.is_playing ? "text-amber-400" : "text-[#B3B3B3]",
      onClick: async () => {
        try {
          if (playbackState?.is_playing) {
            await pauseTrack();
            if (setPlaybackState) {
              setPlaybackState((prev: any) => prev ? { ...prev, is_playing: false } : null);
            }
            toast.success("Playback paused");
          } else {
            await playTrack({});
            if (setPlaybackState) {
              setPlaybackState((prev: any) => prev ? { ...prev, is_playing: true } : null);
            }
            toast.success("Playback started");
          }
        } catch (err) {
          toast.error("Playback control failed. Is Spotify running on an active device?");
        }
      }
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-[#1a1a2e] via-[#121212] to-[#121212]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-8 py-3 md:py-4 bg-gradient-to-b from-[#1a1a2e]/95 to-transparent backdrop-blur-sm">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-white text-[18px] md:text-[22px] font-bold truncate">
            {(() => {
              const hour = new Date().getHours();
              const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
              return `${greeting}, ${currentUser?.displayName || "Guest"}`;
            })()}
          </h1>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          {/* Deprecated API Toggle */}
          <button
            onClick={onToggleDeprecatedApis}
            title={enableDeprecatedApis
              ? "Audio features & genre enrichment ON (deprecated Spotify endpoints active)"
              : "Audio features & genre enrichment OFF (safe mode — deprecated endpoints skipped)"}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all duration-200 cursor-pointer select-none ${enableDeprecatedApis
              ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
              : "bg-[#282828] border-[#383838] text-[#535353] hover:border-[#535353] hover:text-[#B3B3B3]"
              }`}
          >
            <span className={`w-2 h-2 rounded-full transition-colors ${enableDeprecatedApis ? "bg-amber-400" : "bg-[#535353]"}`} />
            <span className="hidden sm:inline">{enableDeprecatedApis ? "Deprecated Features ON" : "Deprecated Features OFF"}</span>
            <span className="sm:hidden">{enableDeprecatedApis ? "DF" : "DF"}</span>
          </button>

          <div className="flex items-center gap-3 relative group">
            <button className="flex items-center gap-2 bg-[#181818] rounded-full px-3 py-1.5 hover:scale-105 transition-transform border border-white/5 cursor-pointer">
              {currentUser?.imageUrl ? (
                <img src={currentUser.imageUrl} className="w-6 h-6 rounded-full object-cover" alt="" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-[10px] font-bold text-white">
                  {getInitials(currentUser?.displayName || "Guest")}
                </div>
              )}
              <span className="text-white text-[13px] font-semibold hidden sm:inline">
                {currentUser?.displayName || "Spotify User"}
              </span>
              <ChevronDown size={14} className="text-[#B3B3B3]" />
            </button>
            {/* Dropdown Menu for Logout */}
            <div className="absolute right-0 top-full mt-2 w-36 bg-[#282828] border border-[#383838] rounded-lg shadow-2xl py-1 hidden group-hover:block hover:block z-50">
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-[#383838] hover:text-red-300 font-semibold transition-colors flex items-center gap-2"
              >
                <LogOut size={12} />
                Log Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-8 pb-8 md:pb-10 -mt-2">
        {/* Key Data Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mx-[0px] my-[28px]">
          {indicators.map((s) => {
            const isClickable = s.onClick !== undefined;
            return (
              <button
                key={s.label}
                onClick={s.onClick}
                disabled={!isClickable}
                className={`bg-[#181818] rounded-lg p-3 md:p-4 border border-white/5 text-left transition-all duration-200 w-full focus:outline-none ${isClickable
                  ? "cursor-pointer hover:bg-[#282828] hover:border-[#1DB954]/30 hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-black/50"
                  : "cursor-default"
                  }`}
              >
                <p className="text-[#B3B3B3] text-[10px] md:text-[11px] uppercase tracking-widest font-semibold">{s.label}</p>
                <p className={`text-[22px] md:text-[26px] font-bold mt-1 truncate ${s.color}`}>{s.value}</p>
                <p className="text-[#B3B3B3] text-[11px] md:text-[12px] mt-1 truncate">{s.sub}</p>
              </button>
            );
          })}
        </div>

        {/* Recently Played */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-[16px] md:text-[18px] font-bold">Recently Played</h2>
          </div>
          {recentlyPlayed.length === 0 ? (
            <div className="text-[#535353] text-sm py-4">No recently played tracks found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
              {recentlyPlayed.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    const trackUris = recentlyPlayed.map(rp => rp.uri).filter(Boolean);
                    if (trackUris.length > 0) {
                      playTrack({
                        uris: trackUris,
                        offset: { position: i }
                      }).catch(() => toast.error("Could not start playback. Is Spotify open on an active device?"));
                    }
                  }}
                  className="group flex items-center gap-3 bg-[#181818] hover:bg-[#282828] rounded-md overflow-hidden pr-3 transition-all text-left cursor-pointer w-full focus:outline-none"
                >
                  <div className="w-14 h-14 shrink-0 flex items-center justify-center bg-[#282828]">
                    {item.cover.startsWith("http") ? (
                      <img src={item.cover} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <Music2 size={18} className="text-white/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-[13px] font-semibold truncate">{item.title}</p>
                    <p className="text-[#B3B3B3] text-[11px] truncate">{item.ago}</p>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                      <Play size={12} className="text-black fill-black ml-0.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top Artists */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-[16px] md:text-[18px] font-bold flex items-center gap-2"><TrendingUp size={18} className="text-[#1DB954]" /> Your Top Artists</h2>
          </div>
          {topArtists.length === 0 ? (
            <div className="text-[#535353] text-sm py-4">No top artists found.</div>
          ) : (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-[#282828] scrollbar-track-transparent">
              {topArtists.map((artist, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (setSearchQuery) {
                      setSearchQuery(artist.name);
                      setPage("search");
                    }
                  }}
                  className="group flex flex-col items-center gap-3 shrink-0 cursor-pointer text-left focus:outline-none"
                >
                  <div className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg bg-[#282828] overflow-hidden">
                    {artist.cover.startsWith("http") ? (
                      <img src={artist.cover} className="w-full h-full object-cover rounded-full" alt="" />
                    ) : (
                      <Mic2 size={28} className="text-white/70" />
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Search size={22} className="text-white" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-white text-[13px] font-semibold truncate max-w-[100px]">{artist.name}</p>
                    <p className="text-[#B3B3B3] text-[11px] truncate max-w-[100px]">{artist.genre}</p>
                    <p className="text-[#1DB954] text-[11px] font-mono">{artist.plays} popularity</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Curated Playlists */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4 md:mb-5">
            <div ref={headerDropdownRef} className="relative">
              <button
                onClick={() => setHeaderDropdownOpen(o => !o)}
                className="flex items-center gap-1.5 text-white text-[16px] md:text-[18px] font-bold hover:text-[#B3B3B3] transition-colors cursor-pointer">
                {libraryViewLabels[libraryView]}
                <ChevronDown size={16} className={`transition-transform mt-0.5 ${headerDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {headerDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-44 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 py-1">
                  {([
                    { key: "all" as const, label: "All Playlists" },
                    { key: "yours" as const, label: "My Playlists" },
                    { key: "followed" as const, label: "Followed Playlists" },
                  ] as const).map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => { setLibraryView(key); setHeaderDropdownOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-[#383838] transition-colors text-left ${libraryView === key ? "text-[#1DB954]" : "text-[#B3B3B3]"}`}>
                      {label}
                      {libraryView === key && <Check size={10} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex gap-3 md:gap-5 overflow-x-auto pb-4">
            {/* Liked Songs - Conditionally rendered */}
            {likedSongsCount > 0 && (
              <div onClick={() => { setSelectedPlaylistId("liked"); setPage("workspace"); }}
                onMouseEnter={() => setHoveredPlaylist("liked")} onMouseLeave={() => setHoveredPlaylist(null)}
                className="group flex flex-col gap-3 p-3 rounded-lg bg-gradient-to-br from-[#450af5] to-[#c4efd9] hover:brightness-110 transition-all duration-200 text-left cursor-pointer border border-white/5 w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
                <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-[#450af5] to-[#8134af] flex items-center justify-center">
                  <Heart size={48} className="text-white fill-white" />
                  <div className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200 ${hoveredPlaylist === "liked" ? "opacity-100" : "opacity-0"}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPlayPlaylist) onPlayPlaylist("liked");
                      }}
                      className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-1 group-hover:translate-y-0 transition-transform duration-200 hover:scale-105 z-10 focus:outline-none"
                    >
                      <Play size={16} className="text-black fill-black ml-0.5" />
                    </button>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-[14px] truncate">Liked Songs</p>
                  <p className="text-white/90 text-[12px] mt-0.5 truncate">{likedSongsCount.toLocaleString()} songs</p>
                </div>
              </div>
            )}
            {/* All My Songs */}
            <div onClick={() => { setSelectedPlaylistId("all_my"); setPage("workspace"); }}
              onMouseEnter={() => setHoveredPlaylist("all_my")} onMouseLeave={() => setHoveredPlaylist(null)}
              className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-200 text-left cursor-pointer border border-white/5 w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <ListMusic size={48} className="text-white" />
                <div className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200 ${hoveredPlaylist === "all_my" ? "opacity-100" : "opacity-0"}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPlayPlaylist) onPlayPlaylist("all_my");
                    }}
                    className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-1 group-hover:translate-y-0 transition-transform duration-200 hover:scale-105 z-10 focus:outline-none"
                  >
                    <Play size={16} className="text-black fill-black ml-0.5" />
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-[14px] truncate">All My Songs</p>
                <p className="text-[#B3B3B3] text-[12px] mt-0.5 truncate">Compiled Playlist</p>
              </div>
            </div>
            {/* All Followed Songs */}
            <div onClick={() => { setSelectedPlaylistId("all_followed"); setPage("workspace"); }}
              onMouseEnter={() => setHoveredPlaylist("all_followed")} onMouseLeave={() => setHoveredPlaylist(null)}
              className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-200 text-left cursor-pointer border border-white/5 w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
                <RadioTower size={48} className="text-white" />
                <div className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200 ${hoveredPlaylist === "all_followed" ? "opacity-100" : "opacity-0"}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPlayPlaylist) onPlayPlaylist("all_followed");
                    }}
                    className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-1 group-hover:translate-y-0 transition-transform duration-200 hover:scale-105 z-10 focus:outline-none"
                  >
                    <Play size={16} className="text-black fill-black ml-0.5" />
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-[14px] truncate">All Followed</p>
                <p className="text-[#B3B3B3] text-[12px] mt-0.5 truncate">Compiled Playlist</p>
              </div>
            </div>
            {/* All Songs */}
            <div onClick={() => { setSelectedPlaylistId("all_songs"); setPage("workspace"); }}
              onMouseEnter={() => setHoveredPlaylist("all_songs")} onMouseLeave={() => setHoveredPlaylist(null)}
              className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-200 text-left cursor-pointer border border-white/5 w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
              <div className="relative w-full aspect-square rounded-md overflow-hidden bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                <Music2 size={48} className="text-white" />
                <div className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200 ${hoveredPlaylist === "all_songs" ? "opacity-100" : "opacity-0"}`}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onPlayPlaylist) onPlayPlaylist("all_songs");
                    }}
                    className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-1 group-hover:translate-y-0 transition-transform duration-200 hover:scale-105 z-10 focus:outline-none"
                  >
                    <Play size={16} className="text-black fill-black ml-0.5" />
                  </button>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-white font-semibold text-[14px] truncate">All Songs</p>
                <p className="text-[#B3B3B3] text-[12px] mt-0.5 truncate">Compiled Playlist</p>
              </div>
            </div>

            {filteredPlaylists.map((pl) => (
              <div key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setPage("workspace"); }}
                onMouseEnter={() => setHoveredPlaylist(pl.id)} onMouseLeave={() => setHoveredPlaylist(null)}
                className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all duration-200 text-left cursor-pointer border border-white/5 w-[150px] sm:w-[170px] md:w-[190px] shrink-0">
                <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828]">
                  {isUrlOrData(pl.cover) ? (
                    <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className={`w-full h-full ${pl.cover}`} />
                  )}
                  <div className={`absolute inset-0 flex items-end justify-end p-3 transition-opacity duration-200 ${hoveredPlaylist === pl.id ? "opacity-100" : "opacity-0"}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onPlayPlaylist) onPlayPlaylist(pl.id);
                      }}
                      className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl translate-y-1 group-hover:translate-y-0 transition-transform duration-200 hover:scale-105 z-10 focus:outline-none"
                    >
                      <Play size={16} className="text-black fill-black ml-0.5" />
                    </button>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-[14px] truncate">{pl.name}</p>
                  <p className="text-[#B3B3B3] text-[12px] mt-0.5 truncate">{pl.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page 2: Data Table Workspace ─────────────────────────────────────────────

const LAZY_ROW_STEP = 100; // rows rendered per batch

type SortKey = keyof Track | null;
type GroupBy = GroupByOption;
type SortDir = "asc" | "desc";

const sameTrackOrder = (left: string[], right: string[]) =>
  left.length === right.length && left.every((trackId, index) => trackId === right[index]);

const getTrackOrderKey = (track: Track) => track.rowKey ?? String(track.id);

const getPlaylistTrackCount = (playlist: Playlist) => {
  const tracks = playlist.tracks as unknown;

  if (typeof tracks === "number") {
    return Number.isFinite(tracks) ? tracks : 0;
  }

  if (typeof tracks === "string") {
    const parsed = Number(tracks);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  if (tracks && typeof tracks === "object") {
    const trackData = tracks as { total?: unknown; count?: unknown };
    if (typeof trackData.total === "number" && Number.isFinite(trackData.total)) {
      return trackData.total;
    }
    if (typeof trackData.count === "number" && Number.isFinite(trackData.count)) {
      return trackData.count;
    }
  }

  return 0;
};

const applyTrackOrder = (tracks: Track[], trackOrder: string[]) => {
  const trackMap = new Map(tracks.map(track => [getTrackOrderKey(track), track] as const));
  const ordered = trackOrder.map(id => trackMap.get(id)).filter(Boolean) as Track[];
  const orderedIds = new Set(trackOrder);

  for (const track of tracks) {
    if (!orderedIds.has(getTrackOrderKey(track))) {
      ordered.push(track);
    }
  }

  return ordered;
};

type WorkspaceTrackCache = Record<string, Track[]>;

const WORKSPACE_TRACK_CACHE_KEY = "spotify-manager-workspace-track-cache";

const readWorkspaceTrackCache = (): WorkspaceTrackCache => {
  try {
    const stored = sessionStorage.getItem(WORKSPACE_TRACK_CACHE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const writeWorkspaceTrackCache = (cache: WorkspaceTrackCache) => {
  try {
    sessionStorage.setItem(WORKSPACE_TRACK_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn("Failed to save workspace track cache:", error);
  }
};

// ─── Edit Playlist Modal ──────────────────────────────────────────────────────

interface EditPlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist: Playlist;
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
}

function EditPlaylistModal({
  isOpen,
  onClose,
  playlist,
  setPlaylists,
}: EditPlaylistModalProps) {
  const [name, setName] = useState(playlist.name);
  const [desc, setDesc] = useState(playlist.desc);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when playlist changes or modal opens
  useEffect(() => {
    setName(playlist.name);
    setDesc(playlist.desc);
    setImagePreview(null);
  }, [playlist, isOpen]);

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      toast.error("Spotify only supports JPEG images for playlist covers.");
      return;
    }

    if (file.size > 256 * 1024) {
      toast.error("Image size must be less than 256 KB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Playlist name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update playlist details
      await updatePlaylistDetails(playlist.id, {
        name: name.trim(),
        description: desc.trim(),
      });

      // 2. Upload cover image if changed
      let newCover = playlist.cover;
      if (imagePreview) {
        const base64Data = imagePreview.split(",")[1];
        await uploadPlaylistCoverImage(playlist.id, base64Data);
        newCover = imagePreview;
      }

      // 3. Update parent state
      setPlaylists((prev) =>
        prev.map((p) =>
          String(p.id) === String(playlist.id)
            ? { ...p, name: name.trim(), desc: desc.trim(), cover: newCover }
            : p
        )
      );

      toast.success("Playlist updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating playlist details:", error);
      toast.error("Failed to update playlist details.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={onClose}>
      {/* Modal Card */}
      <div
        className="bg-[#282828] border border-[#383838] w-full max-w-[520px] rounded-lg shadow-2xl overflow-hidden text-white flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#383838]">
          <h2 className="text-[18px] font-bold">Edit details</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-5">
            {/* Image Section */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-36 h-36 bg-[#181818] border border-[#383838] rounded-md overflow-hidden relative group cursor-pointer flex items-center justify-center shadow-lg"
              >
                {imagePreview ? (
                  <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                ) : isUrlOrData(playlist.cover) ? (
                  <img src={playlist.cover} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className={`w-full h-full ${playlist.cover} flex items-center justify-center`}>
                    <Music2 size={40} className="text-white/60" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-xs font-semibold text-white">
                  <Camera size={20} />
                  <span>Choose photo</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageChange}
                accept="image/jpeg,image/jpg"
                className="hidden"
              />
              <span className="text-[10px] text-[#B3B3B3] text-center max-w-[150px]">
                JPEG up to 256KB
              </span>
            </div>

            {/* Inputs Section */}
            <div className="flex-1 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Add a name"
                  required
                  className="w-full bg-[#3e3e3e] border border-transparent focus:border-[#535353] focus:bg-[#4a4a4a] text-sm rounded px-3 py-2 outline-none text-white transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B3B3B3]">
                  Description
                </label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Add an optional description"
                  rows={4}
                  className="w-full bg-[#3e3e3e] border border-transparent focus:border-[#535353] focus:bg-[#4a4a4a] text-sm rounded px-3 py-2 outline-none text-white transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          <p className="text-[10px] text-[#B3B3B3] mt-2 leading-normal">
            By proceeding, you agree to give Spotify access to the image you upload. Please make sure you have the right to upload the image.
          </p>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 mt-4 border-t border-[#383838] pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-6 py-2 rounded-full text-sm font-bold text-white hover:scale-105 transition-transform cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="bg-white hover:bg-neutral-100 text-black px-8 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Workspace({
  playlists,
  setPlaylists,
  selectedPlaylistId,
  playlistTracks,
  loadingTracks,
  loadingTracksProgress,
  setPlaylistTracks,
  likedSongsCount,
  setLikedSongsCount,
  onForceCompleteFetch,
  currentPlaybackTrackId,
  enableDeprecatedApis,
  setPlayingPlaylistId,
}: {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  playlistTracks: Track[];
  loadingTracks: boolean;
  loadingTracksProgress: number;
  setPlaylistTracks: React.Dispatch<React.SetStateAction<Track[]>>;
  likedSongsCount: number;
  setLikedSongsCount: React.Dispatch<React.SetStateAction<number>>;
  onForceCompleteFetch: () => void;
  currentPlaybackTrackId: string | null;
  enableDeprecatedApis: boolean;
  setPlayingPlaylistId: (id: string | number | null) => void;
}) {
  const preferences = loadPreferences();

  const [search, setSearch] = useState(preferences.workspaceSearch);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<GroupBy>(preferences.workspaceGroupBy);
  const [sortKey, setSortKey] = useState<SortKey>(preferences.workspaceSortKey as SortKey);
  const [sortDir, setSortDir] = useState<SortDir>(preferences.workspaceSortDir);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [playlistFlyoutOpen, setPlaylistFlyoutOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [trackOrders, setTrackOrders] = useState<Record<string, string[]>>(preferences.workspaceTrackOrders);
  const [isSavingTrackOrder, setIsSavingTrackOrder] = useState(false);
  // Lazy rendering: number of rows currently rendered
  const [visibleRowCount, setVisibleRowCount] = useState(LAZY_ROW_STEP);
  const lazyTriggerRef = useRef<HTMLTableRowElement>(null);
  const trackDragItemRef = useRef<string | null>(null);
  const trackDragOverRef = useRef<string | null>(null);

  type ColId = "title" | "artist" | "album" | "genre" | "releaseYear" | "releaseDate" | "dateAdded" | "bpm" | "energy" | "popularity" | "duration" | "danceability" | "valence" | "acousticness" | "instrumentalness" | "speechiness" | "liveness" | "loudness";
  const [columnOrder, setColumnOrder] = useState<ColId[]>(preferences.workspaceColumnOrder as ColId[]);
  const [visibleCols, setVisibleCols] = useState<Set<ColId>>(new Set(preferences.workspaceVisibleColumns as ColId[]));
  const dragColRef = useRef<ColId | null>(null);
  const dragOverColRef = useRef<ColId | null>(null);

  const DEPRECATED_COLUMNS = React.useMemo(() => new Set<ColId>([
    "genre", "bpm", "energy", "popularity", "danceability", "valence",
    "acousticness", "instrumentalness", "speechiness", "liveness", "loudness"
  ]), []);

  const GROUPABLE_COLUMNS = React.useMemo(() => ALL_COLUMNS.filter((column) => column.groupable), []);

  const activeColumnsCount = React.useMemo(() => {
    return columnOrder
      .filter(id => visibleCols.has(id))
      .filter(id => enableDeprecatedApis || !DEPRECATED_COLUMNS.has(id)).length;
  }, [columnOrder, visibleCols, enableDeprecatedApis, DEPRECATED_COLUMNS]);

  const totalColSpan = 2 + activeColumnsCount;

  useEffect(() => {
    if (!enableDeprecatedApis) {
      if (sortKey && DEPRECATED_COLUMNS.has(sortKey as ColId)) {
        setSortKey(null);
      }
      if (groupBy === "genre") {
        setGroupBy("none");
      }
    }
  }, [enableDeprecatedApis, sortKey, groupBy, DEPRECATED_COLUMNS]);

  useEffect(() => {
    if (groupBy === "none") return;
    const groupedColumn = groupBy as ColId;
    if (visibleCols.has(groupedColumn)) return;
    setVisibleCols(prev => {
      const next = new Set(prev);
      next.add(groupedColumn);
      return next;
    });
  }, [groupBy, visibleCols]);

  const activePlaylist = playlists.find(p => String(p.id) === String(selectedPlaylistId));
  const currentPlaylistKey = String(selectedPlaylistId);
  const playlistName =
    selectedPlaylistId === "liked" ? "Liked Songs" :
      selectedPlaylistId === "all_my" ? "All My Songs" :
        selectedPlaylistId === "all_followed" ? "All Followed Songs" :
          selectedPlaylistId === "all_songs" ? "All Songs" :
            activePlaylist?.name || "Playlist View";
  const playlistDesc =
    selectedPlaylistId === "liked" ? "Your personal favorite tracks synced from Spotify" :
      selectedPlaylistId === "all_my" ? "Compiled list of all your liked songs and personal playlists" :
        selectedPlaylistId === "all_followed" ? "Compiled list of all tracks from playlists you follow" :
          selectedPlaylistId === "all_songs" ? "Every track in your library compiled into one virtual playlist" :
            activePlaylist?.desc || "Compiled track analysis and filtering criteria";
  const playlistCover =
    selectedPlaylistId === "liked" ? "" :
      selectedPlaylistId === "all_my" ? "bg-gradient-to-br from-blue-600 to-indigo-700" :
        selectedPlaylistId === "all_followed" ? "bg-gradient-to-br from-purple-600 to-violet-700" :
          selectedPlaylistId === "all_songs" ? "bg-gradient-to-br from-emerald-600 to-teal-700" :
            activePlaylist?.cover || "";
  const playlistTotalTracks =
    selectedPlaylistId === "liked"
      ? likedSongsCount
      : activePlaylist
        ? getPlaylistTrackCount(activePlaylist)
        : playlistTracks.length;
  const isCompiledVirtualPlaylist = selectedPlaylistId === "all_my" || selectedPlaylistId === "all_followed" || selectedPlaylistId === "all_songs";
  const playlistCountLabel =
    typeof playlistTotalTracks === "number" && playlistTotalTracks >= 0 && !isCompiledVirtualPlaylist
      ? `${playlistTracks.length.toLocaleString()} / ${playlistTotalTracks.toLocaleString()} tracks`
      : `${playlistTracks.length.toLocaleString()} tracks`;
  const isYours = (selectedPlaylistId === "liked" || activePlaylist?.owner === "yours") && selectedPlaylistId !== "all_my" && selectedPlaylistId !== "all_followed" && selectedPlaylistId !== "all_songs";
  const isEditable = !!activePlaylist && activePlaylist.owner === "yours";
  const canSortPlaylist = !!activePlaylist && activePlaylist.owner === "yours";
  const canReorderTracks = canSortPlaylist && sortKey === null && groupBy === "none";
  const currentTrackOrder = trackOrders[currentPlaylistKey] ?? [];
  const orderedPlaylistTracks = canReorderTracks && currentTrackOrder.length > 0
    ? applyTrackOrder(playlistTracks, currentTrackOrder)
    : playlistTracks;

  const trackIndices = React.useMemo(() => {
    const map = new Map<Track, number>();
    orderedPlaylistTracks.forEach((t, i) => {
      map.set(t, i);
    });
    return map;
  }, [orderedPlaylistTracks]);

  const sortedPlaylistTracks = React.useMemo(() => {
    if (!sortKey) {
      return orderedPlaylistTracks;
    }
    return [...playlistTracks].sort((a, b) => {
      const va = a[sortKey as keyof Track];
      const vb = b[sortKey as keyof Track];

      if ((va === undefined || va === null) && (vb === undefined || vb === null)) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;

      let cmp = 0;
      if (sortKey === "duration") {
        cmp = a.durationMs - b.durationMs;
      } else if (sortKey === "releaseDate") {
        const da = a.releaseDate || String(a.releaseYear || "");
        const db = b.releaseDate || String(b.releaseYear || "");
        cmp = da.localeCompare(db, undefined, { sensitivity: "base", numeric: true });
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
      }

      if (cmp === 0) {
        const idxA = trackIndices.get(a) ?? 0;
        const idxB = trackIndices.get(b) ?? 0;
        return idxA - idxB;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [playlistTracks, orderedPlaylistTracks, sortKey, sortDir, trackIndices]);

  const targetTrackOrder = sortedPlaylistTracks.map(getTrackOrderKey);
  const initialTrackOrder = playlistTracks.map(getTrackOrderKey);
  const hasUnsavedTrackOrder = canSortPlaylist && playlistTracks.length > 0 && !sameTrackOrder(targetTrackOrder, initialTrackOrder);

  // Reset visible row count whenever playlist or sort changes
  useEffect(() => {
    setVisibleRowCount(LAZY_ROW_STEP);
  }, [selectedPlaylistId, sortKey, sortDir, groupBy, search]);

  // IntersectionObserver to load more rows when sentinel is visible
  useEffect(() => {
    const sentinel = lazyTriggerRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleRowCount(prev => prev + LAZY_ROW_STEP);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [lazyTriggerRef.current]);

  // Save workspace preferences when they change
  useEffect(() => {
    PreferenceUpdaters.setWorkspaceSort(sortKey, sortDir);
  }, [sortKey, sortDir]);

  useEffect(() => {
    PreferenceUpdaters.setWorkspaceGroupBy(groupBy);
  }, [groupBy]);

  useEffect(() => {
    PreferenceUpdaters.setWorkspaceColumns(columnOrder, Array.from(visibleCols));
  }, [columnOrder, visibleCols]);

  useEffect(() => {
    savePreferences({ workspaceTrackOrders: trackOrders });
  }, [trackOrders]);

  useEffect(() => {
    if (!columnsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cols-dropdown]")) setColumnsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [columnsOpen]);

  const toggleColVisibility = (id: ColId) => {
    if (groupBy !== "none" && groupBy === id) return;
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(id) && next.size === 1) return prev;
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleColDragStart = (id: ColId) => { dragColRef.current = id; };
  const handleColDragEnter = (id: ColId) => { dragOverColRef.current = id; };
  const handleColDragEnd = () => {
    const from = dragColRef.current;
    const to = dragOverColRef.current;
    if (!from || !to || from === to) return;
    setColumnOrder(prev => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      return next;
    });
    dragColRef.current = null;
    dragOverColRef.current = null;
  };

  const filtered = React.useMemo(() => {
    return orderedPlaylistTracks.filter((t) => {
      if (!t) return false;
      const q = search.toLowerCase();
      const title = (t.title || "").toLowerCase();
      const artist = (t.artist || "").toLowerCase();
      const album = (t.album || "").toLowerCase();
      const genre = (t.genre || "").toLowerCase();
      return title.includes(q) || artist.includes(q) || album.includes(q) || genre.includes(q);
    });
  }, [orderedPlaylistTracks, search]);

  const sorted = React.useMemo(() => {
    if (!sortKey) return filtered;
    return [...filtered].sort((a, b) => {
      const va = a[sortKey as keyof Track];
      const vb = b[sortKey as keyof Track];

      if ((va === undefined || va === null) && (vb === undefined || vb === null)) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;

      let cmp = 0;
      if (sortKey === "duration") {
        cmp = a.durationMs - b.durationMs;
      } else if (sortKey === "releaseDate") {
        const da = a.releaseDate || String(a.releaseYear || "");
        const db = b.releaseDate || String(b.releaseYear || "");
        cmp = da.localeCompare(db, undefined, { sensitivity: "base", numeric: true });
      } else if (typeof va === "number" && typeof vb === "number") {
        cmp = va - vb;
      } else {
        cmp = String(va).localeCompare(String(vb), undefined, { sensitivity: "base", numeric: true });
      }

      if (cmp === 0) {
        const idxA = trackIndices.get(a) ?? 0;
        const idxB = trackIndices.get(b) ?? 0;
        return idxA - idxB;
      }

      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir, trackIndices]);

  const toggleSort = (key: SortKey) => {
    if (!key) return;
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleSavePlaylistOrder = async () => {
    if (!canSortPlaylist || !hasUnsavedTrackOrder || targetTrackOrder.length === 0) return;

    setIsSavingTrackOrder(true);
    try {
      const snapshotId = await getPlaylistSnapshotId(selectedPlaylistId);
      await reorderPlaylistTracks(selectedPlaylistId, initialTrackOrder, targetTrackOrder, snapshotId);

      // Update playlistTracks locally to match the new saved order
      setPlaylistTracks(prev => {
        const trackMap = new Map(prev.map(t => [getTrackOrderKey(t), t] as const));
        return targetTrackOrder.map(id => trackMap.get(id)).filter(Boolean) as Track[];
      });

      // Also update trackOrders to match the new order (so that sameTrackOrder will be true and save button disables)
      setTrackOrders(prev => ({
        ...prev,
        [currentPlaylistKey]: targetTrackOrder,
      }));

      // If we sorted by column, we should clear the column sort so the visual layout matches the new default order
      if (sortKey !== null) {
        setSortKey(null);
      }

      toast.success("Playlist sequence saved to Spotify.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save playlist sequence.");
    } finally {
      setIsSavingTrackOrder(false);
    }
  };

  const toggleRow = (id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === sorted.length) setSelected(new Set());
    else setSelected(new Set(sorted.map(t => t.id)));
  };

  const toggleGroup = (label: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  const groupedEntries: { label: string; tracks: Track[] }[] = (() => {
    if (groupBy === "none") return [{ label: "", tracks: sorted }];
    const map = new Map<string, Track[]>();
    for (const t of sorted) {
      const key = groupBy === "artist" ? t.artist : groupBy === "album" ? t.album : groupBy === "genre" ? t.genre : String(t.releaseYear);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return Array.from(map.entries()).map(([label, tracks]) => ({ label, tracks }));
  })();

  const handleAddToPlaylist = async (destPlaylistId: string | number) => {
    const selectedIds = Array.from(selected);
    const uris = selectedIds.map(id => `spotify:track:${id}`);
    try {
      await addTracksToPlaylist(destPlaylistId, uris);
      toast.success(`Successfully added ${selectedIds.length} track(s) to playlist.`);
      setPlaylistFlyoutOpen(false);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to add tracks. Make sure you own the destination playlist.");
    }
  };

  const handleDelete = async () => {
    const selectedIds = Array.from(selected);
    const uris = selectedIds.map(id => `spotify:track:${id}`);
    try {
      await removeTracksFromPlaylist(selectedPlaylistId, uris);
      setPlaylistTracks(prev => prev.filter(t => !selected.has(t.id)));
      setTrackOrders(prev => {
        const nextOrder = prev[currentPlaylistKey] ?? [];
        return {
          ...prev,
          [currentPlaylistKey]: nextOrder.filter(trackId => !selected.has(trackId)),
        };
      });
      if (selectedPlaylistId === "liked") {
        setLikedSongsCount(c => Math.max(0, c - selectedIds.length));
      }
      toast.success(`Successfully removed ${selectedIds.length} track(s) from this playlist.`);
      setSelected(new Set());
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove tracks. You can only remove tracks from playlists you own.");
    }
  };

  const handleTrackDragStart = (trackId: string | number) => {
    if (!canReorderTracks) return;
    trackDragItemRef.current = String(trackId);
  };

  const handleTrackDragEnter = (trackId: string | number) => {
    if (!canReorderTracks) return;
    trackDragOverRef.current = String(trackId);
  };

  const handleTrackDragEnd = () => {
    const draggedId = trackDragItemRef.current;
    const targetId = trackDragOverRef.current;

    if (!draggedId || !targetId || draggedId === targetId) {
      trackDragItemRef.current = null;
      trackDragOverRef.current = null;
      return;
    }

    const nextOrder = orderedPlaylistTracks.map(getTrackOrderKey);
    const draggedIndex = nextOrder.indexOf(draggedId);
    const targetIndex = nextOrder.indexOf(targetId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      nextOrder.splice(draggedIndex, 1);
      nextOrder.splice(targetIndex, 0, draggedId);
      setTrackOrders(prev => ({
        ...prev,
        [currentPlaylistKey]: nextOrder,
      }));
    }

    trackDragItemRef.current = null;
    trackDragOverRef.current = null;
  };

  const ColHeader = ({ col, label }: { col: ColId; label: string }) => (
    <th
      draggable
      onDragStart={() => handleColDragStart(col)}
      onDragEnter={() => handleColDragEnter(col)}
      onDragEnd={handleColDragEnd}
      onDragOver={e => e.preventDefault()}
      className={`group px-3 py-3 text-left text-[10px] uppercase tracking-widest font-semibold cursor-grab active:cursor-grabbing transition-colors select-none ${col === "dateAdded" ? "min-w-[160px]" : col === "releaseDate" ? "min-w-[130px]" : ""} ${sortKey === col ? "text-white" : "text-[#B3B3B3] hover:text-white"}`}>
      <button
        type="button"
        onClick={() => toggleSort(col as SortKey)}
        className="flex items-center gap-1 text-left"
      >
        {col === "energy" ? "Energy" : col === "bpm" ? "BPM" : label}
        {sortKey === col
          ? sortDir === "asc" ? <ChevronDown size={11} className="text-[#1DB954] rotate-180" /> : <ChevronDown size={11} className="text-[#1DB954]" />
          : <ChevronDown size={11} className="opacity-0 group-hover:opacity-40 transition-opacity" />}
      </button>
    </th>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#121212] overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#2a1a4e] to-[#121212] px-4 md:px-8 pt-6 md:pt-8 pb-5 md:pb-6 shrink-0">
        <div className="flex items-end gap-4 md:gap-6">
          <div
            className="w-[80px] h-[80px] md:w-[100px] md:h-[100px] rounded-lg flex items-center justify-center shadow-2xl shrink-0 overflow-hidden bg-[#282828] relative"
          >
            {selectedPlaylistId === "liked" ? (
              <div className="w-full h-full bg-gradient-to-br from-[#450af5] to-[#8134af] flex items-center justify-center">
                <Heart size={36} className="text-white fill-white" />
              </div>
            ) : selectedPlaylistId === "all_my" ? (
              <div className="w-full h-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                <ListMusic size={36} className="text-white" />
              </div>
            ) : selectedPlaylistId === "all_followed" ? (
              <div className="w-full h-full bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
                <RadioTower size={36} className="text-white" />
              </div>
            ) : selectedPlaylistId === "all_songs" ? (
              <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                <Music2 size={36} className="text-white" />
              </div>
            ) : isUrlOrData(playlistCover) ? (
              <img src={playlistCover} className="w-full h-full object-cover" alt="" />
            ) : (
              <div className={`w-full h-full ${playlistCover} flex items-center justify-center`}>
                <Zap size={36} className="text-white/80" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="mb-1">
              <div className="flex items-center gap-1.5">
                <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Playlist</p>
              </div>
              <h1 className="text-white text-[20px] md:text-[32px] font-extrabold leading-none mt-1 mb-1 truncate">{playlistName}</h1>
              <p className="text-[#B3B3B3] text-[12px] md:text-[13px] hidden sm:block truncate max-w-xl">{playlistDesc}</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 text-[11px] md:text-[13px] flex-wrap">
              <span className="text-white font-semibold flex items-center gap-2">
                {playlistCountLabel}
                {(typeof playlistTotalTracks === "number" || isCompiledVirtualPlaylist) && (
                  <button
                    type="button"
                    onClick={onForceCompleteFetch}
                    disabled={loadingTracks}
                    title={isCompiledVirtualPlaylist ? "Refresh compiled playlist tracks from Spotify" : "Fetch complete playlist data from Spotify"}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border p-0 leading-none transition-colors ${loadingTracks ? "cursor-not-allowed border-white/10 text-[#535353]" : "border-white/20 text-[#B3B3B3] hover:text-white hover:border-white/40"}`}
                  >
                    <RefreshCw size={10} className={loadingTracks ? "animate-spin" : ""} />
                  </button>
                )}
                {loadingTracks && (
                  <span className="flex items-center gap-1.5 text-[11px] text-[#1DB954] font-medium bg-[#1DB954]/10 border border-[#1DB954]/20 px-2 py-0.5 rounded-full animate-pulse select-none" title="Streaming tracks in real-time">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#1DB954]" />
                    Loading {Math.round(loadingTracksProgress)}%
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 md:gap-3 px-4 md:px-8 py-2 md:py-3 border-b border-[#282828] bg-[#121212] shrink-0 overflow-visible flex-wrap sm:flex-nowrap">
        <button
          onClick={() => {
            if (playlistTracks.length > 0) {
              playTrackSequence(sorted, 0)
                .catch(() => toast.error("Could not play playlist. Is Spotify open on an active device?"));
              if (setPlayingPlaylistId) setPlayingPlaylistId(selectedPlaylistId);
            }
          }}
          className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer shrink-0 mr-1"
        >
          <Play size={18} className="text-black fill-black ml-0.5" />
        </button>

        {isYours && (
          <button
            onClick={handleSavePlaylistOrder}
            disabled={!canSortPlaylist || !hasUnsavedTrackOrder || targetTrackOrder.length === 0 || isSavingTrackOrder}
            title={!canSortPlaylist
              ? "Only playlists you own can be saved back to Spotify"
              : isSavingTrackOrder
                ? "Sorting playlist..."
                : !hasUnsavedTrackOrder
                  ? "Playlist sequence is already in sync"
                  : "Save the current track order to Spotify"}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all border shrink-0 ${isSavingTrackOrder ? "bg-[#1DB954] text-black border-[#1DB954] cursor-wait" : hasUnsavedTrackOrder ? "bg-[#1DB954]/15 text-[#1DB954] border-[#1DB954]/40 hover:bg-[#1DB954]/20 cursor-pointer" : "bg-[#282828] text-[#535353] border-transparent cursor-not-allowed"}`}
          >
            <RefreshCw size={13} className={isSavingTrackOrder ? "animate-spin text-black" : hasUnsavedTrackOrder ? "text-[#1DB954]" : "text-[#535353]"} />
            {isSavingTrackOrder ? "Sorting..." : hasUnsavedTrackOrder ? "Save Sort" : "Sort Playlist"}
          </button>
        )}

        {isEditable && (
          <button
            type="button"
            onClick={() => setIsEditModalOpen(true)}
            title="Edit playlist details"
            className="flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold bg-[#282828] border border-[#535353] hover:border-white text-white transition-all cursor-pointer shrink-0"
          >
            <Pencil size={13} />
            <span>Edit Details</span>
          </button>
        )}

        <div className="flex-1 min-w-0 max-w-sm relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
          <input type="text" placeholder="Search tracks..." value={search} onChange={e => setSearch(e.target.value)}
            id="workspace-search-input" name="workspaceSearch"
            className="w-full pl-8 pr-3 py-2 bg-[#282828] rounded text-[12px] md:text-[13px] text-white placeholder-[#B3B3B3] border border-transparent focus:border-white/20 outline-none transition-colors" />
        </div>

        <div className="relative hidden sm:block">
          <button onClick={() => setGroupByOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-[#282828] rounded text-[13px] text-[#B3B3B3] hover:text-white transition-colors border border-transparent hover:border-white/20 cursor-pointer">
            <ListMusic size={14} />
            Group By: <span className="text-white">{GROUP_BY_LABELS[groupBy as GroupByOption]}</span>
            <ChevronDown size={12} />
          </button>
          {groupByOpen && (
            <div className="absolute top-full left-0 mt-1 w-44 bg-[#282828] rounded-lg shadow-2xl border border-[#383838] z-50 py-1 overflow-hidden">
              <button
                onClick={() => { setGroupBy("none"); setGroupByOpen(false); setCollapsedGroups(new Set()); }}
                className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between transition-colors cursor-pointer ${groupBy === "none" ? "text-[#1DB954] bg-[#1DB954]/10" : "text-[#B3B3B3] hover:text-white hover:bg-[#383838]"}`}
              >
                {GROUP_BY_LABELS.none}
                {groupBy === "none" && <Check size={12} />}
              </button>
              {GROUPABLE_COLUMNS
                .filter((column) => enableDeprecatedApis || column.id !== "genre")
                .map((column) => {
                  const option = column.id as GroupBy;
                  return (
                    <button key={option} onClick={() => { setGroupBy(option); setGroupByOpen(false); setCollapsedGroups(new Set()); }}
                      className={`w-full text-left px-4 py-2 text-[13px] flex items-center justify-between transition-colors cursor-pointer ${groupBy === option ? "text-[#1DB954] bg-[#1DB954]/10" : "text-[#B3B3B3] hover:text-white hover:bg-[#383838]"}`}>
                      {column.label}
                      {groupBy === option && <Check size={12} />}
                    </button>
                  );
                })}
            </div>
          )}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative" data-cols-dropdown>
            <button
              onClick={() => setColumnsOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${columnsOpen ? "bg-white text-black" : "bg-[#282828] text-[#B3B3B3] hover:text-white hover:bg-[#383838]"}`}>
              <Columns3 size={13} />
              Columns
              <ChevronDown size={11} className={`transition-transform duration-200 ${columnsOpen ? "rotate-180" : ""}`} />
            </button>
            {columnsOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 py-1 overflow-hidden flex flex-col">
                <div className="px-4 py-2 border-b border-[#383838] shrink-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Toggle Columns</p>
                </div>
                <div className="max-h-60 overflow-y-auto py-1">
                  {ALL_COLUMNS.filter(col => enableDeprecatedApis || !DEPRECATED_COLUMNS.has(col.id as ColId)).map(col => (
                    <button key={col.id} onClick={() => toggleColVisibility(col.id as ColId)}
                      disabled={groupBy !== "none" && groupBy === col.id}
                      className={`w-full flex items-center justify-between px-4 py-2 text-[13px] transition-colors text-left ${groupBy !== "none" && groupBy === col.id ? "cursor-not-allowed bg-[#1DB954]/10" : "hover:bg-[#383838] cursor-pointer"}`}>
                      <span className={visibleCols.has(col.id as ColId) ? "text-white" : "text-[#535353]"}>{col.label}</span>
                      {visibleCols.has(col.id as ColId) && <Check size={12} className="text-[#1DB954]" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {isYours && (
            <button
              disabled={selected.size === 0}
              onClick={handleDelete}
              title="Remove selected tracks"
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${selected.size > 0 ? "bg-[#e91429]/10 text-[#e91429] hover:bg-[#e91429]/20 border border-[#e91429]/30" : "bg-[#282828] text-[#535353] cursor-not-allowed border border-transparent"}`}
            >
              <Trash2 size={13} />
              Remove{selected.size > 0 && ` (${selected.size})`}
            </button>
          )}

          <div className="relative">
            <button
              disabled={selected.size === 0}
              onClick={() => setPlaylistFlyoutOpen(o => !o)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all cursor-pointer ${selected.size > 0 ? playlistFlyoutOpen ? "bg-white text-black" : "bg-[#282828] text-white hover:bg-[#383838]" : "bg-[#282828] text-[#535353] cursor-not-allowed"}`}>
              <Plus size={13} />
              Add to Playlist
              <ChevronDown size={11} className={`transition-transform duration-200 ${playlistFlyoutOpen ? "rotate-180" : ""}`} />
            </button>
            {playlistFlyoutOpen && selected.size > 0 && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-[#383838]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Add {selected.size} track{selected.size > 1 ? "s" : ""} to…</p>
                </div>
                <div className="max-h-52 overflow-y-auto py-1">
                  {playlists.filter(pl => pl.owner === "yours").length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#888888]">No playlists owned by you.</div>
                  ) : (
                    playlists.filter(pl => pl.owner === "yours").map(pl => (
                      <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id)}
                        className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#383838] transition-colors text-left cursor-pointer">
                        <div className="w-8 h-8 rounded shrink-0 bg-[#383838] overflow-hidden">
                          {pl.cover.startsWith("http") ? (
                            <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <div className={`w-full h-full ${pl.cover}`} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-white text-[13px] font-medium truncate">{pl.name}</p>
                          <p className="text-[#B3B3B3] text-[11px]">{getPlaylistTrackCount(pl)} tracks</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        {loadingTracks && playlistTracks.length === 0 ? (
          <div className="absolute inset-0 z-20 flex items-center justify-center px-6 bg-[#121212]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center text-center w-full max-w-sm">
              <p className="text-[#B3B3B3] text-sm font-semibold">Fetching tracks & metadata from Spotify...</p>
              <p className="text-[#535353] text-xs mt-1">Loading your playlist's metadata and tracks...</p>
              <div className="mt-4 w-full rounded-full bg-[#1a1a1a] border border-[#282828] p-1">
                <div className="h-2 rounded-full bg-gradient-to-r from-[#1DB954] via-[#29d97f] to-[#7CFFB2] transition-all duration-300 ease-out" style={{ width: `${Math.max(4, loadingTracksProgress)}%` }} />
              </div>
              <p className="mt-2 text-[11px] font-mono text-[#B3B3B3]">{Math.round(loadingTracksProgress)}%</p>
            </div>
          </div>
        ) : null}

        {/* Sleek top loading progress bar when we already have tracks to display */}
        {loadingTracks && playlistTracks.length > 0 && (
          <div className="absolute top-0 left-0 right-0 z-20 h-[2px] bg-transparent">
            <div className="h-full bg-gradient-to-r from-[#1DB954] via-[#29d97f] to-[#7CFFB2] transition-all duration-300 ease-out" style={{ width: `${loadingTracksProgress}%` }} />
          </div>
        )}

        <div className={`h-full overflow-auto ${(loadingTracks && playlistTracks.length === 0) ? "opacity-0 pointer-events-none" : ""}`}>
          <table className="w-full min-w-[860px] border-collapse">
            <thead className="sticky top-0 z-10 bg-[#121212]">
              <tr className="border-b border-[#282828]">
                <th className="w-10 px-4 py-3 text-left">
                  <button onClick={toggleAll}
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${selected.size === sorted.length && sorted.length > 0 ? "bg-[#1DB954] border-[#1DB954]" : "border-[#535353] hover:border-white"}`}>
                    {selected.size === sorted.length && sorted.length > 0 && <Check size={10} className="text-black" />}
                  </button>
                </th>
                <th className="w-8 px-2 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold">#</th>
                {columnOrder
                  .filter(id => visibleCols.has(id))
                  .filter(id => enableDeprecatedApis || !DEPRECATED_COLUMNS.has(id))
                  .map(id => {
                    const col = ALL_COLUMNS.find(c => c.id === id)!;
                    return <ColHeader key={id} col={id} label={col.label} />;
                  })}
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={totalColSpan} className="text-center py-20 text-[#535353] text-sm">
                    No tracks found in this playlist.
                  </td>
                </tr>
              ) : (() => {
                // Lazy rendering: accumulate rows until we hit visibleRowCount
                let renderedCount = 0;
                const rows = groupedEntries.map(({ label, tracks }, gi) => {
                  const isCollapsed = collapsedGroups.has(label);
                  return (
                    <React.Fragment key={`group-${gi}-${label}`}>
                      {groupBy !== "none" && (
                        <tr className="bg-[#181818]/60 cursor-pointer hover:bg-[#1e1e1e]" onClick={() => toggleGroup(label)}>
                          <td colSpan={totalColSpan} className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {isCollapsed
                                ? <ChevronRight size={14} className="text-[#B3B3B3]" />
                                : <ChevronDown size={14} className="text-[#B3B3B3]" />}
                              <span className="text-[#B3B3B3] text-[12px] font-semibold">
                                {GROUP_BY_LABELS[groupBy as GroupByOption]}: <span className="text-white">{label}</span>
                                <span className="ml-2 text-[#535353]">({tracks.length} tracks)</span>
                              </span>
                            </div>
                          </td>
                        </tr>
                      )}
                      {!isCollapsed && (() => {
                        const limit = Math.max(0, visibleRowCount - renderedCount);
                        const visibleTracks = tracks.slice(0, limit);
                        renderedCount += visibleTracks.length;
                        return visibleTracks.map((track, i) => {
                          const isSelected = selected.has(track.id);
                          const trackKey = getTrackOrderKey(track);
                          const trackImage = track.cover;
                          const isPlayingTrack = currentPlaybackTrackId === String(track.id);
                          return (
                            <tr
                              key={trackKey}
                              draggable={canReorderTracks}
                              onDragStart={() => handleTrackDragStart(trackKey)}
                              onDragEnter={() => handleTrackDragEnter(trackKey)}
                              onDragEnd={handleTrackDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              className={`group border-b border-[#282828]/40 hover:bg-[#282828]/60 transition-colors cursor-pointer ${isPlayingTrack ? "bg-[#1DB954]/10 hover:bg-[#1DB954]/15" : isSelected ? "bg-[#1DB954]/10 hover:bg-[#1DB954]/15" : i % 2 === 0 ? "" : "bg-[#181818]/40"
                                }`}
                              onClick={() => toggleRow(track.id)}
                            >
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => toggleRow(track.id)}
                                  className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${isSelected ? "bg-[#1DB954] border-[#1DB954]" : "border-[#535353] hover:border-white"
                                    }`}
                                >
                                  {isSelected && <Check size={10} className="text-black" />}
                                </button>
                              </td>
                              <td className="px-2 py-2.5">
                                <span className={`text-[12px] font-mono group-hover:hidden ${isPlayingTrack ? "text-[#1DB954] font-semibold" : "text-[#B3B3B3]"}`}>
                                  {isPlayingTrack ? (
                                    <Volume2 size={12} className="text-[#1DB954]" />
                                  ) : (
                                    i + 1
                                  )}
                                </span>
                                <Play
                                  size={12}
                                  className="text-white fill-white hidden group-hover:block cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playTrackSequence(sorted, sorted.findIndex(sortedTrack => String(sortedTrack.id) === String(track.id))).catch(() =>
                                      toast.error("Could not play track. Is Spotify open on an active device?")
                                    );
                                  }}
                                />
                              </td>
                              {columnOrder
                                .filter((colId) => visibleCols.has(colId))
                                .filter((colId) => enableDeprecatedApis || !DEPRECATED_COLUMNS.has(colId))
                                .map((colId) => {
                                  if (colId === "title") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-3">
                                          <div className="w-9 h-9 bg-[#282828] rounded shrink-0 overflow-hidden flex items-center justify-center">
                                            {trackImage ? (
                                              <ImageWithFallback src={trackImage} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Music2 size={14} className="text-[#B3B3B3]" />
                                            )}
                                          </div>
                                          <div className="min-w-0 flex flex-col">
                                            <TextCarousel text={track.title} className="text-white text-[13px] font-semibold max-w-[180px]" />
                                            <TextCarousel text={(track.artist || "").split(", ")[0]} className="text-[#B3B3B3] text-[11px] max-w-[180px]" />
                                          </div>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "artist") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <TextCarousel text={track.artist} className="text-[#B3B3B3] text-[13px] max-w-[140px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "album") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <TextCarousel text={track.album} className="text-[#B3B3B3] text-[13px] max-w-[140px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "genre") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <TextCarousel text={track.genre} className="text-[11px] text-[#B3B3B3] bg-[#282828] px-2 py-0.5 rounded-full max-w-[140px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "releaseYear") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <TextCarousel text={String(track.releaseYear)} className="text-[#B3B3B3] text-[12px] font-mono max-w-[90px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "releaseDate") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <TextCarousel text={formatDate(track.releaseDate || String(track.releaseYear))} className="text-[#B3B3B3] text-[12px] font-mono max-w-[120px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "dateAdded") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5 min-w-[160px]">
                                        <TextCarousel text={formatDate(track.dateAdded)} className="text-[#B3B3B3] text-[12px] font-mono max-w-[160px]" />
                                      </td>
                                    );
                                  }
                                  if (colId === "bpm") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono">
                                        {track.bpm}
                                      </td>
                                    );
                                  }
                                  if (colId === "popularity") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-[#1DB954] h-full" style={{ width: `${Math.min(100, Math.max(0, track.popularity))}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[12px] font-mono w-8 text-right">
                                            {Math.round(track.popularity)}
                                          </span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "energy") {
                                    const energyPct = Math.round(track.energy * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-[#1DB954] h-full" style={{ width: `${energyPct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{energyPct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "danceability") {
                                    const val = track.danceability !== undefined ? track.danceability : 0.5;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-purple-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "valence") {
                                    const val = track.valence !== undefined ? track.valence : 0.5;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-amber-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "acousticness") {
                                    const val = track.acousticness !== undefined ? track.acousticness : 0.2;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-cyan-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "instrumentalness") {
                                    const val = track.instrumentalness !== undefined ? track.instrumentalness : 0.1;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-pink-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "speechiness") {
                                    const val = track.speechiness !== undefined ? track.speechiness : 0.05;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "liveness") {
                                    const val = track.liveness !== undefined ? track.liveness : 0.1;
                                    const pct = Math.round(val * 100);
                                    return (
                                      <td key={colId} className="px-3 py-2.5">
                                        <div className="flex items-center gap-2">
                                          <div className="w-16 bg-[#282828] h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span className="text-[#B3B3B3] text-[11px] font-mono">{pct}%</span>
                                        </div>
                                      </td>
                                    );
                                  }
                                  if (colId === "loudness") {
                                    const val = track.loudness !== undefined ? track.loudness : -6.0;
                                    return (
                                      <td key={colId} className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono">
                                        {val.toFixed(1)} dB
                                      </td>
                                    );
                                  }
                                  if (colId === "duration") {
                                    return (
                                      <td key={colId} className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono">
                                        {track.duration}
                                      </td>
                                    );
                                  }
                                  return null;
                                })}
                            </tr>
                          );
                        });
                      })()}
                    </React.Fragment>
                  );
                });
                // Count total rendered rows to detect if sentinel is needed
                let totalVisible = 0;
                for (const { label, tracks } of groupedEntries) {
                  if (!collapsedGroups.has(label)) totalVisible += tracks.length;
                }
                return (
                  <>
                    {rows}
                    {visibleRowCount < totalVisible && (
                      <tr ref={lazyTriggerRef}>
                        <td colSpan={totalColSpan} className="py-4 text-center">
                          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-t-transparent border-[#1DB954]" />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      {activePlaylist && (
        <EditPlaylistModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          playlist={activePlaylist}
          setPlaylists={setPlaylists}
        />
      )}
    </div>
  );
}

// ─── Page 3: API Reference ─────────────────────────────────────────────────────

function EndpointPlayground({ endpoint }: { endpoint: ApiEndpoint }) {
  // Parse path parameters
  const pathParams: string[] = [];
  const pathRegex = /\{([^}]+)\}|\{\{([^}]+)\}\}/g;
  let match;
  while ((match = pathRegex.exec(endpoint.path)) !== null) {
    pathParams.push(match[1] || match[2]);
  }

  // Parse query parameters
  const queryParams = endpoint.params ? endpoint.params.split(", ") : [];

  // State for parameters
  const [paramValues, setParamValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    pathParams.forEach(p => {
      // Set sensible defaults for path variables
      if (p.includes("id")) {
        if (p.includes("album")) defaults[p] = "4aawyAB9vmqN3u77FjrbEE"; // Daft Punk - RAM
        else if (p.includes("artist")) defaults[p] = "4tZwfgrHOu2mvq6V4NWiYj"; // Daft Punk
        else if (p.includes("track")) defaults[p] = "2TpxZ7JUBn3uw46aR7qd6V"; // Daft Punk - Get Lucky
        else if (p.includes("playlist")) defaults[p] = "37i9dQZF1DXcBWIGo373Ol"; // Lo-fi Beats
        else defaults[p] = "4aawyAB9vmqN3u77FjrbEE";
      } else {
        defaults[p] = "";
      }
    });
    queryParams.forEach((q: string) => {
      if (q === "limit") defaults[q] = "10";
      else if (q === "market") defaults[q] = "US";
      else if (q === "type") defaults[q] = "track";
      else defaults[q] = "";
    });
    return defaults;
  });

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setLoading(true);
    setResponse(null);
    setStatus(null);
    setError(null);

    try {
      // 1. Build path
      let resolvedPath = endpoint.path;
      pathParams.forEach(p => {
        const val = paramValues[p] || "";
        resolvedPath = resolvedPath.replace(`{${p}}`, val).replace(`{{${p}}}`, val);
      });

      // 2. Build query parameters
      const qParams = new URLSearchParams();
      queryParams.forEach((q: string) => {
        const val = paramValues[q];
        if (val) qParams.append(q, val);
      });
      const queryStr = qParams.toString();
      const finalPath = queryStr ? `${resolvedPath}?${queryStr}` : resolvedPath;

      // 3. Perform live API request using spotifyFetch
      const opts: RequestInit = { method: endpoint.method };
      if (endpoint.method !== "GET" && endpoint.body) {
        opts.body = endpoint.body;
      }

      const res = await spotifyFetch(finalPath, opts);
      setStatus(200);
      setResponse(res || { success: true, message: "Request completed with no content." });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred");
      setStatus(err.message?.match(/\((\d+)\)/)?.[1] ? Number(err.message.match(/\((\d+)\)/)[1]) : 400);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-[#282828] space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#1DB954]">Interactive API Playground</h4>
        <button
          onClick={handleRun}
          disabled={loading}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${loading ? "bg-[#282828] text-[#535353] cursor-not-allowed" : "bg-[#1DB954] text-black hover:bg-[#1ed760] hover:scale-105"}`}
        >
          {loading ? "Sending..." : "Send Live Request"}
        </button>
      </div>

      {/* Input Fields */}
      {(pathParams.length > 0 || queryParams.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#1e1e1e] p-3 rounded-lg border border-white/5">
          {pathParams.map(p => (
            <div key={p} className="flex flex-col gap-1">
              <label className="text-[10px] text-[#B3B3B3] font-mono font-bold uppercase">Path parameter: {"{" + p + "}"}</label>
              <input
                type="text"
                value={paramValues[p] || ""}
                onChange={e => setParamValues(prev => ({ ...prev, [p]: e.target.value }))}
                className="bg-[#282828] text-white px-2 py-1 rounded text-xs outline-none border border-transparent focus:border-[#1DB954]/50"
              />
            </div>
          ))}
          {queryParams.map((q: string) => (
            <div key={q} className="flex flex-col gap-1">
              <label className="text-[10px] text-[#B3B3B3] font-mono font-bold uppercase">Query parameter: {q}</label>
              <input
                type="text"
                value={paramValues[q] || ""}
                onChange={e => setParamValues(prev => ({ ...prev, [q]: e.target.value }))}
                className="bg-[#282828] text-white px-2 py-1 rounded text-xs outline-none border border-transparent focus:border-[#1DB954]/50"
              />
            </div>
          ))}
        </div>
      )}

      {/* Output Console */}
      {(status !== null || error !== null || response !== null) && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#535353]">Response Console</span>
            {status && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${status >= 200 && status < 300 ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-red-950 text-red-400 border border-red-800"}`}>
                HTTP {status}
              </span>
            )}
          </div>
          {error && (
            <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded font-mono">
              Error: {error}
            </div>
          )}
          {response && (
            <pre className="text-[11px] font-mono text-emerald-400 bg-black/40 border border-[#1DB954]/10 rounded p-4 overflow-auto max-h-[260px] scrollbar-thin scrollbar-thumb-[#282828]">
              {JSON.stringify(response, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ApiReference({ enableDeprecatedApis }: { enableDeprecatedApis: boolean }) {
  const preferences = loadPreferences();
  const [openSection, setOpenSection] = useState<string>(preferences.apiOpenSection);
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(preferences.apiExpandedEndpoint);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const showDeprecated = enableDeprecatedApis;

  // Save preferences when they change
  useEffect(() => {
    PreferenceUpdaters.setApiSection(openSection);
  }, [openSection]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header */}
      <div className="bg-gradient-to-b from-[#0d2a1a] to-[#121212] px-4 md:px-8 pt-6 md:pt-8 pb-5 md:pb-6 border-b border-[#282828]">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-[#1DB954]/20 rounded-lg flex items-center justify-center border border-[#1DB954]/30">
            <Code2 size={20} className="md:hidden text-[#1DB954]" />
            <Code2 size={24} className="hidden md:block text-[#1DB954]" />
          </div>
          <div className="flex-1">
            <p className="text-[10px] md:text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Postman Collection</p>
            <h1 className="text-white text-[20px] md:text-[26px] font-extrabold leading-tight">Spotify API Reference</h1>
          </div>
          <button
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
            className="md:hidden w-9 h-9 flex items-center justify-center rounded-md bg-[#282828] text-white">
            <ListMusic size={18} />
          </button>
        </div>
        <p className="text-[#B3B3B3] text-[13px] max-w-2xl">Complete endpoint reference for the Spotify Web API. All requests require <code className="text-[#1DB954] bg-[#1DB954]/10 px-1.5 py-0.5 rounded text-[12px] font-mono">Authorization: Bearer {"{{access_token}}"}</code> in the request header.</p>
        <div className="flex items-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#1DB954]" />
            <span className="text-[#B3B3B3] text-[12px]">Base URL: <span className="text-white font-mono text-[12px]">https://api.spotify.com/v1</span></span>
          </div>
          <div className="flex items-center gap-2">
            <RadioTower size={13} className="text-[#1DB954]" />
            <span className="text-[#B3B3B3] text-[12px]">{API_SECTIONS.reduce((acc, s) => acc + (showDeprecated ? s.endpoints.length : s.endpoints.filter(e => !e.deprecated).length), 0)} endpoints documented</span>
          </div>
          <div className="flex items-center gap-2">
            <Laptop2 size={13} className="text-[#B3B3B3]" />
            <span className="text-[#B3B3B3] text-[12px]">OAuth 2.0 · Live Playground</span>
          </div>
        </div>
      </div>

      <div className="flex relative">
        {/* Mobile Overlay */}
        {mobileSidebarOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black/80" onClick={() => setMobileSidebarOpen(false)} />
        )}

        {/* Left Nav */}
        <div className={`${mobileSidebarOpen ? "fixed left-0 top-0 bottom-0 z-50" : "hidden"} md:block w-64 md:w-52 shrink-0 border-r border-[#282828] md:sticky md:top-0 h-screen overflow-y-auto py-4 bg-[#121212]`}>
          <div className="md:hidden flex items-center justify-between px-5 py-3 border-b border-[#282828] mb-2">
            <span className="text-white font-semibold">Categories</span>
            <button onClick={() => setMobileSidebarOpen(false)} className="text-[#B3B3B3] hover:text-white">
              <X size={20} />
            </button>
          </div>
          {API_SECTIONS.map((section) => {
            const endpoints = showDeprecated ? section.endpoints : section.endpoints.filter(e => !e.deprecated);
            return (
              <button key={section.name} onClick={() => { setOpenSection(section.name); setMobileSidebarOpen(false); }}
                className={`w-full text-left px-5 py-2.5 text-[13px] transition-colors flex items-center justify-between gap-2 ${openSection === section.name ? "text-white bg-[#282828] border-l-2 border-[#1DB954]" : "text-[#B3B3B3] hover:text-white hover:bg-[#1a1a1a]"}`}>
                <span className="truncate">{section.name}</span>
                <span className="text-[11px] text-[#535353] font-mono shrink-0">{endpoints.length}</span>
              </button>
            );
          })}
        </div>

        {/* Endpoint List */}
        <div className="flex-1 py-4 md:py-6 px-4 md:px-8">
          {API_SECTIONS.filter(s => s.name === openSection).map((section) => {
            const endpoints = showDeprecated ? section.endpoints : section.endpoints.filter(e => !e.deprecated);
            return (
              <div key={section.name}>
                <h2 className="text-white text-[16px] md:text-[18px] font-bold mb-1">{section.name}</h2>
                <p className="text-[#B3B3B3] text-[12px] md:text-[13px] mb-4 md:mb-5">{endpoints.length} endpoints</p>
                <div className="space-y-2">
                  {endpoints.map((ep, i) => {
                    const key = `${section.name}-${i}`;
                    const isExpanded = expandedEndpoint === key;
                    return (
                      <div key={i} className="rounded-lg border border-[#282828] bg-[#181818] overflow-hidden">
                        <button className="w-full flex items-center gap-2 md:gap-4 px-3 md:px-5 py-3 md:py-3.5 hover:bg-[#1e1e1e] transition-colors text-left"
                          onClick={() => setExpandedEndpoint(isExpanded ? null : key)}>
                          <MethodBadge method={ep.method} />
                          <code className="text-white text-[11px] md:text-[13px] font-mono flex-1 truncate">{ep.path}</code>
                          {ep.deprecated && (
                            <span className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-[#e91429]/10 text-[#e91429] border border-[#e91429]/30 font-semibold uppercase tracking-wider">Deprecated</span>
                          )}
                          <span className="text-[#B3B3B3] text-[12px] truncate max-w-[320px] hidden lg:block">{ep.desc}</span>
                          <ChevronDown size={14} className={`text-[#535353] transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 pt-1 border-t border-[#282828] bg-[#141414]">
                            {ep.deprecated && (
                              <div className="mb-3 px-3 py-2 bg-[#e91429]/10 border border-[#e91429]/30 rounded flex items-start gap-2">
                                <X size={14} className="text-[#e91429] shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[#e91429] text-[11px] font-bold uppercase tracking-wider">Deprecated Endpoint</p>
                                  <p className="text-[#e91429]/80 text-[12px] mt-1">This endpoint is deprecated and may be removed in a future version. Please use alternative endpoints.</p>
                                </div>
                              </div>
                            )}
                            <p className="text-[#B3B3B3] text-[13px] mb-3">{ep.desc}</p>
                            {ep.params && (
                              <div className="mb-3">
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#535353] mb-2">Query Parameters</p>
                                <div className="flex flex-wrap gap-2">
                                  {ep.params.split(", ").map(p => (
                                    <span key={p} className="px-2 py-0.5 bg-[#282828] rounded text-[12px] font-mono text-[#B3B3B3] border border-[#383838]">{p}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {ep.body && (
                              <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-[#535353] mb-2">Request Body</p>
                                <pre className="text-[12px] font-mono text-[#1DB954] bg-[#0d1f0f] border border-[#1DB954]/20 rounded px-4 py-3 overflow-x-auto">{ep.body}</pre>
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-2">
                              <span className="text-[11px] text-[#535353]">Scope required:</span>
                              <span className="text-[11px] font-mono text-[#B3B3B3] bg-[#282828] px-2 py-0.5 rounded border border-[#383838]">
                                {ep.method === "GET" ? "user-read-private" : ep.path.includes("player") ? "user-modify-playback-state" : "playlist-modify-private"}
                              </span>
                            </div>
                            <EndpointPlayground endpoint={ep} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Bottom Now Playing Bar ────────────────────────────────────────────────────

function NowPlayingBar({
  playbackState,
  setPlaybackState,
}: {
  playbackState: any;
  setPlaybackState: React.Dispatch<React.SetStateAction<any>>;
}) {
  const isPlaying = playbackState?.is_playing || false;
  const shuffle = playbackState?.shuffle_state || false;
  const repeat = playbackState?.repeat_state || "off";
  const volume = playbackState?.device?.volume_percent ?? 50;

  // Track local progress changes during user drag
  const [localProgressPct, setLocalProgressPct] = useState<number | null>(null);

  // Debounce ref for volume changes to avoid spamming Spotify volume API
  const volumeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (volumeTimeoutRef.current) {
        clearTimeout(volumeTimeoutRef.current);
      }
    };
  }, []);

  const track = playbackState?.item;

  // Sync internal progress timer
  const progressMs = playbackState?.progress_ms ?? 0;
  const durationMs = track?.duration_ms ?? 1;

  // Track local progress in milliseconds for smooth realtime updates
  const [tickerProgressMs, setTickerProgressMs] = useState<number>(progressMs);

  useEffect(() => {
    setTickerProgressMs(progressMs);
  }, [progressMs, track?.id]);

  useEffect(() => {
    if (!isPlaying) return;

    const startTime = Date.now();
    const initialProgress = progressMs;

    const intervalId = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(initialProgress + elapsed, durationMs);
      setTickerProgressMs(nextProgress);
    }, 250);

    return () => clearInterval(intervalId);
  }, [isPlaying, progressMs, durationMs, track?.id]);

  const progressPct = localProgressPct !== null ? localProgressPct : Math.round((tickerProgressMs / durationMs) * 100);

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        await pauseTrack();
        setPlaybackState((prev: any) => prev ? { ...prev, is_playing: false } : null);
      } else {
        await playTrack({});
        setPlaybackState((prev: any) => prev ? { ...prev, is_playing: true } : null);
      }
    } catch (err) {
      toast.error("Playback control failed. Is Spotify running on an active device?");
    }
  };

  const handleNext = async () => {
    try {
      await skipToNext();
      toast.success("Skipped to next track");
    } catch (err) {
      toast.error("Failed to skip track");
    }
  };

  const handlePrevious = async () => {
    try {
      await skipToPrevious();
      toast.success("Skipped to previous track");
    } catch (err) {
      toast.error("Failed to skip track");
    }
  };

  const handleShuffle = async () => {
    try {
      await toggleShuffle(!shuffle);
      setPlaybackState((prev: any) => prev ? { ...prev, shuffle_state: !shuffle } : null);
      toast.success(shuffle ? "Shuffle turned off" : "Shuffle turned on");
    } catch (err) {
      toast.error("Failed to toggle shuffle");
    }
  };

  const handleRepeat = async () => {
    try {
      const nextState = repeat === "off" ? "context" : repeat === "context" ? "track" : "off";
      await toggleRepeat(nextState);
      setPlaybackState((prev: any) => prev ? { ...prev, repeat_state: nextState } : null);
      toast.success(`Repeat mode: ${nextState}`);
    } catch (err) {
      toast.error("Failed to change repeat mode");
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setPlaybackState((prev: any) => prev ? { ...prev, device: { ...prev.device, volume_percent: val } } : null);

    if (volumeTimeoutRef.current) {
      clearTimeout(volumeTimeoutRef.current);
    }

    volumeTimeoutRef.current = setTimeout(async () => {
      try {
        await setPlayerVolume(val);
      } catch (err) {
        console.warn("Failed to set volume:", err);
      }
    }, 250);
  };

  const handleProgressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setLocalProgressPct(val);
  };

  const handleProgressSeekEnd = async () => {
    if (localProgressPct === null) return;
    const targetMs = Math.round((localProgressPct / 100) * durationMs);
    setLocalProgressPct(null);
    setTickerProgressMs(targetMs);
    setPlaybackState((prev: any) => prev ? { ...prev, progress_ms: targetMs } : null);
    try {
      await seekPosition(targetMs);
    } catch (err) {
      console.warn("Failed to seek:", err);
    }
  };

  // If no track is playing, show a styled inactive remote control
  if (!track) {
    return (
      <div className="hidden md:flex h-[90px] shrink-0 bg-[#181818] border-t border-[#282828] items-center justify-between px-6 select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#282828] rounded flex items-center justify-center">
            <Music2 size={18} className="text-white/30 animate-pulse" />
          </div>
          <div>
            <p className="text-white text-xs font-semibold">No playback active</p>
            <p className="text-[#888888] text-[11px]">Start playing Spotify on any device to enable remote control.</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[#535353]">
          <SkipBack size={18} className="cursor-not-allowed" />
          <div className="w-8 h-8 rounded-full border border-[#535353] flex items-center justify-center cursor-not-allowed">
            <Play size={14} className="text-[#535353] fill-[#535353] ml-0.5" />
          </div>
          <SkipForward size={18} className="cursor-not-allowed" />
        </div>
      </div>
    );
  }

  return (
    <div className="hidden md:flex h-[90px] shrink-0 bg-[#181818] border-t border-[#282828] items-center px-4 gap-4 select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Track Info */}
      <div className="flex items-center gap-3 w-[220px] lg:w-[280px] shrink-0">
        <div className="w-12 h-12 lg:w-14 lg:h-14 rounded overflow-hidden bg-[#282828] shrink-0">
          {track.album?.images?.[0]?.url ? (
            <img src={track.album.images[0].url} className="w-full h-full object-cover" alt="" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Music2 size={20} className="text-white/60" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[#1DB954] text-[10px] font-bold uppercase tracking-[0.2em]">Now playing</p>
          <p className="text-white text-[12px] lg:text-[13px] font-semibold truncate" title={track.name}>{track.name}</p>
          <p className="text-[#B3B3B3] text-[11px] lg:text-[12px] truncate" title={track.artists?.map((a: any) => a.name).join(", ")}>
            {track.artists?.map((a: any) => a.name).join(", ")}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-1 flex flex-col items-center gap-2 max-w-[600px] mx-auto">
        <div className="flex items-center gap-4 lg:gap-5">
          <button onClick={handleShuffle}
            className={`transition-colors hidden md:block cursor-pointer ${shuffle ? "text-[#1DB954]" : "text-[#B3B3B3] hover:text-white"}`}>
            <Shuffle size={16} />
          </button>
          <button onClick={handlePrevious} className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"><SkipBack size={18} /></button>
          <button onClick={handlePlayPause}
            className="w-8 h-8 bg-white rounded-full flex items-center justify-center hover:scale-105 transition-transform cursor-pointer">
            {isPlaying ? <Pause size={16} className="text-black" /> : <Play size={16} className="text-black fill-black ml-0.5" />}
          </button>
          <button onClick={handleNext} className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer"><SkipForward size={18} /></button>
          <button onClick={handleRepeat}
            className={`transition-colors hidden md:block cursor-pointer ${repeat !== "off" ? "text-[#1DB954]" : "text-[#B3B3B3] hover:text-white"}`}>
            <Repeat size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 w-full">
          <span className="text-[#B3B3B3] text-[10px] lg:text-[11px] font-mono w-7 lg:w-8 text-right">
            {formatDuration(localProgressPct !== null ? Math.round((localProgressPct / 100) * durationMs) : tickerProgressMs)}
          </span>
          <div className="flex-1 relative group h-1">
            <div className="absolute inset-0 bg-[#535353] rounded-full" />
            <div className="absolute left-0 top-0 h-full bg-white group-hover:bg-[#1DB954] rounded-full transition-colors" style={{ width: `${progressPct}%` }} />
            <input type="range" min={0} max={100} value={progressPct}
              id="playback-progress-slider" name="playbackProgress"
              onChange={handleProgressChange}
              onMouseUp={handleProgressSeekEnd}
              onTouchEnd={handleProgressSeekEnd}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
          </div>
          <span className="text-[#B3B3B3] text-[10px] lg:text-[11px] font-mono w-7 lg:w-8">{formatDuration(durationMs)}</span>
        </div>
      </div>

      {/* Volume */}
      <div className="hidden lg:flex items-center gap-2 w-[200px] shrink-0 justify-end">
        <button className="text-[#B3B3B3] hover:text-white transition-colors cursor-pointer">
          <Volume2 size={16} />
        </button>
        <div className="relative w-24 group h-1">
          <div className="absolute inset-0 bg-[#535353] rounded-full" />
          <div className="absolute left-0 top-0 h-full bg-white group-hover:bg-[#1DB954] rounded-full transition-colors" style={{ width: `${volume}%` }} />
          <input type="range" min={0} max={100} value={volume} onChange={handleVolumeChange}
            id="playback-volume-slider" name="playbackVolume"
            className="absolute inset-0 w-full opacity-0 cursor-pointer h-full" />
        </div>
      </div>
    </div>
  );
}

// Helper to format ms to MM:SS inside player
function formatDuration(ms: number): string {
  const totalSecs = Math.floor(ms / 1000);
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

// Helper to format date strings (YYYY-MM-DD or YYYY-MM or YYYY) to human-readable format (e.g. Jan 14, 2024)
function formatDate(dateString: string | undefined): string {
  if (!dateString) return "";
  const parts = dateString.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  if (parts.length === 3) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day)) {
      return `${months[monthIndex]} ${day}, ${year}`;
    }
  } else if (parts.length === 2) {
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) {
      return `${months[monthIndex]} ${year}`;
    }
  } else if (parts.length === 1 && parts[0].length === 4) {
    return parts[0];
  }
  return dateString;
}


// ─── Page: Search ─────────────────────────────────────────────────────────────

function SearchPage({
  topArtists,
  currentPlaybackTrackId,
  query,
  setQuery,
}: {
  topArtists: Artist[];
  currentPlaybackTrackId: string | null;
  query: string;
  setQuery: (q: string) => void;
}) {
  const [activeFilter, setActiveFilter] = useState<"all" | "tracks" | "artists" | "playlists" | "albums">("all");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    tracks: Track[];
    artists: Artist[];
    playlists: Playlist[];
    albums: any[];
  }>({ tracks: [], artists: [], playlists: [], albums: [] });

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  const q = query.toLowerCase().trim();

  React.useEffect(() => {
    if (!q) {
      setResults({ tracks: [], artists: [], playlists: [], albums: [] });
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const searchResults = await searchSpotify(q);
        setResults(searchResults);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [q]);

  const matchedTracks = results.tracks;
  const matchedArtists = results.artists;
  const matchedPlaylists = results.playlists;
  const matchedAlbums = results.albums;

  const hasResults =
    matchedTracks.length > 0 ||
    matchedArtists.length > 0 ||
    matchedPlaylists.length > 0 ||
    matchedAlbums.length > 0;

  const showBrowse = q === "";

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Sticky search bar */}
      <div className="sticky top-0 z-20 bg-[#121212]/95 backdrop-blur-sm px-8 pt-6 pb-4 border-b border-[#282828]/60">
        <div className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
          <input
            ref={inputRef}
            id="search-page-query-input"
            name="searchQuery"
            type="text"
            placeholder="What do you want to listen to?"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full pl-12 pr-10 py-3 bg-white rounded-full text-[15px] text-black placeholder-[#6b6b6b] outline-none focus:ring-2 focus:ring-white/40 transition-all"
          />
          {query && (
            <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6b6b6b] hover:text-black transition-colors">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter pills — only when searching */}
        {q !== "" && (
          <div className="flex items-center gap-2 mt-4">
            {SEARCH_FILTERS.map(f => (
              <button key={f.key} onClick={() => setActiveFilter(f.key)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-colors ${activeFilter === f.key ? "bg-white text-black" : "bg-[#282828] text-white hover:bg-[#383838]"}`}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-8 py-6">
        {/* Loading spinner */}
        {loading && q !== "" && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#1DB954] mb-3"></div>
            <p className="text-[#B3B3B3] text-sm">Searching Spotify...</p>
          </div>
        )}

        {/* Browse genres when empty */}
        {showBrowse && (
          <>
            <h2 className="text-white text-[18px] font-bold mb-5">Browse Categories</h2>
            <div className="grid grid-cols-4 gap-3">
              {BROWSE_CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => setQuery(cat.label)}
                  className={`relative h-24 rounded-lg overflow-hidden ${cat.color} hover:brightness-110 transition-all text-left px-4 py-3 group`}>
                  <span className="text-white font-bold text-[16px] drop-shadow">{cat.label}</span>
                  <Music2 size={48} className="absolute -bottom-2 -right-2 text-white/20 rotate-12 group-hover:text-white/30 transition-colors" />
                </button>
              ))}
            </div>

            <h2 className="text-white text-[18px] font-bold mt-10 mb-5">Your Top Artists</h2>
            <div className="grid grid-cols-5 gap-4">
              {topArtists.slice(0, 5).map(artist => (
                <button key={artist.name} onClick={() => setQuery(artist.name)}
                  className="group flex flex-col items-center gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-center">
                  <div className="w-20 h-20 rounded-full flex items-center justify-center relative bg-[#282828] overflow-hidden shrink-0">
                    {artist.cover.startsWith("http") ? (
                      <img src={artist.cover} className="w-full h-full object-cover rounded-full" alt="" />
                    ) : (
                      <Mic2 size={26} className="text-white/60" />
                    )}
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Play size={20} className="text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white text-[13px] font-semibold truncate max-w-[110px]">{artist.name}</p>
                    <p className="text-[#B3B3B3] text-[11px] truncate max-w-[110px]">Artist</p>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {/* No results */}
        {!loading && q !== "" && !hasResults && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Music2 size={48} className="text-[#535353] mb-4" />
            <p className="text-white text-[18px] font-bold mb-2">No results found for "{query}"</p>
            <p className="text-[#B3B3B3] text-[14px]">Please make sure your words are spelled correctly, or use fewer or different keywords.</p>
          </div>
        )}

        {/* Results */}
        {!loading && q !== "" && hasResults && (
          <div className="space-y-8">
            {/* Top Result + Tracks — show side by side */}
            {(activeFilter === "all" || activeFilter === "tracks") && matchedTracks.length > 0 && (
              <div className={`grid gap-6 ${activeFilter === "all" && matchedTracks.length > 1 ? "grid-cols-[280px_1fr]" : "grid-cols-1"}`}>
                {/* Top Result card */}
                {activeFilter === "all" && (
                  <div>
                    <h2 className="text-white text-[18px] font-bold mb-4">Top Result</h2>
                    <div
                      onClick={() => playTrackSequence(matchedTracks, 0).catch(() => toast.error("Could not start playback. Is Spotify open on an active device?"))}
                      className="bg-[#181818] hover:bg-[#282828] transition-colors rounded-lg p-5 cursor-pointer group h-[220px] flex flex-col justify-between"
                    >
                      <div className="w-20 h-20 rounded-lg bg-[#282828] flex items-center justify-center shadow-lg overflow-hidden shrink-0">
                        {matchedTracks[0].cover ? (
                          <ImageWithFallback src={matchedTracks[0].cover} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Music2 size={32} className="text-white/70 animate-pulse" />
                        )}
                      </div>
                      <div>
                        <p className="text-white text-[22px] font-extrabold leading-tight truncate">{matchedTracks[0].title}</p>
                        <p className="text-[#B3B3B3] text-[13px] mt-1 truncate">{matchedTracks[0].artist} · Track</p>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity self-end">
                        <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-xl">
                          <Play size={20} className="text-black fill-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tracks list */}
                <div>
                  <h2 className="text-white text-[18px] font-bold mb-4">Tracks</h2>
                  <div className="space-y-1">
                    {(activeFilter === "all" ? matchedTracks.slice(0, 5) : matchedTracks).map((track, i) => {
                      const isPlayingTrack = currentPlaybackTrackId === String(track.id);
                      return (
                        <div
                          key={track.id}
                          onClick={() => playTrackSequence(matchedTracks, i).catch(() => toast.error("Could not start playback. Is Spotify open on an active device?"))}
                          className={`group flex items-center gap-4 px-3 py-2 rounded-md hover:bg-[#282828] transition-colors cursor-pointer ${isPlayingTrack ? "bg-[#1DB954]/10" : ""}`}
                        >
                          <span className={`text-[13px] font-mono w-4 text-right group-hover:hidden ${isPlayingTrack ? "text-[#1DB954] font-semibold" : "text-[#B3B3B3]"}`}>
                            {isPlayingTrack ? (
                              <Play size={12} className="text-[#1DB954] fill-[#1DB954] inline-block" />
                            ) : (
                              i + 1
                            )}
                          </span>
                          <Play size={13} className="text-white fill-white hidden group-hover:block w-4" />
                          <div className="w-10 h-10 bg-[#282828] rounded shrink-0 overflow-hidden flex items-center justify-center">
                            {track.cover ? (
                              <ImageWithFallback src={track.cover} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <Music2 size={14} className="text-[#B3B3B3]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-[14px] font-semibold truncate">{track.title}</p>
                            <p className="text-[#B3B3B3] text-[12px] truncate">{track.artist}</p>
                          </div>
                          <p className="text-[#B3B3B3] text-[13px] truncate hidden md:block max-w-[160px]">{track.album}</p>
                          <p className="text-[#B3B3B3] text-[12px] font-mono">{track.duration}</p>
                          <button className="text-[#B3B3B3] hover:text-white opacity-0 group-hover:opacity-100 transition-all" onClick={e => e.stopPropagation()}>
                            <MoreHorizontal size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Artists */}
            {(activeFilter === "all" || activeFilter === "artists") && matchedArtists.length > 0 && (
              <div>
                <h2 className="text-white text-[18px] font-bold mb-4">Artists</h2>
                <div className="grid grid-cols-5 gap-4">
                  {matchedArtists.map(artist => (
                    <button key={artist.name}
                      className="group flex flex-col items-center gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-center">
                      <div className="relative w-full aspect-square rounded-full flex items-center justify-center bg-[#282828] overflow-hidden shrink-0">
                        {artist.cover.startsWith("http") ? (
                          <img src={artist.cover} className="w-full h-full object-cover rounded-full" alt="" />
                        ) : (
                          <Mic2 size={28} className="text-white/60" />
                        )}
                        <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Play size={22} className="text-white fill-white ml-0.5" />
                        </div>
                      </div>
                      <div>
                        <p className="text-white text-[13px] font-semibold truncate max-w-[110px]">{artist.name}</p>
                        <p className="text-[#B3B3B3] text-[11px] truncate max-w-[110px]">Artist</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Albums */}
            {(activeFilter === "all" || activeFilter === "albums") && matchedAlbums.length > 0 && (
              <div>
                <h2 className="text-white text-[18px] font-bold mb-4">Albums</h2>
                <div className="grid grid-cols-4 xl:grid-cols-6 gap-4">
                  {matchedAlbums.map(t => (
                    <button key={t.album}
                      className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left">
                      <div className="relative w-full aspect-square rounded-md bg-gradient-to-br from-slate-700 to-zinc-900 flex items-center justify-center overflow-hidden">
                        {t.cover.startsWith("http") ? (
                          <img src={t.cover} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <Music2 size={28} className="text-white/40" />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                          <div className="w-9 h-9 bg-[#1DB954] rounded-full flex items-center justify-center">
                            <Play size={14} className="text-black fill-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[13px] font-semibold truncate">{t.album}</p>
                        <p className="text-[#B3B3B3] text-[12px] truncate">{t.releaseYear} · {t.artist}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Playlists */}
            {(activeFilter === "all" || activeFilter === "playlists") && matchedPlaylists.length > 0 && (
              <div>
                <h2 className="text-white text-[18px] font-bold mb-4">Playlists</h2>
                <div className="grid grid-cols-4 xl:grid-cols-6 gap-4">
                  {matchedPlaylists.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => playTrack({ contextUri: `spotify:playlist:${pl.id}` }).catch(() => toast.error("Could not start playback. Is Spotify open on an active device?"))}
                      className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left"
                    >
                      <div className="relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] shrink-0">
                        {pl.cover.startsWith("http") ? (
                          <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className={`w-full h-full ${pl.cover}`} />
                        )}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                          <div className="w-9 h-9 bg-[#1DB954] rounded-full flex items-center justify-center">
                            <Play size={14} className="text-black fill-black ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-[13px] font-semibold truncate">{pl.name}</p>
                        <p className="text-[#B3B3B3] text-[12px] truncate">Playlist · {getPlaylistTrackCount(pl)} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page: All Libraries ────────────────────────────────────────────────────────

function AllLibraries({
  setPage,
  playlists,
  playlistTracks,
  setSelectedPlaylistId,
  topArtists,
  currentPlaybackTrackId,
  enableDeprecatedApis,
}: {
  setPage: (p: Page) => void;
  playlists: Playlist[];
  playlistTracks: Track[];
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  topArtists: Artist[];
  currentPlaybackTrackId: string | null;
  enableDeprecatedApis: boolean;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "tracks" | "recent">("name");

  const totalUniqueMs = playlistTracks.reduce((sum, t) => sum + t.durationMs, 0);
  const totalHours = Math.floor(totalUniqueMs / 3600000);
  const totalMin = Math.floor((totalUniqueMs % 3600000) / 60000);

  const filteredPlaylists = playlists.filter(pl =>
    pl.name.toLowerCase().includes(search.toLowerCase()) || pl.desc.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => {
    if (sortBy === "tracks") return b.tracks - a.tracks;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return String(b.id).localeCompare(String(a.id));
  });

  const avgBpm = playlistTracks.length > 0 ? Math.round(playlistTracks.reduce((s, t) => s + t.bpm, 0) / playlistTracks.length) : 120;

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212]" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-[#0f2a1a] via-[#121212] to-[#121212] px-8 pt-8 pb-6">
        <div className="flex items-end gap-6 mb-6">
          <div className="w-[140px] h-[140px] bg-gradient-to-br from-[#1DB954]/40 to-[#1DB954]/10 border border-[#1DB954]/30 rounded-xl flex flex-col items-center justify-center gap-2 shadow-2xl shrink-0">
            <Library size={44} className="text-[#1DB954]" />
            <span className="text-[#1DB954] text-[11px] font-bold uppercase tracking-widest">All Songs</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3] mb-1">Conditional Playlist</p>
            <h1 className="text-white text-[40px] font-extrabold leading-none mb-3">All Libraries</h1>
            <p className="text-[#B3B3B3] text-[13px] mb-4 max-w-xl">
              Dynamically compiled from all your playlists and saved tracks. Deduplicated by Spotify Track URI across {playlists.length} sources.
            </p>
            <div className="flex items-center gap-5 text-[13px] flex-wrap">
              <span className="text-white font-semibold">{playlistTracks.length} unique tracks</span>
              <span className="text-[#B3B3B3] hidden sm:inline">·</span>
              <span className="text-[#B3B3B3]">{totalHours} hr {totalMin} min</span>
              <span className="text-[#B3B3B3] hidden sm:inline">·</span>
              <span className="text-[#B3B3B3]">{playlists.length} source playlists</span>
              <span className="text-[#B3B3B3] hidden sm:inline">·</span>
              <span className="text-[#1DB954] flex items-center gap-1 font-semibold"><RefreshCw size={11} /> Synced · just now</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => {
              if (playlistTracks.length > 0) {
                playTrackSequence(playlistTracks, 0)
                  .catch(() => toast.error("Could not play playlist. Is Spotify open on an active device?"));
              }
            }} className="w-14 h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg cursor-pointer">
              <Play size={24} className="text-black fill-black ml-0.5" />
            </button>
          </div>
        </div>

        {/* Aggregate stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Source Playlists", value: String(playlists.length), icon: ListMusic, color: "text-blue-400" },
            { label: "Unique Tracks", value: String(playlistTracks.length), icon: Music2, color: "text-[#1DB954]" },
            { label: "Unique Artists", value: String(topArtists.length), icon: Mic2, color: "text-purple-400" },
            { label: "Avg. BPM", value: String(avgBpm), icon: Zap, color: "text-amber-400" },
            { label: "Sync Status", value: "OK", icon: Check, color: "text-emerald-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#181818] rounded-lg px-4 py-3 border border-[#282828] flex items-center gap-3">
              <Icon size={18} className={color} />
              <div>
                <p className={`text-[20px] font-bold ${color}`}>{value}</p>
                <p className="text-[#B3B3B3] text-[11px]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-8 py-4 border-b border-[#282828] sticky top-0 z-10 bg-[#121212]/95 backdrop-blur-sm">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
          <input type="text" placeholder="Filter playlists..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#282828] rounded text-[13px] text-white placeholder-[#B3B3B3] border border-transparent focus:border-white/20 outline-none" />
        </div>
        <div className="flex items-center gap-1 bg-[#282828] rounded p-1 text-[12px]">
          {(["name", "tracks", "recent"] as const).map(opt => (
            <button key={opt} onClick={() => setSortBy(opt)}
              className={`px-3 py-1 rounded capitalize transition-colors font-medium ${sortBy === opt ? "bg-[#383838] text-white" : "text-[#B3B3B3] hover:text-white"}`}>
              {opt === "recent" ? "Recently Added" : opt}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1 bg-[#282828] rounded p-1">
          <button onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded transition-colors ${viewMode === "grid" ? "bg-[#383838] text-white" : "text-[#B3B3B3] hover:text-white"}`}>
            <Columns3 size={15} />
          </button>
          <button onClick={() => setViewMode("list")}
            className={`p-1.5 rounded transition-colors ${viewMode === "list" ? "bg-[#383838] text-white" : "text-[#B3B3B3] hover:text-white"}`}>
            <ListMusic size={15} />
          </button>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* All Songs flat table — a compact preview */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-[16px] font-bold">All Aggregated Tracks</h2>
            <button onClick={() => setPage("workspace")}
              className="text-[13px] text-[#1DB954] font-semibold hover:underline flex items-center gap-1">
              Open in Workspace <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-[#181818] rounded-lg border border-[#282828] overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#282828]">
                  <th className="px-4 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold w-8">#</th>
                  <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold">Title</th>
                  <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold">Artist</th>
                  <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold hidden xl:table-cell">Album</th>
                  {enableDeprecatedApis && <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold hidden xl:table-cell">Genre</th>}
                  {enableDeprecatedApis && <th className="px-3 py-3 text-left text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold">BPM</th>}
                  <th className="px-3 py-3 text-right text-[10px] uppercase tracking-widest text-[#B3B3B3] font-semibold"><Clock size={12} className="inline" /></th>
                </tr>
              </thead>
              <tbody>
                {playlistTracks.map((track, i) => (
                  <tr key={track.id}
                    onClick={() => playTrackSequence(playlistTracks, i).catch(() => toast.error("Could not play track."))}
                    className={`group border-b border-[#282828]/40 hover:bg-[#282828]/60 transition-colors cursor-pointer ${currentPlaybackTrackId === String(track.id) ? "bg-[#1DB954]/10" : i % 2 === 0 ? "" : "bg-[#181818]/60"}`}>
                    <td className="px-4 py-2.5">
                      <span className={`text-[12px] font-mono group-hover:hidden ${currentPlaybackTrackId === String(track.id) ? "text-[#1DB954] font-semibold" : "text-[#B3B3B3]"}`}>
                        {currentPlaybackTrackId === String(track.id) ? (
                          <Play size={12} className="text-[#1DB954] fill-[#1DB954] inline-block" />
                        ) : (
                          i + 1
                        )}
                      </span>
                      <Play size={12} className="text-white fill-white hidden group-hover:block" />
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 bg-[#282828] rounded shrink-0 overflow-hidden flex items-center justify-center">
                          {track.cover ? (
                            <ImageWithFallback src={track.cover} className="w-full h-full object-cover" alt="" />
                          ) : (
                            <Music2 size={11} className="text-[#B3B3B3]" />
                          )}
                        </div>
                        <span className="text-white text-[13px] font-medium truncate max-w-[160px]">{track.title}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[#B3B3B3] text-[13px]">{track.artist}</td>
                    <td className="px-3 py-2.5 text-[#B3B3B3] text-[13px] hidden xl:table-cell truncate max-w-[140px]">{track.album}</td>
                    {enableDeprecatedApis && (
                      <td className="px-3 py-2.5 hidden xl:table-cell">
                        <span className="text-[11px] text-[#B3B3B3] bg-[#282828] px-2 py-0.5 rounded-full">{track.genre}</span>
                      </td>
                    )}
                    {enableDeprecatedApis && <td className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono">{track.bpm}</td>}
                    <td className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono text-right">{track.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Source Playlists */}
        <div>
          <h2 className="text-white text-[16px] font-bold mb-4">Source Playlists <span className="text-[#B3B3B3] font-normal text-[14px]">({filteredPlaylists.length})</span></h2>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredPlaylists.map(pl => (
                <button key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setPage("workspace"); }}
                  className="group flex flex-col gap-3 p-3 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border border-white/5">
                  <div className={`relative w-full aspect-square rounded-md overflow-hidden bg-[#282828] shrink-0`}>
                    {isUrlOrData(pl.cover) ? (
                      <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className={`w-full h-full ${pl.cover}`} />
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                      <div className="w-9 h-9 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <Play size={14} className="text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-[14px] truncate">{pl.name}</p>
                    <p className="text-[#B3B3B3] text-[12px] mt-0.5 truncate">{pl.desc}</p>
                    <p className="text-[#B3B3B3] text-[11px] mt-1">{getPlaylistTrackCount(pl)} tracks</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="bg-[#181818] rounded-lg border border-[#282828] overflow-hidden">
              {filteredPlaylists.map((pl, i) => (
                <button key={pl.id} onClick={() => { setSelectedPlaylistId(pl.id); setPage("workspace"); }}
                  className={`group w-full flex items-center gap-4 px-4 py-3 hover:bg-[#282828] transition-colors text-left ${i < filteredPlaylists.length - 1 ? "border-b border-[#282828]" : ""}`}>
                  <div className="w-12 h-12 rounded shrink-0 bg-[#282828] overflow-hidden">
                    {isUrlOrData(pl.cover) ? (
                      <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className={`w-full h-full ${pl.cover}`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-[14px] font-semibold truncate">{pl.name}</p>
                    <p className="text-[#B3B3B3] text-[12px] truncate">{pl.desc}</p>
                  </div>
                  <span className="text-[#B3B3B3] text-[13px] font-mono shrink-0">{getPlaylistTrackCount(pl)} tracks</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} className="text-white fill-white" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Library Playlists ────────────────────────────────────────────────────────

type PlSortKey = "none" | "name" | "tracks" | "owner";
type PlGroupKey = "none" | "size" | "owner";
type ViewSize = "large" | "medium" | "small";

const PLAYLIST_SORT_OPTIONS: Array<{ key: Exclude<PlSortKey, "none">; label: string }> = [
  { key: "name", label: "Name" },
  { key: "tracks", label: "Track count" },
  { key: "owner", label: "Owner" },
];

const PLAYLIST_GROUP_OPTIONS: Array<{ key: Exclude<PlGroupKey, "none">; label: string }> = [
  { key: "size", label: "By Size" },
  { key: "owner", label: "By Owner" },
];

const getPlaylistOwnerLabel = (owner: Playlist["owner"]) => owner === "yours" ? "My Playlists" : "Followed Playlists";

const getPlaylistSortValue = (playlist: Playlist, key: Exclude<PlSortKey, "none">) => {
  if (key === "name") return playlist.name;
  if (key === "tracks") return getPlaylistTrackCount(playlist);
  return playlist.owner === "yours" ? 0 : 1;
};

const getPlaylistGroupLabel = (playlist: Playlist, key: Exclude<PlGroupKey, "none">) => {
  const trackCount = getPlaylistTrackCount(playlist);
  if (key === "size") return trackCount < 40 ? "Small" : trackCount < 80 ? "Medium" : "Large";
  return getPlaylistOwnerLabel(playlist.owner);
};

function LibraryPlaylists({
  onOpen,
  selectedView,
  playlists,
  likedSongsCount,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playingPlaylistId,
}: {
  onOpen: () => void;
  selectedView: "yours" | "all" | "followed";
  playlists: Playlist[];
  likedSongsCount: number;
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  playingPlaylistId: string | number | null;
}) {
  // Load preferences from cache
  const preferences = loadPreferences();

  const [sortKey, setSortKey] = useState<PlSortKey>(preferences.playlistSortKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(preferences.playlistSortDir);
  const [groupKey, setGroupKey] = useState<PlGroupKey>(preferences.playlistGroupKey);
  const [viewSize, setViewSize] = useState<ViewSize>(preferences.playlistViewSize);
  const [customOrder, setCustomOrder] = useState<string[]>(preferences.playlistOrder);
  const [sortOpen, setSortOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const sortRef = useRef<HTMLDivElement>(null);
  const groupRef = useRef<HTMLDivElement>(null);
  const sortBtnRef = useRef<HTMLButtonElement>(null);
  const groupBtnRef = useRef<HTMLButtonElement>(null);
  const [sortDropdownPos, setSortDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [groupDropdownPos, setGroupDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const dragItemRef = useRef<string | null>(null);
  const dragOverItemRef = useRef<string | null>(null);

  const toggleSection = (label: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      next.has(label) ? next.delete(label) : next.add(label);
      return next;
    });
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) setGroupOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Save preferences when they change
  useEffect(() => {
    PreferenceUpdaters.setPlaylistSort(sortKey, sortDir);
  }, [sortKey, sortDir]);

  useEffect(() => {
    PreferenceUpdaters.setPlaylistGroup(groupKey);
  }, [groupKey]);

  useEffect(() => {
    PreferenceUpdaters.setPlaylistViewSize(viewSize);
  }, [viewSize]);

  useEffect(() => {
    PreferenceUpdaters.setPlaylistOrder(customOrder);
  }, [customOrder]);

  // Filter based on selected view
  const filtered = selectedView === "all"
    ? playlists
    : playlists.filter(pl => pl.owner === selectedView);

  const uniquePlaylists = Array.from(
    filtered.reduce((map, playlist) => {
      const key = String(playlist.id);
      if (!map.has(key)) {
        map.set(key, playlist);
      }
      return map;
    }, new Map<string, Playlist>()).values()
  );

  // Apply custom order if no sorting is active
  const reordered = sortKey === "none" && customOrder.length > 0
    ? [...uniquePlaylists].sort((a, b) => {
      const aIdx = customOrder.indexOf(String(a.id));
      const bIdx = customOrder.indexOf(String(b.id));
      if (aIdx === -1 && bIdx === -1) return 0;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    })
    : uniquePlaylists;

  const sorted = sortKey === "none" ? reordered : [...reordered].sort((a, b) => {
    const va = getPlaylistSortValue(a, sortKey);
    const vb = getPlaylistSortValue(b, sortKey);
    const cmp = String(va).localeCompare(String(vb), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  type Group = { label: string; items: Playlist[] };
  const grouped: Group[] = groupKey === "none"
    ? [{ label: "", items: sorted }]
    : Array.from(
      sorted.reduce((map, pl) => {
        const key = getPlaylistGroupLabel(pl, groupKey);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(pl);
        return map;
      }, new Map<string, Playlist[]>())
    ).map(([label, items]) => ({ label, items }));

  const toggleSort = (key: PlSortKey) => {
    if (key === "none") { setSortKey("none"); return; }
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  // Drag and drop handlers
  const handleDragStart = (playlistId: string | number) => {
    dragItemRef.current = String(playlistId);
  };

  const handleDragEnter = (playlistId: string | number) => {
    dragOverItemRef.current = String(playlistId);
  };

  const handleDragEnd = () => {
    const draggedId = dragItemRef.current;
    const targetId = dragOverItemRef.current;

    if (!draggedId || !targetId || draggedId === targetId) {
      dragItemRef.current = null;
      dragOverItemRef.current = null;
      return;
    }

    // Only allow reordering when no sort is active
    if (sortKey !== "none") {
      dragItemRef.current = null;
      dragOverItemRef.current = null;
      return;
    }

    // Get the full list of playlist IDs
    const allIds = sorted.map(pl => String(pl.id));

    // Update custom order
    const newOrder = [...allIds];
    const draggedIndex = newOrder.indexOf(String(draggedId));
    const targetIndex = newOrder.indexOf(String(targetId));

    if (draggedIndex !== -1 && targetIndex !== -1) {
      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, String(draggedId));
      setCustomOrder(newOrder);
    }

    dragItemRef.current = null;
    dragOverItemRef.current = null;
  };

  const isDraggable = sortKey === "none" && groupKey === "none";

  return (
    <div className="flex flex-col flex-1 min-h-0 px-2 pt-2 pb-2">
      {/* toolbar: Group + Sort in one row */}
      <div className="flex items-center gap-1.5 px-2 pb-2">
        {/* Group by */}
        <div ref={groupRef} className="relative flex-1 min-w-0">
          <button
            ref={groupBtnRef}
            onClick={() => {
              if (!groupOpen) {
                const rect = groupBtnRef.current?.getBoundingClientRect();
                if (rect) setGroupDropdownPos({ top: rect.bottom + 4, left: rect.left });
              }
              setGroupOpen(o => !o);
            }}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${groupKey !== "none" ? "text-[#1DB954] bg-[#1DB954]/10" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
            <Library size={11} />
            {groupKey !== "none" ? "Grouped" : "Group"}
          </button>
          {groupOpen && groupDropdownPos && (
            <div
              style={{ position: "fixed", top: groupDropdownPos.top, left: groupDropdownPos.left, zIndex: 9999 }}
              className="w-40 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl py-1">
              {(["none", ...PLAYLIST_GROUP_OPTIONS.map(option => option.key)] as PlGroupKey[]).map(opt => (
                <button key={opt} onClick={() => { setGroupKey(opt); setGroupOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] capitalize hover:bg-[#383838] transition-colors ${groupKey === opt ? "text-[#1DB954]" : "text-[#B3B3B3]"}`}>
                  {opt === "none" ? "None" : PLAYLIST_GROUP_OPTIONS.find(option => option.key === opt)?.label}
                  {groupKey === opt && <Check size={10} />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* divider */}
        <div className="w-px h-4 bg-[#383838] shrink-0" />

        {/* Sort by */}
        <div ref={sortRef} className="relative flex-1 min-w-0">
          <button
            ref={sortBtnRef}
            onClick={() => {
              if (!sortOpen) {
                const rect = sortBtnRef.current?.getBoundingClientRect();
                if (rect) setSortDropdownPos({ top: rect.bottom + 4, left: rect.left });
              }
              setSortOpen(o => !o);
            }}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded text-[11px] transition-colors ${sortKey !== "none" ? "text-[#1DB954] bg-[#1DB954]/10" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
            <ArrowUpDown size={11} />
            <span>Sort{sortKey !== "none" && ` ${sortDir === "asc" ? "↑" : "↓"}`}</span>
          </button>
          {sortOpen && sortDropdownPos && (
            <div
              style={{ position: "fixed", top: sortDropdownPos.top, left: sortDropdownPos.left, zIndex: 9999 }}
              className="w-40 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl py-1">
              {(["none", ...PLAYLIST_SORT_OPTIONS.map(option => option.key)] as PlSortKey[]).map(opt => (
                <button key={opt} onClick={() => { toggleSort(opt); setSortOpen(false); }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-[12px] hover:bg-[#383838] transition-colors ${sortKey === opt ? "text-[#1DB954]" : "text-[#B3B3B3]"}`}>
                  {opt === "none" ? "None" : PLAYLIST_SORT_OPTIONS.find(option => option.key === opt)?.label}
                  {sortKey === opt && opt !== "none" && <span className="font-mono text-[11px]">{sortDir === "asc" ? "↑" : "↓"}</span>}
                  {sortKey === opt && opt === "none" && <Check size={10} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* View Size Radio Buttons */}
      <div className="px-2 pb-3">
        <div className="bg-[#282828] rounded p-1 border border-[#383838] flex items-center gap-1">
          {([
            { key: "large", icon: Grid3x3, label: "Large" },
            { key: "medium", icon: Grid2x2, label: "Medium" },
            { key: "small", icon: Rows3, label: "Small" }
          ] as { key: ViewSize; icon: React.ElementType; label: string }[]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setViewSize(key)}
              title={label}
              className={`flex-1 flex items-center justify-center p-1.5 rounded transition-colors ${viewSize === key
                ? "bg-[#1DB954]/20 text-[#1DB954]"
                : "text-[#B3B3B3] hover:text-white hover:bg-[#383838]"
                }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      {/* list */}
      <div className="overflow-y-auto flex-1 space-y-0.5 no-scrollbar">
        {viewSize === "large" ? (
          // Large Grid Photos View
          <div className="grid grid-cols-2 gap-2 px-2">
            {likedSongsCount > 0 && (() => {
              const isPlaying = playingPlaylistId === "liked";
              return (
                <button onClick={() => { setSelectedPlaylistId("liked"); onOpen(); }}
                  className={`group flex flex-col gap-2 p-2 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border ${selectedPlaylistId === "liked" ? "border-[#1DB954]" : "border-white/5"}`}>
                  <div className="relative w-full aspect-square rounded bg-gradient-to-br from-[#450af5] to-[#8134af] overflow-hidden flex items-center justify-center">
                    <Heart size={32} className="text-white fill-white" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                      <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <Play size={12} className="text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`text-[12px] font-semibold truncate ${isPlaying ? "text-[#1DB954]" : "text-white"}`}>Liked Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[#B3B3B3] text-[10px]">{likedSongsCount.toLocaleString()} tracks</p>
                  </div>
                </button>
              );
            })()}
            {/* All My Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_my";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_my"); onOpen(); }}
                  className={`group flex flex-col gap-2 p-2 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border ${selectedPlaylistId === "all_my" ? "border-[#1DB954]" : "border-white/5"}`}>
                  <div className="relative w-full aspect-square rounded bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden flex items-center justify-center">
                    <ListMusic size={32} className="text-white" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                      <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <Play size={12} className="text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`text-[12px] font-semibold truncate ${isPlaying ? "text-[#1DB954]" : "text-white"}`}>All My Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[#B3B3B3] text-[10px]">Compiled Playlist</p>
                  </div>
                </button>
              );
            })()}
            {/* All Followed Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_followed";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_followed"); onOpen(); }}
                  className={`group flex flex-col gap-2 p-2 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border ${selectedPlaylistId === "all_followed" ? "border-[#1DB954]" : "border-white/5"}`}>
                  <div className="relative w-full aspect-square rounded bg-gradient-to-br from-purple-600 to-violet-700 overflow-hidden flex items-center justify-center">
                    <RadioTower size={32} className="text-white" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                      <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <Play size={12} className="text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`text-[12px] font-semibold truncate ${isPlaying ? "text-[#1DB954]" : "text-white"}`}>All Followed</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[#B3B3B3] text-[10px]">Compiled Playlist</p>
                  </div>
                </button>
              );
            })()}
            {/* All Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_songs";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_songs"); onOpen(); }}
                  className={`group flex flex-col gap-2 p-2 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border ${selectedPlaylistId === "all_songs" ? "border-[#1DB954]" : "border-white/5"}`}>
                  <div className="relative w-full aspect-square rounded bg-gradient-to-br from-emerald-600 to-teal-700 overflow-hidden flex items-center justify-center">
                    <Music2 size={32} className="text-white" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                      <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                        <Play size={12} className="text-black fill-black ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`text-[12px] font-semibold truncate ${isPlaying ? "text-[#1DB954]" : "text-white"}`}>All Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[#B3B3B3] text-[10px]">Compiled Playlist</p>
                  </div>
                </button>
              );
            })()}
            {grouped.flatMap(({ items }) => items).map(pl => (
              <button
                key={pl.id}
                onClick={() => { setSelectedPlaylistId(pl.id); onOpen(); }}
                draggable={isDraggable}
                onDragStart={() => handleDragStart(pl.id)}
                onDragEnter={() => handleDragEnter(pl.id)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`group flex flex-col gap-2 p-2 rounded-lg bg-[#181818] hover:bg-[#282828] transition-all text-left border ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${selectedPlaylistId === pl.id ? "border-[#1DB954]" : "border-white/5"}`}>
                <div className={`relative w-full aspect-square rounded overflow-hidden bg-[#282828]`}>
                  {isDraggable && (
                    <div className="absolute top-1 left-1 z-10 bg-black/60 rounded p-0.5">
                      <GripVertical size={12} className="text-white" />
                    </div>
                  )}
                  {isUrlOrData(pl.cover) ? (
                    <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className={`w-full h-full ${pl.cover}`} />
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                    <div className="w-7 h-7 bg-[#1DB954] rounded-full flex items-center justify-center">
                      <Play size={12} className="text-black fill-black ml-0.5" />
                    </div>
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p className={`text-[12px] font-semibold truncate ${playingPlaylistId === pl.id ? "text-[#1DB954]" : "text-white"}`}>{pl.name}</p>
                    {playingPlaylistId === pl.id && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                  </div>
                  <p className="text-[#B3B3B3] text-[10px]">{getPlaylistTrackCount(pl)} tracks</p>
                </div>
              </button>
            ))}
          </div>
        ) : viewSize === "small" ? (
          // Small List View
          <>
            {likedSongsCount > 0 && (() => {
              const isPlaying = playingPlaylistId === "liked";
              return (
                <button onClick={() => { setSelectedPlaylistId("liked"); onOpen(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors text-left ${selectedPlaylistId === "liked" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-6 h-6 rounded shrink-0 bg-gradient-to-br from-[#450af5] to-[#8134af] flex items-center justify-center">
                    <Heart size={10} className="text-white fill-white" />
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>Liked Songs</p>
                    {isPlaying && <Volume2 size={10} className="text-[#1DB954] animate-pulse shrink-0" />}
                  </div>
                </button>
              );
            })()}
            {/* All My Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_my";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_my"); onOpen(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors text-left ${selectedPlaylistId === "all_my" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-6 h-6 rounded shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                    <ListMusic size={10} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All My Songs</p>
                    {isPlaying && <Volume2 size={10} className="text-[#1DB954] animate-pulse shrink-0" />}
                  </div>
                </button>
              );
            })()}
            {/* All Followed Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_followed";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_followed"); onOpen(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors text-left ${selectedPlaylistId === "all_followed" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-6 h-6 rounded shrink-0 bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
                    <RadioTower size={10} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All Followed Songs</p>
                    {isPlaying && <Volume2 size={10} className="text-[#1DB954] animate-pulse shrink-0" />}
                  </div>
                </button>
              );
            })()}
            {/* All Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_songs";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_songs"); onOpen(); }}
                  className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors text-left ${selectedPlaylistId === "all_songs" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-6 h-6 rounded shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                    <Music2 size={10} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    <p className={`text-[11px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All Songs</p>
                    {isPlaying && <Volume2 size={10} className="text-[#1DB954] animate-pulse shrink-0" />}
                  </div>
                </button>
              );
            })()}
            {grouped.map(({ label, items }) => {
              const isCollapsed = label ? collapsedSections.has(label) : false;
              return (
                <div key={label}>
                  {label && (
                    <button
                      onClick={() => toggleSection(label)}
                      className="w-full flex items-center gap-1 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#535353] hover:text-[#B3B3B3] transition-colors text-left">
                      <ChevronDown size={10} className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      {label}
                      <span className="ml-auto font-mono normal-case tracking-normal opacity-60">{items.length}</span>
                    </button>
                  )}
                  {!isCollapsed && items.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => { setSelectedPlaylistId(pl.id); onOpen(); }}
                      draggable={isDraggable}
                      onDragStart={() => handleDragStart(pl.id)}
                      onDragEnter={() => handleDragEnter(pl.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()
                      }
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-[11px] transition-colors text-left ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${selectedPlaylistId === pl.id ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                      {isDraggable && <GripVertical size={12} className="text-[#535353] shrink-0" />}
                      <div className="w-6 h-6 rounded shrink-0 bg-[#282828] overflow-hidden">
                        {isUrlOrData(pl.cover) ? (
                          <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className={`w-full h-full ${pl.cover}`} />
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-1 min-w-0">
                        <p className={`text-[11px] truncate ${playingPlaylistId === pl.id ? "text-[#1DB954] font-semibold" : "text-white"}`}>{pl.name}</p>
                        {playingPlaylistId === pl.id && <Volume2 size={10} className="text-[#1DB954] animate-pulse shrink-0" />}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </>
        ) : (
          // Medium List View (Default)
          <>
            {likedSongsCount > 0 && (() => {
              const isPlaying = playingPlaylistId === "liked";
              return (
                <button onClick={() => { setSelectedPlaylistId("liked"); onOpen(); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors text-left ${selectedPlaylistId === "liked" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-8 h-8 rounded shrink-0 bg-gradient-to-br from-[#450af5] to-[#8134af] flex items-center justify-center">
                    <Heart size={14} className="text-white fill-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>Liked Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                    <p className="text-[#B3B3B3] text-[11px]">Playlist · {likedSongsCount.toLocaleString()} tracks</p>
                  </div>
                </button>
              );
            })()}
            {/* All My Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_my";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_my"); onOpen(); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors text-left ${selectedPlaylistId === "all_my" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-8 h-8 rounded shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">
                    <ListMusic size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All My Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                  </div>
                </button>
              );
            })()}
            {/* All Followed Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_followed";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_followed"); onOpen(); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors text-left ${selectedPlaylistId === "all_followed" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-8 h-8 rounded shrink-0 bg-gradient-to-br from-purple-600 to-violet-700 flex items-center justify-center">
                    <RadioTower size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All Followed Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                  </div>
                </button>
              );
            })()}
            {/* All Songs */}
            {(() => {
              const isPlaying = playingPlaylistId === "all_songs";
              return (
                <button onClick={() => { setSelectedPlaylistId("all_songs"); onOpen(); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors text-left ${selectedPlaylistId === "all_songs" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                  <div className="w-8 h-8 rounded shrink-0 bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
                    <Music2 size={14} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-[13px] truncate ${isPlaying ? "text-[#1DB954] font-semibold" : "text-white"}`}>All Songs</p>
                      {isPlaying && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                    </div>
                  </div>
                </button>
              );
            })()}
            {grouped.map(({ label, items }) => {
              const isCollapsed = label ? collapsedSections.has(label) : false;
              return (
                <div key={label}>
                  {label && (
                    <button
                      onClick={() => toggleSection(label)}
                      className="w-full flex items-center gap-1 px-2 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-[#535353] hover:text-[#B3B3B3] transition-colors text-left">
                      <ChevronDown size={10} className={`shrink-0 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
                      {label}
                      <span className="ml-auto font-mono normal-case tracking-normal opacity-60">{items.length}</span>
                    </button>
                  )}
                  {!isCollapsed && items.map(pl => (
                    <button
                      key={pl.id}
                      onClick={() => { setSelectedPlaylistId(pl.id); onOpen(); }}
                      draggable={isDraggable}
                      onDragStart={() => handleDragStart(pl.id)}
                      onDragEnter={() => handleDragEnter(pl.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded text-[13px] transition-colors text-left ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''} ${selectedPlaylistId === pl.id ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
                      {isDraggable && <GripVertical size={14} className="text-[#535353] shrink-0" />}
                      <div className="w-8 h-8 rounded shrink-0 bg-[#282828] overflow-hidden">
                        {isUrlOrData(pl.cover) ? (
                          <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className={`w-full h-full ${pl.cover}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-[13px] truncate ${playingPlaylistId === pl.id ? "text-[#1DB954] font-semibold" : "text-white"}`}>{pl.name}</p>
                          {playingPlaylistId === pl.id && <Volume2 size={12} className="text-[#1DB954] animate-pulse shrink-0" />}
                        </div>
                        <p className="text-[#B3B3B3] text-[11px]">Playlist · {getPlaylistTrackCount(pl)} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Text Carousel ───────────────────────────────────────────────────────────

function TextCarousel({ text, className }: { text: string; className?: string }) {
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLSpanElement>(null);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = textRef.current;
    const container = containerRef.current;
    if (el && container) {
      setOverflows(el.scrollWidth > container.offsetWidth);
    }
  }, [text]);

  return (
    <span ref={containerRef} className={`inline-flex min-w-0 whitespace-nowrap overflow-hidden ${className ?? ""}`}>
      <style>{`@keyframes marquee-loop{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
      {overflows ? (
        <span className="inline-flex whitespace-nowrap group-hover:[animation:marquee-loop_5s_linear_infinite]">
          <span ref={textRef} className="pr-4">{text}</span>
          <span className="pr-4">{text}</span>
        </span>
      ) : (
        <span ref={textRef} className="truncate">{text}</span>
      )}
    </span>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App() {
  const preferences = loadPreferences();
  const [page, setPage] = useState<Page>(preferences.currentPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(preferences.sidebarCollapsed);

  // Spotify integration state
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongsCount, setLikedSongsCount] = useState<number>(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | number>(preferences.selectedPlaylistId || "liked");
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
  const [loadingTracksProgress, setLoadingTracksProgress] = useState<number>(0);
  const [workspaceForceFetchToken, setWorkspaceForceFetchToken] = useState(0);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const playbackStateRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    playbackStateRef.current = playbackState;
  }, [playbackState]);

  useEffect(() => {
    if (!playbackState) return;
    const uri = playbackState.context?.uri || "";
    if (uri.startsWith("spotify:playlist:")) {
      const plId = uri.split("spotify:playlist:")[1];
      setPlayingPlaylistId(plId);
    } else if (uri.includes(":collection") || uri.includes("collection:tracks")) {
      setPlayingPlaylistId("liked");
    }
  }, [playbackState]);

  const playlistTrackCacheRef = useRef<WorkspaceTrackCache>(readWorkspaceTrackCache());
  const workspaceLoadSessionRef = useRef(0);
  const lastConsumedForceFetchTokenRef = useRef(0);
  // Feature flag: deprecated Spotify endpoints (audio-features, artists/genre)
  const [enableDeprecatedApis, setEnableDeprecatedApis] = useState<boolean>(
    () => loadPreferences().enableDeprecatedApis
  );

  // Sync flag to API module on mount and whenever it changes
  useEffect(() => {
    setDeprecatedApisEnabled(enableDeprecatedApis);
    PreferenceUpdaters.setEnableDeprecatedApis(enableDeprecatedApis);
  }, [enableDeprecatedApis]);

  const handleToggleDeprecatedApis = () => {
    setEnableDeprecatedApis(prev => !prev);
  };

  // Save preferences when they change
  useEffect(() => {
    PreferenceUpdaters.setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    PreferenceUpdaters.setSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  useEffect(() => {
    PreferenceUpdaters.setSelectedPlaylistId(selectedPlaylistId);
  }, [selectedPlaylistId]);

  const updatePlaylistTracks = (updater: React.SetStateAction<Track[]>, playlistKey?: string) => {
    const key = playlistKey || (String(selectedPlaylistId) + (enableDeprecatedApis ? "-enriched" : "-basic"));
    setPlaylistTracks(prev => {
      const next = typeof updater === "function"
        ? (updater as (value: Track[]) => Track[])(prev)
        : updater;
      playlistTrackCacheRef.current = {
        ...playlistTrackCacheRef.current,
        [key]: next,
      };
      writeWorkspaceTrackCache(playlistTrackCacheRef.current);
      return next;
    });
  };

  // Auth check & callback resolution on mount
  useEffect(() => {
    const resolveAuth = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        if (code) {
          const success = await handleRedirectCallback();
          setAuthenticated(success);
        } else {
          const isAuth = isAuthenticatedSync();
          setAuthenticated(isAuth);
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
      } finally {
        setAuthChecking(false);
      }
    };
    resolveAuth();
  }, []);
  // Fetch initial profile & metadata once authenticated
  useEffect(() => {
    if (!authenticated) return;

    const loadProfileData = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUser(user);

        // Fetch remaining metrics independently so one missing scope does not block the rest.
        const [userPlaylists, likedSongsResult, recentResult, topArtistsResult] = await Promise.allSettled([
          getUserPlaylists(user.id),
          getLikedSongsCount(),
          getRecentlyPlayed(),
          getTopArtists()
        ]);

        if (userPlaylists.status === "fulfilled") {
          setPlaylists(userPlaylists.value);
        } else {
          console.error("Failed to load playlists:", userPlaylists.reason);
        }

        if (likedSongsResult.status === "fulfilled") {
          setLikedSongsCount(likedSongsResult.value);
        } else {
          console.error("Failed to load liked songs count:", likedSongsResult.reason);
        }

        if (recentResult.status === "fulfilled") {
          setRecentlyPlayed(recentResult.value);
        } else {
          console.error("Failed to load recently played tracks:", recentResult.reason);
        }

        if (topArtistsResult.status === "fulfilled") {
          setTopArtists(topArtistsResult.value);
        } else {
          console.error("Failed to load top artists:", topArtistsResult.reason);
        }
      } catch (err) {
        console.error("Failed to load user profile data:", err);
      }
    };

    loadProfileData();
  }, [authenticated]);

  // Sync playlist tracks when selected playlist changes
  useEffect(() => {
    if (!authenticated || page !== "workspace") return;

    const controller = new AbortController();
    const signal = controller.signal;
    const loadSession = ++workspaceLoadSessionRef.current;

    const setWorkspaceLoadProgress = (progress: number) => {
      if (workspaceLoadSessionRef.current === loadSession) {
        setLoadingTracksProgress(progress);
      }
    };

    const loadTracks = async () => {
      const forceRefreshRequested = workspaceForceFetchToken !== lastConsumedForceFetchTokenRef.current;
      if (forceRefreshRequested) {
        lastConsumedForceFetchTokenRef.current = workspaceForceFetchToken;
      }
      const cacheKey = String(selectedPlaylistId) + (enableDeprecatedApis ? "-enriched" : "-basic");
      const cachedTracks = playlistTrackCacheRef.current[cacheKey];
      if (cachedTracks?.length && !forceRefreshRequested && cachedTracks[0].releaseDate !== undefined) {
        if (workspaceLoadSessionRef.current === loadSession) {
          setLoadingTracks(false);
        }
        updatePlaylistTracks(cachedTracks, cacheKey);
        return;
      }

      setLoadingTracks(true);
      setWorkspaceLoadProgress(0);
      setPlaylistTracks([]);
      try {
        setDeprecatedApisEnabled(enableDeprecatedApis);
        let tracks: Track[] = [];
        if (selectedPlaylistId === "all_my") {
          const myPlaylists = playlists.filter(p => p.owner === "yours");
          tracks = await getMultiPlaylistTracks(["liked", ...myPlaylists.map(p => p.id)], setWorkspaceLoadProgress, signal, (newTracks) => updatePlaylistTracks(newTracks, cacheKey));
        } else if (selectedPlaylistId === "all_followed") {
          const followedPlaylists = playlists.filter(p => p.owner === "followed");
          tracks = await getMultiPlaylistTracks(followedPlaylists.map(p => p.id), setWorkspaceLoadProgress, signal, (newTracks) => updatePlaylistTracks(newTracks, cacheKey));
        } else if (selectedPlaylistId === "all_songs") {
          tracks = await getMultiPlaylistTracks(["liked", ...playlists.map(p => p.id)], setWorkspaceLoadProgress, signal, (newTracks) => updatePlaylistTracks(newTracks, cacheKey));
        } else {
          tracks = await getPlaylistTracks(selectedPlaylistId, setWorkspaceLoadProgress, signal, (newTracks) => updatePlaylistTracks(newTracks, cacheKey));
        }
        if (workspaceLoadSessionRef.current !== loadSession) {
          return;
        }
        setWorkspaceLoadProgress(100);
        updatePlaylistTracks(tracks, cacheKey);
      } catch (err: any) {
        if (err.name === "AbortError") {
          console.log("Track loading aborted for session:", loadSession);
          return;
        }
        console.error("Failed to load playlist tracks:", err);
        toast.error("Failed to load tracks from Spotify.");
      } finally {
        if (workspaceLoadSessionRef.current === loadSession) {
          setLoadingTracks(false);
        }
      }
    };

    loadTracks();

    return () => {
      controller.abort();
    };
  }, [authenticated, page, selectedPlaylistId, playlists, enableDeprecatedApis, workspaceForceFetchToken]);

  // Player state polling (visibility-aware, adaptive interval, and playback-action triggered)
  useEffect(() => {
    if (!authenticated) return;

    let timeoutId: any;
    let isActive = true;

    const pollPlayerState = async () => {
      // Don't poll if the tab is hidden
      if (document.hidden) return;

      let nextState: any = null;
      try {
        nextState = await getPlayerState();
        if (isActive) {
          setPlaybackState(nextState);
        }
      } catch (err) {
        console.debug("Active player state polling error (Spotify might be idle):", err);
      } finally {
        if (isActive) {
          // Stop the polling loop when Spotify returns 204 No Content.
          // Resume via visibility change or playback-triggered events.
          // Schedule next poll. If Spotify is idle (nextState is null), poll every 20 seconds.
          // If active, poll every 4 seconds (playing) or 15 seconds (paused).
          const isPlaying = nextState?.is_playing === true;
          const delay = nextState === null ? 20000 : (isPlaying ? 4000 : 15000);
          timeoutId = setTimeout(pollPlayerState, delay);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimeout(timeoutId);
      } else {
        clearTimeout(timeoutId);
        pollPlayerState();
      }
    };

    const handlePlaybackTrigger = () => {
      // Schedule an immediate poll with a small delay (600ms) to allow Spotify API backend to catch up
      clearTimeout(timeoutId);
      timeoutId = setTimeout(pollPlayerState, 600);
    };

    // Initial poll on mount (only if document is visible)
    if (!document.hidden) {
      pollPlayerState();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("spotify-playback-trigger", handlePlaybackTrigger as EventListener);

    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("spotify-playback-trigger", handlePlaybackTrigger as EventListener);
    };
  }, [authenticated]);

  const handlePlayPlaylist = async (playlistId: string | number) => {
    try {
      const loaderToast = toast.loading("Loading playlist tracks to play...");
      let trackUris: string[] = [];

      if (playlistId === "liked" || playlistId === "all_my" || playlistId === "all_followed" || playlistId === "all_songs") {
        // Fetch or get from cache
        const cacheKey = String(playlistId) + (enableDeprecatedApis ? "-enriched" : "-basic");
        let tracks = playlistTrackCacheRef.current[cacheKey];

        if (!tracks || tracks.length === 0) {
          if (playlistId === "liked") {
            tracks = await getPlaylistTracks("liked");
          } else if (playlistId === "all_my") {
            const myPlaylists = playlists.filter(p => p.owner === "yours");
            tracks = await getMultiPlaylistTracks(["liked", ...myPlaylists.map(p => p.id)]);
          } else if (playlistId === "all_followed") {
            const followedPlaylists = playlists.filter(p => p.owner === "followed");
            tracks = await getMultiPlaylistTracks(followedPlaylists.map(p => p.id));
          } else {
            tracks = await getMultiPlaylistTracks(["liked", ...playlists.map(p => p.id)]);
          }
        }

        if (tracks && tracks.length > 0) {
          trackUris = tracks.map(t => buildTrackUri(t.id));
        }
      }

      toast.dismiss(loaderToast);

      if (trackUris.length > 0) {
        await playTrack({ uris: trackUris });
        setPlayingPlaylistId(playlistId);
        toast.success("Playing compilation playlist");
      } else if (playlistId !== "liked" && playlistId !== "all_my" && playlistId !== "all_followed" && playlistId !== "all_songs") {
        // Regular Spotify playlist
        await playTrack({ contextUri: `spotify:playlist:${playlistId}` });
        setPlayingPlaylistId(playlistId);
        toast.success("Playing playlist");
      } else {
        toast.error("No tracks found to play in this playlist");
      }
    } catch (err) {
      toast.dismiss();
      console.error("Failed to play playlist:", err);
      toast.error("Could not start playback. Is Spotify open on an active device?");
    }
  };

  // Auth Loading Gating Screen
  if (authChecking) {
    return (
      <div className="min-h-screen w-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-white font-medium select-none">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-t-transparent border-[#1DB954]" />
        <p className="text-sm text-[#B3B3B3] animate-pulse">Initializing Secure Connection...</p>
      </div>
    );
  }

  // Not Authenticated Gating Screen
  if (!authenticated) {
    return <Login />;
  }

  const currentPlaybackTrackId = getPlaybackTrackId(playbackState?.item);

  return (
    <div className="dark flex flex-col h-screen w-screen overflow-hidden bg-[#121212]">
      <div className="flex flex-1 min-h-0">
        <Sidebar
          page={page}
          setPage={setPage}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(c => !c)}
          playlists={playlists}
          likedSongsCount={likedSongsCount}
          selectedPlaylistId={selectedPlaylistId}
          setSelectedPlaylistId={setSelectedPlaylistId}
          currentUser={currentUser}
          playingPlaylistId={playingPlaylistId}
        />
        <main className="flex-1 min-w-0 relative overflow-hidden flex">
          {page === "dashboard" && (
            <Dashboard
              setPage={setPage}
              currentUser={currentUser}
              playlists={playlists}
              likedSongsCount={likedSongsCount}
              recentlyPlayed={recentlyPlayed}
              topArtists={topArtists}
              selectedPlaylistId={selectedPlaylistId}
              setSelectedPlaylistId={setSelectedPlaylistId}
              playbackState={playbackState}
              setPlaybackState={setPlaybackState}
              onPlayPlaylist={handlePlayPlaylist}
              setSearchQuery={setSearchQuery}
              enableDeprecatedApis={enableDeprecatedApis}
              onToggleDeprecatedApis={handleToggleDeprecatedApis}
            />
          )}
          {page === "workspace" && (
            <Workspace
              playlists={playlists}
              setPlaylists={setPlaylists}
              selectedPlaylistId={selectedPlaylistId}
              setSelectedPlaylistId={setSelectedPlaylistId}
              playlistTracks={playlistTracks}
              loadingTracks={loadingTracks}
              loadingTracksProgress={loadingTracksProgress}
              setPlaylistTracks={updatePlaylistTracks}
              likedSongsCount={likedSongsCount}
              setLikedSongsCount={setLikedSongsCount}
              onForceCompleteFetch={() => setWorkspaceForceFetchToken(v => v + 1)}
              currentPlaybackTrackId={currentPlaybackTrackId}
              enableDeprecatedApis={enableDeprecatedApis}
              setPlayingPlaylistId={setPlayingPlaylistId}
            />
          )}
          {page === "api" && <ApiReference enableDeprecatedApis={enableDeprecatedApis} />}
          {page === "search" && <SearchPage topArtists={topArtists} currentPlaybackTrackId={currentPlaybackTrackId} query={searchQuery} setQuery={setSearchQuery} />}
          {page === "libraries" && (
            <AllLibraries
              setPage={setPage}
              playlists={playlists}
              playlistTracks={playlistTracks}
              selectedPlaylistId={selectedPlaylistId}
              setSelectedPlaylistId={setSelectedPlaylistId}
              topArtists={topArtists}
              currentPlaybackTrackId={currentPlaybackTrackId}
              enableDeprecatedApis={enableDeprecatedApis}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden flex items-center justify-around bg-[#000000] border-t border-[#282828] h-16 shrink-0 z-30">
        <button onClick={() => setPage("dashboard")} className={`flex flex-col items-center gap-1 py-2 px-3 ${page === "dashboard" ? "text-white" : "text-[#B3B3B3]"}`}>
          <Home size={20} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>
        <button onClick={() => setPage("search")} className={`flex flex-col items-center gap-1 py-2 px-3 ${page === "search" ? "text-white" : "text-[#B3B3B3]"}`}>
          <Search size={20} />
          <span className="text-[10px] font-semibold">Search</span>
        </button>
        <button onClick={() => setPage("workspace")} className={`flex flex-col items-center gap-1 py-2 px-3 ${page === "workspace" ? "text-white" : "text-[#B3B3B3]"}`}>
          <Library size={20} />
          <span className="text-[10px] font-semibold">Library</span>
        </button>
        <button onClick={() => setPage("api")} className={`flex flex-col items-center gap-1 py-2 px-3 ${page === "api" ? "text-white" : "text-[#B3B3B3]"}`}>
          <Code2 size={20} />
          <span className="text-[10px] font-semibold">API</span>
        </button>
      </nav>

      <NowPlayingBar playbackState={playbackState} setPlaybackState={setPlaybackState} />
    </div>
  );
}