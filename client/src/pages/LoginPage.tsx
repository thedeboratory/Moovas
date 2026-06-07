import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Eye, EyeOff, ArrowRight } from "lucide-react";

type Mode = "login" | "register";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/canvas");
    },
    onError: (err) => {
      toast.error(err.message || "Login failed");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      setLocation("/canvas");
    },
    onError: (err) => {
      toast.error(err.message || "Registration failed");
    },
  });

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      if (!name.trim()) { toast.error("Name is required"); return; }
      registerMutation.mutate({ email, password, name: name.trim() });
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left — brand column */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-black text-white p-12 relative overflow-hidden">
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="font-mono text-[10px] text-white/40 uppercase tracking-[0.3em] mb-2">
            Moovas
          </div>
          <div className="font-display text-[80px] leading-none tracking-tighter font-black text-white">
            M
          </div>
        </div>

        {/* Tagline */}
        <div className="relative z-10">
          <div className="font-display text-4xl leading-tight tracking-tighter font-black mb-6">
            CAPTURE.<br />ORGANIZE.<br />CREATE.
          </div>
          <div className="font-mono text-sm text-white/50 leading-relaxed max-w-xs">
            A lightweight design companion that just works. Infinite canvas for your fonts, colors, code, and media.
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <div className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
            Local-first · Always fast
          </div>
        </div>
      </div>

      {/* Right — auth form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16">
        {/* Mobile logo */}
        <div className="lg:hidden mb-10 text-center">
          <div className="font-display text-5xl tracking-tighter font-black text-black">
            MOOVAS
          </div>
        </div>

        <div className="w-full max-w-sm">
          {/* Mode toggle */}
          <div className="flex border-2 border-black mb-8">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 font-mono font-bold text-xs uppercase tracking-widest transition-colors ${
                  mode === m
                    ? "bg-black text-white"
                    : "bg-white text-black hover:bg-black/5"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Heading */}
          <div className="mb-8">
            <div className="font-mono text-[10px] text-black/40 uppercase tracking-widest mb-1">
              {mode === "login" ? "Welcome back" : "Get started"}
            </div>
            <div className="font-display text-3xl tracking-tighter font-black text-black leading-none">
              {mode === "login" ? "SIGN IN" : "CREATE ACCOUNT"}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block font-mono text-[10px] text-black/50 uppercase tracking-widest mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  className="w-full border-2 border-black bg-white font-mono text-sm text-black placeholder:text-black/20 px-4 py-3 focus:outline-none focus:ring-0 focus:border-black"
                />
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] text-black/50 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                className="w-full border-2 border-black bg-white font-mono text-sm text-black placeholder:text-black/20 px-4 py-3 focus:outline-none focus:ring-0 focus:border-black"
              />
            </div>

            <div>
              <label className="block font-mono text-[10px] text-black/50 uppercase tracking-widest mb-1.5">
                Password {mode === "register" && <span className="text-black/30">(min. 8 characters)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "register" ? "Create a password" : "Your password"}
                  required
                  minLength={mode === "register" ? 8 : 1}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  className="w-full border-2 border-black bg-white font-mono text-sm text-black placeholder:text-black/20 px-4 py-3 pr-12 focus:outline-none focus:ring-0 focus:border-black"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-black/30 hover:text-black transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest py-3.5 press-feedback hover:bg-black/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed mt-2"
            >
              {isPending ? (
                <span className="animate-pulse">
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={14} strokeWidth={2.5} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-black/10">
            <p className="font-mono text-[10px] text-black/30 text-center leading-relaxed">
              Your data is stored locally first and synced to your account.
              {mode === "register" && " No email verification required to get started."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
