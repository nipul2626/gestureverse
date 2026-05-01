import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
    children: React.ReactNode;
    className?: string;
    hover?: boolean;
    glow?: boolean;
    glowColor?: string;
    onClick?: () => void;
    padding?: "sm" | "md" | "lg" | "none";
    animate?: boolean;
    delay?: number;
}

const paddingMap = {
    none: "p-0",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
};

export default function GlassCard({
                                      children,
                                      className,
                                      hover = true,
                                      glow = false,
                                      glowColor = "rgba(99,102,241,0.3)",
                                      onClick,
                                      padding = "md",
                                      animate = true,
                                      delay = 0,
                                  }: GlassCardProps) {
    const base = (
        <div
            className={cn(
                "glass rounded-2xl transition-all duration-300",
                paddingMap[padding],
                hover && "cursor-pointer hover:bg-white/[0.07] hover:-translate-y-1",
                glow && "shadow-glow",
                className
            )}
            style={
                glow
                    ? { boxShadow: `0 0 40px ${glowColor}, 0 8px 32px rgba(0,0,0,0.4)` }
                    : { boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }
            }
            onClick={onClick}
        >
            {children}
        </div>
    );

    if (!animate) return base;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay, ease: "easeOut" }}
            className={cn(
                "glass rounded-2xl transition-all duration-300",
                paddingMap[padding],
                hover && "cursor-pointer hover:bg-white/[0.07] hover:-translate-y-1",
                glow && "shadow-glow",
                className
            )}
            style={
                glow
                    ? { boxShadow: `0 0 40px ${glowColor}, 0 8px 32px rgba(0,0,0,0.4)` }
                    : { boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)" }
            }
            onClick={onClick}
            whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        >
            {children}
        </motion.div>
    );
}