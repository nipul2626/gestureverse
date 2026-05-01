import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { supabase, upsertProfile } from "@/lib/supabase";
import GlowButton from "@/components/UI/GlowButton";

export default function SignupForm() {
    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { closeAuthModal } = useAuthStore();

    const handleSignup = async () => {
        if (!email || !password || !username) {
            setError("Please fill in all fields.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        if (username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }

        setLoading(true);
        setError("");

        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        if (data.user) {
            await upsertProfile(data.user.id, {
                username,
                email,
                gesture_preferences: {
                    sensitivity: 0.7,
                    dominantHand: "right",
                    enabledGestures: ["open_palm", "closed_fist", "pinch", "pointing", "peace"],
                    calibrationData: {},
                },
                completed_experiences: [],
            });

            setSuccess(true);
            setTimeout(closeAuthModal, 2000);
        }

        setLoading(false);
    };

    if (success) {
        return (
            <div className="text-center py-4">
                <div className="text-4xl mb-4">🎉</div>
                <h3 className="text-white font-semibold text-lg mb-2">You're in!</h3>
                <p className="text-gray-400 text-sm">
                    Welcome to GestureVerse, <span className="text-indigo-400">{username}</span>
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div>
                <h2 className="text-white font-display font-bold text-2xl mb-1">Create account</h2>
                <p className="text-gray-500 text-sm">Save your gesture preferences across sessions</p>
            </div>

            <div className="space-y-3">
                <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="input-glass"
                />
                <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass"
                />
                <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
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
                onClick={handleSignup}
            >
                Create Account
            </GlowButton>

            <p className="text-xs text-gray-600 text-center">
                By signing up you agree to our terms. No spam, ever.
            </p>
        </div>
    );
}