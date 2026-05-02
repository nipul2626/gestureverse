import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Experience from "@/pages/Experience";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Loader from "@/components/UI/Loader";

export default function App() {
  const location = useLocation();
  const { setUser, setLoading, loading } = useAuthStore();

  useEffect(() => {
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          setUser(session?.user ?? null);
          setLoading(false);
        }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [setUser, setLoading]);

  if (loading) {
    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center">
          <Loader size="lg" text="Initializing GestureVerse..." />
        </div>
    );
  }

  return (
      <>
        {/* Ambient glow blobs */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div
              className="ambient-glow w-[600px] h-[600px] -top-48 -left-48"
              style={{ background: "radial-gradient(circle, rgba(99,102,241,1) 0%, transparent 70%)" }}
          />
          <div
              className="ambient-glow w-[500px] h-[500px] -bottom-32 -right-32"
              style={{ background: "radial-gradient(circle, rgba(139,92,246,1) 0%, transparent 70%)" }}
          />
          <div
              className="ambient-glow w-[300px] h-[300px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ background: "radial-gradient(circle, rgba(34,211,238,0.5) 0%, transparent 70%)" }}
          />
        </div>

        <div className="relative z-10">
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Landing />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/experience/:id" element={<Experience />} />
            </Routes>
          </AnimatePresence>
        </div>
      </>
  );
}