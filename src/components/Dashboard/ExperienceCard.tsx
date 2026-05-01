import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useExperienceStore, type Experience } from "@/store/experienceStore";
import Badge from "@/components/UI/Badge";
import { cn } from "@/lib/utils";

interface ExperienceCardProps {
    experience: Experience;
    index?: number;
    compact?: boolean;
}

const difficultyVariant: Record<string, "success" | "warning" | "danger"> = {
    Beginner: "success",
    Intermediate: "warning",
    Advanced: "danger",
};

export default function ExperienceCard({
                                           experience,
                                           index = 0,
                                           compact = false,
                                       }: ExperienceCardProps) {
    const navigate = useNavigate();
    const { completedIds, setActiveExperience } = useExperienceStore();
    const isCompleted = completedIds.includes(experience.id);

    const handleClick = () => {
        setActiveExperience(experience.id);
        navigate(experience.route);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.08, ease: "easeOut" }}
            whileHover={{ y: -6, transition: { duration: 0.2 } }}
            onClick={handleClick}
            className={cn(
                "group relative glass rounded-2xl overflow-hidden cursor-pointer transition-all duration-300",
                "hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                compact ? "p-4" : "p-6"
            )}
        >
            {/* Gradient top border */}
            <div
                className={cn("absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r opacity-60 group-hover:opacity-100 transition-opacity duration-300", experience.gradient)}
            />

            {/* Background glow on hover */}
            <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at top left, ${experience.accentColor}15 0%, transparent 60%)`,
                }}
            />

            {/* Completed badge */}
            {isCompleted && (
                <div className="absolute top-4 right-4">
                    <Badge variant="success" dot>Completed</Badge>
                </div>
            )}

            <div className="relative z-10">
                {/* Icon */}
                <div
                    className={cn(
                        "flex items-center justify-center rounded-2xl font-bold text-white mb-4 transition-transform duration-300 group-hover:scale-110",
                        compact ? "w-10 h-10 text-xl" : "w-14 h-14 text-3xl",
                        `bg-gradient-to-br ${experience.gradient}`
                    )}
                    style={{ boxShadow: `0 8px 24px ${experience.accentColor}30` }}
                >
                    {experience.icon}
                </div>

                {/* Title */}
                <h3
                    className={cn(
                        "font-display font-bold text-white mb-1 group-hover:gradient-text transition-all duration-300",
                        compact ? "text-base" : "text-xl"
                    )}
                >
                    {experience.title}
                </h3>

                {/* Subtitle */}
                <p className={cn("text-gray-500 mb-3", compact ? "text-xs" : "text-sm")}>
                    {experience.subtitle}
                </p>

                {/* Description */}
                {!compact && (
                    <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
                        {experience.description}
                    </p>
                )}

                {/* Tags + difficulty */}
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={difficultyVariant[experience.difficulty]}>
                        {experience.difficulty}
                    </Badge>
                    {!compact &&
                        experience.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="default">
                                {tag}
                            </Badge>
                        ))}
                </div>

                {/* Gestures used */}
                {!compact && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                        <p className="text-xs text-gray-600 mb-2">Gestures used</p>
                        <div className="flex flex-wrap gap-1.5">
                            {experience.gestures.map((g) => (
                                <span
                                    key={g}
                                    className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-500 font-mono"
                                >
                  {g.replace("_", " ")}
                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* CTA arrow */}
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-x-2 group-hover:translate-x-0"
                     style={{ color: experience.accentColor }}
                >
                    Launch experience
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                </div>
            </div>
        </motion.div>
    );
}