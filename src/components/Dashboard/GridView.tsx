import { motion } from "framer-motion";
import { useExperienceStore } from "@/store/experienceStore";
import ExperienceCard from "./ExperienceCard";

export default function GridView() {
    const { experiences } = useExperienceStore();

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full"
        >
            {experiences.map((exp, i) => (
                <ExperienceCard key={exp.id} experience={exp} index={i} />
            ))}
        </motion.div>
    );
}