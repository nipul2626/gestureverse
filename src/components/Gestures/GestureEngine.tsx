import { useEffect, useRef, useState } from "react";
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
function injectMediaPipeScripts(): Promise<void> {
    return new Promise((resolve) => {
        if (scriptsInjected) {
            resolve();
            return;
        }

        scriptsInjected = true;

        const scripts = [
            "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
            "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
            "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
        ];

        let loaded = 0;

        scripts.forEach((src) => {
            const s = document.createElement("script");
            s.src = src;
            s.crossOrigin = "anonymous";

            s.onload = () => {
                loaded++;
                if (loaded === scripts.length) {
                    resolve();
                }
            };

            document.head.appendChild(s);
        });
    });
}

export default function GestureEngine({
                                          showVideo = false,
                                          showSkeleton = true,
                                          onGesture,
                                          children,
                                      }: GestureEngineProps) {
    const [scriptsReady, setScriptsReady] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const { isCalibrated, webcamSupported } = useGestureStore();
    const { videoRef, startCamera } = useWebcam({ width: 640, height: 480 });

    useGesture({
        videoRef,
        canvasRef,
        enabled: scriptsReady && isCalibrated && webcamSupported,
        drawSkeleton: showSkeleton,
        onGesture,
    });

    useEffect(() => {
        async function init() {
            await injectMediaPipeScripts();
            setScriptsReady(true);

            if (webcamSupported) {
                startCamera();
            }
        }

        init();
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