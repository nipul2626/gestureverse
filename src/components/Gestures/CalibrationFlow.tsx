import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGestureStore } from "@/store/gestureStore";
import { useAuthStore } from "@/store/authStore";
import { useWebcam } from "@/hooks/useWebcam";
import GlowButton from "@/components/UI/GlowButton";

interface CalibrationStep {
    id: number;
    title: string;
    instruction: string;
    gesture: string;
    emoji: string;
    duration: number; // ms to hold gesture
}

const STEPS: CalibrationStep[] = [
    {
        id: 0,
        title: "Welcome to GestureVerse",
        instruction: "We'll calibrate your hand tracking in 4 quick steps. Make sure your hand is visible in the camera.",
        gesture: "none",
        emoji: "👋",
        duration: 0,
    },
    {
        id: 1,
        title: "Open Palm",
        instruction: "Hold your hand open flat, facing the camera. Keep all fingers spread.",
        gesture: "open_palm",
        emoji: "🖐",
        duration: 2000,
    },
    {
        id: 2,
        title: "Closed Fist",
        instruction: "Now make a fist. Hold it steady for 2 seconds.",
        gesture: "closed_fist",
        emoji: "✊",
        duration: 2000,
    },
    {
        id: 3,
        title: "Pinch",
        instruction: "Bring your thumb and index finger together. This controls zoom and selection.",
        gesture: "pinch",
        emoji: "🤌",
        duration: 2000,
    },
    {
        id: 4,
        title: "All Done!",
        instruction: "Excellent calibration! You're ready to explore GestureVerse.",
        gesture: "none",
        emoji: "🎉",
        duration: 0,
    },
];

interface CalibrationFlowProps {
    onComplete: () => void;
    onSkip: () => void;
}

export default function CalibrationFlow({ onComplete, onSkip }: CalibrationFlowProps) {
    const [step, setStep] = useState(0);
    const [holding, setHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [dominantHand, setDominantHand] = useState<"left" | "right">("right");
    const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const { setCalibrated, setSensitivity, setDominantHand: storeSetHand, setCalibrationStep } =
        useGestureStore();
    const { updateGesturePreferences } = useAuthStore();
    const { videoRef, startCamera } = useWebcam();

    useEffect(() => {
        startCamera();
    }, [startCamera]);

    useEffect(() => {
        setCalibrationStep(step);
    }, [step, setCalibrationStep]);

    const currentStep = STEPS[step];
    const isActionStep = currentStep.duration > 0;

    const startHolding = () => {
        if (!isActionStep || holding) return;
        setHolding(true);
        setProgress(0);

        const interval = 50;
        const total = currentStep.duration;
        let elapsed = 0;

        progressRef.current = setInterval(() => {
            elapsed += interval;
            const pct = Math.min((elapsed / total) * 100, 100);
            setProgress(pct);

            if (elapsed >= total) {
                clearInterval(progressRef.current!);
                setHolding(false);
                setProgress(100);
                setTimeout(() => {
                    setProgress(0);
                    setStep((s) => s + 1);
                }, 400);
            }
        }, interval);
    };

    const stopHolding = () => {
        if (progressRef.current) clearInterval(progressRef.current);
        setHolding(false);
        setProgress(0);
    };

    const handleComplete = async () => {
        storeSetHand(dominantHand);
        setSensitivity(0.7);
        setCalibrated(true);

        await updateGesturePreferences({
            sensitivity: 0.7,
            dominantHand,
            enabledGestures: ["open_palm", "closed_fist", "pinch", "pointing", "peace", "swipe_left", "swipe_right"],
            calibrationData: {},
        });

        onComplete();
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(20px)" }}
        >
            {/* Scan line effect */}
            <div className="scan-line pointer-events-none" />

            {/* Ambient glow */}
            <div
                className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
                style={{
                    background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
            />

            <div className="relative z-10 w-full max-w-3xl px-6 flex flex-col lg:flex-row gap-8 items-center">
                {/* Left: Camera preview */}
                <div className="relative w-full lg:w-80 flex-shrink-0">
                    <div className="relative rounded-2xl overflow-hidden neon-border aspect-[4/3] bg-dark-800">
                        <video
                            ref={videoRef}
                            className="w-full h-full object-cover"
                            playsInline
                            muted
                            style={{ transform: "scaleX(-1)" }}
                        />

                        {/* Corner brackets */}
                        {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
                            <div
                                key={i}
                                className={`absolute ${pos} w-6 h-6 pointer-events-none`}
                                style={{
                                    borderTop: i < 2 ? "2px solid rgba(99,102,241,0.7)" : "none",
                                    borderBottom: i >= 2 ? "2px solid rgba(99,102,241,0.7)" : "none",
                                    borderLeft: i % 2 === 0 ? "2px solid rgba(99,102,241,0.7)" : "none",
                                    borderRight: i % 2 === 1 ? "2px solid rgba(99,102,241,0.7)" : "none",
                                }}
                            />
                        ))}

                        {/* Live indicator */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                            <span className="text-xs text-gray-300 font-medium">LIVE</span>
                        </div>
                    </div>

                    {/* Step dots */}
                    <div className="flex justify-center gap-2 mt-4">
                        {STEPS.map((s) => (
                            <motion.div
                                key={s.id}
                                className="rounded-full transition-all duration-300"
                                animate={{
                                    width: s.id === step ? 24 : 8,
                                    backgroundColor: s.id < step
                                        ? "#6366f1"
                                        : s.id === step
                                            ? "#22d3ee"
                                            : "rgba(255,255,255,0.15)",
                                }}
                                style={{ height: 8 }}
                            />
                        ))}
                    </div>
                </div>

                {/* Right: Step content */}
                <div className="flex-1 flex flex-col gap-6">
                    {/* Step header */}
                    <div>
                        <p className="text-xs text-indigo-400 font-semibold tracking-widest uppercase mb-2">
                            {step === 0 ? "Calibration" : step === STEPS.length - 1 ? "Complete" : `Step ${step} of ${STEPS.length - 2}`}
                        </p>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="text-6xl mb-4">{currentStep.emoji}</div>
                                <h2 className="font-display text-3xl font-bold text-white mb-3">
                                    {currentStep.title}
                                </h2>
                                <p className="text-gray-400 text-base leading-relaxed">
                                    {currentStep.instruction}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Dominant hand selector (step 0 only) */}
                    {step === 0 && (
                        <div>
                            <p className="text-sm text-gray-500 mb-3">Dominant hand</p>
                            <div className="flex gap-3">
                                {(["left", "right"] as const).map((hand) => (
                                    <button
                                        key={hand}
                                        onClick={() => setDominantHand(hand)}
                                        className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold capitalize transition-all duration-200 ${
                                            dominantHand === hand
                                                ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                                                : "border-white/10 text-gray-500 hover:border-white/20 hover:text-gray-300"
                                        }`}
                                    >
                                        {hand === "left" ? "🤚" : "✋"} {hand}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hold progress */}
                    {isActionStep && (
                        <div className="space-y-2">
                            <p className="text-xs text-gray-500 font-medium">
                                Hold gesture to confirm
                            </p>
                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                                    style={{ width: `${progress}%` }}
                                    transition={{ duration: 0.05 }}
                                />
                            </div>
                            <button
                                onMouseDown={startHolding}
                                onMouseUp={stopHolding}
                                onTouchStart={startHolding}
                                onTouchEnd={stopHolding}
                                className={`w-full py-4 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 ${
                                    holding
                                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                                        : "border-white/10 bg-white/5 text-gray-400 hover:border-indigo-500/50 hover:text-gray-300"
                                }`}
                            >
                                {holding ? "Holding... keep it steady" : "Hold to confirm gesture"}
                            </button>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3">
                        {step === 0 && (
                            <GlowButton variant="primary" size="lg" onClick={() => setStep(1)} fullWidth>
                                Start Calibration →
                            </GlowButton>
                        )}
                        {step === STEPS.length - 1 && (
                            <GlowButton variant="primary" size="lg" onClick={handleComplete} fullWidth>
                                Enter GestureVerse 🚀
                            </GlowButton>
                        )}
                        <button
                            onClick={onSkip}
                            className="text-sm text-gray-600 hover:text-gray-400 transition-colors whitespace-nowrap"
                        >
                            Skip for now
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}