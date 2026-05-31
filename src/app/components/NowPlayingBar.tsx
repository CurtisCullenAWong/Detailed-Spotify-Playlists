import React, { useState, useEffect, useRef } from "react";
import {
  Music2,
  SkipBack,
  Play,
  SkipForward,
  Shuffle,
  Pause,
  Repeat,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { formatDuration } from "../../utils/formatters";
import {
  playTrack,
  pauseTrack,
  skipToNext,
  skipToPrevious,
  toggleShuffle,
  toggleRepeat,
  setPlayerVolume,
  seekPosition,
} from "../../utils/spotifyApi";

interface NowPlayingBarProps {
  playbackState: any;
  setPlaybackState: React.Dispatch<React.SetStateAction<any>>;
}

export default function NowPlayingBar({
  playbackState,
  setPlaybackState,
}: NowPlayingBarProps) {
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

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
