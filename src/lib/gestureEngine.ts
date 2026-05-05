// src/lib/gestureEngine.ts
// GestureVerse v2 — Master gesture event dispatcher.
// Maintains per-gesture listener sets. Handles cooldowns per gesture type.
// Exported: useGestureOn.ts(gesture, handler, deps)

import { useEffect, useRef } from 'react'
import { useGestureStore } from '../store/gestureStore'
import type { GestureEvent } from '../store/gestureStore'
import type { GestureName } from './gestureInterpreter'
import {
    CONTINUOUS_GESTURES,
    DISCRETE_GESTURES,
    GESTURE_COOLDOWN_MS,
} from './gestureInterpreter'

// ─── Types ────────────────────────────────────────────────────────────────────

export type GestureHandler = (event: GestureEvent) => void

export interface GestureHandlerOptions {
    /** Cooldown override in ms (null = use global default) */
    cooldown?: number | null
    /** If true, handler fires every frame for continuous gestures */
    continuous?: boolean
    /** Only fire if confidence >= this threshold */
    minConfidence?: number
}

// ─── Engine State (module-level singleton) ────────────────────────────────────

const listeners = new Map<GestureName, Set<GestureHandler>>()
const lastFiredAt = new Map<GestureName, number>()

// ─── Engine Public API ────────────────────────────────────────────────────────

/**
 * Register a handler for a specific gesture.
 * Returns a cleanup function to remove the handler.
 */
export function onGesture(
    gesture: GestureName,
    handler: GestureHandler,
    options: GestureHandlerOptions = {}
): () => void {
    if (!listeners.has(gesture)) {
        listeners.set(gesture, new Set())
    }

    const wrappedHandler: GestureHandler = (event) => {
        // Min confidence guard
        if (options.minConfidence !== undefined && event.confidence < options.minConfidence) {
            return
        }

        // Cooldown check for discrete gestures
        if (DISCRETE_GESTURES.has(gesture)) {
            const cooldown =
                options.cooldown ?? (GESTURE_COOLDOWN_MS[gesture] ?? 400)

            const lastFired = lastFiredAt.get(gesture) ?? 0
            if (Date.now() - lastFired < cooldown) return

            lastFiredAt.set(gesture, Date.now())
        }

        // Continuous gestures always pass (option to override)
        if (CONTINUOUS_GESTURES.has(gesture) && options.continuous === false) {
            return
        }

        handler(event)
    }

    listeners.get(gesture)!.add(wrappedHandler)

    return () => {
        listeners.get(gesture)?.delete(wrappedHandler)
    }
}

/**
 * Fire all registered handlers for a gesture.
 * Called internally by the gesture processing pipeline.
 */
export function fireGesture(event: GestureEvent): void {
    const handlers = listeners.get(event.gesture)
    if (!handlers || handlers.size === 0) return

    for (const handler of handlers) {
        try {
            handler(event)
        } catch (err) {
            console.error(`[GestureEngine] Handler error for ${event.gesture}:`, err)
        }
    }
}

/**
 * Remove all handlers for a gesture (or all gestures if none specified).
 */
export function clearGestureHandlers(gesture?: GestureName): void {
    if (gesture) {
        listeners.get(gesture)?.clear()
    } else {
        listeners.clear()
    }
}

// ─── Zustand Bridge ───────────────────────────────────────────────────────────
// Subscribe to store's lastGestureEvent and fan out to registered handlers.
// This bridge is initialized once at app startup.

let bridgeUnsubscribe: (() => void) | null = null

export function initGestureEngineBridge(): () => void {
    if (bridgeUnsubscribe) bridgeUnsubscribe()

    bridgeUnsubscribe = useGestureStore.subscribe(
        state => state.lastGestureEvent,
        (event) => {
            if (!event) return
            fireGesture(event)
        }
    )

    return () => {
        bridgeUnsubscribe?.()
        bridgeUnsubscribe = null
    }
}

// ─── React Hook ───────────────────────────────────────────────────────────────

/**
 * Subscribe to a gesture within a React component.
 * Handler is stable and automatically cleaned up on unmount.
 *
 * @example
 * useGestureOn.ts('swipe_left', (event) => {
 *   navigatePrev()
 * }, { cooldown: 500 })
 */
export function useGestureOn(
    gesture: GestureName,
    handler: GestureHandler,
    options: GestureHandlerOptions = {},
    deps: React.DependencyList = []
): void {
    // Stable handler ref — avoids stale closures
    const handlerRef = useRef<GestureHandler>(handler)

    useEffect(() => {
        handlerRef.current = handler
    }) // update every render

    useEffect(() => {
        const stableHandler: GestureHandler = (event) => {
            handlerRef.current(event)
        }

        const cleanup = onGesture(gesture, stableHandler, options)
        return cleanup
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gesture, ...deps])
}

/**
 * Subscribe to multiple gestures with a shared handler.
 *
 * @example
 * useGesturesOn(
 *   ['swipe_left', 'swipe_right'],
 *   (event) => handleSwipe(event.gesture),
 *   { cooldown: 400 }
 * )
 */
export function useGesturesOn(
    gestures: GestureName[],
    handler: GestureHandler,
    options: GestureHandlerOptions = {},
    deps: React.DependencyList = []
): void {
    const handlerRef = useRef<GestureHandler>(handler)

    useEffect(() => {
        handlerRef.current = handler
    })

    useEffect(() => {
        const stableHandler: GestureHandler = (event) => {
            handlerRef.current(event)
        }

        const cleanups = gestures.map(g => onGesture(g, stableHandler, options))
        return () => cleanups.forEach(fn => fn())
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...gestures, ...deps])
}

/**
 * Returns the current gesture event from the store reactively.
 * Use when you need inline reactive access without a dedicated handler.
 */
export function useLastGestureEvent(): GestureEvent | null {
    return useGestureStore(s => s.lastGestureEvent)
}