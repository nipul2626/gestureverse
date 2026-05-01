import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { supabase } from "@/lib/supabase";
import GlowButton from "@/components/UI/GlowButton";

export default function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [magicSent, setMagicSent] = useState(false);

    const { closeAuthModal } = useAuthStore();

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            setError(error.message);
        } else {
            closeAuthModal();
        }
        setLoading(false);
    };

    const handleMagicLink = async () => {
        if (!email) {
            setError("Enter your email to receive a magic link.");
            return;
        }
        setLoading(true);
        setError("");

        const { error } = await supabase.auth.signInWithOtp({ email });

        if (error) {
            setError(error.message);
        } else {
            setMagicSent(true);
        }
        setLoading(false);
    };

    if (magicSent) {
        return (
            <div className="text-center py-4">
                <div className="text-4xl mb-4">📬</div>
                <h3 className="text-white font-semibold text-lg mb-2">Check your inbox</h3>
                <p className="text-gray-400 text-sm">
                    We sent a magic link to <span className="text-indigo-400">{email}</span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-white font-display font-bold text-2xl mb-1">Welcome back</h2>
                <p className="text-gray-500 text-sm">Sign in to restore your gesture preferences</p>
            </div>

            <div className="space-y-3">
                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="input-glass"
                />
                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    className="input-glass"
                />
            </div>

            {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                </p>
            )}

            <GlowButton
                variant="primary"
                fullWidth
                loading={loading}
                onClick={handleLogin}
            >
                Sign In
            </GlowButton>

            <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-gray-600">or</span>
                <div className="flex-1 h-px bg-white/5" />
            </div>

            <GlowButton
                variant="glass"
                fullWidth
                loading={loading}
                onClick={handleMagicLink}
            >
                ✉️ Send Magic Link
            </GlowButton>
        </div>
    );
}