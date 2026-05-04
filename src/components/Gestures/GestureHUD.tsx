// src/components/Gestures/GestureHUD.tsx
// GestureVerse v2 — Live gesture HUD with confidence bar, FPS, latency.
// Framer Motion pulse animation on gesture fire. Power Mode display.

import { useEffect, useRef } from 'react'
import { motion, useAnimation } from 'framer-motion'
import { useGestureStore } from '@/store/gestureStore.ts'
import type { GestureName } from '@/lib/gestureInterpreter.ts'

// ─── Gesture Display Names ────────────────────────────────────────────────────
const GESTURE_LABELS: Record<GestureName, string> = {
    open_palm: '🖐 Open Palm',
    closed_fist: '✊ Fist',
    pinch: '🤏 Pinch',
    pointing: '☝️ Pointing',
    peace: '✌️ Peace',
    thumbs_up: '👍 Thumbs Up',
    thumbs_down: '👎 Thumbs Down',
    swipe_left: '← Swipe Left',
    swipe_right: '→ Swipe Right',
    swipe_up: '↑ Swipe Up',
    swipe_down: '↓ Swipe Down',
    rotate_cw: '↻ Rotate CW',
    rotate_ccw: '↺ Rotate CCW',
    zoom_in: '🔍 Zoom In',
    zoom_out: '🔎 Zoom Out',
    snap: '👌 Snap',
    wave: '👋 Wave',
    grab: '🫳 Grab',
    magnetic_pull: '🧲 Magnetic',
    wrist_tilt: '↗ Tilt',
    none: '— No Gesture',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GestureHUDProps {
    /** Whether to show expanded stats */
    showStats?: boolean
    className?: string
}

export function GestureHUD({ showStats = true, className = '' }: GestureHUDProps) {
    const currentGesture = useGestureStore(s => s.currentGesture)
    const currentConfidence = useGestureStore(s => s.currentConfidence)
    const currentHand = useGestureStore(s => s.currentHand)
    const fps = useGestureStore(s => s.fps)
    const latencyMs = useGestureStore(s => s.latencyMs)
    const powerMode = useGestureStore(s => s.powerMode)
    const lastGestureEvent = useGestureStore(s => s.lastGestureEvent)

    const borderControls = useAnimation()
    const prevEventRef = useRef(lastGestureEvent)

    // Pulse border on gesture fire
    useEffect(() => {
        if (!lastGestureEvent || lastGestureEvent === prevEventRef.current) return
        prevEventRef.current = lastGestureEvent

        borderControls.start({
            boxShadow: [
                '0 0 0 0 rgba(255, 255, 255, 0)',
                '0 0 0 2px rgba(255, 255, 255, 0.8)',
                '0 0 0 0 rgba(255, 255, 255, 0)',
            ],
            transition: { duration: 0.2, ease: 'easeOut' },
        })
    }, [lastGestureEvent, borderControls])

    const isActive = currentGesture !== 'none'
    const label = GESTURE_LABELS[currentGesture] ?? currentGesture

    // Confidence bar color
    const confColor =
        currentConfidence > 0.8
            ? '#22d3ee'
            : currentConfidence > 0.6
                ? '#a78bfa'
                : '#6366f1'

    return (
        <motion.div
            animate={borderControls}
            className={`
        backdrop-blur-xl rounded-xl border
        bg-white/[0.04] border-white/[0.08]
        overflow-hidden min-w-[200px]
        ${powerMode ? 'border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.3)]' : ''}
        ${className}
      `}
            style={{ boxShadow: '0 0 0 0 rgba(255,255,255,0)' }}
        >
            {/* Power Mode Banner */}
            {powerMode && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: [0.7, 1, 0.7], y: 0 }}
                    transition={{ opacity: { repeat: Infinity, duration: 0.8 } }}
                    className="bg-cyan-500/20 border-b border-cyan-400/30 px-3 py-1 text-center"
                >
          <span className="text-cyan-300 text-[10px] font-bold tracking-[0.2em] uppercase">
            ⚡ POWER MODE
          </span>
                </motion.div>
            )}

            <div className="p-3 space-y-2">
                {/* Gesture Name */}
                <div className="flex items-center justify-between gap-3">
                    <motion.span
                        key={currentGesture}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15 }}
                        className={`text-sm font-medium ${isActive ? 'text-white' : 'text-white/40'}`}
                    >
                        {label}
                    </motion.span>

                    {/* Hand indicator */}
                    {currentHand && (
                        <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                currentHand === 'Left'
                                    ? 'bg-violet-500/30 text-violet-300'
                                    : 'bg-cyan-500/30 text-cyan-300'
                            }`}
                        >
              {currentHand === 'Left' ? 'L' : 'R'}
            </span>
                    )}
                </div>

                {/* Confidence Bar */}
                <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full"
                        animate={{ width: `${currentConfidence * 100}%` }}
                        transition={{ duration: 0.1, ease: 'linear' }}
                        style={{ backgroundColor: confColor }}
                    />
                </div>

                {/* Confidence Percentage */}
                <div className="flex justify-between items-center">
                    <span className="text-[10px] text-white/40">Confidence</span>
                    <span className="text-[10px] text-white/60 font-mono">
            {(currentConfidence * 100).toFixed(0)}%
          </span>
                </div>

                {/* Stats Row */}
                {showStats && (
                    <div className="flex gap-3 pt-1 border-t border-white/[0.06]">
                        <div className="flex-1 text-center">
                            <div className="text-[10px] text-white/40">FPS</div>
                            <div className={`text-xs font-mono font-bold ${fps >= 25 ? 'text-emerald-400' : fps >= 15 ? 'text-amber-400' : 'text-red-400'}`}>
                                {fps}
                            </div>
                        </div>
                        <div className="w-px bg-white/[0.06]" />
                        <div className="flex-1 text-center">
                            <div className="text-[10px] text-white/40">ms</div>
                            <div className={`text-xs font-mono font-bold ${latencyMs < 50 ? 'text-emerald-400' : latencyMs < 100 ? 'text-amber-400' : 'text-red-400'}`}>
                                {latencyMs}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    )
}

export default GestureHUD