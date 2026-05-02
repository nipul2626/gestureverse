import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import * as THREE from "three";
import PageWrapper from "@/components/Layout/PageWrapper";
import GlowButton from "@/components/UI/GlowButton";
import Badge from "@/components/UI/Badge";
import GlassCard from "@/components/UI/GlassCard";
import CalibrationFlow from "@/components/Gestures/CalibrationFlow";
import { useGestureStore } from "@/store/gestureStore";
import { useAuthStore } from "@/store/authStore";
import { EXPERIENCES } from "@/store/experienceStore";
import { GESTURE_EMOJI } from "@/lib/gestureInterpreter";

const GESTURE_SHOWCASE = [
    { name: "Open Palm", emoji: "🖐", desc: "Repel & push objects" },
    { name: "Pinch", emoji: "🤌", desc: "Zoom & select items" },
    { name: "Swipe", emoji: "👈", desc: "Navigate between views" },
    { name: "Fist", emoji: "✊", desc: "Attract & grab objects" },
    { name: "Point", emoji: "☝️", desc: "Aim & direct forces" },
    { name: "Peace", emoji: "✌️", desc: "Trigger audio events" },
];

const STATS = [
    { value: "5", label: "Experiences", suffix: "" },
    { value: "21", label: "Hand Landmarks", suffix: "" },
    { value: "60", label: "FPS Tracking", suffix: "+" },
    { value: "0", label: "Plugins needed", suffix: "" },
];

export default function Landing() {
    const navigate = useNavigate();
    const heroRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [showCalibration, setShowCalibration] = useState(false);
    const [hoveredGesture, setHoveredGesture] = useState<number | null>(null);

    const { isCalibrated, setCalibrated } = useGestureStore();
    const { openAuthModal } = useAuthStore();

    const { scrollY } = useScroll();
    const heroOpacity = useTransform(scrollY, [0, 400], [1, 0]);
    const heroY = useTransform(scrollY, [0, 400], [0, -80]);

    // ── Three.js floating hand illustration ───────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lights
        scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const p1 = new THREE.PointLight(0x6366f1, 6, 20);
        p1.position.set(3, 3, 3);
        scene.add(p1);
        const p2 = new THREE.PointLight(0x22d3ee, 4, 15);
        p2.position.set(-3, -2, 2);
        scene.add(p2);

        const group = new THREE.Group();

        // Hand palm
        const palmGeo = new THREE.CylinderGeometry(0.5, 0.45, 0.15, 16);
        const palmMat = new THREE.MeshPhysicalMaterial({
            color: 0x1a1a3e,
            metalness: 0.4,
            roughness: 0.2,
            clearcoat: 1,
            transparent: true,
            opacity: 0.9,
        });
        group.add(new THREE.Mesh(palmGeo, palmMat));

        // Fingers
        const fingerPositions = [
            { x: -0.35, y: 0.6, rx: 0 },
            { x: -0.12, y: 0.72, rx: 0 },
            { x: 0.12, y: 0.72, rx: 0 },
            { x: 0.35, y: 0.62, rx: 0 },
            { x: -0.55, y: 0.25, rx: 0.4 },
        ];

        fingerPositions.forEach((fp, i) => {
            const fingerGroup = new THREE.Group();
            const fh = i === 4 ? 0.35 : 0.45;

            // Two segments per finger
            for (let s = 0; s < 2; s++) {
                const seg = new THREE.CapsuleGeometry(0.07, fh * 0.5, 4, 8);
                const mat = new THREE.MeshPhysicalMaterial({
                    color: i === 4 ? 0x6366f1 : 0x1a1a3e,
                    metalness: 0.3,
                    roughness: 0.25,
                    clearcoat: 0.8,
                    transparent: true,
                    opacity: 0.88,
                });
                const mesh = new THREE.Mesh(seg, mat);
                mesh.position.y = s * fh * 0.55;
                fingerGroup.add(mesh);
            }

            // Glowing tip
            const tipGeo = new THREE.SphereGeometry(0.09, 8, 8);
            const tipMat = new THREE.MeshPhysicalMaterial({
                color: 0x22d3ee,
                emissive: 0x22d3ee,
                emissiveIntensity: 0.8,
                transparent: true,
                opacity: 0.9,
            });
            const tip = new THREE.Mesh(tipGeo, tipMat);
            tip.position.y = fh;
            fingerGroup.add(tip);

            fingerGroup.position.set(fp.x, fp.y, 0);
            fingerGroup.rotation.x = fp.rx;
            group.add(fingerGroup);
        });

        // Floating particles around the hand
        const particleGeo = new THREE.BufferGeometry();
        const pCount = 200;
        const pPos = new Float32Array(pCount * 3);
        for (let i = 0; i < pCount; i++) {
            pPos[i * 3] = (Math.random() - 0.5) * 5;
            pPos[i * 3 + 1] = (Math.random() - 0.5) * 5;
            pPos[i * 3 + 2] = (Math.random() - 0.5) * 3;
        }
        particleGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
        const pMat = new THREE.PointsMaterial({
            size: 0.04,
            color: 0x6366f1,
            transparent: true,
            opacity: 0.6,
        });
        scene.add(new THREE.Points(particleGeo, pMat));

        scene.add(group);

        const clock = new THREE.Clock();
        let animId: number;

        const animate = () => {
            animId = requestAnimationFrame(animate);
            const t = clock.getElapsedTime();

            group.rotation.y = Math.sin(t * 0.4) * 0.4;
            group.rotation.x = Math.sin(t * 0.3) * 0.1 + 0.1;
            group.position.y = Math.sin(t * 0.5) * 0.15;

            p1.position.x = Math.sin(t * 0.7) * 4;
            p1.position.y = Math.cos(t * 0.5) * 3;

            renderer.render(scene, camera);
        };

        animate();

        const ro = new ResizeObserver(() => {
            if (!canvas) return;
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            camera.aspect = canvas.clientWidth / canvas.clientHeight;
            camera.updateProjectionMatrix();
        });
        ro.observe(canvas);

        return () => {
            cancelAnimationFrame(animId);
            ro.disconnect();
            renderer.dispose();
        };
    }, []);

    const handleGetStarted = () => {
        if (isCalibrated) {
            navigate("/dashboard");
        } else {
            setShowCalibration(true);
        }
    };

    return (
        <PageWrapper>
            {/* Calibration overlay */}
            {showCalibration && (
                <CalibrationFlow
                    onComplete={() => { setShowCalibration(false); navigate("/dashboard"); }}
                    onSkip={() => { setCalibrated(true); setShowCalibration(false); navigate("/dashboard"); }}
                />
            )}

            {/* ── HERO ──────────────────────────────────────────────── */}
            <motion.section
                ref={heroRef}
                style={{ opacity: heroOpacity, y: heroY }}
                className="relative min-h-screen flex items-center justify-center overflow-hidden px-6"
            >
                {/* Grid background */}
                <div
                    className="absolute inset-0 opacity-[0.04]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(99,102,241,1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99,102,241,1) 1px, transparent 1px)`,
                        backgroundSize: "60px 60px",
                    }}
                />

                <div className="relative z-10 max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
                    {/* Left copy */}
                    <div>
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.1 }}
                        >
                            <Badge variant="purple" dot className="mb-6">
                                Powered by MediaPipe + Three.js
                            </Badge>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.7, delay: 0.2 }}
                            className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6"
                        >
                            Control{" "}
                            <span className="gradient-text">3D worlds</span>
                            {" "}with your{" "}
                            <span className="gradient-text-warm">hands</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.35 }}
                            className="text-gray-400 text-lg md:text-xl leading-relaxed mb-8 max-w-xl"
                        >
                            GestureVerse is an immersive hub of hand-gesture powered experiences.
                            No controllers. No plugins. Just your hands and a webcam.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.45 }}
                            className="flex flex-wrap gap-3 mb-10"
                        >
                            <GlowButton size="lg" onClick={handleGetStarted}>
                                Start Exploring →
                            </GlowButton>
                            <GlowButton variant="glass" size="lg" onClick={() => openAuthModal("signup")}>
                                Create Account
                            </GlowButton>
                        </motion.div>

                        {/* Stats */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="grid grid-cols-4 gap-4"
                        >
                            {STATS.map((stat) => (
                                <div key={stat.label}>
                                    <p className="font-display text-2xl font-bold gradient-text">
                                        {stat.value}{stat.suffix}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5">{stat.label}</p>
                                </div>
                            ))}
                        </motion.div>
                    </div>

                    {/* Right: 3D hand canvas */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        className="relative h-[500px] lg:h-[600px]"
                    >
                        <canvas ref={canvasRef} className="w-full h-full rounded-3xl" />
                        {/* Reflection */}
                        <div
                            className="absolute bottom-0 left-0 right-0 h-32 rounded-b-3xl"
                            style={{
                                background: "linear-gradient(to top, rgba(10,10,15,0.9), transparent)",
                            }}
                        />
                        {/* Floating labels */}
                        {[
                            { text: "21 landmarks", x: "10%", y: "20%", delay: 1.0 },
                            { text: "< 10ms latency", x: "65%", y: "15%", delay: 1.2 },
                            { text: "60fps tracking", x: "70%", y: "75%", delay: 1.4 },
                        ].map((label) => (
                            <motion.div
                                key={label.text}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: label.delay, duration: 0.4 }}
                                className="absolute glass rounded-xl px-3 py-1.5 pointer-events-none"
                                style={{ left: label.x, top: label.y }}
                            >
                                <span className="text-xs text-gray-300 font-medium">{label.text}</span>
                            </motion.div>
                        ))}
                    </motion.div>
                </div>

                {/* Scroll indicator */}
                <motion.div
                    className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                >
                    <span className="text-xs text-gray-600">scroll to explore</span>
                    <div className="w-px h-8 bg-gradient-to-b from-indigo-500/50 to-transparent" />
                </motion.div>
            </motion.section>

            {/* ── GESTURE SHOWCASE ──────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6 }}
                        className="text-center mb-16"
                    >
                        <Badge variant="info" className="mb-4">Hand Gestures</Badge>
                        <h2 className="font-display text-4xl font-bold text-white mb-4">
                            Natural controls, <span className="gradient-text">zero learning curve</span>
                        </h2>
                        <p className="text-gray-500 max-w-xl mx-auto">
                            Every interaction is designed around gestures you already know.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {GESTURE_SHOWCASE.map((g, i) => (
                            <motion.div
                                key={g.name}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.07, duration: 0.5 }}
                                onMouseEnter={() => setHoveredGesture(i)}
                                onMouseLeave={() => setHoveredGesture(null)}
                                className="glass rounded-2xl p-4 text-center cursor-default group transition-all duration-300 hover:bg-white/7 hover:-translate-y-2"
                            >
                                <motion.div
                                    animate={hoveredGesture === i ? { scale: 1.3, rotate: [0, -10, 10, 0] } : { scale: 1 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-4xl mb-3"
                                >
                                    {g.emoji}
                                </motion.div>
                                <p className="text-sm font-semibold text-white mb-1">{g.name}</p>
                                <p className="text-xs text-gray-600">{g.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── EXPERIENCES PREVIEW ───────────────────────────────── */}
            <section className="py-24 px-6 relative">
                <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ background: "radial-gradient(ellipse at center, rgba(99,102,241,1) 0%, transparent 60%)" }}
                />
                <div className="max-w-7xl mx-auto relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <Badge variant="purple" className="mb-4">5 Experiences</Badge>
                        <h2 className="font-display text-4xl font-bold text-white mb-4">
                            Everything you can <span className="gradient-text">build & explore</span>
                        </h2>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {EXPERIENCES.map((exp, i) => (
                            <motion.div
                                key={exp.id}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                whileHover={{ y: -6 }}
                                onClick={() => handleGetStarted()}
                                className="glass rounded-2xl p-6 cursor-pointer group relative overflow-hidden transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                            >
                                <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${exp.gradient} opacity-60 group-hover:opacity-100 transition-opacity`} />
                                <div
                                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4 bg-gradient-to-br font-bold"
                                    style={{ background: `linear-gradient(135deg, ${exp.accentColor}40, ${exp.accentColor}20)`, border: `1px solid ${exp.accentColor}30` }}
                                >
                                    {exp.icon}
                                </div>
                                <h3 className="font-display text-lg font-bold text-white mb-1">{exp.title}</h3>
                                <p className="text-sm text-gray-500 mb-3">{exp.subtitle}</p>
                                <p className="text-xs text-gray-600 line-clamp-2">{exp.description}</p>
                            </motion.div>
                        ))}

                        {/* CTA card */}
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.5, duration: 0.5 }}
                            onClick={handleGetStarted}
                            className="glass rounded-2xl p-6 cursor-pointer flex flex-col items-center justify-center text-center gap-4 group hover:bg-white/7 transition-all duration-300 hover:-translate-y-2 neon-border"
                        >
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300 shadow-glow">
                                ＋
                            </div>
                            <div>
                                <p className="font-display font-bold text-white mb-1">More coming soon</p>
                                <p className="text-sm text-gray-600">Start exploring now</p>
                            </div>
                            <GlowButton size="sm" onClick={handleGetStarted}>
                                Enter GestureVerse →
                            </GlowButton>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ──────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <Badge variant="success" className="mb-4">How it works</Badge>
                        <h2 className="font-display text-4xl font-bold text-white mb-4">
                            Up and running in <span className="gradient-text">30 seconds</span>
                        </h2>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { step: "01", title: "Allow Camera", desc: "GestureVerse uses your webcam locally. No data leaves your device.", emoji: "📷" },
                            { step: "02", title: "Calibrate", desc: "A 4-step cinematic calibration tunes the system to your hand and lighting.", emoji: "🎯" },
                            { step: "03", title: "Explore", desc: "Navigate experiences with gestures. Swipe, pinch, push — it's all natural.", emoji: "🚀" },
                        ].map((step, i) => (
                            <motion.div
                                key={step.step}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.15 }}
                                className="relative"
                            >
                                {i < 2 && (
                                    <div className="hidden md:block absolute top-8 left-full w-full h-px bg-gradient-to-r from-indigo-500/30 to-transparent z-0" />
                                )}
                                <GlassCard className="relative z-10 text-center">
                                    <div className="text-4xl mb-4">{step.emoji}</div>
                                    <div className="font-mono text-xs text-indigo-400 font-bold mb-2">{step.step}</div>
                                    <h3 className="font-display text-lg font-bold text-white mb-2">{step.title}</h3>
                                    <p className="text-sm text-gray-500 leading-relaxed">{step.desc}</p>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FINAL CTA ─────────────────────────────────────────── */}
            <section className="py-24 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        className="glass rounded-3xl p-12 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 to-violet-600/5 pointer-events-none" />
                        <div className="relative z-10">
                            <div className="text-6xl mb-6">🖐</div>
                            <h2 className="font-display text-4xl font-bold text-white mb-4">
                                Ready to use your <span className="gradient-text">hands?</span>
                            </h2>
                            <p className="text-gray-400 mb-8 text-lg">
                                No downloads. No setup. Just open your browser and wave.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <GlowButton size="lg" onClick={handleGetStarted}>
                                    Launch GestureVerse →
                                </GlowButton>
                                <GlowButton variant="glass" size="lg" onClick={() => openAuthModal("signup")}>
                                    Create Free Account
                                </GlowButton>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-white/5">
                <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">G</span>
                        </div>
                        <span className="text-gray-600 text-sm font-medium">GestureVerse</span>
                    </div>
                    <p className="text-xs text-gray-700">
                        Built with Three.js · MediaPipe · React · Tailwind
                    </p>
                </div>
            </footer>
        </PageWrapper>
    );
}