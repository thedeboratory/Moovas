import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Code2,
  Image,
  LayoutGrid,
  LogOut,
  Palette,
  Type,
  Download,
} from "lucide-react";
import { useLocation } from "wouter";
import ExportPanel from "./ExportPanel";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Canvas", path: "/canvas", icon: <LayoutGrid size={18} strokeWidth={2.5} /> },
  { label: "Fonts", path: "/fonts", icon: <Type size={18} strokeWidth={2.5} /> },
  { label: "Colors", path: "/colors", icon: <Palette size={18} strokeWidth={2.5} /> },
  { label: "Code", path: "/code", icon: <Code2 size={18} strokeWidth={2.5} /> },
  { label: "Media", path: "/media", icon: <Image size={18} strokeWidth={2.5} /> },
  { label: "Bookmarks", path: "/bookmarks", icon: <BookOpen size={18} strokeWidth={2.5} /> },
];

interface MoovasLayoutProps {
  children: React.ReactNode;
  activeTab?: string;
}

export default function MoovasLayout({ children, activeTab }: MoovasLayoutProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [showExport, setShowExport] = useState(false);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="font-display text-6xl text-black mb-4">MOOVAS</div>
          <div className="font-mono text-sm text-black/40 tracking-widest uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-white flex items-center justify-center overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 max-w-lg w-full px-8">
          {/* Logo */}
          <div className="mb-16">
            <div className="font-display text-[80px] leading-none text-black tracking-tighter">
              MOO<br />VAS
            </div>
            <div className="mt-3 h-1 w-24 bg-black" />
          </div>

          {/* Tagline */}
          <div className="mb-12">
            <p className="font-mono text-sm text-black/60 uppercase tracking-widest leading-relaxed">
              Asset harvester<br />
              Infinite canvas<br />
              Local-first
            </p>
          </div>

          {/* Login CTA */}
          <a
            href={getLoginUrl()}
            className="inline-flex items-center gap-3 bg-black text-white font-mono font-bold text-sm uppercase tracking-widest px-8 py-4 press-feedback transition-all duration-150 hover:bg-black/80"
          >
            <span>[</span>
            <span>Sign In</span>
            <span>]</span>
          </a>

          <div className="mt-8 text-xs font-mono text-black/30 uppercase tracking-widest">
            Manus OAuth — Secure
          </div>
        </div>
      </div>
    );
  }

  const currentPath = location;

  return (
    <div className="h-screen w-screen flex bg-white overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r-2 border-black bg-white">
        {/* Logo area */}
        <div className="px-6 pt-8 pb-6 border-b-2 border-black">
          <div className="font-display text-3xl leading-none text-black tracking-tighter">
            MOOVAS
          </div>
          <div className="mt-1 font-mono text-[10px] text-black/40 uppercase tracking-widest">
            Asset Canvas
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.path || activeTab === item.label.toLowerCase();
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 font-mono font-bold text-sm uppercase tracking-wider transition-all duration-100 press-feedback text-left",
                  isActive
                    ? "bg-black text-white"
                    : "text-black/60 hover:text-black hover:bg-black/5"
                )}
              >
                {item.icon}
                {item.label}
                {isActive && <span className="ml-auto text-white/60">›</span>}
              </button>
            );
          })}
        </nav>

        {/* User area */}
        <div className="border-t-2 border-black p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-black flex items-center justify-center flex-shrink-0">
              <span className="font-mono font-bold text-white text-xs">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-black truncate">
                {user?.name ?? "User"}
              </div>
              <div className="font-mono text-[10px] text-black/40 truncate">
                {user?.email ?? ""}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowExport(true)}
            className="w-full flex items-center gap-2 font-mono text-xs text-black/60 hover:text-black uppercase tracking-wider transition-colors press-feedback mb-2"
          >
            <Download size={12} />
            Export
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 font-mono text-xs text-black/40 hover:text-black uppercase tracking-wider transition-colors press-feedback"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

      {/* Export panel */}
      {showExport && (
        <ExportPanel onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
