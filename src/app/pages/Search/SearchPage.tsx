import React, { useState } from "react";
import { Search, X, Music2, Mic2, Play, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { Artist, Track, Playlist } from "../../../data";
import { SEARCH_FILTERS, BROWSE_CATEGORIES } from "../../../data";
import { searchSpotify, playTrack } from "../../../utils/spotifyApi";
import { playTrackSequence, getPlaylistTrackCount } from "../../../utils/spotifyHelpers";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface SearchPageProps {
  topArtists: Artist[];
  currentPlaybackTrackId: string | null;
  query: string;
  setQuery: (q: string) => void;
}

export default function SearchPage({
  topArtists,
  currentPlaybackTrackId,
  query,
  setQuery,
}: SearchPageProps) {
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
                <button key={artist.id || artist.name} onClick={() => setQuery(artist.name)}
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
                    <button key={artist.id || artist.name}
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
                    <button key={t.id || t.album}
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
