import { useEffect, useRef, useCallback } from "react";
import { useGestureStore } from "@/store/gestureStore";

interface UseWebcamOptions {
    width?: number;
    height?: number;
    facingMode?: "user" | "environment";
}

export function useWebcam(options: UseWebcamOptions = {}) {
    const { width = 640, height = 480, facingMode = "user" } = options;
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const { setCameraActive, setWebcamSupported } = useGestureStore();

    const startCamera = useCallback(async (): Promise<boolean> => {
        // Check support
        if (!navigator.mediaDevices?.getUserMedia) {
            setWebcamSupported(false);
            return false;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: width },
                    height: { ideal: height },
                    facingMode,
                },
                audio: false,
            });

            streamRef.current = stream;

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play();
                    setCameraActive(true);
                };
            }

            setWebcamSupported(true);
            return true;
        } catch (err) {
            console.error("Camera error:", err);
            if (err instanceof DOMException) {
                if (err.name === "NotAllowedError") {
                    console.warn("Camera permission denied");
                } else if (err.name === "NotFoundError") {
                    setWebcamSupported(false);
                }
            }
            setCameraActive(false);
            return false;
        }
    }, [width, height, facingMode, setCameraActive, setWebcamSupported]);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setCameraActive(false);
    }, [setCameraActive]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopCamera();
        };
    }, [stopCamera]);

    return {
        videoRef,
        startCamera,
        stopCamera,
    };
}