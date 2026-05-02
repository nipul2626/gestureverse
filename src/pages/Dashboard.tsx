import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import PageWrapper from "@/components/Layout/PageWrapper";
import CarouselView from "@/components/Dashboard/CarouselView";
import GridView from "@/components/Dashboard/GridView";
import GestureEngine from "@/components/Gestures/GestureEngine";
import GestureHUD from "@/components/Gestures/GestureHUD";
import CalibrationFlow from "@/components/Gestures/CalibrationFlow";
import GlowButton from "@/components/UI/GlowButton";
import Badge from "@/components/UI/Badge";
import { useGestureStore } from "@/store/gestureStore";
import { useAuthStore } from "@/store/authStore";
import { useExperienceStore } from "@/store/experienceStore";
import { cn } from "@/lib/utils";

export default function Dashboard() {
    const navigate = useNavigate();
    const { isCalibrated, setCalibrated, webcamSupported, cameraActive } = useGestureStore();
    const { user, openAuthModal } = useAuthStore();
    const { viewMode, setViewMode, completedIds, experiences } = useExperienceStore();
    const [showCalibration, setShowCalibration] = useState(!isCalibrated);
    const [showCamera, setShowCamera] = useState(false);

    const completionPct = Math.round((completedIds.length / experiences.length) * 100);

    return (
        <PageWrapper>
            {/* Calibration overlay */}
            {showCalibration && (
                <CalibrationFlow
                    onComplete={() => setShowCalibration(false)}
                    onSkip={() => {
                        setCalibrated(true);
                        setShowCalibration(false);
                    }}
                />
            )}

            {/* Gesture engine (hidden, always running when calibrated) */}
            {isCalibrated && webcamSupported && (
                <div className="fixed bottom-4 left-4 z-30">
                    <div
                        className={cn(
                            "relative transition-all duration-300 rounded-2xl overflow-hidden",
                            showCamera ? "w-48 h-36" : "w-0 h-0"
                        )}
                    >
                        <GestureEngine showVideo={showCamera} showSkeleton={showCamera} />
                    </div>

                    <button
                        onClick={() => setShowCamera((v) => !v)}
                        className={cn(
                            "glass px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200 mt-2 flex items-center gap-1.5",
                            cameraActive ? "text-emerald-400" : "text-gray-500"
                        )}
                    >
                        <span className={cn("w-1.5 h-1.5 rounded-full", cameraActive ? "bg-emerald-400 animate-pulse" : "bg-gray-600")} />
                        {showCamera ? "Hide camera" : "Show camera"}
                    </button>
                </div>
            )}

            {/* Gesture HUD */}
            {isCalibrated && <GestureHUD position="bottom-right" />}

            <div className="max-w-7xl mx-auto px-6 py-8">
                {/* ── Header ── */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <p className="text-xs text-indigo-400 font-semibold tracking-widest uppercase mb-1">
                            Experience Hub
                        </p>
                        <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                            Welcome{user ? `, ${user.email?.split("@")[0]}` : " back"}
                            <span className="gradient-text"> 👋</span>
                        </h1>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5 }}
                        className="flex items-center gap-3 flex-wrap"
                    >
                        {/* Calibration status */}
                        {isCalibrated ? (
                            <Badge variant="success" dot>Gesture Ready</Badge>
                        ) : (
                            <GlowButton
                                variant="outline"
                                size="sm"
                                onClick={() => setShowCalibration(true)}
                            >
                                🎯 Calibrate Gestures
                            </GlowButton>
                        )}

                        {/* Recalibrate */}
                        {isCalibrated && (
                            <button
                                onClick={() => setShowCalibration(true)}
                                className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                            >
                                Recalibrate
                            </button>
                        )}

                        {!user && (
                            <GlowButton size="sm" onClick={() => openAuthModal("signup")}>
                                Save Progress
                            </GlowButton>
                        )}
                    </motion.div>
                </div>

                {/* ── Progress bar (if user) ── */}
                {user && completedIds.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="glass rounded-2xl p-5 mb-8 flex items-center gap-5"
                    >
                        <div className="flex-shrink-0">
                            <p className="font-display text-2xl font-bold gradient-text">{completionPct}%</p>
                            <p className="text-xs text-gray-600">complete</p>
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm text-gray-400 font-medium">Your progress</p>
                                <p className="text-xs text-gray-600">{completedIds.length}/{experiences.length} experiences</p>
                            </div>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${completionPct}%` }}
                                    transition={{ duration: 1, ease: "easeOut" }}
                                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* ── View toggle ── */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-gray-500 font-medium">
                            {experiences.length} experiences
                        </p>
                        {isCalibrated && (
                            <Badge variant="info" dot>Gesture nav active</Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-1 glass rounded-xl p-1">
                        {(["carousel", "grid"] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setViewMode(mode)}
                                className={cn(
                                    "px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all duration-200",
                                    viewMode === mode
                                        ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-glow-sm"
                                        : "text-gray-500 hover:text-gray-300"
                                )}
                            >
                                {mode === "carousel" ? "⟳ Carousel" : "⊞ Grid"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Main view ── */}
                <AnimatePresence mode="wait">
                    {viewMode === "carousel" ? (
                        <motion.div
                            key="carousel"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <CarouselView />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="grid"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                        >
                            <GridView />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── No webcam banner ── */}
                {!webcamSupported && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 glass rounded-2xl p-6 border border-amber-500/20 bg-amber-500/5"
                    >
                        <div className="flex items-start gap-4">
                            <span className="text-2xl">⚠️</span>
                            <div>
                                <p className="text-amber-400 font-semibold mb-1">No webcam detected</p>
                                <p className="text-gray-500 text-sm">
                                    Gesture controls require a webcam. You can still explore all experiences
                                    using mouse/touch interactions as a fallback.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </PageWrapper>
    );
}