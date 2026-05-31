import React, { useState, useRef, useEffect } from "react";
import {
  ListMusic,
  Music2,
  Plus,
  Search,
  ArrowUpDown,
  Grid3x3,
  Grid2x2,
  Rows3,
  ChevronDown,
  Check,
  RadioTower,
  Heart,
  Volume2,
  GripVertical,
  Play,
  Library,
} from "lucide-react";
import { toast } from "sonner";
import type { Playlist } from "../../data";
import { loadPreferences, PreferenceUpdaters } from "../../utils/userPreferences";
import { isUrlOrData, getPlaylistTrackCount } from "../../utils/spotifyHelpers";

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

const PLAYLIST_OWNER_GROUP_ORDER = ["My Playlists", "Followed Playlists"] as const;

interface LibraryPlaylistsProps {
  onOpen: () => void;
  selectedView: "yours" | "all" | "followed";
  playlists: Playlist[];
  likedSongsCount: number;
  selectedPlaylistId: string | number;
  setSelectedPlaylistId: (id: string | number) => void;
  playingPlaylistId: string | number | null;
  enableDeprecatedApis: boolean;
  loadingProfile?: boolean;
}

export default function LibraryPlaylists({
  onOpen,
  selectedView,
  playlists,
  likedSongsCount,
  selectedPlaylistId,
  setSelectedPlaylistId,
  playingPlaylistId,
  enableDeprecatedApis,
  loadingProfile,
}: LibraryPlaylistsProps) {
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
  const [sortingProgress, setSortingProgress] = useState<number | null>(null);
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

  // Filter based on selected view (include followed playlists regardless of feature flag)
  const visiblePlaylists = playlists;
  const filtered = selectedView === "all"
    ? visiblePlaylists
    : visiblePlaylists.filter(pl => pl.owner === selectedView);

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
    ).map(([label, items]) => ({ label, items }))
      .sort((left, right) => {
        if (groupKey !== "owner") return 0;
        const leftIndex = PLAYLIST_OWNER_GROUP_ORDER.indexOf(left.label as (typeof PLAYLIST_OWNER_GROUP_ORDER)[number]);
        const rightIndex = PLAYLIST_OWNER_GROUP_ORDER.indexOf(right.label as (typeof PLAYLIST_OWNER_GROUP_ORDER)[number]);
        return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
      });

  const toggleSort = (key: PlSortKey) => {
    // Trigger visual sorting loading bar animation
    setSortingProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 100) {
        clearInterval(interval);

        // Apply the actual sort at the end of the animation
        if (key === "none") {
          setSortKey("none");
        } else if (sortKey === key) {
          setSortDir(prev => prev === "asc" ? "desc" : "asc");
        } else {
          setSortKey(key);
          setSortDir("asc");
        }

        setSortingProgress(null);
      } else {
        setSortingProgress(current);
      }
    }, 40); // 200ms total duration
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

  const isDraggable = sortKey === "none";

  if (loadingProfile && playlists.length === 0) {
    // Simple skeleton while profile/playlists load
    return (
      <div className="flex flex-col flex-1 min-h-0 px-2 pt-2 pb-2">
        <div className="flex gap-2 px-2 pb-2">
          <div className="h-8 w-1/2 bg-[#1f1f1f] rounded animate-pulse" />
          <div className="h-8 w-1/3 bg-[#1f1f1f] rounded animate-pulse" />
        </div>
        <div className="space-y-2 mt-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-1">
              <div className="w-8 h-8 rounded bg-[#1f1f1f] animate-pulse" />
              <div className="h-4 bg-[#1f1f1f] rounded w-3/4 animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

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

      {/* Sleek top loading progress bar when sorting playlists */}
      {sortingProgress !== null && (
        <div className="mx-2 mb-2 h-[2px] bg-transparent rounded-full overflow-hidden relative">
          <div className="h-full bg-gradient-to-r from-[#1DB954] via-[#29d97f] to-[#7CFFB2] transition-all duration-200 ease-out" style={{ width: `${sortingProgress}%` }} />
        </div>
      )}

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
            {enableDeprecatedApis && (() => {
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
            {enableDeprecatedApis && (() => {
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
            {enableDeprecatedApis && (() => {
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
