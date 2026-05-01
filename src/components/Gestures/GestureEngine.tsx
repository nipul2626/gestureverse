import { useEffect, useRef } from "react";
import { useGestureStore } from "@/store/gestureStore";
import { useWebcam } from "@/hooks/useWebcam";
import { useGesture } from "@/hooks/useGesture";

interface GestureEngineProps {
    showVideo?: boolean;
    showSkeleton?: boolean;
    onGesture?: (gesture: string, confidence: number) => void;
    children?: React.ReactNode;
}

// Injects MediaPipe scripts once
let scriptsInjected = false;
function injectMediaPipeScripts() {
    if (scriptsInjected) return;
    scriptsInjected = true;

    const scripts = [
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
        "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
    ];

    scripts.forEach((src) => {
        const s = document.createElement("script");
        s.src = src;
        s.crossOrigin = "anonymous";
        document.head.appendChild(s);
    });
}

export default function GestureEngine({
                                          showVideo = false,
                                          showSkeleton = true,
                                          onGesture,
                                          children,
                                      }: GestureEngineProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isCalibrated, webcamSupported } = useGestureStore();
    const { videoRef, startCamera } = useWebcam({ width: 640, height: 480 });

    useGesture({
        videoRef,
        canvasRef,
        enabled: isCalibrated && webcamSupported,
        drawSkeleton: showSkeleton,
        onGesture,
    });

    useEffect(() => {
        injectMediaPipeScripts();
        if (webcamSupported) {
            startCamera();
        }
    }, [startCamera, webcamSupported]);

    return (
        <div className="relative">
            {/* Hidden video element that MediaPipe reads from */}
            <video
                ref={videoRef}
                className={showVideo ? "rounded-xl w-full" : "hidden"}
                playsInline
                muted
                style={showVideo ? { transform: "scaleX(-1)" } : undefined}
            />

            {/* Skeleton overlay canvas */}
            {showSkeleton && (
                <canvas
                    ref={canvasRef}
                    className="gesture-canvas rounded-xl"
                    style={{
                        width: showVideo ? "100%" : 0,
                        height: showVideo ? "auto" : 0,
                        transform: "scaleX(-1)",
                    }}
                />
            )}

            {children}
        </div>
    );
}