import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGestureStore } from "@/store/gestureStore";
import { getPinchDistance, getPalmCenter } from "@/lib/gestureInterpreter";

export default function ProductSpin() {
    const mountRef = useRef<HTMLDivElement>(null);
    const { detectedHands, currentGesture } = useGestureStore();
    const handsRef = useRef(detectedHands);
    const gestureRef = useRef(currentGesture);
    const prevPalmRef = useRef<{ x: number; y: number } | null>(null);
    const prevPinchRef = useRef<number | null>(null);

    useEffect(() => { handsRef.current = detectedHands; }, [detectedHands]);
    useEffect(() => { gestureRef.current = currentGesture; }, [currentGesture]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
        camera.position.set(0, 0, 4);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        mount.appendChild(renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambient);

        const pointLight1 = new THREE.PointLight(0x6366f1, 3, 20);
        pointLight1.position.set(5, 5, 5);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0x22d3ee, 2, 20);
        pointLight2.position.set(-5, -3, 3);
        scene.add(pointLight2);

        const rimLight = new THREE.DirectionalLight(0x8b5cf6, 1.5);
        rimLight.position.set(0, -5, -5);
        scene.add(rimLight);

        // Build a stylised "product" — a sneaker-like abstract form
        const group = new THREE.Group();

        // Main body
        const bodyGeo = new THREE.CapsuleGeometry(0.7, 1.4, 8, 20);
        const bodyMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a2e,
            metalness: 0.3,
            roughness: 0.2,
            clearcoat: 1,
            clearcoatRoughness: 0.1,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.z = Math.PI / 2;
        group.add(body);

        // Sole
        const soleGeo = new THREE.BoxGeometry(2.2, 0.25, 0.9);
        const soleMat = new THREE.MeshPhysicalMaterial({
            color: 0x6366f1,
            metalness: 0.1,
            roughness: 0.4,
        });
        const sole = new THREE.Mesh(soleGeo, soleMat);
        sole.position.y = -0.6;
        group.add(sole);

        // Stripe accents
        for (let i = 0; i < 3; i++) {
            const stripeGeo = new THREE.BoxGeometry(0.08, 0.5, 0.75);
            const stripeMat = new THREE.MeshPhysicalMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 0.3,
                metalness: 0.5,
                roughness: 0.2,
            });
            const stripe = new THREE.Mesh(stripeGeo, stripeMat);
            stripe.position.set(-0.3 + i * 0.3, 0.1, 0.38);
            group.add(stripe);
        }

        // Toe cap
        const toeGeo = new THREE.SphereGeometry(0.55, 16, 16, 0, Math.PI);
        const toeMat = new THREE.MeshPhysicalMaterial({
            color: 0x222240,
            metalness: 0.4,
            roughness: 0.15,
            clearcoat: 1,
        });
        const toe = new THREE.Mesh(toeGeo, toeMat);
        toe.position.set(0.9, -0.15, 0);
        toe.rotation.z = -Math.PI / 2;
        group.add(toe);

        scene.add(group);

        // Ground reflection plane
        const planeGeo = new THREE.PlaneGeometry(10, 10);
        const planeMat = new THREE.MeshStandardMaterial({
            color: 0x0a0a0f,
            transparent: true,
            opacity: 0.4,
        });
        const plane = new THREE.Mesh(planeGeo, planeMat);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -1.2;
        scene.add(plane);

        // State
        let rotX = 0.2;
        let rotY = 0;
        let scale = 1;
        let autoRotate = true;
        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            const hands = handsRef.current;
            const gesture = gestureRef.current;

            if (hands.length > 0) {
                autoRotate = false;
                const palm = getPalmCenter(hands[0].landmarks);

                if (gesture === "open_palm" || gesture === "pointing") {
                    // Drag rotation
                    if (prevPalmRef.current) {
                        const dx = palm.x - prevPalmRef.current.x;
                        const dy = palm.y - prevPalmRef.current.y;
                        rotY += dx * 5;
                        rotX += dy * 3;
                    }
                    prevPalmRef.current = palm;
                } else {
                    prevPalmRef.current = null;
                }

                if (gesture === "pinch" && hands.length >= 1) {
                    const pinch = getPinchDistance(hands[0].landmarks);
                    if (prevPinchRef.current !== null) {
                        const delta = prevPinchRef.current - pinch;
                        scale = Math.max(0.4, Math.min(2.5, scale + delta * 4));
                    }
                    prevPinchRef.current = pinch;
                } else {
                    prevPinchRef.current = null;
                }

                if (gesture === "open_palm" && hands.length === 0) {
                    // Reset
                    rotX = 0.2;
                    rotY = 0;
                    scale = 1;
                }
            } else {
                autoRotate = true;
                prevPalmRef.current = null;
                prevPinchRef.current = null;
            }

            if (autoRotate) {
                rotY = elapsed * 0.4;
                rotX = Math.sin(elapsed * 0.3) * 0.15 + 0.1;
            }

            group.rotation.x = rotX;
            group.rotation.y = rotY;
            group.scale.setScalar(scale);

            // Animate lights
            pointLight1.position.x = Math.sin(elapsed * 0.5) * 6;
            pointLight1.position.y = Math.cos(elapsed * 0.4) * 4;

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

    return <div ref={mountRef} className="w-full h-full" />;
}