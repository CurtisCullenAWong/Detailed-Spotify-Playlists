import React, { useState, useRef, useEffect } from "react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  ListMusic,
  Columns3,
  ChevronsUpDown,
  ChevronsDownUp,
  Trash2,
  Plus,
  Volume2,
  Pencil,
  Search,
  GripVertical,
  Play,
  Heart,
  RadioTower,
  Music2,
  Zap,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { Playlist, Track, GroupByOption } from "../../../data";
import { ALL_COLUMNS, GROUP_BY_LABELS } from "../../../data";
import { loadPreferences, PreferenceUpdaters, savePreferences } from "../../../utils/userPreferences";
import { getPlaylistTrackCount, isUrlOrData, playTrackSequence } from "../../../utils/spotifyHelpers";
import { formatDate } from "../../../utils/formatters";
import {
  getPlaylistSnapshotId,
  reorderPlaylistTracks,
  addTracksToPlaylist,
  removeTracksFromPlaylist,
} from "../../../utils/spotifyApi";
import EditPlaylistModal from "../../components/EditPlaylistModal";
import { TextCarousel } from "../../components/ui/TextCarousel";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { sameTrackOrder, getTrackOrderKey, applyTrackOrder } from "../../../utils/helpers";

const LAZY_ROW_STEP = 100; // rows rendered per batch

type SortKey = keyof Track | null;
type GroupBy = GroupByOption;
type SortDir = "asc" | "desc";

interface WorkspaceProps {
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  currentUserId?: string;
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
}

export default function Workspace({
  playlists,
  setPlaylists,
  currentUserId,
  selectedPlaylistId,
  setSelectedPlaylistId,
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
}: WorkspaceProps) {
  const preferences = loadPreferences();

  const [search, setSearch] = useState(preferences.workspaceSearch);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTrackUris, setCreateModalTrackUris] = useState<string[]>([]);
  const [groupBy, setGroupBy] = useState<GroupBy>(preferences.workspaceGroupBy);
  const [sortKey, setSortKey] = useState<SortKey>(preferences.workspaceSortKey as SortKey);
  const [sortDir, setSortDir] = useState<SortDir>(preferences.workspaceSortDir);
  const [selected, setSelected] = useState<Set<string | number>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);
  const [sortingProgress, setSortingProgress] = useState<number | null>(null);
  const [groupByOpen, setGroupByOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [playlistFlyoutOpen, setPlaylistFlyoutOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [trackOrders, setTrackOrders] = useState<Record<string, string[]>>(preferences.workspaceTrackOrders);
  const [isSavingTrackOrder, setIsSavingTrackOrder] = useState(false);
  // Lazy rendering: number of rows currently rendered
  const [visibleRowCount, setVisibleRowCount] = useState(LAZY_ROW_STEP);
  const lazyTriggerRef = useRef<HTMLTableRowElement>(null);
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const trackDragItemRef = useRef<string | null>(null);
  const trackDragOverRef = useRef<string | null>(null);
  const groupDragItemRef = useRef<string | null>(null);
  const groupDragOverRef = useRef<string | null>(null);

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
  const canReorderGroups = canSortPlaylist && sortKey === null && groupBy !== "none";
  const currentTrackOrder = trackOrders[currentPlaylistKey] ?? [];
  const orderedPlaylistTracks = canSortPlaylist && sortKey === null && currentTrackOrder.length > 0
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
    let base = [...playlistTracks];
    if (sortKey) {
      base.sort((a, b) => {
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
    } else {
      base = [...orderedPlaylistTracks];
    }

    if (groupBy !== "none") {
      const map = new Map<string, Track[]>();
      for (const t of base) {
        const key = groupBy === "artist" ? (t.artist ? t.artist.split(",")[0].trim() : "Unknown Artist") : groupBy === "album" ? t.album : groupBy === "genre" ? t.genre : String(t.releaseYear);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(t);
      }
      const entries = Array.from(map.entries());
      if (sortKey !== null) {
        entries.sort((a, b) => {
          const labelA = a[0];
          const labelB = b[0];
          if (groupBy === "releaseYear") {
            const numA = parseInt(labelA, 10) || 0;
            const numB = parseInt(labelB, 10) || 0;
            return sortDir === "asc" ? numA - numB : numB - numA;
          }
          return sortDir === "asc"
            ? labelA.localeCompare(labelB, undefined, { sensitivity: "base", numeric: true })
            : labelB.localeCompare(labelA, undefined, { sensitivity: "base", numeric: true });
        });
      }
      return entries.flatMap(([_, tracks]) => tracks);
    }

    return base;
  }, [playlistTracks, orderedPlaylistTracks, sortKey, sortDir, groupBy, trackIndices]);

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
    const root = tableScrollRef.current || null;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleRowCount(prev => prev + LAZY_ROW_STEP);
        }
      },
      { root, rootMargin: "200px", threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [lazyTriggerRef.current, tableScrollRef.current]);

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

  useEffect(() => {
    if (!groupByOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-groupby-dropdown]")) setGroupByOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [groupByOpen]);

  useEffect(() => {
    if (!playlistFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-playlist-flyout]")) setPlaylistFlyoutOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [playlistFlyoutOpen]);

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

    // Trigger visual sorting loading bar animation
    setSortingProgress(0);
    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      if (current >= 100) {
        clearInterval(interval);

        // Apply the actual sort at the end of the animation
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

        setSortingProgress(null);
      } else {
        setSortingProgress(current);
      }
    }, 40); // 200ms total duration
  };

  const handleSavePlaylistOrder = async () => {
    if (!canSortPlaylist || !hasUnsavedTrackOrder || targetTrackOrder.length === 0) return;

    setIsSavingTrackOrder(true);
    setSortingProgress(0);
    try {
      const snapshotId = await getPlaylistSnapshotId(selectedPlaylistId);
      await reorderPlaylistTracks(
        selectedPlaylistId,
        initialTrackOrder,
        targetTrackOrder,
        snapshotId,
        (progress) => setSortingProgress(progress)
      );

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
      setSortingProgress(null);
    }
  };

  const toggleRow = (id: string | number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRowClick = (e: React.MouseEvent, id: string | number) => {
    // compute index in the currently visible sorted list
    const idx = playSequence.findIndex(t => String(t.id) === String(id));

    if (e.shiftKey && lastClickedIndexRef.current !== null && idx !== -1) {
      const start = Math.min(lastClickedIndexRef.current, idx);
      const end = Math.max(lastClickedIndexRef.current, idx);
      const idsInRange = playSequence.slice(start, end + 1).map(t => t.id);
      const isRangeFullySelected = idsInRange.every(trackId => selected.has(trackId));
      setSelected(prev => {
        const next = new Set(prev);
        idsInRange.forEach(trackId => {
          if (isRangeFullySelected) next.delete(trackId);
          else next.add(trackId);
        });
        return next;
      });
    } else if (e.ctrlKey || e.metaKey) {
      // ctrl/cmd click -> toggle single
      toggleRow(id);
    } else {
      // simple click -> toggle single (preserve existing behavior)
      toggleRow(id);
    }

    lastClickedIndexRef.current = idx !== -1 ? idx : lastClickedIndexRef.current;
  };

  const toggleAll = () => {
    if (selected.size === playSequence.length) setSelected(new Set());
    else setSelected(new Set(playSequence.map(t => t.id)));
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
      const key = groupBy === "artist" ? (t.artist ? t.artist.split(",")[0].trim() : "Unknown Artist") : groupBy === "album" ? t.album : groupBy === "genre" ? t.genre : String(t.releaseYear);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const entries = Array.from(map.entries()).map(([label, tracks]) => ({ label, tracks }));

    if (sortKey !== null) {
      // Sort the groups themselves alphabetically or numerically based on sortDir
      entries.sort((a, b) => {
        const labelA = a.label;
        const labelB = b.label;
        if (groupBy === "releaseYear") {
          const numA = parseInt(labelA, 10) || 0;
          const numB = parseInt(labelB, 10) || 0;
          return sortDir === "asc" ? numA - numB : numB - numA;
        }
        return sortDir === "asc"
          ? labelA.localeCompare(labelB, undefined, { sensitivity: "base", numeric: true })
          : labelB.localeCompare(labelA, undefined, { sensitivity: "base", numeric: true });
      });
    }

    return entries;
  })();

  const playSequence = React.useMemo(() => {
    if (groupBy === "none") return sorted;
    return groupedEntries.flatMap(g => g.tracks);
  }, [sorted, groupedEntries, groupBy]);

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

  const handleCreatePlaylist = () => {
    const selectedIds = Array.from(selected);
    setCreateModalTrackUris(selectedIds.map(id => `spotify:track:${id}`));
    setPlaylistFlyoutOpen(false);
    setIsCreateModalOpen(true);
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

  const handleGroupDragStart = (label: string) => {
    if (!canReorderGroups) return;
    groupDragItemRef.current = label;
  };

  const handleGroupDragEnter = (label: string) => {
    if (!canReorderGroups) return;
    groupDragOverRef.current = label;
  };

  const handleGroupDragEnd = () => {
    const draggedLabel = groupDragItemRef.current;
    const targetLabel = groupDragOverRef.current;

    if (!draggedLabel || !targetLabel || draggedLabel === targetLabel) {
      groupDragItemRef.current = null;
      groupDragOverRef.current = null;
      return;
    }

    const draggedGroup = groupedEntries.find(g => g.label === draggedLabel);
    const targetGroup = groupedEntries.find(g => g.label === targetLabel);

    if (!draggedGroup || !targetGroup) {
      groupDragItemRef.current = null;
      groupDragOverRef.current = null;
      return;
    }

    const currentOrder = orderedPlaylistTracks.map(getTrackOrderKey);
    const draggedTrackKeys = draggedGroup.tracks.map(getTrackOrderKey);
    const targetTrackKeys = targetGroup.tracks.map(getTrackOrderKey);

    const targetFirstTrackKey = targetTrackKeys[0];
    const targetIndex = currentOrder.indexOf(targetFirstTrackKey);

    if (targetIndex !== -1) {
      const filteredOrder = currentOrder.filter(k => !draggedTrackKeys.includes(k));
      const newTargetIndex = filteredOrder.indexOf(targetFirstTrackKey);
      filteredOrder.splice(newTargetIndex, 0, ...draggedTrackKeys);

      setTrackOrders(prev => ({
        ...prev,
        [currentPlaylistKey]: filteredOrder,
      }));
    }

    groupDragItemRef.current = null;
    groupDragOverRef.current = null;
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

      {/* Responsive Toolbar */}
      <div className="flex flex-col gap-3 px-4 md:px-8 py-3 border-b border-[#282828] bg-[#121212] shrink-0 overflow-visible lg:flex-row lg:items-center lg:justify-between">
        {/* Left Side: Playback & Playlist Management */}
        <div className="flex items-center gap-2 md:gap-3 flex-wrap shrink-0">
          <button
            onClick={() => {
              if (playlistTracks.length > 0) {
                playTrackSequence(playSequence, 0)
                  .catch(() => toast.error("Could not play playlist. Is Spotify open on an active device?"));
                if (setPlayingPlaylistId) setPlayingPlaylistId(selectedPlaylistId);
              }
            }}
            className="w-10 h-10 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-105 active:scale-95 rounded-full flex items-center justify-center transition-all duration-200 shadow-md shadow-[#1DB954]/25 hover:shadow-[#1DB954]/40 cursor-pointer shrink-0 mr-1"
          >
            <Play size={18} className="text-black fill-black ml-0.5" />
          </button>

          {(isYours || isEditable) && (
            <div className="flex items-center bg-[#282828] border border-[#3e3e3e]/80 rounded-full p-0.5 shadow-md">
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
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${isSavingTrackOrder
                      ? "bg-[#1DB954] text-black cursor-wait"
                      : hasUnsavedTrackOrder
                        ? "text-[#1DB954] hover:bg-[#1DB954]/10 cursor-pointer font-bold"
                        : "text-[#535353] cursor-not-allowed"
                    }`}
                >
                  <RefreshCw size={12} className={isSavingTrackOrder ? "animate-spin text-black" : ""} />
                  <span>{isSavingTrackOrder ? `Saving ${sortingProgress !== null ? `(${Math.round(sortingProgress)}%)` : "..."}` : "Save Sort"}</span>
                </button>
              )}

              {isYours && isEditable && <div className="w-px h-3.5 bg-[#3e3e3e]/80 mx-1" />}

              {isEditable && (
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  title="Edit playlist details"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-all whitespace-nowrap cursor-pointer"
                >
                  <Pencil size={12} />
                  <span>Edit Details</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Filters, Search, View, Selection Options */}
        <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:justify-end flex-1 min-w-0 w-full">
          <div className="w-full md:w-auto md:flex-1 md:max-w-xs relative min-w-[140px]">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#B3B3B3]" />
            <input
              type="text"
              placeholder="Search tracks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              id="workspace-search-input"
              name="workspaceSearch"
              className="w-full pl-9 pr-4 py-2 bg-[#282828] rounded-full text-[12px] md:text-[13px] text-white placeholder-[#B3B3B3] border border-[#3e3e3e]/80 focus:border-[#1DB954]/50 focus:bg-[#333333] outline-none transition-all"
            />
          </div>

          <div className="flex items-center bg-[#282828] border border-[#3e3e3e]/80 rounded-full p-0.5 shadow-md">
            <div className="relative" data-groupby-dropdown>
              <button
                onClick={() => setGroupByOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap cursor-pointer ${groupByOpen
                    ? "bg-[#333333] text-white"
                    : groupBy !== "none"
                      ? "text-[#1DB954] hover:bg-[#1DB954]/10 font-bold"
                      : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
                  }`}
              >
                <ListMusic size={12} className={groupBy !== "none" ? "text-[#1DB954]" : ""} />
                <span>Group By: <span className={groupBy !== "none" ? "text-[#1DB954] font-bold" : "text-white font-semibold"}>{GROUP_BY_LABELS[groupBy as GroupByOption]}</span></span>
                <ChevronDown size={10} className={`transition-transform duration-200 ${groupByOpen ? "rotate-180" : ""}`} />
              </button>
              {groupByOpen && (
                <div className="absolute top-full right-0 mt-1 w-44 bg-[#282828] rounded-lg shadow-2xl border border-[#383838] z-50 py-1 overflow-hidden">
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

            <div className="w-px h-3.5 bg-[#3e3e3e]/80 mx-1" />

            <div className="relative" data-cols-dropdown>
              <button
                onClick={() => setColumnsOpen(o => !o)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all whitespace-nowrap cursor-pointer ${columnsOpen
                    ? "bg-white text-black"
                    : "text-[#B3B3B3] hover:text-white hover:bg-white/5"
                  }`}
              >
                <Columns3 size={12} />
                <span>Columns</span>
                <ChevronDown size={10} className={`transition-transform duration-200 ${columnsOpen ? "rotate-180" : ""}`} />
              </button>
              {columnsOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 py-1 overflow-hidden flex flex-col">
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

            {groupBy !== "none" && (
              <>
                <div className="w-px h-3.5 bg-[#3e3e3e]/80 mx-1 animate-in fade-in duration-200" />
                <button
                  onClick={() => {
                    const allCollapsed = collapsedGroups.size === groupedEntries.length;
                    if (allCollapsed) {
                      setCollapsedGroups(new Set());
                    } else {
                      setCollapsedGroups(new Set(groupedEntries.map(g => g.label)));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all text-[#B3B3B3] hover:text-white hover:bg-white/5 whitespace-nowrap cursor-pointer animate-in fade-in duration-200"
                  title={collapsedGroups.size === groupedEntries.length ? "Expand all sections" : "Collapse all sections"}
                >
                  {collapsedGroups.size === groupedEntries.length ? (
                    <>
                      <ChevronsUpDown size={12} />
                      <span>Expand All</span>
                    </>
                  ) : (
                    <>
                      <ChevronsDownUp size={12} />
                      <span>Collapse All</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          {selected.size > 0 && (
            <div className="flex items-center bg-[#181818] border border-[#3e3e3e]/80 rounded-full p-0.5 shadow-md animate-in fade-in slide-in-from-right-4 duration-200">
              <span className="text-[11px] text-[#B3B3B3] font-bold px-3 border-r border-[#3e3e3e]/80 select-none">
                {selected.size} selected
              </span>

              <div className="flex items-center gap-0.5 px-0.5">
                {isYours && (
                  <button
                    onClick={handleDelete}
                    title="Remove selected tracks from playlist"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#e91429]/10 text-[#e91429] hover:text-red-400 text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Trash2 size={12} />
                    <span>Remove</span>
                  </button>
                )}

                {isYours && <div className="w-px h-3.5 bg-[#3e3e3e]/80 mx-0.5" />}

                <div className="relative" data-playlist-flyout>
                  <button
                    onClick={() => setPlaylistFlyoutOpen(o => !o)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-white/5 text-white text-[12px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Plus size={12} />
                    <span>Add to Playlist</span>
                    <ChevronDown size={10} className={`transition-transform duration-200 ${playlistFlyoutOpen ? "rotate-180" : ""}`} />
                  </button>
                  {playlistFlyoutOpen && (
                    <div className="absolute top-full right-0 mt-1 w-64 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#383838]">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-[#B3B3B3]">Add {selected.size} track{selected.size > 1 ? "s" : ""} to…</p>
                      </div>
                      <div className="max-h-52 overflow-y-auto py-1">
                        <button
                          type="button"
                          onClick={handleCreatePlaylist}
                          className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#383838] transition-colors text-left cursor-pointer border-b border-[#383838]"
                        >
                          <div className="w-8 h-8 rounded shrink-0 bg-[#1DB954] flex items-center justify-center text-black font-bold">
                            <Plus size={16} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-[13px] font-medium truncate">Create New Playlist</p>
                            <p className="text-[#B3B3B3] text-[11px]">Start a new playlist with these tracks</p>
                          </div>
                        </button>
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
          )}
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

        {/* Sleek top loading progress bar when sorting tracks */}
        {!loadingTracks && sortingProgress !== null && (
          <div className="absolute top-0 left-0 right-0 z-20 h-[2px] bg-transparent">
            <div className="h-full bg-gradient-to-r from-[#1DB954] via-[#29d97f] to-[#7CFFB2] transition-all duration-200 ease-out" style={{ width: `${sortingProgress}%` }} />
          </div>
        )}

        <div ref={tableScrollRef} className={`h-full overflow-auto ${(loadingTracks && playlistTracks.length === 0) ? "opacity-0 pointer-events-none" : ""}`}>
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
                        <tr
                          draggable={canReorderGroups}
                          onDragStart={() => handleGroupDragStart(label)}
                          onDragEnter={() => handleGroupDragEnter(label)}
                          onDragEnd={handleGroupDragEnd}
                          onDragOver={(e) => e.preventDefault()}
                          className={`bg-[#181818]/60 cursor-pointer hover:bg-[#1e1e1e] select-none transition-colors border-b border-[#282828]/20 ${canReorderGroups ? "hover:border-[#1DB954]/20" : ""
                            }`}
                          onClick={() => toggleGroup(label)}
                        >
                          <td colSpan={totalColSpan} className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {canReorderGroups && (
                                <div
                                  className="p-1 hover:bg-[#282828] rounded cursor-grab active:cursor-grabbing text-[#535353] hover:text-white transition-colors mr-0.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <GripVertical size={13} />
                                </div>
                              )}
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
                        const groupStartIdx = renderedCount;
                        renderedCount += visibleTracks.length;
                        return visibleTracks.map((track, i) => {
                          const globalIdx = groupStartIdx + i;
                          const isSelected = selected.has(track.id);
                          const trackKey = getTrackOrderKey(track);
                          const trackImage = track.cover;
                          const isPlayingTrack = currentPlaybackTrackId === String(track.id);
                          return (
                            <tr
                              key={trackKey}
                              draggable={canReorderTracks}
                              onMouseDown={(e) => {
                                if (e.shiftKey) e.preventDefault();
                              }}
                              onDragStart={() => handleTrackDragStart(trackKey)}
                              onDragEnter={() => handleTrackDragEnter(trackKey)}
                              onDragEnd={handleTrackDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              className={`group border-b border-[#282828]/40 hover:bg-[#282828]/60 transition-colors cursor-pointer select-none ${isPlayingTrack ? "bg-[#1DB954]/10 hover:bg-[#1DB954]/15" : isSelected ? "bg-[#1DB954]/10 hover:bg-[#1DB954]/15" : globalIdx % 2 === 0 ? "" : "bg-[#181818]/40"
                                }`}
                              onClick={(e) => handleRowClick(e, track.id)}
                            >
                              <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleRowClick(e, track.id); }}
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
                                    globalIdx + 1
                                  )}
                                </span>
                                <Play
                                  size={12}
                                  className="text-white fill-white hidden group-hover:block cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playTrackSequence(playSequence, playSequence.findIndex(sortedTrack => String(sortedTrack.id) === String(track.id))).catch(() =>
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
                                        {track.bpm !== undefined ? track.bpm : <span className="text-[#535353]">-</span>}
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
                                    if (track.energy === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
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
                                    if (track.danceability === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.danceability * 100);
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
                                    if (track.valence === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.valence * 100);
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
                                    if (track.acousticness === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.acousticness * 100);
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
                                    if (track.instrumentalness === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.instrumentalness * 100);
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
                                    if (track.speechiness === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.speechiness * 100);
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
                                    if (track.liveness === undefined) {
                                      return (
                                        <td key={colId} className="px-3 py-2.5 text-[#535353] text-[12px] font-mono">
                                          -
                                        </td>
                                      );
                                    }
                                    const pct = Math.round(track.liveness * 100);
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
                                    return (
                                      <td key={colId} className="px-3 py-2.5 text-[#B3B3B3] text-[12px] font-mono">
                                        {track.loudness !== undefined ? `${track.loudness.toFixed(1)} dB` : <span className="text-[#535353]">-</span>}
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
          mode="edit"
          playlist={activePlaylist}
          setPlaylists={setPlaylists}
        />
      )}

      <EditPlaylistModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        mode="create"
        setPlaylists={setPlaylists}
        currentUserId={currentUserId}
        trackUrisToAdd={createModalTrackUris}
      />
    </div>
  );
}
