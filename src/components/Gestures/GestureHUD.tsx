import { motion, AnimatePresence } from "framer-motion";
import { useGestureStore } from "@/store/gestureStore";
import { GESTURE_LABELS, GESTURE_EMOJI } from "@/lib/gestureInterpreter";
import Badge from "@/components/UI/Badge";

interface GestureHUDProps {
    position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
    compact?: boolean;
}

const positionClasses = {
    "top-left": "top-4 left-4",
    "top-right": "top-4 right-4",
    "bottom-left": "bottom-4 left-4",
    "bottom-right": "bottom-4 right-4",
};

export default function GestureHUD({
                                       position = "bottom-right",
                                       compact = false,
                                   }: GestureHUDProps) {
    const { currentGesture, gestureConfidence, fps, latency, engineReady, detectedHands } =
        useGestureStore();

    if (!engineReady) return null;

    const label = GESTURE_LABELS[currentGesture];
    const emoji = GESTURE_EMOJI[currentGesture];
    const isActive = currentGesture !== "none" && gestureConfidence > 0.5;

    return (
        <div className={`fixed ${positionClasses[position]} z-40 flex flex-col gap-2 items-end`}>
            {/* Main gesture display */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentGesture}
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className={`glass rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[160px] ${
                        isActive ? "neon-border-cyan" : ""
                    }`}
                >
                    <span className="text-2xl">{emoji}</span>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${isActive ? "text-cyan-400" : "text-gray-500"}`}>
                            {isActive ? label : "No Gesture"}
                        </p>
                        {isActive && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full"
                                        style={{ width: `${gestureConfidence * 100}%` }}
                                        layoutId="confidence-bar"
                                    />
                                </div>
                                <span className="text-xs text-gray-500 font-mono">
                  {Math.round(gestureConfidence * 100)}%
                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Stats row */}
            {!compact && (
                <div className="flex items-center gap-2">
                    <div className="glass rounded-xl px-3 py-1.5 flex items-center gap-2">
            <span
                className={`w-1.5 h-1.5 rounded-full ${
                    detectedHands.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-gray-600"
                }`}
            />
                        <span className="text-xs font-mono text-gray-400">
              {detectedHands.length === 0
                  ? "No hands"
                  : detectedHands.length === 1
                      ? "1 hand"
                      : "2 hands"}
            </span>
                    </div>

                    <div className="glass rounded-xl px-3 py-1.5">
            <span className="text-xs font-mono text-gray-500">
              {fps}
                <span className="text-gray-600">fps</span>
                {" · "}
                {latency}
                <span className="text-gray-600">ms</span>
            </span>
                    </div>
                </div>
            )}
        </div>
    );
}