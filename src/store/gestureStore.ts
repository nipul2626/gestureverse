// src/store/gestureStore.ts
// GestureVerse v2 — Extended Zustand store with all Phase 1-6 state.

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type {
    GestureName,
    LandmarkPoint,
    TwoHandData,
    SwipeState,
    WaveState,
    SnapState,
    OrbitState,
} from '../lib/gestureInterpreter'
import {
    createWaveState,
    createSnapState,
    createOrbitState,
} from '../lib/gestureInterpreter'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DetectedHand {
    handedness: 'Left' | 'Right'
    landmarks: LandmarkPoint[]
    gesture: GestureName
    confidence: number
    palmCenter: LandmarkPoint
    pinchDistance: number
    wristTiltAngle: number
    palmFacingCamera: boolean
    fingersExtended: boolean[]
}

export interface GrabState {
    isGrabbing: boolean
    objectId: string | null
    hand: 'Left' | 'Right' | null
    grabOffset: { x: number; y: number; z: number }
    velocity: { x: number; y: number; z: number }
}

export interface GestureEvent {
    gesture: GestureName
    hand: 'Left' | 'Right' | null
    confidence: number
    position: { x: number; y: number } | null
    velocity: { x: number; y: number } | null
    palmCenter: LandmarkPoint | null
    pinchDistance: number
    twoHandDistance: number | null
    twoHandAngle: number | null
    elapsed: number
    landmarks: LandmarkPoint[] | null
    timestamp: number
    isDoubleSwipe?: boolean
}

export type CalibrationStep = 'idle' | 'open_palm' | 'fist' | 'pinch' | 'pointing' | 'complete'

// ─── Store State Interface ────────────────────────────────────────────────────

interface GestureState {
    // ── Camera & Engine ──────────────────────────────────────────────────────
    isCameraActive: boolean
    cameraError: string | null
    isMediaPipeReady: boolean
    webcamSupported: boolean
    isCalibrated: boolean
    calibrationStep: CalibrationStep
    // ── Detection Results ─────────────────────────────────────────────────────
    detectedHands: DetectedHand[]
    currentGesture: GestureName
    currentConfidence: number
    currentHand: 'Left' | 'Right' | null
    setHand: (hand: 'Left' | 'Right' | null) => void

    // ── Performance ───────────────────────────────────────────────────────────
    fps: number
    latencyMs: number
    frameCount: number
    lastFrameTime: number
    sensitivity: number  // 0.5–1.5 multiplier

    // ── Landmark History (typed arrays for perf) ──────────────────────────────
    landmarkHistory: Float32Array[]  // last 30 frames × 63 floats (21 pts × xyz)
    historyMaxLength: number

    // ── Swipe / Discrete State ─────────────────────────────────────────────────
    swipeState: SwipeState        // per-hand — primary hand only
    leftSwipeState: SwipeState
    rightSwipeState: SwipeState
    gestureDebounceMap: Map<GestureName, number>

    // ── Wave ──────────────────────────────────────────────────────────────────
    waveState: WaveState
    lastSwipeGesture: GestureName | null
    lastSwipeTime: number

    // ── Snap ──────────────────────────────────────────────────────────────────
    snapState: SnapState

    // ── Grab / Object Manipulation ────────────────────────────────────────────
    grabState: GrabState | null

    // ── Two-Hand Tracking ─────────────────────────────────────────────────────
    twoHandData: TwoHandData | null

    // ── System States ─────────────────────────────────────────────────────────
    powerMode: boolean
    powerModeStartTime: number | null
    powerModeAmplifier: number  // 2.5x
    radialMenuOpen: boolean
    airDrawActive: boolean
    uiHidden: boolean

    // ── Orbit ─────────────────────────────────────────────────────────────────
    orbitState: OrbitState
    orbitActive: boolean
    orbitCenter: { x: number; y: number } | null
    orbitRadius: number

    // ── Hold Gesture Tracking ─────────────────────────────────────────────────
    holdGestureStart: number | null
    holdGestureName: GestureName | null
    holdTriggered: boolean

    // ── Last Event (for GestureFlash etc.) ────────────────────────────────────
    lastGestureEvent: GestureEvent | null

    // ── Air Draw ──────────────────────────────────────────────────────────────
    airDrawColor: string

    // ─── Actions ────────────────────────────────────────────────────────────
    setCameraActive: (active: boolean) => void
    setWebcamSupported: (value: boolean) => void
    setCameraError: (error: string | null) => void
    setMediaPipeReady: (ready: boolean) => void
    setCalibrated: (calibrated: boolean) => void
    setCalibrationStep: (step: CalibrationStep) => void

    updateDetectedHands: (hands: DetectedHand[]) => void
    setCurrentGesture: (gesture: GestureName, confidence: number, hand: 'Left' | 'Right' | null) => void
    updatePerformance: (fps: number, latency: number) => void
    setSensitivity: (s: number) => void

    pushLandmarkHistory: (frame: Float32Array) => void
    clearLandmarkHistory: () => void

    updateGestureDebounce: (gesture: GestureName) => void
    isGestureDebounced: (gesture: GestureName) => boolean

    setGrabState: (state: GrabState | null) => void
    setTwoHandData: (data: TwoHandData | null) => void

    setPowerMode: (active: boolean) => void
    setRadialMenuOpen: (open: boolean) => void
    setAirDrawActive: (active: boolean) => void
    setUiHidden: (hidden: boolean) => void

    setOrbitActive: (active: boolean, center?: { x: number; y: number }, radius?: number) => void

    startHoldGesture: (gesture: GestureName) => void
    clearHoldGesture: () => void
    setHoldTriggered: (triggered: boolean) => void

    fireGestureEvent: (event: GestureEvent) => void
    setAirDrawColor: (color: string) => void

    reset: () => void
}

// ─── Initial State ────────────────────────────────────────────────────────────

function makeSwipeState(): SwipeState {
    return { history: [], lastSwipeGesture: null, lastSwipeTime: 0 }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGestureStore = create<GestureState>()(
    subscribeWithSelector((set, get) => ({
        // ── Camera & Engine ──────────────────────────────────────────────────────
        isCameraActive: false,
        cameraError: null,
        isMediaPipeReady: false,
        isCalibrated: false,
        calibrationStep: 'idle',
        webcamSupported: true,

        // ── Detection Results ─────────────────────────────────────────────────────
        detectedHands: [],
        currentGesture: 'none',
        currentConfidence: 0,
        currentHand: null,

        // ── Performance ───────────────────────────────────────────────────────────
        fps: 0,
        latencyMs: 0,
        frameCount: 0,
        lastFrameTime: 0,
        sensitivity: 1.0,

        // ── Landmark History ──────────────────────────────────────────────────────
        landmarkHistory: [],
        historyMaxLength: 30,

        // ── Swipe State ───────────────────────────────────────────────────────────
        swipeState: makeSwipeState(),
        leftSwipeState: makeSwipeState(),
        rightSwipeState: makeSwipeState(),
        gestureDebounceMap: new Map(),
        lastSwipeGesture: null,
        lastSwipeTime: 0,

        // ── Wave ──────────────────────────────────────────────────────────────────
        waveState: createWaveState(),

        // ── Snap ──────────────────────────────────────────────────────────────────
        snapState: createSnapState(),

        // ── Grab ──────────────────────────────────────────────────────────────────
        grabState: null,

        // ── Two-Hand ──────────────────────────────────────────────────────────────
        twoHandData: null,

        // ── System ────────────────────────────────────────────────────────────────
        powerMode: false,
        powerModeStartTime: null,
        powerModeAmplifier: 2.5,
        radialMenuOpen: false,
        airDrawActive: false,
        uiHidden: false,

        // ── Orbit ─────────────────────────────────────────────────────────────────
        orbitState: createOrbitState(),
        orbitActive: false,
        orbitCenter: null,
        orbitRadius: 0,

        // ── Hold ──────────────────────────────────────────────────────────────────
        holdGestureStart: null,
        holdGestureName: null,
        holdTriggered: false,

        // ── Events ────────────────────────────────────────────────────────────────
        lastGestureEvent: null,

        // ── Air Draw ──────────────────────────────────────────────────────────────
        airDrawColor: '#6366f1',

        // ─── Actions ─────────────────────────────────────────────────────────────

        setCameraActive: (active) => set({ isCameraActive: active }),

        setWebcamSupported: (value: boolean) => set({ webcamSupported: value }),
        setCameraError: (error) => set({ cameraError: error }),
        setMediaPipeReady: (ready) => set({ isMediaPipeReady: ready }),
        setCalibrated: (calibrated) => set({ isCalibrated: calibrated }),
        setCalibrationStep: (step) => set({ calibrationStep: step }),
        setHand: (hand) => set({ currentHand: hand }),
        updateDetectedHands: (hands) => set({ detectedHands: hands }),

        setCurrentGesture: (gesture, confidence, hand) =>
            set({ currentGesture: gesture, currentConfidence: confidence, currentHand: hand }),

        updatePerformance: (fps, latency) =>
            set((s) => ({
                fps,
                latencyMs: latency,
                frameCount: s.frameCount + 1,
                lastFrameTime: Date.now(),
            })),

        setSensitivity: (s) => set({ sensitivity: Math.max(0.5, Math.min(1.5, s)) }),

        pushLandmarkHistory: (frame) =>
            set((s) => {
                const next = [...s.landmarkHistory, frame]
                if (next.length > s.historyMaxLength) next.shift()
                return { landmarkHistory: next }
            }),

        clearLandmarkHistory: () => set({ landmarkHistory: [] }),

        updateGestureDebounce: (gesture) =>
            set((s) => {
                const map = new Map(s.gestureDebounceMap)
                map.set(gesture, Date.now())
                return { gestureDebounceMap: map }
            }),

        isGestureDebounced: (gesture) => {
            const { gestureDebounceMap } = get()
            const lastFired = gestureDebounceMap.get(gesture)
            if (lastFired === undefined) return false
            // Import cooldown map dynamically to avoid circular deps
            const COOLDOWNS: Partial<Record<GestureName, number>> = {
                swipe_left: 400, swipe_right: 400, swipe_up: 400, swipe_down: 400,
                snap: 300, wave: 600, thumbs_up: 500, thumbs_down: 500,
            }
            const cooldown = COOLDOWNS[gesture] ?? 0
            return Date.now() - lastFired < cooldown
        },

        setGrabState: (state) => set({ grabState: state }),
        setTwoHandData: (data) => set({ twoHandData: data }),

        setPowerMode: (active) =>
            set({
                powerMode: active,
                powerModeStartTime: active ? Date.now() : null,
            }),

        setRadialMenuOpen: (open) => set({ radialMenuOpen: open }),
        setAirDrawActive: (active) => set({ airDrawActive: active }),
        setUiHidden: (hidden) => set({ uiHidden: hidden }),

        setOrbitActive: (active, center?, radius?) =>
            set({
                orbitActive: active,
                orbitCenter: center ?? null,
                orbitRadius: radius ?? 0,
            }),

        startHoldGesture: (gesture) =>
            set({
                holdGestureStart: Date.now(),
                holdGestureName: gesture,
                holdTriggered: false,
            }),

        clearHoldGesture: () =>
            set({
                holdGestureStart: null,
                holdGestureName: null,
                holdTriggered: false,
            }),

        setHoldTriggered: (triggered) => set({ holdTriggered: triggered }),

        fireGestureEvent: (event) => set({ lastGestureEvent: event }),

        setAirDrawColor: (color) => set({ airDrawColor: color }),

        reset: () =>
            set({
                detectedHands: [],
                currentGesture: 'none',
                currentConfidence: 0,
                currentHand: null,
                grabState: null,
                twoHandData: null,
                powerMode: false,
                powerModeStartTime: null,
                radialMenuOpen: false,
                airDrawActive: false,
                uiHidden: false,
                orbitActive: false,
                orbitCenter: null,
                orbitRadius: 0,
                holdGestureStart: null,
                holdGestureName: null,
                holdTriggered: false,
                landmarkHistory: [],
                lastGestureEvent: null,
                swipeState: makeSwipeState(),
                leftSwipeState: makeSwipeState(),
                rightSwipeState: makeSwipeState(),
                gestureDebounceMap: new Map(),
                waveState: createWaveState(),
                snapState: createSnapState(),
                orbitState: createOrbitState(),
            }),
    }))
)