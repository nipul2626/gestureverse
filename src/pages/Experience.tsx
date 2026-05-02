import { useEffect, Suspense, lazy } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "@/components/Layout/PageWrapper";
import GestureEngine from "@/components/Gestures/GestureEngine";
import GestureHUD from "@/components/Gestures/GestureHUD";
import GlowButton from "@/components/UI/GlowButton";
import Badge from "@/components/UI/Badge";
import Loader from "@/components/UI/Loader";
import { useExperienceStore } from "@/store/experienceStore";
import { useGestureStore } from "@/store/gestureStore";
import { useAuthStore } from "@/store/authStore";

// Lazy load experiences
const ParticlePlayground = lazy(() => import("@/components/Experiences/ParticlePlayground"));
const ProductSpin = lazy(() => import("@/components/Experiences/ProductSpin"));
const SoundSculptor = lazy(() => import("@/components/Experiences/SoundSculptor"));
const DataSphere = lazy(() => import("@/components/Experiences/DataSphere"));
const VirtualGallery = lazy(() => import("@/components/Experiences/VirtualGallery"));

const EXPERIENCE_MAP: Record<string, React.ComponentType> = {
    "particle-playground": ParticlePlayground,
    "product-spin": ProductSpin,
    "sound-sculptor": SoundSculptor,
    "data-sphere": DataSphere,
    "virtual-gallery": VirtualGallery,
};

const GESTURE_GUIDES: Record<string, { gesture: string; action: string }[]> = {
    "particle-playground": [
        { gesture: "🖐 Open Palm", action: "Repel particles" },
        { gesture: "✊ Fist", action: "Attract particles" },
        { gesture: "🤌 Pinch", action: "Spiral effect" },
        { gesture: "👈 Swipe", action: "Explosion burst" },
    ],
    "product-spin": [
        { gesture: "🖐 Open Palm", action: "Rotate model" },
        { gesture: "🤌 Pinch", action: "Zoom in/out" },
        { gesture: "☝️ Point", action: "Drag rotate" },
    ],
    "sound-sculptor": [
        { gesture: "🖐 Open Palm", action: "Play note (height = pitch)" },
        { gesture: "✌️ Peace", action: "Sustain note (X = pitch)" },
        { gesture: "↕️ Hand height", action: "Filter frequency" },
        { gesture: "↔️ Hand X", action: "Reverb amount" },
    ],
    "data-sphere": [
        { gesture: "☝️ Point", action: "Rotate sphere" },
        { gesture: "🖐 Open Palm", action: "Pan view" },
        { gesture: "✊ Fist", action: "Scale down" },
        { gesture: "🤌 Pinch", action: "Scale up" },
    ],
    "virtual-gallery": [
        { gesture: "👈 Swipe Left", action: "Next artwork" },
        { gesture: "👉 Swipe Right", action: "Previous artwork" },
        { gesture: "🤌 Pinch", action: "Zoom in" },
        { gesture: "🖐 Open Palm", action: "Zoom out" },
        { gesture: "☝️ Point", action: "Pan camera" },
    ],
};

export default function Experience() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { getExperience, markCompleted, setActiveExperience } = useExperienceStore();
    const { isCalibrated, webcamSupported } = useGestureStore();
    const { user } = useAuthStore();

    const experience = id ? getExperience(id) : undefined;
    const ExperienceComponent = id ? EXPERIENCE_MAP[id] : undefined;
    const gestureGuide = id ? GESTURE_GUIDES[id] ?? [] : [];

    useEffect(() => {
        if (id) setActiveExperience(id);
        return () => setActiveExperience(null);
    }, [id, setActiveExperience]);

    // Mark complete after 15s
    useEffect(() => {
        if (!id) return;
        const t = setTimeout(() => {
            markCompleted(id);
        }, 15000);
        return () => clearTimeout(t);
    }, [id, markCompleted]);

    if (!experience || !ExperienceComponent) {
        return (
            <PageWrapper>
                <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-6xl mb-4">🌌</p>
                        <h2 className="font-display text-2xl font-bold text-white mb-4">
                            Experience not found
                        </h2>
                        <GlowButton onClick={() => navigate("/dashboard")}>
                            Back to Dashboard
                        </GlowButton>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper showNav={false} className="!pt-0">
            {/* Gesture Engine */}
            {isCalibrated && webcamSupported && (
                <div className="fixed bottom-4 left-4 z-30 w-40">
                    <GestureEngine showVideo showSkeleton />
                </div>
            )}

            {/* Gesture HUD */}
            <GestureHUD position="bottom-right" compact />

            {/* ── Top bar ── */}
            <motion.div
                initial={{ y: -60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="fixed top-0 left-0 right-0 z-40 px-4 py-3"
            >
                <div className="flex items-center justify-between glass rounded-2xl px-4 py-2.5 max-w-7xl mx-auto">
                    {/* Back */}
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
                    >
                        ← Dashboard
                    </button>

                    {/* Experience info */}
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${experience.gradient} flex items-center justify-center text-sm font-bold`}
                        >
                            {experience.icon}
                        </div>
                        <div className="hidden sm:block">
                            <p className="text-sm font-semibold text-white leading-none">{experience.title}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{experience.subtitle}</p>
                        </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex items-center gap-2">
                        {isCalibrated ? (
                            <Badge variant="success" dot>Gesture Active</Badge>
                        ) : (
                            <Badge variant="warning">Mouse mode</Badge>
                        )}
                    </div>
                </div>
            </motion.div>

            {/* ── Full screen experience canvas ── */}
            <div className="fixed inset-0 z-10 pt-16">
                <Suspense
                    fallback={
                        <div className="w-full h-full flex items-center justify-center bg-dark-900">
                            <Loader size="lg" text={`Loading ${experience.title}...`} />
                        </div>
                    }
                >
                    <ExperienceComponent />
                </Suspense>
            </div>

            {/* ── Gesture guide panel ── */}
            <motion.div
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="fixed top-20 right-4 z-40"
            >
                <div className="glass rounded-2xl p-4 w-52">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                        Gesture Guide
                    </p>
                    <div className="space-y-2">
                        {gestureGuide.map((item, i) => (
                            <div key={i} className="flex items-start gap-2">
                <span className="text-xs font-mono text-indigo-400 flex-shrink-0 mt-0.5 w-24 truncate">
                  {item.gesture}
                </span>
                                <span className="text-xs text-gray-500">{item.action}</span>
                            </div>
                        ))}
                    </div>

                    {!isCalibrated && (
                        <div className="mt-3 pt-3 border-t border-white/5">
                            <p className="text-xs text-amber-400/80">
                                ⚠️ Calibrate gestures on the dashboard for full control
                            </p>
                        </div>
                    )}
                </div>
            </motion.div>
        </PageWrapper>
    );
}