import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGestureStore } from "@/store/gestureStore";
import { getPalmCenter, getHandOpenness } from "@/lib/gestureInterpreter";

const PARTICLE_COUNT = 6000;

export default function ParticlePlayground() {
    const mountRef = useRef<HTMLDivElement>(null);
    const { detectedHands, currentGesture } = useGestureStore();
    const gestureRef = useRef(currentGesture);
    const handsRef = useRef(detectedHands);

    useEffect(() => { gestureRef.current = currentGesture; }, [currentGesture]);
    useEffect(() => { handsRef.current = detectedHands; }, [detectedHands]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        // Scene
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, mount.clientWidth / mount.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        // Particles
        const positions = new Float32Array(PARTICLE_COUNT * 3);
        const velocities = new Float32Array(PARTICLE_COUNT * 3);
        const colors = new Float32Array(PARTICLE_COUNT * 3);
        const origins = new Float32Array(PARTICLE_COUNT * 3);

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 2 + Math.random() * 1.5;

            positions[i3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = r * Math.cos(phi);

            origins[i3] = positions[i3];
            origins[i3 + 1] = positions[i3 + 1];
            origins[i3 + 2] = positions[i3 + 2];

            velocities[i3] = (Math.random() - 0.5) * 0.01;
            velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

            // Colors: indigo → cyan gradient
            const t = Math.random();
            colors[i3] = 0.4 + t * 0.2;
            colors[i3 + 1] = 0.2 + t * 0.6;
            colors[i3 + 2] = 0.7 + t * 0.3;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.025,
            vertexColors: true,
            transparent: true,
            opacity: 0.85,
            sizeAttenuation: true,
        });

        const particles = new THREE.Points(geometry, material);
        scene.add(particles);

        // Clock
        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();
            const pos = geometry.attributes.position as THREE.BufferAttribute;

            const gesture = gestureRef.current;
            const hands = handsRef.current;

            let palmX = 0;
            let palmY = 0;
            let openness = 0;

            if (hands.length > 0) {
                const palm = getPalmCenter(hands[0].landmarks);
                // Remap from [0,1] webcam space to [-2,2] world space
                palmX = (palm.x - 0.5) * -4;
                palmY = (palm.y - 0.5) * -4;
                openness = getHandOpenness(hands[0].landmarks);
            }

            for (let i = 0; i < PARTICLE_COUNT; i++) {
                const i3 = i * 3;

                let px = pos.array[i3];
                let py = pos.array[i3 + 1];
                let pz = pos.array[i3 + 2];

                // Base wave motion
                const wave = Math.sin(elapsed * 0.8 + origins[i3] * 2) * 0.003;
                velocities[i3] += wave;
                velocities[i3 + 1] += Math.cos(elapsed * 0.6 + origins[i3 + 1] * 2) * 0.003;

                // Gesture effects
                if (gesture === "open_palm" && hands.length > 0) {
                    // Repel from palm position
                    const dx = px - palmX;
                    const dy = py - palmY;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
                    const force = Math.max(0, 1.5 - dist) * 0.04;
                    velocities[i3] += (dx / dist) * force;
                    velocities[i3 + 1] += (dy / dist) * force;
                }

                if (gesture === "closed_fist" && hands.length > 0) {
                    // Attract to palm position
                    const dx = palmX - px;
                    const dy = palmY - py;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;
                    const force = 0.03;
                    velocities[i3] += (dx / dist) * force;
                    velocities[i3 + 1] += (dy / dist) * force;
                }

                if (gesture === "swipe_left" || gesture === "swipe_right") {
                    // Explosion burst
                    velocities[i3] += (Math.random() - 0.5) * 0.15;
                    velocities[i3 + 1] += (Math.random() - 0.5) * 0.15;
                    velocities[i3 + 2] += (Math.random() - 0.5) * 0.15;
                }

                if (gesture === "pinch") {
                    // Spiral
                    const angle = Math.atan2(py, px) + 0.04;
                    const r = Math.sqrt(px * px + py * py);
                    velocities[i3] += (Math.cos(angle) * r - px) * 0.02;
                    velocities[i3 + 1] += (Math.sin(angle) * r - py) * 0.02;
                }

                // Return to origin (spring)
                const ox = origins[i3], oy = origins[i3 + 1], oz = origins[i3 + 2];
                velocities[i3] += (ox - px) * 0.002;
                velocities[i3 + 1] += (oy - py) * 0.002;
                velocities[i3 + 2] += (oz - pz) * 0.002;

                // Damping
                velocities[i3] *= 0.96;
                velocities[i3 + 1] *= 0.96;
                velocities[i3 + 2] *= 0.96;

                (pos.array as Float32Array)[i3] = px + velocities[i3];
                (pos.array as Float32Array)[i3 + 1] = py + velocities[i3 + 1];
                (pos.array as Float32Array)[i3 + 2] = pz + velocities[i3 + 2];
            }

            pos.needsUpdate = true;
            particles.rotation.y = elapsed * 0.05;
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
            geometry.dispose();
            material.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, []);

    return (
        <div ref={mountRef} className="w-full h-full" />
    );
}