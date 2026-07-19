import React, { useState, useEffect, useRef } from "react";
import {
  Home,
  Search,
  ListMusic,
  Heart,
  Music2,
  ChevronRight,
  Code2,
  RadioTower,
  X,
} from "lucide-react";
import type { Playlist } from "../../data";
import { loadPreferences, PreferenceUpdaters } from "../../utils/userPreferences";
import { isUrlOrData } from "../../utils/spotifyHelpers";
import LibraryPlaylists from "./LibraryPlaylists";

type Page = "dashboard" | "workspace" | "api" | "search" | "libraries" | "song" | "artist" | "album";

interface SidebarProps {
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
  enableDeprecatedApis: boolean;
  loadingProfile?: boolean;
  libraryView: "all" | "yours" | "followed";
  setLibraryView: (view: "all" | "yours" | "followed") => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  page,
  setPage,
  collapsed,
  onToggleCollapse,
  playlists,
  likedSongsCount,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playingPlaylistId,
  enableDeprecatedApis,
  loadingProfile,
  libraryView,
  setLibraryView,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const [, setLibraryDropdownOpen] = useState(false);
  const libraryDropdownRef = useRef<HTMLDivElement>(null);

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

  // Filter playlists based on selected view (include followed playlists regardless of feature flag)
  const visiblePlaylists = playlists;
  const filteredPlaylists =
    libraryView === "all"
      ? visiblePlaylists
      : visiblePlaylists.filter(pl => pl.owner === libraryView);

  if (collapsed && !mobileOpen) {
    return (
      <aside className="hidden md:flex flex-col h-full w-[60px] shrink-0 bg-[#121212] border-r border-[#282828] select-none items-center py-4 gap-2 overflow-hidden" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        <button onClick={onToggleCollapse} aria-label="Toggle sidebar" className="w-9 h-9 flex items-center justify-center mb-2 shrink-0 hover:scale-105 transition-all overflow-hidden">
          <img src="./favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
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
          {loadingProfile && filteredPlaylists.length === 0 ? (
            // show small skeleton placeholders while loading
            Array.from({ length: 8 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="w-9 h-9 rounded-md bg-[#1f1f1f] animate-pulse" />
            ))
          ) : (
            filteredPlaylists.map((pl) => (
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
            )))}
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
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden cursor-pointer"
          onClick={onCloseMobile}
        />
      )}
      <aside
        className={`
          flex flex-col h-full shrink-0 bg-[#121212] border-r border-[#282828] select-none overflow-hidden transition-all duration-300
          ${mobileOpen
            ? "fixed inset-y-0 left-0 w-[260px] z-50 translate-x-0"
            : "hidden md:flex md:w-[260px] -translate-x-full md:translate-x-0"
          }
        `}
        style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
      >
        {/* Brand */}
        <div className="px-4 pt-4 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <img src="./favicon.png" alt="Logo" className="w-6 h-6 object-contain" />
            </div>
            <span className="text-white font-bold text-[15px] tracking-tight">Spotify Manager</span>
            
            {/* Close button on mobile, Collapse button on desktop */}
            <button
              onClick={mobileOpen ? onCloseMobile : onToggleCollapse}
              className="ml-auto text-[#B3B3B3] hover:text-white transition-colors p-1 rounded hover:bg-[#282828]"
              aria-label={mobileOpen ? "Close sidebar" : "Collapse sidebar"}
            >
              {mobileOpen ? <X size={16} /> : <ChevronRight size={14} />}
            </button>
          </div>
        </div>

        {/* Primary Nav */}
        <nav className="px-3 space-y-0.5">
          {NAV.map(({ icon: Icon, label, id }) => (
            <button key={label} onClick={() => { setPage(id); onCloseMobile?.(); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-[14px] font-medium transition-colors ${id === page ? "text-white bg-[#1a1a1a]" : "text-[#B3B3B3] hover:text-white"}`}>
              <Icon size={20} className={id === page ? "text-white" : "text-[#B3B3B3]"} />
              {label}
            </button>
          ))}
        </nav>

        {/* Library Panel */}
        <div className="mt-2 pt-2 border-t border-[#282828] flex-1 overflow-hidden flex flex-col min-h-0">
          <LibraryPlaylists
            onOpen={() => {
              setPage("workspace");
              onCloseMobile?.();
            }}
            selectedView={libraryView}
            setSelectedView={setLibraryView}
            playlists={playlists}
            likedSongsCount={likedSongsCount}
            selectedPlaylistId={selectedPlaylistId}
            setSelectedPlaylistId={setSelectedPlaylistId}
            playingPlaylistId={playingPlaylistId}
            enableDeprecatedApis={enableDeprecatedApis}
            loadingProfile={loadingProfile}
          />

          {/* API Reference link */}
          <div className="px-4 pb-3 pt-2 border-t border-[#282828] mt-auto">
            <button onClick={() => { setPage("api"); onCloseMobile?.(); }}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded text-[12px] font-medium transition-colors ${page === "api" ? "text-white bg-[#282828]" : "text-[#B3B3B3] hover:text-white hover:bg-[#282828]"}`}>
              <Code2 size={14} />
              API Reference
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
