/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    indigo: "#6366f1",
                    purple: "#8b5cf6",
                    cyan: "#22d3ee",
                    pink: "#ec4899",
                },
                glass: {
                    DEFAULT: "rgba(255,255,255,0.04)",
                    border: "rgba(255,255,255,0.08)",
                    hover: "rgba(255,255,255,0.08)",
                },
                dark: {
                    900: "#0a0a0f",
                    800: "#0f0f1a",
                    700: "#1a1a2e",
                    600: "#16213e",
                    500: "#1f2040",
                },
            },
            fontFamily: {
                sans: ["Inter", "system-ui", "sans-serif"],
                display: ["Space Grotesk", "Inter", "sans-serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
                "gradient-hero": "linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0f0f1a 100%)",
                "gradient-card": "linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.05) 100%)",
                "gradient-accent": "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                "gradient-glow": "radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)",
            },
            boxShadow: {
                glass: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
                "glass-hover": "0 16px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
                glow: "0 0 40px rgba(99,102,241,0.3)",
                "glow-cyan": "0 0 40px rgba(34,211,238,0.3)",
                "glow-purple": "0 0 40px rgba(139,92,246,0.4)",
                "glow-sm": "0 0 20px rgba(99,102,241,0.2)",
            },
            backdropBlur: {
                xs: "2px",
            },
            animation: {
                "float": "float 6s ease-in-out infinite",
                "float-slow": "float 10s ease-in-out infinite",
                "pulse-glow": "pulseGlow 2s ease-in-out infinite",
                "gradient-shift": "gradientShift 8s ease infinite",
                "spin-slow": "spin 20s linear infinite",
                "scan": "scan 3s linear infinite",
                "particle": "particle 4s ease-in-out infinite",
                "fade-up": "fadeUp 0.6s ease forwards",
                "fade-in": "fadeIn 0.4s ease forwards",
                "slide-in-left": "slideInLeft 0.5s ease forwards",
                "scale-in": "scaleIn 0.3s ease forwards",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-20px)" },
                },
                pulseGlow: {
                    "0%, 100%": { opacity: "0.6", transform: "scale(1)" },
                    "50%": { opacity: "1", transform: "scale(1.05)" },
                },
                gradientShift: {
                    "0%, 100%": { backgroundPosition: "0% 50%" },
                    "50%": { backgroundPosition: "100% 50%" },
                },
                scan: {
                    "0%": { transform: "translateY(-100%)" },
                    "100%": { transform: "translateY(100vh)" },
                },
                particle: {
                    "0%": { transform: "translateY(0) scale(1)", opacity: "1" },
                    "100%": { transform: "translateY(-200px) scale(0)", opacity: "0" },
                },
                fadeUp: {
                    "0%": { opacity: "0", transform: "translateY(30px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideInLeft: {
                    "0%": { opacity: "0", transform: "translateX(-30px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                scaleIn: {
                    "0%": { opacity: "0", transform: "scale(0.9)" },
                    "100%": { opacity: "1", transform: "scale(1)" },
                },
            },
        },
    },
    plugins: [],
};