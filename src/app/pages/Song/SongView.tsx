import React, { useState, useEffect } from "react";
import { ArrowLeft, Play, Music, Calendar, Disc, Heart, Info, Volume2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { getTrack, getTrackAudioFeatures, playTrack } from "../../../utils/spotifyApi";
import { formatDuration } from "../../../utils/formatters";
import { ImageWithFallback } from "../../components/figma/ImageWithFallback";

interface SongViewProps {
  trackId: string;
  onBack: () => void;
  onNavigateToArtist: (artistId: string) => void;
  onNavigateToAlbum: (albumId: string) => void;
  enableDeprecatedApis: boolean;
  currentPlaybackTrackId: string | null;
}

export default function SongView({
  trackId,
  onBack,
  onNavigateToArtist,
  onNavigateToAlbum,
  enableDeprecatedApis,
  currentPlaybackTrackId,
}: SongViewProps) {
  const [track, setTrack] = useState<any>(null);
  const [features, setFeatures] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFeatures, setLoadingFeatures] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackDetails = async () => {
      setLoading(true);
      setError(null);
      try {
        const trackData = await getTrack(trackId);
        setTrack(trackData);

        if (enableDeprecatedApis) {
          setLoadingFeatures(true);
          try {
            const featuresData = await getTrackAudioFeatures(trackId);
            setFeatures(featuresData);
          } catch (featErr) {
            console.warn("Failed to load audio features:", featErr);
          } finally {
            setLoadingFeatures(false);
          }
        }
      } catch (err: any) {
        console.error("Error fetching track details:", err);
        setError("Failed to load song details.");
      } finally {
        setLoading(false);
      }
    };

    fetchTrackDetails();
  }, [trackId, enableDeprecatedApis]);

  const handlePlay = async () => {
    if (!track) return;
    try {
      await playTrack({ uris: [track.uri] });
      toast.success(`Playing "${track.name}"`);
    } catch (err) {
      console.error(err);
      toast.error("Could not play track. Is Spotify open on an active device?");
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-t-transparent border-[#1DB954] mb-3"></div>
        <p className="text-[#B3B3B3] text-xs">Loading song details...</p>
      </div>
    );
  }

  if (error || !track) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#121212] text-white p-6">
        <AlertCircle size={36} className="text-red-500 mb-3" />
        <p className="text-white text-base font-bold mb-3">{error || "Song not found"}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-[#282828] text-white rounded-full text-xs font-semibold hover:bg-[#383838] transition-colors cursor-pointer"
        >
          <ArrowLeft size={14} /> Go Back
        </button>
      </div>
    );
  }

  const isCurrentlyPlaying = currentPlaybackTrackId === track.id;

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] text-white flex flex-col text-xs" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Header bar (Compact) */}
      <div className="sticky top-0 z-20 bg-[#121212]/95 backdrop-blur-sm px-4 py-3 border-b border-[#282828]/60 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1 rounded-full text-[#B3B3B3] hover:text-white hover:bg-[#282828] transition-all cursor-pointer"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <span className="text-white font-bold text-xs">Song Details</span>
      </div>

      {enableDeprecatedApis ? (
        <>
          {/* Compact Info Section (Full-width bar) */}
          <div className="px-6 py-5 bg-[#181818]/40 border-b border-[#282828]/40 flex flex-col sm:flex-row items-center sm:items-center gap-5 shrink-0">
            <div 
              onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
              className="relative w-28 h-28 rounded bg-[#282828] overflow-hidden shadow-md shrink-0 cursor-pointer group flex items-center justify-center"
            >
              {track.album?.images?.[0]?.url ? (
                <ImageWithFallback
                  src={track.album.images[0].url}
                  alt=""
                  className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
                />
              ) : (
                <Music size={36} className="text-white/40" />
              )}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                <Play size={16} className="text-white fill-white" />
              </div>
            </div>

            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1">
              <span className="text-[10px] uppercase tracking-wider text-[#B3B3B3] font-bold">Track</span>
              <h1 className="text-white text-xl md:text-2xl font-extrabold truncate">
                {track.name}
              </h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-[#B3B3B3]">
                <span className="text-white font-semibold flex items-center gap-1">
                  {track.artists?.map((art: any, index: number) => (
                    <span key={art.id}>
                      <button
                        onClick={() => onNavigateToArtist(art.id)}
                        className="hover:underline hover:text-[#1DB954] font-semibold text-left transition-colors cursor-pointer text-white"
                      >
                        {art.name}
                      </button>
                      {index < track.artists.length - 1 && <span className="text-[#B3B3B3] ml-0.5">,</span>}
                    </span>
                  ))}
                </span>
                <span>•</span>
                <button
                  onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
                  className="hover:underline hover:text-[#1DB954] text-left transition-colors cursor-pointer text-[#B3B3B3]"
                >
                  {track.album?.name}
                </button>
                <span>•</span>
                <span>{new Date(track.album?.release_date).getFullYear()}</span>
                <span>•</span>
                <span>{formatDuration(track.duration_ms)}</span>
              </div>

              <div className="flex items-center justify-center sm:justify-start gap-2 pt-2">
                <button
                  onClick={handlePlay}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all hover:scale-102 cursor-pointer ${
                    isCurrentlyPlaying
                      ? "bg-[#1DB954]/20 border border-[#1DB954] text-[#1DB954]"
                      : "bg-[#1DB954] text-black hover:bg-[#1ed760]"
                  }`}
                >
                  <Play size={12} className={isCurrentlyPlaying ? "text-[#1DB954] fill-[#1DB954]" : "text-black fill-black"} />
                  <span>{isCurrentlyPlaying ? "Currently Playing" : "Play"}</span>
                </button>
                <a
                  href={track.external_urls?.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#282828] border border-[#3e3e3e] hover:border-white rounded-full text-xs font-semibold transition-all hover:scale-102"
                >
                  Open in Spotify
                </a>
              </div>
            </div>
          </div>

          {/* Main Details and Metrics Cards */}
          <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Metadata Details */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-[#181818] border border-white/5 rounded-lg p-4 shadow-sm">
                <h2 className="text-white text-xs font-bold mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <Info size={14} className="text-[#1DB954]" /> Track Information
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#B3B3B3] flex items-center gap-1.5"><Disc size={12} /> Album</span>
                    <button
                      onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
                      className="text-white font-medium text-right max-w-[150px] truncate hover:underline hover:text-[#1DB954]"
                    >
                      {track.album?.name}
                    </button>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#B3B3B3] flex items-center gap-1.5"><Calendar size={12} /> Release Date</span>
                    <span className="text-white font-mono">{track.album?.release_date}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#B3B3B3] flex items-center gap-1.5"><Heart size={12} /> Popularity</span>
                    <span className="text-white font-mono flex items-center gap-1.5">
                      <div className="w-12 bg-[#282828] h-1 rounded-full overflow-hidden shrink-0">
                        <div className="bg-[#1DB954] h-full" style={{ width: `${track.popularity}%` }} />
                      </div>
                      {track.popularity}/100
                    </span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-[#B3B3B3] flex items-center gap-1.5"><Volume2 size={12} /> Disc / Track</span>
                    <span className="text-white font-mono">D{track.disc_number} · T{track.track_number}</span>
                  </div>
                  {track.album?.total_tracks && (
                    <div className="flex justify-between py-0.5">
                      <span className="text-[#B3B3B3]">Album Tracks</span>
                      <span className="text-white font-mono">{track.album.total_tracks} tracks</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Audio Analysis Descriptors */}
            <div className="md:col-span-2 space-y-4">
              <div className="bg-[#181818] border border-white/5 rounded-lg p-4 shadow-sm flex flex-col h-full">
                <h2 className="text-white text-xs font-bold mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
                  <span className="w-2 h-2 rounded-full bg-[#1DB954]" /> Audio Analysis Descriptors
                </h2>

                {loadingFeatures ? (
                  <div className="flex-grow flex flex-col items-center justify-center py-10 text-center">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-t-transparent border-[#1DB954] mb-2"></div>
                    <p className="text-[#B3B3B3] text-[10px]">Analyzing audio features...</p>
                  </div>
                ) : !features ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center py-6 text-[#535353]">
                    No descriptors found.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Clean stats columns */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#282828]/35 border border-white/5 rounded p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[#B3B3B3] text-[9px] font-bold uppercase tracking-wider">Tempo (Speed)</p>
                          <p className="text-lg font-bold font-mono text-white">{Math.round(features.tempo)} <span className="text-[9px] font-normal text-[#B3B3B3]">BPM</span></p>
                        </div>
                      </div>
                      <div className="bg-[#282828]/35 border border-white/5 rounded p-2.5 flex items-center justify-between">
                        <div>
                          <p className="text-[#B3B3B3] text-[9px] font-bold uppercase tracking-wider">Loudness (Volume)</p>
                          <p className="text-lg font-bold font-mono text-white">{features.loudness !== undefined ? `${features.loudness.toFixed(1)}` : "-"} <span className="text-[9px] font-normal text-[#B3B3B3]">dB</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Progress-style details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5 mt-2">
                      
                      {/* Energy */}
                      {features.energy !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Energy (Intensity)</span>
                            <span className="text-white font-mono">{Math.round(features.energy * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${features.energy * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Danceability */}
                      {features.danceability !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Danceability</span>
                            <span className="text-white font-mono">{Math.round(features.danceability * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500" style={{ width: `${features.danceability * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Valence */}
                      {features.valence !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Valence (Positivity)</span>
                            <span className="text-white font-mono">{Math.round(features.valence * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-yellow-500" style={{ width: `${features.valence * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Acousticness */}
                      {features.acousticness !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Acousticness</span>
                            <span className="text-white font-mono">{Math.round(features.acousticness * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-teal-500" style={{ width: `${features.acousticness * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Instrumentalness */}
                      {features.instrumentalness !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Instrumentalness</span>
                            <span className="text-white font-mono">{Math.round(features.instrumentalness * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-pink-500" style={{ width: `${features.instrumentalness * 100}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Liveness */}
                      {features.liveness !== undefined && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-[#B3B3B3]">
                            <span>Liveness (Live Feel)</span>
                            <span className="text-white font-mono">{Math.round(features.liveness * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#282828] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${features.liveness * 100}%` }} />
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="px-6 py-8 max-w-md mx-auto w-full flex flex-col gap-6 text-center">
          {/* Centered Large Album Art */}
          <div 
            onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
            className="relative w-48 h-48 rounded bg-[#282828] overflow-hidden shadow-2xl mx-auto cursor-pointer group flex items-center justify-center shrink-0"
          >
            {track.album?.images?.[0]?.url ? (
              <ImageWithFallback
                src={track.album.images[0].url}
                alt=""
                className="w-full h-full object-cover transition-opacity group-hover:opacity-75"
              />
            ) : (
              <Music size={48} className="text-white/40" />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
              <Play size={20} className="text-white fill-white" />
            </div>
          </div>

          {/* Centered Info Header */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-[#B3B3B3] font-bold">Track</span>
            <h1 className="text-white text-2xl font-black truncate max-w-sm mx-auto">
              {track.name}
            </h1>
            <div className="text-sm font-semibold flex items-center justify-center gap-1 text-[#B3B3B3] flex-wrap">
              {track.artists?.map((art: any, index: number) => (
                <span key={art.id}>
                  <button
                    onClick={() => onNavigateToArtist(art.id)}
                    className="hover:underline hover:text-[#1DB954] font-semibold transition-colors cursor-pointer text-white"
                  >
                    {art.name}
                  </button>
                  {index < track.artists.length - 1 && <span className="text-[#B3B3B3] ml-0.5">,</span>}
                </span>
              ))}
            </div>
            <div className="text-[11px] text-[#B3B3B3] flex items-center justify-center gap-1.5 flex-wrap">
              <button
                onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
                className="hover:underline hover:text-[#1DB954] transition-colors cursor-pointer text-[#B3B3B3]"
              >
                {track.album?.name}
              </button>
              <span>•</span>
              <span>{new Date(track.album?.release_date).getFullYear()}</span>
              <span>•</span>
              <span>{formatDuration(track.duration_ms)}</span>
            </div>
          </div>

          {/* Centered Play/Open buttons */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePlay}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-bold transition-all hover:scale-102 cursor-pointer ${
                isCurrentlyPlaying
                  ? "bg-[#1DB954]/20 border border-[#1DB954] text-[#1DB954]"
                  : "bg-[#1DB954] text-black hover:bg-[#1ed760]"
              }`}
            >
              <Play size={12} className={isCurrentlyPlaying ? "text-[#1DB954] fill-[#1DB954]" : "text-black fill-black"} />
              <span>{isCurrentlyPlaying ? "Currently Playing" : "Play"}</span>
            </button>
            <a
              href={track.external_urls?.spotify}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-[#282828] border border-[#3e3e3e] hover:border-white rounded-full text-xs font-semibold transition-all hover:scale-102"
            >
              Open in Spotify
            </a>
          </div>

          {/* Centered Track Information card without Popularity */}
          <div className="bg-[#181818] border border-white/5 rounded-lg p-4 shadow-sm text-left">
            <h2 className="text-white text-xs font-bold mb-3 flex items-center gap-1.5 border-b border-white/5 pb-2">
              <Info size={14} className="text-[#1DB954]" /> Track Information
            </h2>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1.5"><Disc size={12} /> Album</span>
                <button
                  onClick={() => { if (track.album?.id) onNavigateToAlbum(track.album.id); }}
                  className="text-white font-medium text-right max-w-[180px] truncate hover:underline hover:text-[#1DB954]"
                >
                  {track.album?.name}
                </button>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1.5"><Calendar size={12} /> Release Date</span>
                <span className="text-white font-mono">{track.album?.release_date}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-[#B3B3B3] flex items-center gap-1.5"><Volume2 size={12} /> Disc / Track</span>
                <span className="text-white font-mono">D{track.disc_number} · T{track.track_number}</span>
              </div>
              {track.album?.total_tracks && (
                <div className="flex justify-between py-0.5">
                  <span className="text-[#B3B3B3]">Album Tracks</span>
                  <span className="text-white font-mono">{track.album.total_tracks} tracks</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
