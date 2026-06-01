import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Check,
  LogOut,
  Music2,
  Play,
  TrendingUp,
  Search,
  Mic2,
  ListMusic,
  RadioTower,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import type { Playlist, Artist } from "../../../data";
import { loadPreferences, PreferenceUpdaters } from "../../../utils/userPreferences";
import { logout } from "../../../utils/spotifyAuth";
import { getPlayerState, pauseTrack, playTrack } from "../../../utils/spotifyApi";
import { isUrlOrData } from "../../../utils/spotifyHelpers";

type Page = "dashboard" | "workspace" | "api" | "search" | "libraries";

const getInitials = (name: string) => {
  if (!name) return "SP";
  const parts = name.split(" ");
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

interface DashboardProps {
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
  loadingProfile?: boolean;
  libraryView: "all" | "yours" | "followed";
  setLibraryView: (view: "all" | "yours" | "followed") => void;
}

export default function Dashboard({
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
  loadingProfile,
  libraryView,
  setLibraryView,
}: DashboardProps) {
  const [hoveredPlaylist, setHoveredPlaylist] = useState<string | number | null>(null);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);
  const headerDropdownRef = useRef<HTMLDivElement>(null);

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
      onClick: () => {
        setSelectedPlaylistId("all_songs");
        setPage("workspace");
      }
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
          {loadingProfile ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={`ind-skel-${i}`} className="bg-[#181818] rounded-lg p-3 md:p-4 border border-white/5 text-left w-full">
                <div className="h-3 w-1/2 bg-[#1f1f1f] rounded animate-pulse" />
                <div className="h-8 mt-3 w-3/4 bg-[#1f1f1f] rounded animate-pulse" />
                <div className="h-3 mt-2 w-3/4 bg-[#1f1f1f] rounded animate-pulse" />
              </div>
            ))
          ) : (
            indicators.map((s) => {
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
            })
          )}
        </div>

        {/* Recently Played */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white text-[16px] md:text-[18px] font-bold">Recently Played</h2>
          </div>
          {loadingProfile ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-2 md:gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={`rp-skel-${i}`} className="flex items-center gap-3 bg-[#181818] rounded-md overflow-hidden pr-3 p-3">
                  <div className="w-14 h-14 shrink-0 bg-[#282828] rounded animate-pulse" />
                  <div className="min-w-0 flex-1">
                    <div className="h-4 bg-[#1f1f1f] rounded w-3/4 animate-pulse mb-2" />
                    <div className="h-3 bg-[#1f1f1f] rounded w-1/2 animate-pulse" />
                  </div>
                  <div className="w-7 h-7 bg-[#1f1f1f] rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : recentlyPlayed.length === 0 ? (
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
          {loadingProfile ? (
            <div className="flex gap-3 md:gap-4 overflow-x-auto pb-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={`ta-skel-${i}`} className="flex flex-col items-center gap-3 shrink-0">
                  <div className="w-24 h-24 rounded-full bg-[#282828] animate-pulse" />
                  <div className="h-4 w-20 bg-[#1f1f1f] rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : topArtists.length === 0 ? (
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
                    {enableDeprecatedApis && (
                      <>
                        <p className="text-[#B3B3B3] text-[11px] truncate max-w-[100px]">{artist.genre}</p>
                        <p className="text-[#1DB954] text-[11px] font-mono">{artist.plays} plays</p>
                      </>
                    )}
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
                      onClick={() => { setLibraryView(key as typeof libraryView); setHeaderDropdownOpen(false); }}
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
            {enableDeprecatedApis && (
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
            )}
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
