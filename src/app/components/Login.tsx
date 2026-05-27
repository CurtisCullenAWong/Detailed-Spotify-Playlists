import { Music2, ArrowRight } from "lucide-react";
import { login } from "../../utils/spotifyAuth";

export default function Login() {
  const handleLogin = () => {
    login().catch((err) => {
      console.error("Login redirect failed:", err);
    });
  };

  return (
    <div className="relative min-h-screen w-screen bg-[#09090b] flex items-center justify-center p-4 overflow-hidden select-none" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1DB954]/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse duration-[10000ms]" />
      <div className="absolute top-[30%] right-[20%] w-[300px] h-[300px] bg-emerald-500/5 rounded-full blur-[80px] pointer-events-none" />

      {/* Decorative Grid Patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Central Login Card */}
      <div className="relative z-10 w-full max-w-[480px] bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl p-8 md:p-10 shadow-2xl flex flex-col items-center">

        {/* Brand Icon/Logo */}
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-lg shadow-black/30 mb-6 group hover:scale-105 transition-all duration-300 overflow-hidden">
          <img src="/favicon.png" alt="Logo" className="w-10 h-10 object-contain" />
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
      </div>
    </div>
  );
}
