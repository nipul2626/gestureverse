import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Experience {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    gradient: string;
    accentColor: string;
    tags: string[];
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    gestures: string[];
    route: string;
}

export const EXPERIENCES: Experience[] = [
    {
        id: "particle-playground",
        title: "Particle Playground",
        subtitle: "Sculpt chaos with your hands",
        description:
            "Control thousands of particles with gesture-driven forces. Push, pull, swirl, and explode particle systems in real time.",
        icon: "✦",
        gradient: "from-violet-600 via-purple-600 to-indigo-600",
        accentColor: "#8b5cf6",
        tags: ["Particles", "Physics", "Creative"],
        difficulty: "Beginner",
        gestures: ["open_palm", "closed_fist", "pinch", "swipe"],
        route: "/experience/particle-playground",
    },
    {
        id: "product-spin",
        title: "Product Spin",
        subtitle: "The future of product previews",
        description:
            "Rotate, zoom, and inspect 3D products with natural hand gestures. Pinch to zoom, swipe to rotate, palm to reset.",
        icon: "◈",
        gradient: "from-cyan-500 via-blue-500 to-indigo-600",
        accentColor: "#22d3ee",
        tags: ["E-Commerce", "3D Viewer", "Rotation"],
        difficulty: "Beginner",
        gestures: ["pinch", "rotate", "swipe", "open_palm"],
        route: "/experience/product-spin",
    },
    {
        id: "sound-sculptor",
        title: "Sound Sculptor",
        subtitle: "Conduct your own audio landscape",
        description:
            "Use hand height, spread, and movement to control synth parameters, reverb, and 3D audio visualizations in real time.",
        icon: "◉",
        gradient: "from-pink-500 via-rose-500 to-orange-500",
        accentColor: "#ec4899",
        tags: ["Audio", "Synth", "Visualizer"],
        difficulty: "Intermediate",
        gestures: ["open_palm", "peace", "thumbs_up", "swipe"],
        route: "/experience/sound-sculptor",
    },
    {
        id: "data-sphere",
        title: "Data Sphere",
        subtitle: "Navigate data like never before",
        description:
            "Fly through 3D data visualizations, grab nodes, explore network graphs, and filter datasets with intuitive gestures.",
        icon: "⬡",
        gradient: "from-emerald-500 via-teal-500 to-cyan-500",
        accentColor: "#10b981",
        tags: ["Data Viz", "Analytics", "Navigation"],
        difficulty: "Intermediate",
        gestures: ["pinch", "pointing", "swipe", "closed_fist"],
        route: "/experience/data-sphere",
    },
    {
        id: "virtual-gallery",
        title: "Virtual Gallery",
        subtitle: "Walk through art with your hands",
        description:
            "Navigate a 3D gallery, zoom into artwork, read descriptions, and curate your favorites — no keyboard needed.",
        icon: "▣",
        gradient: "from-amber-500 via-orange-500 to-red-500",
        accentColor: "#f59e0b",
        tags: ["Gallery", "Navigation", "Art"],
        difficulty: "Advanced",
        gestures: ["pointing", "swipe", "pinch", "peace"],
        route: "/experience/virtual-gallery",
    },
];

interface ExperienceState {
    experiences: Experience[];
    activeExperienceId: string | null;
    completedIds: string[];
    viewMode: "carousel" | "grid";
    hoveredId: string | null;

    // Actions
    setActiveExperience: (id: string | null) => void;
    markCompleted: (id: string) => void;
    setViewMode: (mode: "carousel" | "grid") => void;
    setHoveredId: (id: string | null) => void;
    getExperience: (id: string) => Experience | undefined;
}

export const useExperienceStore = create<ExperienceState>()(
    persist(
        (set, get) => ({
            experiences: EXPERIENCES,
            activeExperienceId: null,
            completedIds: [],
            viewMode: "carousel",
            hoveredId: null,

            setActiveExperience: (id) => set({ activeExperienceId: id }),

            markCompleted: (id) => {
                const current = get().completedIds;
                if (!current.includes(id)) {
                    set({ completedIds: [...current, id] });
                }
            },

            setViewMode: (mode) => set({ viewMode: mode }),

            setHoveredId: (id) => set({ hoveredId: id }),

            getExperience: (id) =>
                get().experiences.find((e) => e.id === id),
        }),
        {
            name: "gestureverse-experiences",
            partialize: (state) => ({
                completedIds: state.completedIds,
                viewMode: state.viewMode,
            }),
        }
    )
);