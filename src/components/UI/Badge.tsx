import { cn } from "@/lib/utils";

interface BadgeProps {
    children: React.ReactNode;
    variant?: "default" | "success" | "warning" | "danger" | "info" | "purple";
    size?: "sm" | "md";
    dot?: boolean;
    className?: string;
}

const variants = {
    default: "bg-gray-800/80 text-gray-300 border-gray-700/50",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
    info: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    purple: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

const dotColors = {
    default: "bg-gray-400",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    danger: "bg-red-400",
    info: "bg-cyan-400",
    purple: "bg-violet-400",
};

const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-xs",
};

export default function Badge({
                                  children,
                                  variant = "default",
                                  size = "md",
                                  dot = false,
                                  className,
                              }: BadgeProps) {
    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 font-medium rounded-full border",
                variants[variant],
                sizes[size],
                className
            )}
        >
      {dot && (
          <span
              className={cn(
                  "w-1.5 h-1.5 rounded-full animate-pulse",
                  dotColors[variant]
              )}
          />
      )}
            {children}
    </span>
    );
}