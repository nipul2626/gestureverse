import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@supabase/supabase-js";
import type { UserProfile, GesturePreferences } from "@/lib/supabase";
import { supabase, getProfile, saveGesturePreferences } from "@/lib/supabase";

interface AuthState {
    user: User | null;
    profile: UserProfile | null;
    loading: boolean;
    authModalOpen: boolean;
    authModalTab: "login" | "signup";

    // Actions
    setUser: (user: User | null) => void;
    setProfile: (profile: UserProfile | null) => void;
    setLoading: (loading: boolean) => void;
    openAuthModal: (tab?: "login" | "signup") => void;
    closeAuthModal: () => void;
    fetchProfile: () => Promise<void>;
    signOut: () => Promise<void>;
    updateGesturePreferences: (prefs: GesturePreferences) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            profile: null,
            loading: true,
            authModalOpen: false,
            authModalTab: "login",

            setUser: (user) => {
                set({ user });
                if (user) {
                    get().fetchProfile();
                } else {
                    set({ profile: null });
                }
            },

            setProfile: (profile) => set({ profile }),

            setLoading: (loading) => set({ loading }),

            openAuthModal: (tab = "login") =>
                set({ authModalOpen: true, authModalTab: tab }),

            closeAuthModal: () => set({ authModalOpen: false }),

            fetchProfile: async () => {
                const { user } = get();
                if (!user) return;
                const profile = await getProfile(user.id);
                set({ profile });
            },

            signOut: async () => {
                await supabase.auth.signOut();
                set({ user: null, profile: null });
            },

            updateGesturePreferences: async (prefs) => {
                const { user, profile } = get();
                if (!user) return;
                await saveGesturePreferences(user.id, prefs);
                set({
                    profile: profile
                        ? { ...profile, gesture_preferences: prefs }
                        : null,
                });
            },
        }),
        {
            name: "gestureverse-auth",
            partialize: (state) => ({
                // Only persist non-sensitive UI state
                authModalTab: state.authModalTab,
            }),
        }
    )
);