import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface TooltipProps {
    children: React.ReactNode;
    content: React.ReactNode;
    position?: "top" | "bottom" | "left" | "right";
    delay?: number;
    className?: string;
}

const positionStyles = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

const arrowStyles = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-dark-700",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-dark-700",
    left: "left-full top-1/2 -translate-y-1/2 border-l-dark-700",
    right: "right-full top-1/2 -translate-y-1/2 border-r-dark-700",
};

export default function Tooltip({
                                    children,
                                    content,
                                    position = "top",
                                    className,
                                }: TooltipProps) {
    const [visible, setVisible] = useState(false);

    return (
        <div
            className="relative inline-flex"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}

            <AnimatePresence>
                {visible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                            "absolute z-50 pointer-events-none whitespace-nowrap",
                            positionStyles[position]
                        )}
                    >
                        <div
                            className={cn(
                                "glass-dark px-3 py-1.5 rounded-lg text-xs text-gray-300 font-medium",
                                "border border-white/10 shadow-xl",
                                className
                            )}
                        >
                            {content}
                        </div>
                        {/* Arrow */}
                        <div
                            className={cn(
                                "absolute w-0 h-0 border-4 border-transparent",
                                arrowStyles[position]
                            )}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}