import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGestureStore } from "@/store/gestureStore";
import { getPalmCenter } from "@/lib/gestureInterpreter";

const ARTWORKS = [
    { title: "Neon Genesis", color: 0x6366f1, accent: 0x22d3ee, pattern: "grid" },
    { title: "Crimson Void", color: 0xec4899, accent: 0xf59e0b, pattern: "waves" },
    { title: "Digital Forest", color: 0x10b981, accent: 0x22d3ee, pattern: "circles" },
    { title: "Solar Flare", color: 0xf59e0b, accent: 0xec4899, pattern: "lines" },
    { title: "Midnight Blue", color: 0x3b82f6, accent: 0x8b5cf6, pattern: "dots" },
];

function makeArtworkTexture(pattern: string, color: number, accent: number): THREE.CanvasTexture {
    const size = 512;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const c = `#${color.toString(16).padStart(6, "0")}`;
    const a = `#${accent.toString(16).padStart(6, "0")}`;

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, size, size);

    if (pattern === "grid") {
        ctx.strokeStyle = c;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < size; i += 32) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(size, i); ctx.stroke();
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = a;
        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.arc(Math.random() * size, Math.random() * size, 20 + Math.random() * 40, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (pattern === "waves") {
        for (let y = 0; y < size; y += 20) {
            ctx.beginPath();
            ctx.strokeStyle = y % 40 === 0 ? a : c;
            ctx.lineWidth = 2;
            ctx.globalAlpha = 0.6;
            for (let x = 0; x < size; x++) {
                const wave = Math.sin((x + y) * 0.05) * 15;
                ctx.lineTo(x, y + wave);
            }
            ctx.stroke();
        }
    }

    if (pattern === "circles") {
        for (let i = 0; i < 12; i++) {
            const x = (Math.random() * 0.8 + 0.1) * size;
            const y = (Math.random() * 0.8 + 0.1) * size;
            const r = 20 + Math.random() * 100;
            const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
            grad.addColorStop(0, a + "99");
            grad.addColorStop(1, c + "00");
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    if (pattern === "lines") {
        for (let i = 0; i < 30; i++) {
            ctx.strokeStyle = i % 3 === 0 ? a : c;
            ctx.lineWidth = 1 + Math.random() * 3;
            ctx.globalAlpha = 0.4 + Math.random() * 0.5;
            ctx.beginPath();
            ctx.moveTo(Math.random() * size, 0);
            ctx.lineTo(Math.random() * size, size);
            ctx.stroke();
        }
    }

    if (pattern === "dots") {
        for (let x = 0; x < size; x += 24) {
            for (let y = 0; y < size; y += 24) {
                const d = Math.sqrt((x - size / 2) ** 2 + (y - size / 2) ** 2);
                ctx.fillStyle = d < 100 ? a : c;
                ctx.globalAlpha = Math.max(0.1, 1 - d / (size * 0.7));
                ctx.beginPath();
                ctx.arc(x, y, 4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    return new THREE.CanvasTexture(canvas);
}

export default function VirtualGallery() {
    const mountRef = useRef<HTMLDivElement>(null);
    const [focusedArt, setFocusedArt] = useState<string | null>(null);
    const { detectedHands, currentGesture } = useGestureStore();
    const handsRef = useRef(detectedHands);
    const gestureRef = useRef(currentGesture);
    const lastGestureRef = useRef<string | null>(null);

    useEffect(() => { handsRef.current = detectedHands; }, [detectedHands]);
    useEffect(() => { gestureRef.current = currentGesture; }, [currentGesture]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x0a0a0f, 0.06);
        const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 100);
        camera.position.set(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        // Gallery lighting
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        ARTWORKS.forEach((_, i) => {
            const spotAngle = (i / ARTWORKS.length) * Math.PI * 2;
            const r = 5;
            const spot = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 6, 0.3);
            spot.position.set(Math.cos(spotAngle) * r, 3, Math.sin(spotAngle) * r - 5);
            scene.add(spot);
        });

        // Build gallery — frames arranged in a circle
        const frames: THREE.Group[] = [];
        const GALLERY_RADIUS = 6;

        ARTWORKS.forEach((art, i) => {
            const angle = (i / ARTWORKS.length) * Math.PI * 2;
            const frameGroup = new THREE.Group();

            // Canvas artwork
            const tex = makeArtworkTexture(art.pattern, art.color, art.accent);
            const artGeo = new THREE.PlaneGeometry(2.4, 3);
            const artMat = new THREE.MeshStandardMaterial({ map: tex });
            const artMesh = new THREE.Mesh(artGeo, artMat);
            frameGroup.add(artMesh);

            // Frame border
            const frameGeo = new THREE.BoxGeometry(2.7, 3.3, 0.08);
            const frameMat = new THREE.MeshPhysicalMaterial({
                color: 0x1a1a2e,
                metalness: 0.8,
                roughness: 0.2,
            });
            const frameMesh = new THREE.Mesh(frameGeo, frameMat);
            frameMesh.position.z = -0.05;
            frameGroup.add(frameMesh);

            // Accent glow strip at bottom
            const glowGeo = new THREE.BoxGeometry(2.4, 0.06, 0.02);
            const glowMat = new THREE.MeshStandardMaterial({
                color: art.color,
                emissive: art.color,
                emissiveIntensity: 1,
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = -1.55;
            frameGroup.add(glow);

            // Position in circle
            frameGroup.position.set(
                Math.sin(angle) * GALLERY_RADIUS,
                0,
                -Math.cos(angle) * GALLERY_RADIUS - 2
            );
            frameGroup.rotation.y = -angle;
            frameGroup.userData = { artIndex: i, title: art.title };

            frames.push(frameGroup);
            scene.add(frameGroup);
        });

        // Floor
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a10,
            metalness: 0.2,
            roughness: 0.8,
        });
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -2;
        scene.add(floor);

        // Navigation state
        let currentAngle = 0;
        let targetAngle = 0;
        let zoom = 0;
        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            const hands = handsRef.current;
            const gesture = gestureRef.current;

            if (gesture !== lastGestureRef.current) {
                if (gesture === "swipe_left") targetAngle -= (Math.PI * 2) / ARTWORKS.length;
                if (gesture === "swipe_right") targetAngle += (Math.PI * 2) / ARTWORKS.length;
                if (gesture === "pinch") zoom = Math.min(zoom + 0.5, 3);
                if (gesture === "open_palm") zoom = Math.max(zoom - 0.5, 0);
                if (gesture === "pointing" && hands.length > 0) {
                    const palm = getPalmCenter(hands[0].landmarks);
                    targetAngle += (palm.x - 0.5) * 0.08;
                }
                lastGestureRef.current = gesture;
            }

            // Smooth camera
            currentAngle += (targetAngle - currentAngle) * 0.06;
            camera.position.x += (Math.sin(currentAngle) * 0.5 - camera.position.x) * 0.05;
            camera.position.z += (-Math.cos(currentAngle) * 0.5 - camera.position.z) * 0.05;
            camera.position.y += (0 - camera.position.y) * 0.05;

            const lookX = Math.sin(currentAngle) * GALLERY_RADIUS * 0.5;
            const lookZ = -Math.cos(currentAngle) * GALLERY_RADIUS * 0.5 - 2;
            camera.lookAt(lookX + zoom * Math.sin(currentAngle), 0, lookZ + zoom * Math.cos(currentAngle) * -1);

            // Frame animations
            frames.forEach((frame, i) => {
                const angle = (i / ARTWORKS.length) * Math.PI * 2;
                const distToCamera = Math.abs(angle - (currentAngle % (Math.PI * 2)));
                const glow = frame.children[2] as THREE.Mesh;
                if (glow?.material) {
                    (glow.material as THREE.MeshStandardMaterial).emissiveIntensity =
                        0.5 + Math.sin(elapsed * 2 + i) * 0.2;
                }
            });

            renderer.render(scene, camera);
        };

        animate();

        const handleResize = () => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener("resize", handleResize);
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div className="relative w-full h-full">
            <div ref={mountRef} className="w-full h-full" />
            {focusedArt && (
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 glass px-6 py-3 rounded-2xl">
                    <p className="text-white font-semibold">{focusedArt}</p>
                </div>
            )}
        </div>
    );
}