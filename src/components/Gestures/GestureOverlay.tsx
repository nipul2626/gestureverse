// src/components/Gestures/GestureOverlay.tsx
// GestureVerse v2 — Phase 1: Full neon hand skeleton redesign.
// Left = indigo/violet | Right = cyan. Glow rings, palm pulse, wrist labels.
// Canvas mirrored (scaleX -1). Confirmation flash on gesture detect.

import { useEffect, useRef, useCallback } from 'react'
import { useGestureStore } from '../../store/gestureStore'
import type { DetectedHand } from '../../store/gestureStore'
import type { LandmarkPoint } from '../../lib/gestureInterpreter'

// ─── Hand Connection Graph ────────────────────────────────────────────────────
// MediaPipe Hands 21-landmark connection pairs
const CONNECTIONS: [number, number][] = [
    // Thumb
    [0, 1], [1, 2], [2, 3], [3, 4],
    // Index
    [0, 5], [5, 6], [6, 7], [7, 8],
    // Middle
    [0, 9], [9, 10], [10, 11], [11, 12],
    // Ring
    [0, 13], [13, 14], [14, 15], [15, 16],
    // Pinky
    [0, 17], [17, 18], [18, 19], [19, 20],
    // Palm cross-connectors
    [5, 9], [9, 13], [13, 17],
]

const PALM_CONNECTORS = new Set([[5, 9], [9, 13], [13, 17]].map(p => `${p[0]}-${p[1]}`))

const FINGERTIP_INDICES = new Set([4, 8, 12, 16, 20])

// ─── Colors ───────────────────────────────────────────────────────────────────
const COLORS = {
    left: {
        line: 'rgba(99, 102, 241, 0.7)',
        joint: 'rgba(139, 92, 246, 0.9)',
        tip: 'rgba(167, 139, 250, 1)',
        tipGlow: 'rgba(139, 92, 246, 0.3)',
        palm: 'rgba(139, 92, 246, 0.7)',
        label: '#8b5cf6',
        labelBg: 'rgba(99, 102, 241, 0.25)',
    },
    right: {
        line: 'rgba(34, 211, 238, 0.7)',
        joint: 'rgba(6, 182, 212, 0.9)',
        tip: 'rgba(103, 232, 249, 1)',
        tipGlow: 'rgba(34, 211, 238, 0.3)',
        palm: 'rgba(34, 211, 238, 0.7)',
        label: '#22d3ee',
        labelBg: 'rgba(6, 182, 212, 0.2)',
    },
} as const

// ─── Flash State ──────────────────────────────────────────────────────────────
// Track fingertip flash per hand
interface FlashState {
    active: boolean
    startTime: number
    duration: number
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GestureOverlayProps {
    width?: number
    height?: number
    className?: string
}

export function GestureOverlay({
                                   width = 640,
                                   height = 480,
                                   className = '',
                               }: GestureOverlayProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const flashLeft = useRef<FlashState>({ active: false, startTime: 0, duration: 100 })
    const flashRight = useRef<FlashState>({ active: false, startTime: 0, duration: 100 })
    const prevGestureRef = useRef<string>('')
    const rafRef = useRef<number>()
    const palmPulseRef = useRef(0)

    // Subscribe to store slices
    const detectedHands = useGestureStore(s => s.detectedHands)
    const currentGesture = useGestureStore(s => s.currentGesture)

    // Trigger fingertip flash when gesture changes
    useEffect(() => {
        if (currentGesture !== 'none' && currentGesture !== prevGestureRef.current) {
            const now = performance.now()
            flashLeft.current = { active: true, startTime: now, duration: 100 }
            flashRight.current = { active: true, startTime: now, duration: 100 }
            prevGestureRef.current = currentGesture
        }
    }, [currentGesture])

    // ── Draw a single hand skeleton ───────────────────────────────────────────
    const drawHand = useCallback(
        (
            ctx: CanvasRenderingContext2D,
            hand: DetectedHand,
            canvasWidth: number,
            canvasHeight: number,
            now: number,
            palmPulse: number
        ) => {
            const lm = hand.landmarks
            const side = hand.handedness === 'Left' ? 'left' : 'right'
            const colors = COLORS[side]
            const flash = side === 'left' ? flashLeft.current : flashRight.current
            const flashProgress = flash.active
                ? Math.min(1, (now - flash.startTime) / flash.duration)
                : 1

            // Convert normalized coords to canvas pixels
            // NOTE: Canvas is mirrored via CSS transform scaleX(-1)
            // so we draw WITHOUT flipping here — the CSS handles the mirror
            const px = (p: LandmarkPoint) => ({
                x: p.x * canvasWidth,
                y: p.y * canvasHeight,
            })

            // ── 1. Draw connections ──────────────────────────────────────────────
            for (const [a, b] of CONNECTIONS) {
                const pa = px(lm[a])
                const pb = px(lm[b])
                const isPalm = PALM_CONNECTORS.has(`${a}-${b}`)

                // Gradient along bone: darker at MCP, brighter at tip
                const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y)
                const baseAlpha = isPalm ? 0.4 : 0.7
                grad.addColorStop(0, colors.line.replace('0.7', String(baseAlpha * 0.6)))
                grad.addColorStop(1, colors.line.replace('0.7', String(baseAlpha)))

                ctx.beginPath()
                ctx.moveTo(pa.x, pa.y)
                ctx.lineTo(pb.x, pb.y)
                ctx.strokeStyle = grad
                ctx.lineWidth = isPalm ? 1 : 2.5
                ctx.lineCap = 'round'
                ctx.stroke()
            }

            // ── 2. Draw joint dots ──────────────────────────────────────────────
            for (let i = 0; i < 21; i++) {
                if (FINGERTIP_INDICES.has(i)) continue // drawn separately
                const p = px(lm[i])
                ctx.beginPath()
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2)
                ctx.fillStyle = colors.joint
                ctx.fill()
            }

            // ── 3. Draw fingertips with glow rings ─────────────────────────────
            for (const tipIdx of FINGERTIP_INDICES) {
                const p = px(lm[tipIdx])

                // Flash state: white when gesture fires, normal otherwise
                const isFlashing = flash.active && flashProgress < 1
                const tipColor = isFlashing
                    ? `rgba(255, 255, 255, ${1 - flashProgress})`
                    : colors.tip

                // Glow ring
                ctx.beginPath()
                ctx.arc(p.x, p.y, 14, 0, Math.PI * 2)
                ctx.fillStyle = colors.tipGlow
                ctx.fill()

                // Tip dot
                ctx.beginPath()
                ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
                ctx.fillStyle = tipColor
                ctx.fill()

                // Extra white ring during flash
                if (isFlashing) {
                    ctx.beginPath()
                    ctx.arc(p.x, p.y, 14 * (1 - flashProgress), 0, Math.PI * 2)
                    ctx.strokeStyle = `rgba(255, 255, 255, ${1 - flashProgress})`
                    ctx.lineWidth = 1.5
                    ctx.stroke()
                }
            }

            // Deactivate flash when done
            if (flash.active && flashProgress >= 1) {
                flash.active = false
            }

            // ── 4. Palm center pulsing indicator ──────────────────────────────
            const wrist = px(lm[0])
            const indexMCP = px(lm[5])
            const middleMCP = px(lm[9])
            const palmX = (wrist.x + indexMCP.x + middleMCP.x) / 3
            const palmY = (wrist.y + indexMCP.y + middleMCP.y) / 3

            const pulseOpacity = 0.4 + 0.3 * Math.sin(palmPulse * 3)
            ctx.beginPath()
            ctx.arc(palmX, palmY, 8, 0, Math.PI * 2)
            ctx.fillStyle = colors.palm.replace('0.7', String(pulseOpacity))
            ctx.fill()

            // ── 5. Wrist label pill ──────────────────────────────────────────
            const wristPt = px(lm[0])
            const label = hand.handedness === 'Left' ? 'L' : 'R'
            const labelPadX = 6
            const labelPadY = 3
            const fontSize = 10

            ctx.font = `500 ${fontSize}px Inter, sans-serif`
            const textWidth = ctx.measureText(label).width

            const rx = wristPt.x - textWidth / 2 - labelPadX
            const ry = wristPt.y + 12
            const rw = textWidth + labelPadX * 2
            const rh = fontSize + labelPadY * 2

            // Pill background
            ctx.beginPath()
            ctx.roundRect(rx, ry, rw, rh, rh / 2)
            ctx.fillStyle = colors.labelBg
            ctx.fill()
            ctx.strokeStyle = colors.label
            ctx.lineWidth = 0.8
            ctx.stroke()

            // Label text
            ctx.fillStyle = colors.label
            ctx.textAlign = 'center'
            ctx.textBaseline = 'middle'
            ctx.fillText(label, wristPt.x, ry + rh / 2)
        },
        []
    )

    // ── Render loop ────────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const ctx = canvas.getContext('2d')
        if (!ctx) return

        let running = true

        function render(now: number) {
            if (!running || !ctx) return

            ctx.clearRect(0, 0, canvas!.width, canvas!.height)

            // Increment palm pulse
            palmPulseRef.current += 0.016

            // Get current hands from store (via closure - store is reactive)
            const hands = useGestureStore.getState().detectedHands

            for (const hand of hands) {
                drawHand(ctx, hand, canvas!.width, canvas!.height, now, palmPulseRef.current)
            }

            rafRef.current = requestAnimationFrame(render)
        }

        rafRef.current = requestAnimationFrame(render)

        return () => {
            running = false
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [drawHand])

    // Update canvas size if props change
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        canvas.width = width
        canvas.height = height
    }, [width, height])

    return (
        <canvas
            ref={canvasRef}
            width={width}
            height={height}
            className={className}
            style={{
                // Mirror canvas to match selfie view
                transform: 'scaleX(-1)',
                pointerEvents: 'none',
            }}
        />
    )
}

// Re-export type for external use
export type { DetectedHand }