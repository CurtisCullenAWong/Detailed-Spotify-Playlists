import React, { useState, useRef, useEffect, useCallback } from "react";
import { Home, Search, Library, Code2 } from "lucide-react";
import { toast } from "sonner";
import { loadPreferences, PreferenceUpdaters } from "../utils/userPreferences";
import { isAuthenticatedSync, logout, handleRedirectCallback, getAccessToken } from "../utils/spotifyAuth";
import {
  getCurrentUser,
  getUserPlaylists,
  getPlaylistTracks,
  getMultiPlaylistTracks,
  getLikedSongsCount,
  getRecentlyPlayed,
  getTopArtists,
  getPlayerState,
  playTrack,
  setDeprecatedApisEnabled,
} from "../utils/spotifyApi";

import Login from "./components/Login";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard/Dashboard";
import Workspace from "./pages/Workspace/Workspace";
import ApiReference from "./pages/ApiReference/ApiReference";
import SearchPage from "./pages/Search/SearchPage";
import NowPlayingBar from "./components/NowPlayingBar";
import { getPlaybackTrackId, buildTrackUri, getPlaylistTrackCount } from "../utils/spotifyHelpers";
import { readWorkspaceTrackCache, writeWorkspaceTrackCache } from "../utils/cache";
import type { WorkspaceTrackCache } from "../utils/cache";
import type { Track, Playlist, Artist } from "../data";

type Page = "dashboard" | "workspace" | "api" | "search" | "libraries";

export default function App() {
  const preferences = loadPreferences();
  const [page, setPage] = useState<Page>(preferences.currentPage);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(preferences.sidebarCollapsed);
  const [libraryView, setLibraryView] = useState<"all" | "yours" | "followed">(() => {
    const saved = localStorage.getItem("spotify-manager-preferences");
    if (!saved) return "all";
    try {
      const parsed = JSON.parse(saved);
      if (parsed.libraryView === "yours") {
        parsed.libraryView = "all";
        localStorage.setItem("spotify-manager-preferences", JSON.stringify(parsed));
        return "all";
      }
      return parsed.libraryView || "all";
    } catch (e) {
      return "all";
    }
  });

  useEffect(() => {
    PreferenceUpdaters.setLibraryView(libraryView);
  }, [libraryView]);

  // Spotify integration state
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongsCount, setLikedSongsCount] = useState<number>(0);
  const [recentlyPlayed, setRecentlyPlayed] = useState<any[]>([]);
  const [topArtists, setTopArtists] = useState<Artist[]>([]);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | number>(preferences.selectedPlaylistId || "liked");
  const [playingPlaylistId, setPlayingPlaylistId] = useState<string | number | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [loadingTracks, setLoadingTracks] = useState<boolean>(false);
  const [loadingTracksProgress, setLoadingTracksProgress] = useState<number>(0);
  const [workspaceForceFetchToken, setWorkspaceForceFetchToken] = useState(0);
  const [playbackState, setPlaybackState] = useState<any>(null);
  const playbackStateRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const goToAllSongs = useCallback(() => {
    setSelectedPlaylistId("all_songs");
    setPage("workspace");
    setWorkspaceForceFetchToken((t) => t + 1);
  }, []);

  useEffect(() => {
    try {
      (window as any).goToAllSongs = goToAllSongs;
    } catch (err) {
      // ignore in non-browser environments
    }
    return () => {
      try {
        delete (window as any).goToAllSongs;
      } catch (err) {
        // ignore
      }
    };
  }, [goToAllSongs]);

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
    const next = !enableDeprecatedApis;
    try {
      if (next) {
        const fallback = import.meta.env.client_id_fallback || "";
        if (fallback) localStorage.setItem("spotify_client_id", fallback);
      } else {
        localStorage.removeItem("spotify_client_id");
      }
    } catch (err) {
      // ignore storage errors
    }

    // Persist preference immediately and reload to ensure auth module picks up new client id
    PreferenceUpdaters.setEnableDeprecatedApis(next);
    setEnableDeprecatedApis(next);
    // small timeout to allow state to flush in case any sync writes happen
    setTimeout(() => window.location.reload(), 50);
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
          // Fast path: token is present and not yet expired
          if (isAuthenticatedSync()) {
            setAuthenticated(true);
          } else {
            // Slow path: token may be expired — attempt silent refresh before forcing re-login.
            // This handles the common "refresh page after 1 hour" case where the access token
            // has expired but a valid refresh token still exists in localStorage.
            const newToken = await getAccessToken();
            setAuthenticated(!!newToken);
          }
        }
      } catch (err) {
        console.error("Auth initialization failed:", err);
        setAuthenticated(false);
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
      setLoadingProfile(true);
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
      } finally {
        setLoadingProfile(false);
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

      const isCompiledVirtualPlaylist = selectedPlaylistId === "all_my" || selectedPlaylistId === "all_followed" || selectedPlaylistId === "all_songs";

      const syncTrackCount = (count: number) => {
        if (selectedPlaylistId !== "liked" && !isCompiledVirtualPlaylist) {
          setPlaylists(prev =>
            prev.map(p => {
              if (String(p.id) === String(selectedPlaylistId)) {
                if (getPlaylistTrackCount(p) !== count) {
                  return { ...p, tracks: count };
                }
              }
              return p;
            })
          );
        } else if (selectedPlaylistId === "liked") {
          if (likedSongsCount !== count) {
            setLikedSongsCount(count);
          }
        }
      };

      if (cachedTracks?.length && !forceRefreshRequested && cachedTracks[0].releaseDate !== undefined) {
        if (workspaceLoadSessionRef.current === loadSession) {
          setLoadingTracks(false);
        }
        updatePlaylistTracks(cachedTracks, cacheKey);
        syncTrackCount(cachedTracks.length);
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
        syncTrackCount(tracks.length);
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
          enableDeprecatedApis={enableDeprecatedApis}
          loadingProfile={loadingProfile}
          libraryView={libraryView}
          setLibraryView={setLibraryView}
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
              loadingProfile={loadingProfile}
              libraryView={libraryView}
              setLibraryView={setLibraryView}
            />
          )}
          {page === "workspace" && (
            <Workspace
              playlists={playlists}
              setPlaylists={setPlaylists}
              currentUserId={currentUser?.id}
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