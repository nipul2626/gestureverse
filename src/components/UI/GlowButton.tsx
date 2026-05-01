import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlowButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: "primary" | "glass" | "outline" | "danger";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    className?: string;
    icon?: React.ReactNode;
    fullWidth?: boolean;
    type?: "button" | "submit";
}

const variants = {
    primary: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-glow hover:shadow-glow-purple",
    glass: "glass text-gray-300 hover:text-white hover:bg-white/10",
    outline: "border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-400",
    danger: "bg-gradient-to-r from-red-600 to-rose-600 text-white hover:shadow-[0_0_30px_rgba(239,68,68,0.4)]",
};

const sizes = {
    sm: "px-4 py-2 text-sm rounded-lg",
    md: "px-6 py-3 text-sm rounded-xl",
    lg: "px-8 py-4 text-base rounded-xl",
};

export default function GlowButton({
                                       children,
                                       onClick,
                                       variant = "primary",
                                       size = "md",
                                       disabled = false,
                                       loading = false,
                                       className,
                                       icon,
                                       fullWidth = false,
                                       type = "button",
                                   }: GlowButtonProps) {
    return (
        <motion.button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            whileHover={{ scale: disabled ? 1 : 1.02, y: disabled ? 0 : -2 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
            transition={{ duration: 0.15 }}
            className={cn(
                "relative font-semibold transition-all duration-200 flex items-center justify-center gap-2",
                "disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
                variants[variant],
                sizes[size],
                fullWidth && "w-full",
                className
            )}
        >
            {/* Shine effect */}
            {variant === "primary" && (
                <span className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-700" />
        </span>
            )}

            {loading ? (
                <>
                    <svg
                        className="animate-spin w-4 h-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Loading...
                </>
            ) : (
                <>
                    {icon && <span className="flex-shrink-0">{icon}</span>}
                    {children}
                </>
            )}
        </motion.button>
    );
}