import { useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";

/**
 * Home is a routing gateway:
 * - Authenticated → /canvas
 * - Unauthenticated → /login
 */
export default function Home() {
  const { isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      setLocation("/canvas");
    } else {
      setLocation("/login");
    }
  }, [isAuthenticated, loading, setLocation]);

  // Minimal loading state while auth resolves
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="font-display text-[80px] leading-none tracking-tighter font-black text-black/5 select-none animate-pulse">
        MOOVAS
      </div>
    </div>
  );
}
