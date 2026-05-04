// src/hooks/useGesture.ts

import { useEffect, useRef, useCallback } from 'react'
import { useGestureStore } from '../store/gestureStore'
import {
    buildGestureResult,
    normalizeLandmarks,
    detectSwipe,
    detectWave,
    detectSnap,
    detectOrbit,
    calcTwoHandData,
    CONTINUOUS_GESTURES,
    DISCRETE_GESTURES,
    createWaveState,
    createSnapState,
    createOrbitState,
    type GestureName,
} from '../lib/gestureInterpreter'
import type { GestureEvent, DetectedHand } from '../store/gestureStore'

// ─── Constants ─────────────────────────────────────────

const FRAME_SKIP = 2
const HOLD_DURATION_MS = 2000
const POWER_MODE_DURATION = 5000
const BOTH_HANDS_HOLD_MS = 800

// ─── Types ─────────────────────────────────────────────

interface MediaPipeResult {
    multiHandLandmarks?: { x: number; y: number; z: number }[][]
    multiHandedness?: { label: 'Left' | 'Right'; score: number }[]
}

// MediaPipe constructor types
type HandsInstance = {
    setOptions: (opts: any) => void
    onResults: (fn: (r: MediaPipeResult) => void) => void
    send: (data: { image: HTMLVideoElement }) => Promise<void>
}

type CameraInstance = {
    start: () => void
    stop: () => void
}

type HandsConstructor = new (opts: any) => HandsInstance
type CameraConstructor = new (
    video: HTMLVideoElement,
    opts: { onFrame: () => Promise<void>; width: number; height: number }
) => CameraInstance

// ─── Hook ──────────────────────────────────────────────

interface UseGestureProps {
    videoRef: React.RefObject<HTMLVideoElement>
    canvasRef?: React.RefObject<HTMLCanvasElement>
    enabled?: boolean
    drawSkeleton?: boolean
    onGesture?: (gesture: string, confidence: number) => void
}

export function useGesture({
                               videoRef,
                               canvasRef,
                               enabled = true,
                               drawSkeleton = false,
                               onGesture,
                           }: UseGestureProps) {
    const store = useGestureStore.getState

    const frameCountRef = useRef(0)
    const lastDetectTime = useRef(0)

    const waveStateRef = useRef(createWaveState())
    const snapStateLeftRef = useRef(createSnapState())
    const snapStateRightRef = useRef(createSnapState())
    const orbitStateRef = useRef(createOrbitState())

    const holdStartRef = useRef<number | null>(null)
    const holdNameRef = useRef<GestureName | null>(null)
    const bothHandsOpenStartRef = useRef<number | null>(null)

    const prevTwoHandDataRef = useRef(store().twoHandData)

    const leftSwipeRef = useRef(store().leftSwipeState)
    const rightSwipeRef = useRef(store().rightSwipeState)

    const fpsFrames = useRef<number[]>([])

    // ─── Event Dispatcher ──────────────────────────────

    const dispatchGestureEvent = useCallback(
        (gesture: GestureName, hand: 'Left' | 'Right' | null, extra: Partial<GestureEvent> = {}) => {
            const s = store()

            if (DISCRETE_GESTURES.has(gesture) && s.isGestureDebounced(gesture)) return

            const event: GestureEvent = {
                gesture,
                hand,
                confidence: extra.confidence ?? s.currentConfidence,
                position: extra.position ?? null,
                velocity: extra.velocity ?? null,
                palmCenter: extra.palmCenter ?? null,
                pinchDistance: extra.pinchDistance ?? 0,
                twoHandDistance: extra.twoHandDistance ?? null,
                twoHandAngle: extra.twoHandAngle ?? null,
                elapsed: extra.elapsed ?? 0,
                landmarks: extra.landmarks ?? null,
                timestamp: Date.now(),
                isDoubleSwipe: extra.isDoubleSwipe ?? false,
            }

            if (DISCRETE_GESTURES.has(gesture)) {
                s.updateGestureDebounce(gesture)
            }

            s.fireGestureEvent(event)
            s.setCurrentGesture(gesture, event.confidence, hand)
            onGesture?.(gesture, event.confidence)
        },
        []
    )

    // ─── MediaPipe Handler ─────────────────────────────

    const onResults = useCallback(
        (results: MediaPipeResult) => {
            const now = Date.now()
            const s = store()

            fpsFrames.current.push(now)
            fpsFrames.current = fpsFrames.current.filter(t => now - t < 1000)

            const fps = fpsFrames.current.length
            const latency = now - lastDetectTime.current
            lastDetectTime.current = now

            s.updatePerformance(fps, latency)

            if (!results.multiHandLandmarks?.length) {
                s.updateDetectedHands([])
                s.setCurrentGesture('none', 0, null)
                holdStartRef.current = null
                holdNameRef.current = null
                bothHandsOpenStartRef.current = null
                return
            }

            frameCountRef.current++
            const shouldClassify = frameCountRef.current % FRAME_SKIP === 0

            const detectedHands: DetectedHand[] = []

            for (let i = 0; i < results.multiHandLandmarks.length; i++) {
                const raw = results.multiHandLandmarks[i]
                const handednessInfo = results.multiHandedness?.[i]

                if (!raw || !handednessInfo) continue

                const handedness = handednessInfo.label
                const landmarks = normalizeLandmarks(raw)

                if (!shouldClassify) {
                    const prev = s.detectedHands.find(h => h.handedness === handedness)
                    if (prev) detectedHands.push({ ...prev, landmarks })
                    continue
                }

                const result = buildGestureResult(landmarks, handedness)

                const hand: DetectedHand = {
                    handedness,
                    landmarks,
                    gesture: result.gesture,
                    confidence: result.confidence,
                    palmCenter: result.palmCenter,
                    pinchDistance: result.pinchDistance,
                    wristTiltAngle: result.wristTiltAngle,
                    palmFacingCamera: result.palmFacingCamera,
                    fingersExtended: result.fingersExtended,
                }

                detectedHands.push(hand)

                const swipeState =
                    handedness === 'Left' ? leftSwipeRef.current : rightSwipeRef.current

                const { swipe, shouldClearHistory, isDoubleSwipe } = detectSwipe(
                    swipeState,
                    result.palmCenter,
                    now
                )

                if (shouldClearHistory) swipeState.history = []

                if (swipe) {
                    dispatchGestureEvent(swipe, handedness, {
                        confidence: 0.9,
                        palmCenter: result.palmCenter,
                        isDoubleSwipe,
                    })
                }

                const snapState =
                    handedness === 'Left'
                        ? snapStateLeftRef.current
                        : snapStateRightRef.current

                if (detectSnap(snapState, result.pinchDistance)) {
                    dispatchGestureEvent('snap', handedness, {
                        confidence: 0.95,
                        palmCenter: result.palmCenter,
                        pinchDistance: result.pinchDistance,
                    })
                }

                if (detectWave(waveStateRef.current, result.palmCenter.x, now)) {
                    dispatchGestureEvent('wave', handedness, {
                        confidence: 0.9,
                        palmCenter: result.palmCenter,
                    })
                }

                if (detectOrbit(orbitStateRef.current, result.palmCenter)) {
                    const oc = orbitStateRef.current
                    s.setOrbitActive(true, oc.center ?? undefined, oc.radius)
                } else {
                    s.setOrbitActive(false)
                }

                const frame = new Float32Array(63)
                landmarks.forEach((lm, idx) => {
                    frame[idx * 3] = lm.x
                    frame[idx * 3 + 1] = lm.y
                    frame[idx * 3 + 2] = lm.z
                })
                s.pushLandmarkHistory(frame)
            }

            s.updateDetectedHands(detectedHands)
        },
        [dispatchGestureEvent]
    )

    // ─── MediaPipe Init ────────────────────────────────

    useEffect(() => {
        if (!enabled) return
        const video = videoRef.current
        if (!video) return

        let hands: HandsInstance | null = null
        let camera: CameraInstance | null = null
        let destroyed = false

        async function init() {
            console.log("🧠 MediaPipe init starting");
            const win = window as any

            // Wait until MediaPipe is available
            while (!win.Hands || !win.Camera) {
                console.log("⏳ waiting for MediaPipe...");
                await new Promise(res => setTimeout(res, 100));
            }

            const HandsClass = win.Hands as HandsConstructor
            const CameraClass = win.Camera as CameraConstructor

            hands = new HandsClass({

                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
            })

            hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 0,
                minDetectionConfidence: 0.65,
                minTrackingConfidence: 0.55,
            })

            hands.onResults(onResults)

            const videoEl = video as HTMLVideoElement

            camera = new CameraClass(videoEl, {
                onFrame: async () => {
                    console.log("🎥 frame tick");
                    if (destroyed) return
                    if (videoEl.readyState === 4) {
                        await hands!.send({ image: videoEl })
                    }
                },
                width: 640,
                height: 480,
            })

            camera.start()

            useGestureStore.getState().setCameraActive(true)
            useGestureStore.getState().setMediaPipeReady(true)
        }

        init().catch(err => {
            console.error(err)
            useGestureStore.getState().setCameraError(String(err))
        })

        return () => {
            destroyed = true
            camera?.stop()
            useGestureStore.getState().setCameraActive(false)
            useGestureStore.getState().setMediaPipeReady(false)
        }
    }, [videoRef, onResults, enabled])

    return {}
}