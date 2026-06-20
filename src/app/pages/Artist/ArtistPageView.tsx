import React, { useState, useEffect } from "react";
import { ArrowLeft, Play, Users, Star, Music, Disc, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getArtist, getArtistTopTracks, getArtistAlbums, playTrack } from "../../../utils/spotifyApi";
import { formatDuration } from "../../../utils/formatters";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface ArtistPageViewProps {
  artistId: string;
  onBack: () => void;
  onNavigateToTrack: (trackId: string) => void;
  onNavigateToAlbum: (albumId: string) => void;
  currentPlaybackTrackId: string | null;
}

export default function ArtistPageView({
  artistId,
  onBack,
  onNavigateToTrack,
  onNavigateToAlbum,
  currentPlaybackTrackId,
}: ArtistPageViewProps) {
  const [artist, setArtist] = useState<any>(null);
  const [topTracks, setTopTracks] = useState<any[]>([]);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [artistData, topTracksData, albumsData] = await Promise.all([
          getArtist(artistId),
          getArtistTopTracks(artistId),
          getArtistAlbums(artistId),
        ]);

        setArtist(artistData);
        setTopTracks(topTracksData?.tracks || []);
        
        // Deduplicate albums by name to make the list cleaner
        const uniqueAlbums: any[] = [];
        const seenNames = new Set<string>();
        (albumsData?.items || []).forEach((album: any) => {
          const name = album.name.toLowerCase().trim();
          if (!seenNames.has(name)) {
            seenNames.add(name);
            uniqueAlbums.push(album);
          }
        });
        setAlbums(uniqueAlbums);
      } catch (err: any) {
        console.error("Error loading artist page data:", err);
        setError("Failed to load artist details.");
      } finally {
        setLoading(false);
      }
    };

    fetchArtistData();
  }, [artistId]);

  const handlePlayArtist = async () => {
    if (!artist) return;
    try {
      await playTrack({ contextUri: artist.uri });
      toast.success(`Playing artist "${artist.name}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not play artist. Is Spotify open on an active device?");
    }
  };

  const handlePlayTrack = async (trackUri: string, trackName: string) => {
    try {
      await playTrack({ uris: [trackUri] });
      toast.success(`Playing "${trackName}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not play track. Is Spotify open on an active device?");
    }
  };

  const handlePlayAlbum = async (e: React.MouseEvent, albumUri: string, albumName: string) => {
    e.stopPropagation();
    try {
      await playTrack({ contextUri: albumUri });
      toast.success(`Playing album "${albumName}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not play album. Is Spotify open on an active device?");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-[#1DB954] mb-3"></div>
        <p className="text-[#B3B3B3] text-xs">Loading artist profile...</p>
      </div>
    );
  }

  if (error || !artist) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white p-6">
        <AlertCircle size={36} className="text-red-500 mb-3" />
        <p className="text-white text-base font-bold mb-3">{error || "Artist not found"}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-full text-xs font-semibold hover:bg-[#383838] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const artistImage = artist.images?.[0]?.url;

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] text-white flex flex-col text-xs" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Compact Banner (Height 210px instead of 380px) */}
      <div 
        className="relative h-[210px] bg-cover bg-center flex flex-col justify-between p-5 shrink-0"
        style={artistImage ? { backgroundImage: `linear-gradient(to bottom, rgba(18,18,18,0.1) 0%, rgba(18,18,18,0.9) 100%), url(${artistImage})` } : {}}
      >
        {/* Banner Navigation Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full bg-black/60 text-[#B3B3B3] hover:text-white transition-all cursor-pointer shadow hover:scale-105"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <span className="bg-black/40 px-2.5 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-sm">Artist Page</span>
        </div>

        {/* Artist Profile Details */}
        <div className="space-y-1.5 mt-auto">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1DB954] scale-90" />
            <span className="text-[10px] uppercase tracking-wider text-[#B3B3B3] font-bold">Verified Artist</span>
          </div>
          <h1 className="text-white text-2xl md:text-4xl font-extrabold leading-none tracking-tight">
            {artist.name}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-white/90 pt-1 font-medium">
            <div className="flex items-center gap-1 bg-black/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              <Users size={12} className="text-[#1DB954]" />
              <span>{artist.followers?.total?.toLocaleString() || "0"} followers</span>
            </div>
            <div className="flex items-center gap-1 bg-black/30 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
              <Star size={12} className="text-yellow-400" />
              <span>Popularity: {artist.popularity}/100</span>
            </div>
            {artist.genres && artist.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {artist.genres.slice(0, 2).map((g: string) => (
                  <span key={g} className="bg-[#1DB954]/20 border border-[#1DB954]/30 text-[#1DB954] text-[9px] uppercase font-bold tracking-wider px-2 py-0.25 rounded-full">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={handlePlayArtist}
              className="flex items-center gap-1 bg-[#1DB954] hover:bg-[#1ed760] hover:scale-102 text-black font-bold text-xs px-4 py-1.5 rounded-full transition-all duration-200 shadow cursor-pointer"
            >
              <Play size={12} className="fill-black text-black ml-0.5" />
              <span>Play</span>
            </button>
            <a
              href={artist.external_urls?.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center bg-black/40 border border-white/10 hover:border-white text-white font-semibold text-xs px-3 py-1.5 rounded-full transition-all hover:scale-102 backdrop-blur-sm"
            >
              Open in Spotify
            </a>
          </div>
        </div>
      </div>

      {/* Grid of tracks & albums */}
      <div className="px-5 py-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Popular Songs List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-white text-sm font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Music size={14} className="text-[#1DB954]" /> Popular Songs
          </h2>

          {topTracks.length === 0 ? (
            <p className="text-[#535353] py-2">No top tracks found.</p>
          ) : (
            <div className="space-y-1 bg-[#181818]/30 border border-white/5 p-3 rounded-lg">
              {topTracks.slice(0, 8).map((track, i) => {
                const isPlaying = currentPlaybackTrackId === track.id;
                return (
                  <div
                    key={track.id}
                    onClick={() => onNavigateToTrack(track.id)}
                    className={`group flex items-center gap-3 px-2 py-1.5 rounded hover:bg-[#282828]/70 transition-colors cursor-pointer ${
                      isPlaying ? "bg-[#1DB954]/10" : ""
                    }`}
                  >
                    <span className="w-4 text-right text-[#B3B3B3] text-[11px] font-mono group-hover:hidden">
                      {isPlaying ? (
                        <Play size={10} className="text-[#1DB954] fill-[#1DB954] inline-block animate-pulse" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="hidden group-hover:block w-4 flex justify-center items-center">
                      <Play 
                        size={10} 
                        className="text-white fill-white cursor-pointer hover:scale-110"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(track.uri, track.name);
                        }}
                      />
                    </span>
                    
                    <div className="w-8 h-8 bg-[#282828] rounded shrink-0 overflow-hidden flex items-center justify-center">
                      {track.album?.images?.[0]?.url ? (
                        <ImageWithFallback src={track.album.images[0].url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music size={12} className="text-[#B3B3B3]" />
                      )}
                    </div>
                    
                    <div className="flex-grow min-w-0">
                      <p className="text-white font-semibold truncate hover:underline group-hover:text-[#1DB954]">{track.name}</p>
                      {track.album?.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToAlbum(track.album.id);
                          }}
                          className="text-[#B3B3B3] text-[10px] truncate hover:underline hover:text-white block mt-0.5 text-left"
                        >
                          {track.album.name}
                        </button>
                      )}
                    </div>

                    <p className="text-[#B3B3B3] font-mono shrink-0 text-[10px]">{formatDuration(track.duration_ms)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Discography List */}
        <div className="lg:col-span-1 space-y-3">
          <h2 className="text-white text-sm font-bold flex items-center gap-1.5 border-b border-white/5 pb-2">
            <Disc size={14} className="text-[#1DB954]" /> Discography
          </h2>

          {albums.length === 0 ? (
            <p className="text-[#535353] py-2">No albums found.</p>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-[#282828]">
              {albums.slice(0, 10).map((album) => (
                <div
                  key={album.id}
                  onClick={() => onNavigateToAlbum(album.id)}
                  className="group flex gap-3 p-2 bg-[#181818]/40 hover:bg-[#282828]/50 border border-white/5 rounded transition-colors cursor-pointer"
                >
                  <div className="relative w-12 h-12 bg-[#282828] rounded overflow-hidden shrink-0">
                    {album.images?.[0]?.url ? (
                      <ImageWithFallback src={album.images[0].url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Disc size={16} className="text-white/40" />
                    )}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayAlbum(e, album.uri, album.name);
                      }}
                      className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Play size={10} className="text-black fill-black w-5 h-5 bg-[#1DB954] rounded-full flex items-center justify-center p-0.5 hover:scale-105" />
                    </div>
                  </div>
                  
                  <div className="min-w-0 flex-grow flex flex-col justify-center">
                    <p className="text-white font-semibold truncate group-hover:text-[#1DB954] transition-colors">{album.name}</p>
                    <p className="text-[#B3B3B3] text-[10px] mt-0.5 capitalize">{album.album_type} • {new Date(album.release_date).getFullYear()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
