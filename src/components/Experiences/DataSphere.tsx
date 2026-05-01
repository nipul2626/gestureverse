import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useGestureStore } from "@/store/gestureStore";
import { getPalmCenter } from "@/lib/gestureInterpreter";

interface DataNode {
    mesh: THREE.Mesh;
    connections: number[];
    value: number;
    label: string;
}

export default function DataSphere() {
    const mountRef = useRef<HTMLDivElement>(null);
    const { detectedHands, currentGesture } = useGestureStore();
    const handsRef = useRef(detectedHands);
    const gestureRef = useRef(currentGesture);

    useEffect(() => { handsRef.current = detectedHands; }, [detectedHands]);
    useEffect(() => { gestureRef.current = currentGesture; }, [currentGesture]);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 100);
        camera.position.z = 7;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const pLight = new THREE.PointLight(0x6366f1, 5, 20);
        scene.add(pLight);
        const pLight2 = new THREE.PointLight(0x22d3ee, 3, 15);
        pLight2.position.set(-4, 4, 2);
        scene.add(pLight2);

        const NODE_COUNT = 40;
        const nodes: DataNode[] = [];
        const group = new THREE.Group();

        // Build nodes on sphere surface
        for (let i = 0; i < NODE_COUNT; i++) {
            const theta = Math.acos(1 - (2 * (i + 0.5)) / NODE_COUNT);
            const phi = Math.PI * (1 + Math.sqrt(5)) * i;
            const r = 2.5;
            const value = Math.random();

            const size = 0.06 + value * 0.12;
            const geo = new THREE.SphereGeometry(size, 8, 8);
            const hue = 0.65 + value * 0.25;
            const mat = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color().setHSL(hue, 0.8, 0.6),
                emissive: new THREE.Color().setHSL(hue, 0.9, 0.15),
                emissiveIntensity: 0.8,
                metalness: 0.3,
                roughness: 0.2,
                clearcoat: 1,
            });

            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(
                r * Math.sin(theta) * Math.cos(phi),
                r * Math.sin(theta) * Math.sin(phi),
                r * Math.cos(theta)
            );

            const connections: number[] = [];
            for (let j = 0; j < 2; j++) {
                connections.push(Math.floor(Math.random() * NODE_COUNT));
            }

            nodes.push({ mesh, connections, value, label: `Node ${i}` });
            group.add(mesh);
        }

        // Draw connection lines
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x6366f1,
            transparent: true,
            opacity: 0.2,
        });

        nodes.forEach((node, i) => {
            node.connections.forEach((j) => {
                if (j === i || j >= nodes.length) return;
                const points = [node.mesh.position, nodes[j].mesh.position];
                const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                group.add(new THREE.Line(lineGeo, lineMaterial));
            });
        });

        scene.add(group);

        // Center core sphere
        const coreGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const coreMat = new THREE.MeshPhysicalMaterial({
            color: 0x6366f1,
            emissive: 0x6366f1,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8,
        });
        scene.add(new THREE.Mesh(coreGeo, coreMat));

        // State
        let targetRotX = 0, targetRotY = 0;
        let currentScale = 1;
        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            const hands = handsRef.current;
            const gesture = gestureRef.current;

            if (hands.length > 0) {
                const palm = getPalmCenter(hands[0].landmarks);
                if (gesture === "pointing" || gesture === "open_palm") {
                    targetRotY = (palm.x - 0.5) * Math.PI * 2;
                    targetRotX = (palm.y - 0.5) * Math.PI;
                }
                if (gesture === "closed_fist") currentScale = Math.max(0.5, currentScale - 0.01);
                if (gesture === "pinch") currentScale = Math.min(2, currentScale + 0.01);
            }

            // Smooth interpolation
            group.rotation.y += (targetRotY - group.rotation.y) * 0.04;
            group.rotation.x += (targetRotX - group.rotation.x) * 0.04;

            if (hands.length === 0) {
                group.rotation.y += 0.003;
                group.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
            }

            group.scale.setScalar(currentScale + (1 - currentScale) * 0.05);

            // Pulse nodes
            nodes.forEach((node, i) => {
                const pulse = Math.sin(elapsed * 2 + i * 0.5) * 0.05 + 1;
                node.mesh.scale.setScalar(pulse);
            });

            pLight.position.set(
                Math.sin(elapsed * 0.7) * 5,
                Math.cos(elapsed * 0.5) * 4,
                3
            );

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