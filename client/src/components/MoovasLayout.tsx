import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
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
  Menu,
  X,
  Sun,
  Moon,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import ExportPanel from "./ExportPanel";
import { useTheme } from "@/contexts/ThemeContext";

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const handleToggleTheme = () => toggleTheme?.();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="font-display text-6xl text-foreground mb-4">MOOVAS</div>
          <div className="font-mono text-sm text-foreground/40 tracking-widest uppercase">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 max-w-lg w-full px-8">
          <div className="mb-16">
            <div className="font-display text-[80px] leading-none text-foreground tracking-tighter">
              MOO<br />VAS
            </div>
            <div className="mt-3 h-1 w-24 bg-foreground" />
          </div>
          <div className="mb-12">
            <p className="font-mono text-sm text-foreground/60 uppercase tracking-widest leading-relaxed">
              Asset harvester<br />
              Infinite canvas<br />
              Local-first
            </p>
          </div>
          <a
            href="/login"
            className="inline-flex items-center gap-3 bg-foreground text-background font-mono font-bold text-sm uppercase tracking-widest px-8 py-4 press-feedback transition-all duration-150 hover:opacity-80"
          >
            <span>[</span>
            <span>Sign In</span>
            <span>]</span>
          </a>
          <div className="mt-8 text-xs font-mono text-foreground/30 uppercase tracking-widest">
            Email · Password · Secure
          </div>
        </div>
      </div>
    );
  }

  const currentPath = location;

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">

      {/* ── Desktop Sidebar (hidden on mobile) ── */}
      <aside className="hidden md:flex w-[220px] flex-shrink-0 flex-col border-r-2 border-border bg-background">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b-2 border-border">
          <div className="font-display text-3xl leading-none text-foreground tracking-tighter">
            MOOVAS
          </div>
          <div className="mt-1 font-mono text-[10px] text-foreground/40 uppercase tracking-widest">
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
                    ? "bg-foreground text-background"
                    : "text-foreground/60 hover:text-foreground hover:bg-foreground/5"
                )}
              >
                {item.icon}
                {item.label}
                {isActive && <span className="ml-auto opacity-60">›</span>}
              </button>
            );
          })}
        </nav>

        {/* User area */}
        <div className="border-t-2 border-border p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-foreground flex items-center justify-center flex-shrink-0">
              <span className="font-mono font-bold text-background text-xs">
                {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="font-mono font-bold text-xs text-foreground truncate">
                {user?.name ?? "User"}
              </div>
              <div className="font-mono text-[10px] text-foreground/40 truncate">
                {user?.email ?? ""}
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleTheme}
            className="w-full flex items-center gap-2 font-mono text-xs text-foreground/60 hover:text-foreground uppercase tracking-wider transition-colors press-feedback mb-2"
          >
            {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="w-full flex items-center gap-2 font-mono text-xs text-foreground/60 hover:text-foreground uppercase tracking-wider transition-colors press-feedback mb-2"
          >
            <Download size={12} />
            Export
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 font-mono text-xs text-foreground/40 hover:text-foreground uppercase tracking-wider transition-colors press-feedback"
          >
            <LogOut size={12} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Mobile Layout ── */}
      {/* Top bar: hamburger left, logo center, theme toggle right */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-background border-b-2 border-border">
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-2 text-foreground press-feedback"
          aria-label="Open menu"
        >
          <Menu size={22} strokeWidth={2.5} />
        </button>
        <div className="font-display text-xl tracking-tighter text-foreground font-black">
          MOOVAS
        </div>
        <button
          onClick={handleToggleTheme}
          className="p-2 text-foreground/60 hover:text-foreground press-feedback"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Mobile bottom tab bar (icon-only nav) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex border-t-2 border-border bg-background">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPath === item.path || activeTab === item.label.toLowerCase();
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2.5 gap-1 transition-colors press-feedback",
                isActive ? "text-foreground" : "text-foreground/30"
              )}
              aria-label={item.label}
            >
              {item.icon}
              <span className="font-mono text-[8px] uppercase tracking-wider">
                {item.label}
              </span>
              {isActive && <div className="absolute bottom-0 w-6 h-0.5 bg-foreground" />}
            </button>
          );
        })}
      </div>

      {/* Mobile hamburger drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer */}
          <div className="relative z-10 w-72 max-w-[85vw] bg-background border-r-2 border-border flex flex-col h-full">
            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-5 border-b-2 border-border">
              <div className="font-display text-2xl tracking-tighter text-foreground font-black">
                MOOVAS
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-foreground/60 hover:text-foreground press-feedback"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            <div className="px-6 py-4 border-b-2 border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-foreground flex items-center justify-center flex-shrink-0">
                  <span className="font-mono font-bold text-background text-sm">
                    {(user?.name ?? user?.email ?? "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-sm text-foreground truncate">
                    {user?.name ?? "User"}
                  </div>
                  <div className="font-mono text-[10px] text-foreground/40 truncate">
                    {user?.email ?? ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex-1 py-4 px-4 space-y-1">
              <div className="font-mono text-[9px] text-foreground/30 uppercase tracking-widest px-2 mb-3">
                Actions
              </div>
              <button
                onClick={() => { setShowExport(true); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors press-feedback text-left"
              >
                <Download size={16} strokeWidth={2.5} />
                Export
              </button>
              <button
                onClick={() => { handleToggleTheme(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors press-feedback text-left"
              >
                {theme === "dark" ? <Sun size={16} strokeWidth={2.5} /> : <Moon size={16} strokeWidth={2.5} />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
            </div>

            {/* Sign out */}
            <div className="border-t-2 border-border p-4">
              <button
                onClick={() => { logout(); setMobileMenuOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 font-mono font-bold text-sm uppercase tracking-wider text-foreground/40 hover:text-foreground transition-colors press-feedback text-left"
              >
                <LogOut size={16} strokeWidth={2.5} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      {/* On mobile: top padding for the fixed top bar, bottom padding for the tab bar */}
      <main className="flex-1 flex flex-col overflow-hidden md:mt-0 mt-[53px] md:mb-0 mb-[60px]">
        {children}
      </main>

      {/* Export panel */}
      {showExport && (
        <ExportPanel onClose={() => setShowExport(false)} />
      )}
    </div>
  );
}
