// src/components/Gestures/GestureFlash.tsx
// GestureVerse v2 — Screen edge flash on gesture fire.
// 4 corner gradient overlays that pulse on each discrete gesture.
// Color maps to gesture category. Zero React state updates — pure DOM animation.

import { useEffect, useRef } from 'react'
import { useGestureStore } from '@/store/gestureStore.ts'
import type { GestureName } from '@/lib/gestureInterpreter.ts'

// ─── Category → Color Mapping ─────────────────────────────────────────────────

function getFlashColor(gesture: GestureName): string {
    switch (gesture) {
        // Manipulation
        case 'grab':
        case 'magnetic_pull':
        case 'pinch':
            return '#22d3ee'  // cyan

        // Navigation
        case 'swipe_left':
        case 'swipe_right':
        case 'swipe_up':
        case 'swipe_down':
        case 'pointing':
            return '#6366f1'  // indigo

        // System
        case 'wave':
        case 'thumbs_up':
        case 'thumbs_down':
        case 'peace':
            return '#8b5cf6'  // violet

        // Air Draw
        case 'snap':
            return '#a855f7'  // purple-ish

        // Rotation / Scale
        case 'zoom_in':
        case 'zoom_out':
        case 'rotate_cw':
        case 'rotate_ccw':
            return '#f59e0b'  // amber

        default:
            return '#6366f1'
    }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function GestureFlash() {
    const overlayRef = useRef<HTMLDivElement>(null)
    const animatingRef = useRef(false)

    const lastGestureEvent = useGestureStore(s => s.lastGestureEvent)
    const prevEventRef = useRef(lastGestureEvent)

    useEffect(() => {
        if (!lastGestureEvent || lastGestureEvent === prevEventRef.current) return
        if (!overlayRef.current) return

        prevEventRef.current = lastGestureEvent

        const color = getFlashColor(lastGestureEvent.gesture)

        // Prevent overlapping animations
        if (animatingRef.current) return
        animatingRef.current = true

        const el = overlayRef.current

        // Set gradient color
        el.style.setProperty('--flash-color', color)

        // Trigger animation via class toggle
        el.classList.remove('gesture-flash-active')
        // Force reflow
        void el.offsetWidth
        el.classList.add('gesture-flash-active')

        setTimeout(() => {
            animatingRef.current = false
        }, 220)
    }, [lastGestureEvent])

    return (
        <>
            {/* Global animation styles — injected once */}
            <style>{`
        .gesture-flash-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 9999;
          opacity: 0;
          --flash-color: #6366f1;
        }

        .gesture-flash-overlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at top left, var(--flash-color) 0%, transparent 35%),
            radial-gradient(ellipse at top right, var(--flash-color) 0%, transparent 35%),
            radial-gradient(ellipse at bottom left, var(--flash-color) 0%, transparent 35%),
            radial-gradient(ellipse at bottom right, var(--flash-color) 0%, transparent 35%);
        }

        @keyframes gestureFlash {
          0%   { opacity: 0; }
          20%  { opacity: 0.4; }
          100% { opacity: 0; }
        }

        .gesture-flash-overlay.gesture-flash-active {
          animation: gestureFlash 200ms ease-out forwards;
        }
      `}</style>
            <div
                ref={overlayRef}
                className="gesture-flash-overlay"
                aria-hidden="true"
            />
        </>
    )
}