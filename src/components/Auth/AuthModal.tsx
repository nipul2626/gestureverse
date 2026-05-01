import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/authStore";
import LoginForm from "./LoginForm";
import SignupForm from "./SignupForm";

export default function AuthModal() {
    const { authModalOpen, authModalTab, closeAuthModal } = useAuthStore();

    return (
        <AnimatePresence>
            {authModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
                        onClick={closeAuthModal}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div
                            className="glass-strong rounded-3xl w-full max-w-md overflow-hidden pointer-events-auto shadow-2xl"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header with tabs */}
                            <div className="px-8 pt-8 pb-0">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center">
                                            <span className="text-white text-sm font-bold">G</span>
                                        </div>
                                        <span className="font-display font-bold text-lg text-white">
                      GestureVerse
                    </span>
                                    </div>
                                    <button
                                        onClick={closeAuthModal}
                                        className="w-8 h-8 rounded-lg glass flex items-center justify-center text-gray-500 hover:text-white transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Tab switcher */}
                                <div className="flex gap-1 glass rounded-xl p-1">
                                    {(["login", "signup"] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => useAuthStore.setState({ authModalTab: tab })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition-all duration-200 ${
                                                authModalTab === tab
                                                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white"
                                                    : "text-gray-500 hover:text-gray-300"
                                            }`}
                                        >
                                            {tab === "login" ? "Sign In" : "Sign Up"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Form */}
                            <div className="p-8">
                                <AnimatePresence mode="wait">
                                    {authModalTab === "login" ? (
                                        <motion.div
                                            key="login"
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 20 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <LoginForm />
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="signup"
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <SignupForm />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}