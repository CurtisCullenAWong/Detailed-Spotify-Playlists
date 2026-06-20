import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Play, Calendar, Disc, Music, AlertCircle, Check, ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { getAlbum, playTrack, addTracksToPlaylist } from "../../../utils/spotifyApi";
import { formatDuration } from "../../../utils/formatters";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";
import { getPlaylistTrackCount } from "../../../utils/spotifyHelpers";
import type { Playlist } from "../../../data";
import EditPlaylistModal from "../../components/EditPlaylistModal";

interface AlbumViewProps {
  albumId: string;
  onBack: () => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToTrack: (trackId: string) => void;
  currentPlaybackTrackId: string | null;
  playlists: Playlist[];
  setPlaylists: React.Dispatch<React.SetStateAction<Playlist[]>>;
  currentUserId?: string;
}

export default function AlbumView({
  albumId,
  onBack,
  onNavigateToArtist,
  onNavigateToTrack,
  currentPlaybackTrackId,
  playlists = [],
  setPlaylists,
  currentUserId,
}: AlbumViewProps) {
  const [album, setAlbum] = useState<any>(null);
  const [tracks, setTracks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Multi-select & Playlist flyout states
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const lastClickedIndexRef = useRef<number | null>(null);
  const [playlistFlyoutOpen, setPlaylistFlyoutOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalTrackUris, setCreateModalTrackUris] = useState<string[]>([]);

  useEffect(() => {
    const fetchAlbumData = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getAlbum(albumId);
        setAlbum(data);
        setTracks(data?.tracks?.items || []);
      } catch (err: any) {
        console.error("Error loading album data:", err);
        setError("Failed to load album details.");
      } finally {
        setLoading(false);
      }
    };

    fetchAlbumData();
  }, [albumId]);

  useEffect(() => {
    if (!playlistFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-playlist-flyout]")) setPlaylistFlyoutOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [playlistFlyoutOpen]);

  const handleRowClick = (e: React.MouseEvent, trackId: string, idx: number) => {
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      const anchorTrack = tracks[lastClickedIndexRef.current];
      const anchorSelected = anchorTrack ? selected.has(anchorTrack.id) : false;

      const start = Math.min(lastClickedIndexRef.current, idx);
      const end = Math.max(lastClickedIndexRef.current, idx);
      const idsInRange = tracks.slice(start, end + 1).map(t => t.id);

      setSelected(prev => {
        const next = new Set(prev);
        idsInRange.forEach(id => {
          if (anchorSelected) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        return next;
      });
    } else {
      setSelected(prev => {
        const next = new Set(prev);
        next.has(trackId) ? next.delete(trackId) : next.add(trackId);
        return next;
      });
    }
    lastClickedIndexRef.current = idx;
  };

  const toggleAll = () => {
    if (selected.size === tracks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(tracks.map(t => t.id)));
    }
  };

  const handleAddToPlaylist = async (destPlaylistId: string | number) => {
    const selectedIds = Array.from(selected);
    const uris = selectedIds.map(id => `spotify:track:${id}`);
    try {
      await addTracksToPlaylist(destPlaylistId, uris);
      toast.success(`Successfully added ${selectedIds.length} track(s) to playlist.`);
      setPlaylistFlyoutOpen(false);
      setSelected(new Set());

      if (setPlaylists) {
        setPlaylists(prevPlaylists =>
          prevPlaylists.map(pl => {
            if (String(pl.id) === String(destPlaylistId)) {
              const currentCount = getPlaylistTrackCount(pl);
              return {
                ...pl,
                tracks: currentCount + selectedIds.length
              };
            }
            return pl;
          })
        );
      }
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

  const handlePlayAlbum = async () => {
    if (!album) return;
    try {
      // Try playing by context URI first
      await playTrack({ contextUri: album.uri });
      toast.success(`Playing album "${album.name}"`);
    } catch (err) {
      console.warn("Play context failed, playing tracks list instead:", err);
      // Fallback to playing track URIs list
      const uris = tracks.map((t) => t.uri).filter(Boolean);
      if (uris.length > 0) {
        try {
          await playTrack({ uris });
          toast.success(`Playing album "${album.name}"`);
        } catch (fallbackErr) {
          toast.error("Could not play album. Is Spotify open on an active device?");
        }
      } else {
        toast.error("No tracks found to play in this album.");
      }
    }
  };

  const handlePlayTrack = async (trackIndex: number) => {
    try {
      const uris = tracks.map((t) => t.uri).filter(Boolean);
      await playTrack({
        uris,
        offset: { position: trackIndex }
      });
      const track = tracks[trackIndex];
      toast.success(`Playing "${track.name}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not start playback. Is Spotify open on an active device?");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-[#1DB954] mb-3"></div>
        <p className="text-[#B3B3B3] text-xs">Loading album details...</p>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white p-6">
        <AlertCircle size={36} className="text-red-500 mb-3" />
        <p className="text-white text-base font-bold mb-3">{error || "Album not found"}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-full text-xs font-semibold hover:bg-[#383838] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] text-white flex flex-col text-xs" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header bar */}
      <div className="sticky top-0 z-20 bg-[#121212]/95 backdrop-blur-sm px-4 py-3 border-b border-[#282828]/60 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-full text-[#B3B3B3] hover:text-white hover:bg-[#282828] transition-all cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-white font-bold text-xs">Album Details</span>
      </div>

      {/* Album Header Block */}
      <div className="px-6 py-5 bg-[#181818]/40 border-b border-[#282828]/40 flex flex-col sm:flex-row items-center sm:items-center gap-5 shrink-0">
        <div className="relative w-28 h-28 rounded bg-[#282828] overflow-hidden shadow-md shrink-0">
          {album.images?.[0]?.url ? (
            <ImageWithFallback src={album.images[0].url} alt="" className="w-full h-full object-cover" />
          ) : (
            <Disc size={36} className="text-white/40 m-auto h-full" />
          )}
        </div>

        <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5">
          <span className="text-[10px] uppercase tracking-wider text-[#B3B3B3] font-bold">Album</span>
          <h1 className="text-white text-xl md:text-2xl font-extrabold truncate">
            {album.name}
          </h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-[#B3B3B3]">
            <span className="text-white font-semibold">
              {album.artists?.map((art: any, index: number) => (
                <span key={art.id}>
                  <button
                    onClick={() => onNavigateToArtist(art.id)}
                    className="hover:underline hover:text-[#1DB954] font-semibold transition-colors cursor-pointer text-white"
                  >
                    {art.name}
                  </button>
                  {index < album.artists.length - 1 && <span className="text-[#B3B3B3] ml-0.5">,</span>}
                </span>
              ))}
            </span>
            <span>•</span>
            <span>{new Date(album.release_date).getFullYear()}</span>
            <span>•</span>
            <span>{tracks.length} songs</span>
          </div>

          {album.label && (
            <p className="text-[10px] text-[#535353] italic truncate">© {album.label}</p>
          )}

          <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
            <button
              onClick={handlePlayAlbum}
              className="flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-102 text-black font-bold px-4 py-1.5 rounded-full transition-all duration-200 shadow cursor-pointer text-xs"
            >
              <Play size={12} className="fill-black text-black ml-0.5" />
              <span>Play Album</span>
            </button>
            <a
              href={album.external_urls?.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#282828] border border-[#3e3e3e] hover:border-white rounded-full font-semibold transition-all hover:scale-102"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      </div>

      {/* Tracks Table */}
      <div className="px-6 py-5 flex-1">
        <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
          <h2 className="text-white text-xs font-bold flex items-center gap-1.5">
            <Music size={14} className="text-[#1DB954]" /> Album Tracks
          </h2>

          {/* ADD TO PLAYLIST SELECTION TOOLBAR */}
          {selected.size > 0 && (
            <div className="flex items-center bg-[#282828] border border-[#3e3e3e]/80 rounded-full p-0.5 shadow-md animate-in fade-in duration-200">
              <span className="text-[11px] text-[#B3B3B3] font-bold px-3 select-none">
                {selected.size} selected
              </span>

              <div className="w-px h-3.5 bg-[#3e3e3e]/80 mx-1" />

              <div className="relative" data-playlist-flyout>
                <button
                  onClick={() => setPlaylistFlyoutOpen(o => !o)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/5 text-white text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap"
                >
                  <Plus size={12} />
                  <span>Add to Playlist</span>
                  <ChevronDown size={10} className={`transition-transform duration-200 ${playlistFlyoutOpen ? "rotate-180" : ""}`} />
                </button>

                {playlistFlyoutOpen && (
                  <div className="absolute top-full right-0 mt-1 w-64 bg-[#282828] rounded-lg border border-[#383838] shadow-2xl z-50 overflow-hidden text-left">
                    <div className="px-4 py-2.5 border-b border-[#383838]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[#B3B3B3]">Add {selected.size} track{selected.size > 1 ? "s" : ""} to…</p>
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
                          <p className="text-white text-[12px] font-medium truncate">Create New Playlist</p>
                          <p className="text-[#B3B3B3] text-[10px]">Start a new playlist with these tracks</p>
                        </div>
                      </button>
                      {playlists && playlists.filter(pl => pl.owner === "yours").length === 0 ? (
                        <div className="px-4 py-3 text-xs text-[#888888]">No playlists owned by you.</div>
                      ) : (
                        playlists && playlists.filter(pl => pl.owner === "yours").map(pl => (
                          <button
                            key={pl.id}
                            type="button"
                            onClick={() => handleAddToPlaylist(pl.id)}
                            className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[#383838] transition-colors text-left cursor-pointer"
                          >
                            <div className="w-8 h-8 rounded shrink-0 bg-[#383838] overflow-hidden">
                              {pl.cover.startsWith("http") ? (
                                <img src={pl.cover} className="w-full h-full object-cover" alt="" />
                              ) : (
                                <div className={`w-full h-full ${pl.cover}`} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-white text-[12px] font-medium truncate">{pl.name}</p>
                              <p className="text-[#B3B3B3] text-[10px] truncate">{getPlaylistTrackCount(pl)} tracks</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {tracks.length === 0 ? (
          <p className="text-[#535353] py-4 text-center">No tracks found in this album.</p>
        ) : (
          <div className="bg-[#181818]/30 border border-white/5 rounded-lg overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#282828]/60 text-[10px] uppercase font-bold tracking-wider text-[#B3B3B3]">
                  <th className="w-10 px-4 py-2.5 text-left">
                    <button onClick={toggleAll}
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${selected.size === tracks.length && tracks.length > 0 ? "bg-[#1DB954] border-[#1DB954]" : "border-[#535353] hover:border-white"}`}>
                      {selected.size === tracks.length && tracks.length > 0 && <Check size={10} className="text-black" />}
                    </button>
                  </th>
                  <th className="w-12 text-center py-2.5">#</th>
                  <th className="px-3 py-2.5">Title</th>
                  <th className="px-3 py-2.5">Artist</th>
                  <th className="w-24 text-right pr-6 py-2.5">Duration</th>
                </tr>
              </thead>
              <tbody>
                {tracks.map((track, index) => {
                  const isPlaying = currentPlaybackTrackId === track.id;
                  const isTrackSelected = selected.has(track.id);
                  return (
                    <tr
                      key={track.id}
                      onClick={(e) => handleRowClick(e, track.id, index)}
                      className={`group border-b border-[#282828]/20 hover:bg-[#282828]/60 transition-colors cursor-pointer ${
                        isPlaying ? "bg-[#1DB954]/10" : isTrackSelected ? "bg-[#1DB954]/10 hover:bg-[#1DB954]/15" : ""
                      }`}
                    >
                      {/* Checkbox selector */}
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRowClick(e, track.id, index); }}
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors cursor-pointer ${isTrackSelected ? "bg-[#1DB954] border-[#1DB954]" : "border-[#535353] hover:border-white"
                            }`}
                        >
                          {isTrackSelected && <Check size={10} className="text-black" />}
                        </button>
                      </td>

                      {/* Track index / hover play button */}
                      <td className="text-center py-2.5 font-mono text-[#B3B3B3] text-[11px]">
                        <span className="group-hover:hidden">
                          {isPlaying ? (
                            <Play size={10} className="text-[#1DB954] fill-[#1DB954] inline-block animate-pulse" />
                          ) : (
                            index + 1
                          )}
                        </span>
                        <Play
                          size={10}
                          className="text-white fill-white hidden group-hover:inline-block cursor-pointer hover:scale-110 m-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlayTrack(index);
                          }}
                        />
                      </td>

                      {/* Track Title */}
                      <td className="px-3 py-2.5">
                        <p 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToTrack(track.id);
                          }}
                          className="text-white font-semibold truncate hover:underline hover:text-[#1DB954] group-hover:text-[#1DB954]"
                        >
                          {track.name}
                        </p>
                      </td>

                      {/* Track Artists */}
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                          {track.artists?.map((art: any, artIndex: number) => (
                            <span key={art.id} className="inline-flex items-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToArtist(art.id);
                                }}
                                className="text-[#B3B3B3] hover:underline hover:text-white transition-colors cursor-pointer text-[11px] text-left"
                              >
                                {art.name}
                              </button>
                              {artIndex < track.artists.length - 1 && <span className="text-[#535353] ml-1">,</span>}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Track duration */}
                      <td className="text-right pr-6 py-2.5 font-mono text-[#B3B3B3] text-[10px]">
                        {formatDuration(track.duration_ms)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EditPlaylistModal for creating new playlist */}
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
