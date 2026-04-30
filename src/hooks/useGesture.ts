import { useEffect, useRef, useCallback } from "react";
import { useGestureStore } from "@/store/gestureStore";
import {
    classifyGesture,
    detectSwipe,
    getPalmCenter,
} from "@/lib/gestureInterpreter";
import type { HandLandmark, DetectedHand } from "@/store/gestureStore";

declare global {
    interface Window {
        Hands: new (config: object) => MediaPipeHands;
        Camera: new (video: HTMLVideoElement, config: object) => MediaPipeCamera;
        drawConnectors: (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[], connections: unknown[], style: object) => void;
        drawLandmarks: (ctx: CanvasRenderingContext2D, landmarks: HandLandmark[], style: object) => void;
        HAND_CONNECTIONS: unknown[];
    }
}

interface MediaPipeHands {
    setOptions: (options: object) => void;
    onResults: (callback: (results: MediaPipeResults) => void) => void;
    send: (inputs: { image: HTMLVideoElement }) => Promise<void>;
    close: () => void;
}

interface MediaPipeCamera {
    start: () => void;
    stop: () => void;
}

interface MediaPipeResults {
    multiHandLandmarks: HandLandmark[][];
    multiHandedness: Array<{ label: string; score: number }>;
}

interface UseGestureOptions {
    videoRef: React.RefObject<HTMLVideoElement>;
    canvasRef?: React.RefObject<HTMLCanvasElement>;
    enabled?: boolean;
    drawSkeleton?: boolean;
    onGesture?: (gesture: string, confidence: number) => void;
}

export function useGesture({
                               videoRef,
                               canvasRef,
                               enabled = true,
                               drawSkeleton = true,
                               onGesture,
                           }: UseGestureOptions) {
    const handsRef = useRef<MediaPipeHands | null>(null);
    const cameraRef = useRef<MediaPipeCamera | null>(null);
    const frameCountRef = useRef(0);
    const lastFpsUpdate = useRef(Date.now());
    const lastFrameTime = useRef(Date.now());

    const {
        sensitivity,
        setDetectedHands,
        setCurrentGesture,
        setLastGestureEvent,
        setEngineReady,
        setFps,
        setLatency,
        pushLandmarkHistory,
        landmarkHistory,
        isCalibrated,
    } = useGestureStore();

    const processResults = useCallback(
        (results: MediaPipeResults) => {
            const now = Date.now();
            setLatency(now - lastFrameTime.current);
            lastFrameTime.current = now;

            // FPS counter
            frameCountRef.current++;
            if (now - lastFpsUpdate.current >= 1000) {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastFpsUpdate.current = now;
            }

            // Draw skeleton on canvas
            if (canvasRef?.current && drawSkeleton && videoRef.current) {
                const ctx = canvasRef.current.getContext("2d");
                if (ctx) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                    if (results.multiHandLandmarks && window.drawConnectors && window.HAND_CONNECTIONS) {
                        for (const landmarks of results.multiHandLandmarks) {
                            window.drawConnectors(ctx, landmarks, window.HAND_CONNECTIONS, {
                                color: "rgba(99, 102, 241, 0.6)",
                                lineWidth: 2,
                            });
                            window.drawLandmarks(ctx, landmarks, {
                                color: "rgba(34, 211, 238, 0.9)",
                                lineWidth: 1,
                                radius: 3,
                            });
                        }
                    }
                }
            }

            if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
                setDetectedHands([]);
                setCurrentGesture("none", 0);
                return;
            }

            // Build detected hands
            const detectedHands: DetectedHand[] = results.multiHandLandmarks.map(
                (landmarks, i) => {
                    const handedness = results.multiHandedness[i];
                    const { gesture, confidence } = classifyGesture(landmarks, sensitivity);
                    return {
                        landmarks,
                        handedness: handedness?.label as "Left" | "Right",
                        gesture,
                        confidence,
                    };
                }
            );

            setDetectedHands(detectedHands);

            // Use dominant hand (index 0 for now)
            const primary = detectedHands[0];
            if (!primary) return;

            // Push to history for swipe detection
            pushLandmarkHistory(primary.landmarks);

            // Check swipe
            const swipe = detectSwipe(landmarkHistory);
            const finalGesture = swipe ?? { gesture: primary.gesture, confidence: primary.confidence };

            setCurrentGesture(finalGesture.gesture, finalGesture.confidence);

            if (finalGesture.gesture !== "none" && finalGesture.confidence > 0.6) {
                const palmPos = getPalmCenter(primary.landmarks);
                const event = {
                    gesture: finalGesture.gesture,
                    hand: primary.handedness,
                    confidence: finalGesture.confidence,
                    timestamp: now,
                    position: palmPos,
                };
                setLastGestureEvent(event);
                onGesture?.(finalGesture.gesture, finalGesture.confidence);
            }
        },
        [
            sensitivity,
            canvasRef,
            drawSkeleton,
            videoRef,
            setDetectedHands,
            setCurrentGesture,
            setLastGestureEvent,
            setFps,
            setLatency,
            pushLandmarkHistory,
            landmarkHistory,
            onGesture,
        ]
    );

    useEffect(() => {
        if (!enabled || !videoRef.current) return;
        if (!isCalibrated) return;

        let mounted = true;

        const initMediaPipe = async () => {
            // Load MediaPipe via CDN scripts (injected in index.html)
            const waitForMediaPipe = (): Promise<void> =>
                new Promise((resolve) => {
                    const check = () => {
                        if (window.Hands) resolve();
                        else setTimeout(check, 100);
                    };
                    check();
                });

            await waitForMediaPipe();
            if (!mounted) return;

            handsRef.current = new window.Hands({
                locateFile: (file: string) =>
                    `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
            });

            handsRef.current.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.6,
            });

            handsRef.current.onResults(processResults);

            if (videoRef.current) {
                cameraRef.current = new window.Camera(videoRef.current, {
                    onFrame: async () => {
                        if (handsRef.current && videoRef.current) {
                            await handsRef.current.send({ image: videoRef.current });
                        }
                    },
                    width: 640,
                    height: 480,
                });
                cameraRef.current.start();
            }

            setEngineReady(true);
        };

        initMediaPipe();

        return () => {
            mounted = false;
            cameraRef.current?.stop();
            handsRef.current?.close();
            setEngineReady(false);
        };
    }, [enabled, videoRef, processResults, setEngineReady, isCalibrated]);

    return { handsRef, cameraRef };
}