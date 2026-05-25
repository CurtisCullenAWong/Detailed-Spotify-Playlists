import React from "react";
import { Music2, Zap, ArrowRight, Settings } from "lucide-react";
import { login } from "../../utils/spotifyAuth";

export default function Login() {
  const handleLogin = () => {
    login().catch((err) => {
      console.error("Login redirect failed:", err);
    });
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#09090b] flex items-center justify-center p-4 overflow-hidden select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Premium Ambient Glowing Background */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Decorative Grid Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Central Login Card */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col items-center">
        
        {/* Brand Icon/Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1DB954] to-emerald-700 flex items-center justify-center shadow-lg shadow-[#1DB954]/20 mb-6 group hover:scale-105 transition-transform duration-300">
          <Music2 size={32} className="text-black stroke-[2.5]" />
        </div>

        {/* Title & Description */}
        <h1 className="text-white text-2xl md:text-3xl font-extrabold tracking-tight text-center mb-2">
          Spotify Manager
        </h1>
        <p className="text-[#B3B3B3] text-sm md:text-base text-center mb-8 max-w-[340px]">
          Analyze, filter, and organize your Spotify library with our advanced developer-grade management engine.
        </p>

        {/* Connect Button */}
        <button
          onClick={handleLogin}
          className="group w-full relative flex items-center justify-center gap-3 px-6 py-4 bg-[#1DB954] text-black font-bold rounded-full transition-all duration-300 hover:bg-[#1ed760] hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#1DB954]/20 hover:shadow-[#1DB954]/30 cursor-pointer overflow-hidden"
        >
          {/* Subtle reflection overlay */}
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
          
          <Music2 size={18} className="fill-black" />
          <span>Connect Spotify Account</span>
          <ArrowRight size={16} className="transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        {/* Features Checklist */}
        <div className="w-full border-t border-white/5 pt-6 mt-8 space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={11} className="text-[#1DB954]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Live Library Management</p>
              <p className="text-[#888888] text-[11px] mt-0.5">Sync and manage your songs, albums, and playlists in real-time.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={11} className="text-[#1DB954]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Track Metadata Enrichment</p>
              <p className="text-[#888888] text-[11px] mt-0.5">Analyze track BPM, energy values, and artist genres directly in the workspace.</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Zap size={11} className="text-[#1DB954]" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Interactive API Explorer</p>
              <p className="text-[#888888] text-[11px] mt-0.5">Test Spotify Web API endpoints using your active session token.</p>
            </div>
          </div>
        </div>

        {/* Local Setup Instructions Box */}
        <div className="w-full mt-6 bg-white/[0.02] border border-white/5 rounded-xl p-4 flex gap-3">
          <Settings size={16} className="text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-white text-[11px] font-bold uppercase tracking-wider">Required Spotify Developer Setup</p>
            <p className="text-[#888888] text-[11px] leading-relaxed">
              Add <code className="text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded font-mono font-bold">http://127.0.0.1:5173/</code> to your app's **Redirect URIs** list in the Spotify Developer Dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
