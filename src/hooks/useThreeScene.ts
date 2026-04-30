import { useRef, useEffect, useCallback } from "react";
import * as THREE from "three";

interface UseThreeSceneOptions {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    antialias?: boolean;
    alpha?: boolean;
    pixelRatio?: number;
}

export function useThreeScene({
                                  canvasRef,
                                  antialias = true,
                                  alpha = true,
                                  pixelRatio = Math.min(window.devicePixelRatio, 2),
                              }: UseThreeSceneOptions) {
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
    const cameraRef = useRef<THREE.PerspectiveCamera>(
        new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
    );
    const animFrameRef = useRef<number>(0);
    const clockRef = useRef(new THREE.Clock());

    const getScene = useCallback(() => sceneRef.current, []);
    const getCamera = useCallback(() => cameraRef.current, []);
    const getRenderer = useCallback(() => rendererRef.current, []);
    const getClock = useCallback(() => clockRef.current, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const canvas = canvasRef.current;
        const renderer = new THREE.WebGLRenderer({ canvas, antialias, alpha });
        renderer.setPixelRatio(pixelRatio);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        rendererRef.current = renderer;

        // Set initial size
        const setSize = () => {
            const w = canvas.clientWidth;
            const h = canvas.clientHeight;
            renderer.setSize(w, h, false);
            cameraRef.current.aspect = w / h;
            cameraRef.current.updateProjectionMatrix();
        };

        setSize();
        const ro = new ResizeObserver(setSize);
        ro.observe(canvas);

        return () => {
            ro.disconnect();
            cancelAnimationFrame(animFrameRef.current);
            renderer.dispose();
            rendererRef.current = null;
        };
    }, [canvasRef, antialias, alpha, pixelRatio]);

    const startLoop = useCallback((tick: (delta: number, elapsed: number) => void) => {
        const loop = () => {
            animFrameRef.current = requestAnimationFrame(loop);
            const delta = clockRef.current.getDelta();
            const elapsed = clockRef.current.getElapsedTime();
            tick(delta, elapsed);
            if (rendererRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
        };
        loop();

        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    const stopLoop = useCallback(() => {
        cancelAnimationFrame(animFrameRef.current);
    }, []);

    return {
        getScene,
        getCamera,
        getRenderer,
        getClock,
        startLoop,
        stopLoop,
    };
}