import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useExperienceStore } from "@/store/experienceStore";
import { useGestureStore } from "@/store/gestureStore";
import Badge from "@/components/UI/Badge";
import GlowButton from "@/components/UI/GlowButton";
import { cn } from "@/lib/utils";

const difficultyVariant: Record<string, "success" | "warning" | "danger"> = {
    Beginner: "success",
    Intermediate: "warning",
    Advanced: "danger",
};

export default function CarouselView() {
    const navigate = useNavigate();
    const { experiences, completedIds, setActiveExperience } = useExperienceStore();
    const { lastGestureEvent } = useGestureStore();
    const [activeIndex, setActiveIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const lastGestureRef = useRef<string | null>(null);

    const total = experiences.length;
    const active = experiences[activeIndex];

    const goNext = () => {
        setDirection(1);
        setActiveIndex((i) => (i + 1) % total);
    };

    const goPrev = () => {
        setDirection(-1);
        setActiveIndex((i) => (i - 1 + total) % total);
    };

    // Gesture navigation
    useEffect(() => {
        const event = lastGestureEvent;
        if (!event) return;
        if (event.gesture === lastGestureRef.current) return;
        lastGestureRef.current = event.gesture;

        if (event.gesture === "swipe_left") goNext();
        if (event.gesture === "swipe_right") goPrev();
    }, [lastGestureEvent]);

    const handleLaunch = () => {
        setActiveExperience(active.id);
        navigate(active.route);
    };

    const variants = {
        enter: (dir: number) => ({
            x: dir > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.92,
        }),
        center: { x: 0, opacity: 1, scale: 1 },
        exit: (dir: number) => ({
            x: dir < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.92,
        }),
    };

    return (
        <div className="w-full flex flex-col items-center gap-8">
            {/* Gesture hint */}
            <p className="text-xs text-gray-600 font-medium flex items-center gap-2">
                <span>👈</span> Swipe gesture to navigate <span>👉</span>
            </p>

            {/* Main carousel */}
            <div className="relative w-full max-w-2xl">
                {/* Prev / Next arrows */}
                <button
                    onClick={goPrev}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-14 z-10 w-10 h-10 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                    ←
                </button>
                <button
                    onClick={goNext}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-14 z-10 w-10 h-10 glass rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
                >
                    →
                </button>

                {/* Card */}
                <div className="overflow-hidden rounded-3xl">
                    <AnimatePresence custom={direction} mode="wait">
                        <motion.div
                            key={activeIndex}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                            className="relative glass rounded-3xl overflow-hidden"
                        >
                            {/* Gradient header */}
                            <div className={cn("h-2 w-full bg-gradient-to-r", active.gradient)} />

                            {/* Glow bg */}
                            <div
                                className="absolute inset-0 pointer-events-none"
                                style={{
                                    background: `radial-gradient(ellipse at top, ${active.accentColor}12 0%, transparent 60%)`,
                                }}
                            />

                            <div className="relative z-10 p-8 md:p-10">
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    {/* Left */}
                                    <div className="flex-1">
                                        <div
                                            className={cn(
                                                "w-20 h-20 rounded-3xl bg-gradient-to-br flex items-center justify-center text-4xl mb-6",
                                                active.gradient
                                            )}
                                            style={{ boxShadow: `0 12px 40px ${active.accentColor}40` }}
                                        >
                                            {active.icon}
                                        </div>

                                        <Badge variant={difficultyVariant[active.difficulty]} className="mb-3">
                                            {active.difficulty}
                                        </Badge>

                                        <h2 className="font-display text-3xl font-bold text-white mb-2">
                                            {active.title}
                                        </h2>
                                        <p className="text-lg font-medium mb-4" style={{ color: active.accentColor }}>
                                            {active.subtitle}
                                        </p>
                                        <p className="text-gray-400 leading-relaxed mb-6">
                                            {active.description}
                                        </p>

                                        {/* Tags */}
                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {active.tags.map((tag) => (
                                                <Badge key={tag} variant="default">{tag}</Badge>
                                            ))}
                                        </div>

                                        {/* Gestures */}
                                        <div>
                                            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wider font-semibold">
                                                Gestures
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {active.gestures.map((g) => (
                                                    <span
                                                        key={g}
                                                        className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-gray-400 font-mono bg-white/5"
                                                    >
                            {g.replace(/_/g, " ")}
                          </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: launch */}
                                    <div className="flex flex-col items-center gap-4 md:pt-4">
                                        {completedIds.includes(active.id) && (
                                            <Badge variant="success" dot>Completed</Badge>
                                        )}
                                        <GlowButton
                                            variant="primary"
                                            size="lg"
                                            onClick={handleLaunch}
                                        >
                                            Launch →
                                        </GlowButton>
                                        <p className="text-xs text-gray-600 text-center max-w-[100px]">
                                            Or pinch gesture to open
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
                {experiences.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); }}
                        className="transition-all duration-300"
                    >
                        <motion.div
                            animate={{
                                width: i === activeIndex ? 24 : 8,
                                backgroundColor: i === activeIndex ? "#22d3ee" : "rgba(255,255,255,0.15)",
                            }}
                            style={{ height: 8, borderRadius: 4 }}
                        />
                    </button>
                ))}
            </div>

            {/* Mini preview strip */}
            <div className="flex gap-3 w-full max-w-2xl overflow-x-auto pb-2 scrollbar-hide">
                {experiences.map((exp, i) => (
                    <button
                        key={exp.id}
                        onClick={() => { setDirection(i > activeIndex ? 1 : -1); setActiveIndex(i); }}
                        className={cn(
                            "flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 border",
                            i === activeIndex
                                ? "border-white/20 bg-white/8 text-white"
                                : "border-white/5 bg-white/3 text-gray-600 hover:text-gray-400 hover:border-white/10"
                        )}
                    >
                        <span className="text-sm">{exp.icon}</span>
                        <span className="text-xs font-medium whitespace-nowrap">{exp.title}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}