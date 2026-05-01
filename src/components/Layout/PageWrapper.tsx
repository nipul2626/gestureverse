import { motion } from "framer-motion";
import Navbar from "./Navbar";
import AuthModal from "@/components/Auth/AuthModal";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface PageWrapperProps {
    children: React.ReactNode;
    className?: string;
    showNav?: boolean;
    fullHeight?: boolean;
}

export default function PageWrapper({
                                        children,
                                        className,
                                        showNav = true,
                                        fullHeight = true,
                                    }: PageWrapperProps) {
    const { authModalOpen } = useAuthStore();

    return (
        <div className={cn("relative", fullHeight && "min-h-screen")}>
            {showNav && <Navbar />}

            <motion.main
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className={cn(showNav && "pt-20", className)}
            >
                {children}
            </motion.main>

            {authModalOpen && <AuthModal />}
        </div>
    );
}