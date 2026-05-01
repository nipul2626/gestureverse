import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import { useGestureStore } from "@/store/gestureStore";
import GlowButton from "@/components/UI/GlowButton";
import Badge from "@/components/UI/Badge";
import { cn } from "@/lib/utils";

export default function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, profile, signOut, openAuthModal } = useAuthStore();
    const { engineReady, fps, currentGesture, isCalibrated } = useGestureStore();
    const [profileOpen, setProfileOpen] = useState(false);

    const isLanding = location.pathname === "/";

    return (
        <motion.nav
            initial={{ y: -80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
        >
            <div className="max-w-7xl mx-auto flex items-center justify-between">
                {/* ── Logo ── */}
                <Link to="/" className="flex items-center gap-3 group">
                    <div className="relative w-9 h-9">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-glow">
                            <span className="text-white text-lg font-bold">G</span>
                        </div>
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 opacity-0 group-hover:opacity-40 blur-md transition-opacity duration-300" />
                    </div>
                    <span className="font-display font-bold text-xl text-white group-hover:gradient-text transition-all duration-300">
            Gesture<span className="gradient-text">Verse</span>
          </span>
                </Link>

                {/* ── Center nav links ── */}
                {!isLanding && (
                    <div className="hidden md:flex items-center gap-1 glass rounded-xl px-2 py-1.5">
                        {[
                            { label: "Dashboard", path: "/dashboard" },
                        ].map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                                    location.pathname === item.path
                                        ? "bg-indigo-600/30 text-indigo-300"
                                        : "text-gray-400 hover:text-gray-200 hover:bg-white/5"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>
                )}

                {/* ── Right side ── */}
                <div className="flex items-center gap-3">
                    {/* Gesture status pill */}
                    {isCalibrated && engineReady && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="hidden sm:flex items-center gap-2 glass px-3 py-1.5 rounded-full"
                        >
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span className="text-xs text-gray-400 font-mono">
                {currentGesture !== "none" ? (
                    <span className="text-cyan-400 font-semibold">{currentGesture.replace("_", " ")}</span>
                ) : (
                    "tracking"
                )}
              </span>
                            {fps > 0 && (
                                <span className="text-xs text-gray-600 font-mono">{fps}fps</span>
                            )}
                        </motion.div>
                    )}

                    {/* Auth */}
                    {user ? (
                        <div className="relative">
                            <button
                                onClick={() => setProfileOpen(!profileOpen)}
                                className="flex items-center gap-2 glass px-3 py-2 rounded-xl hover:bg-white/8 transition-all duration-200"
                            >
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
                                    {(profile?.username || user.email || "U")[0].toUpperCase()}
                                </div>
                                <span className="hidden sm:block text-sm text-gray-300 font-medium max-w-[100px] truncate">
                  {profile?.username || user.email?.split("@")[0]}
                </span>
                                <svg
                                    className={cn("w-4 h-4 text-gray-500 transition-transform duration-200", profileOpen && "rotate-180")}
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            <AnimatePresence>
                                {profileOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 top-full mt-2 w-52 glass-dark rounded-2xl border border-white/10 overflow-hidden shadow-xl z-50"
                                    >
                                        <div className="px-4 py-3 border-b border-white/5">
                                            <p className="text-xs text-gray-500">Signed in as</p>
                                            <p className="text-sm text-gray-300 font-medium truncate">{user.email}</p>
                                        </div>
                                        <div className="p-1.5">
                                            <button
                                                onClick={() => { navigate("/dashboard"); setProfileOpen(false); }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                                            >
                                                Dashboard
                                            </button>
                                            <button
                                                onClick={async () => { await signOut(); setProfileOpen(false); navigate("/"); }}
                                                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                                            >
                                                Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <GlowButton
                                variant="glass"
                                size="sm"
                                onClick={() => openAuthModal("login")}
                            >
                                Sign In
                            </GlowButton>
                            <GlowButton
                                variant="primary"
                                size="sm"
                                onClick={() => openAuthModal("signup")}
                            >
                                Get Started
                            </GlowButton>
                        </div>
                    )}
                </div>
            </div>
        </motion.nav>
    );
}