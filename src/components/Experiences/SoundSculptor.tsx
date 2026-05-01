import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useGestureStore } from "@/store/gestureStore";
import { useAudio } from "@/hooks/useAudio";
import { getPalmCenter, getHandOpenness } from "@/lib/gestureInterpreter";
import GlowButton from "@/components/UI/GlowButton";

const NOTES = ["C3","E3","G3","B3","D4","F4","A4","C5","E5","G5"];

export default function SoundSculptor() {
    const mountRef = useRef<HTMLDivElement>(null);
    const { detectedHands, currentGesture } = useGestureStore();
    const handsRef = useRef(detectedHands);
    const gestureRef = useRef(currentGesture);
    const [audioStarted, setAudioStarted] = useState(false);
    const lastNoteTime = useRef(0);

    const { initAudio, playNote, setFilterFrequency, setReverbWet, getWaveform } = useAudio({
        enabled: audioStarted,
    });

    useEffect(() => { handsRef.current = detectedHands; }, [detectedHands]);
    useEffect(() => { gestureRef.current = currentGesture; }, [currentGesture]);

    const handleStart = async () => {
        await initAudio();
        setAudioStarted(true);
    };

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(70, mount.clientWidth / mount.clientHeight, 0.1, 100);
        camera.position.z = 6;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        mount.appendChild(renderer.domElement);

        // Waveform line
        const wavePoints = 128;
        const waveGeo = new THREE.BufferGeometry();
        const wavePos = new Float32Array(wavePoints * 3);
        for (let i = 0; i < wavePoints; i++) {
            wavePos[i * 3] = (i / wavePoints) * 6 - 3;
            wavePos[i * 3 + 1] = 0;
            wavePos[i * 3 + 2] = 0;
        }
        waveGeo.setAttribute("position", new THREE.BufferAttribute(wavePos, 3));
        const waveMat = new THREE.LineBasicMaterial({ color: 0x22d3ee, linewidth: 2 });
        const waveLine = new THREE.Line(waveGeo, waveMat);
        waveLine.position.y = -2;
        scene.add(waveLine);

        // Frequency bars
        const BAR_COUNT = 32;
        const bars: THREE.Mesh[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
            const geo = new THREE.BoxGeometry(0.12, 0.1, 0.12);
            const mat = new THREE.MeshStandardMaterial({
                color: new THREE.Color().setHSL(0.7 - (i / BAR_COUNT) * 0.3, 0.8, 0.6),
                emissive: new THREE.Color().setHSL(0.7 - (i / BAR_COUNT) * 0.3, 0.9, 0.2),
                emissiveIntensity: 0.5,
            });
            const bar = new THREE.Mesh(geo, mat);
            const angle = (i / BAR_COUNT) * Math.PI * 2;
            const r = 2.5;
            bar.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
            bar.lookAt(0, 0, 0);
            scene.add(bar);
            bars.push(bar);
        }

        // Ambient light
        scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const pLight = new THREE.PointLight(0x6366f1, 4, 15);
        scene.add(pLight);

        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const elapsed = clock.getElapsedTime();

            const hands = handsRef.current;
            const gesture = gestureRef.current;
            const now = Date.now();

            if (hands.length > 0 && audioStarted) {
                const palm = getPalmCenter(hands[0].landmarks);
                const openness = getHandOpenness(hands[0].landmarks);

                // Map hand Y position to filter frequency
                const freq = (1 - palm.y) * 4000 + 400;
                setFilterFrequency(freq);

                // Map hand X to reverb
                setReverbWet(palm.x * 0.8);

                // Trigger notes based on hand height and gesture
                if (gesture === "open_palm" && now - lastNoteTime.current > 300) {
                    const noteIdx = Math.floor((1 - palm.y) * NOTES.length);
                    const note = NOTES[Math.min(noteIdx, NOTES.length - 1)];
                    playNote(note, "8n");
                    lastNoteTime.current = now;
                }

                if (gesture === "peace" && now - lastNoteTime.current > 500) {
                    const noteIdx = Math.floor(palm.x * NOTES.length);
                    const note = NOTES[Math.min(noteIdx, NOTES.length - 1)];
                    playNote(note, "4n");
                    lastNoteTime.current = now;
                }
            }

            // Update waveform
            const waveform = getWaveform();
            if (waveform) {
                const posAttr = waveGeo.attributes.position as THREE.BufferAttribute;
                for (let i = 0; i < wavePoints; i++) {
                    (posAttr.array as Float32Array)[i * 3 + 1] = waveform[i] * 1.5;
                }
                posAttr.needsUpdate = true;
            }

            // Animate bars
            bars.forEach((bar, i) => {
                const target = waveform
                    ? Math.abs(waveform[Math.floor((i / BAR_COUNT) * 128)]) * 4 + 0.05
                    : 0.05 + Math.sin(elapsed * 2 + i * 0.3) * 0.03;
                bar.scale.y += (target - bar.scale.y) * 0.15;
                bar.rotation.y = elapsed * 0.3;
            });

            pLight.intensity = 3 + Math.sin(elapsed * 4) * 1;
            scene.rotation.y = elapsed * 0.05;

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
    }, [audioStarted, getWaveform, playNote, setFilterFrequency, setReverbWet]);

    return (
        <div className="relative w-full h-full">
            <div ref={mountRef} className="w-full h-full" />
            {!audioStarted && (
                <div className="absolute inset-0 flex items-center justify-center bg-dark-900/70 backdrop-blur-sm rounded-2xl">
                    <div className="text-center">
                        <p className="text-4xl mb-4">🎵</p>
                        <p className="text-gray-300 mb-4 text-sm">Audio requires user interaction</p>
                        <GlowButton variant="primary" onClick={handleStart}>
                            Start Sound Sculptor
                        </GlowButton>
                    </div>
                </div>
            )}
        </div>
    );
}