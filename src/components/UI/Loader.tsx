import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoaderProps {
    size?: "sm" | "md" | "lg";
    text?: string;
    className?: string;
    variant?: "dots" | "ring" | "pulse";
}

const sizeMap = {
    sm: { ring: "w-6 h-6", dot: "w-1.5 h-1.5", text: "text-xs" },
    md: { ring: "w-10 h-10", dot: "w-2 h-2", text: "text-sm" },
    lg: { ring: "w-16 h-16", dot: "w-3 h-3", text: "text-base" },
};

export default function Loader({ size = "md", text, className, variant = "ring" }: LoaderProps) {
    const s = sizeMap[size];

    return (
        <div className={cn("flex flex-col items-center gap-4", className)}>
            {variant === "ring" && (
                <div className="relative">
                    <motion.div
                        className={cn(s.ring, "rounded-full border-2 border-indigo-500/20")}
                        style={{ borderTopColor: "#6366f1" }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className={cn("rounded-full bg-indigo-500/30", s.dot)} />
                    </div>
                </div>
            )}

            {variant === "dots" && (
                <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            className={cn("rounded-full bg-indigo-500", s.dot)}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1, delay: i * 0.2, repeat: Infinity }}
                        />
                    ))}
                </div>
            )}

            {variant === "pulse" && (
                <motion.div
                    className={cn(s.ring, "rounded-full bg-gradient-to-r from-indigo-600 to-violet-600")}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.4, 0.8] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                />
            )}

            {text && (
                <motion.p
                    className={cn(s.text, "text-gray-400 font-medium tracking-wide")}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                >
                    {text}
                </motion.p>
            )}
        </div>
    );
}