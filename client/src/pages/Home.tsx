import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/canvas");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="font-display text-6xl text-black tracking-tighter animate-pulse">
          MOOVAS
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-white flex overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Left — Hero */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-12 border-r-2 border-black">
        <div>
          <div className="font-display text-[120px] leading-none text-black tracking-tighter">
            MOO
          </div>
          <div className="font-display text-[120px] leading-none text-black tracking-tighter">
            VAS
          </div>
          <div className="mt-4 h-2 w-32 bg-black" />
        </div>

        <div>
          <p className="font-mono text-sm text-black/50 uppercase tracking-widest leading-loose max-w-xs">
            Ultra-fast asset harvester<br />
            Tabbed infinite canvas<br />
            Local-first architecture
          </p>
        </div>
      </div>

      {/* Right — Login */}
      <div className="relative z-10 w-[420px] flex flex-col justify-center p-12">
        <div className="mb-12">
          <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-2">
            System Access
          </div>
          <div className="font-display text-4xl text-black tracking-tighter">
            SIGN IN
          </div>
          <div className="mt-2 h-[3px] w-16 bg-black" />
        </div>

        <div className="space-y-6">
          <div className="border-2 border-black p-4">
            <div className="font-mono text-xs text-black/50 uppercase tracking-widest mb-1">
              Auth Provider
            </div>
            <div className="font-mono font-bold text-sm text-black">
              Manus OAuth 2.0
            </div>
          </div>

          <a
            href={getLoginUrl()}
            className="flex items-center justify-between bg-black text-white font-mono font-bold text-sm uppercase tracking-widest px-6 py-4 press-feedback transition-all duration-150 hover:bg-black/80 group"
          >
            <span>[ Continue ]</span>
            <span className="group-hover:translate-x-1 transition-transform duration-150">→</span>
          </a>

          <div className="font-mono text-[10px] text-black/30 uppercase tracking-widest leading-relaxed">
            Secure session via Manus platform.<br />
            No password required.
          </div>
        </div>

        {/* Feature list */}
        <div className="mt-16 space-y-3">
          {[
            "Infinite canvas",
            "Universal ingestion",
            "Smart clipboard",
            "Local-first sync",
            "Export matrix",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3 font-mono text-xs text-black/40 uppercase tracking-wider">
              <div className="w-1.5 h-1.5 bg-black/30 flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
