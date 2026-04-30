import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn(
        "⚠️ Supabase env vars missing. Auth features will be disabled. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file."
    );
}

export const supabase = createClient(
    supabaseUrl || "https://placeholder.supabase.co",
    supabaseAnonKey || "placeholder-key"
);

// ─── Types ─────────────────────────────────────────────────────
export interface GesturePreferences {
    sensitivity: number;           // 0.1 – 1.0
    dominantHand: "left" | "right";
    enabledGestures: string[];
    calibrationData: Record<string, number[]>;
}

export interface UserProfile {
    id: string;
    email: string;
    username: string;
    avatar_url: string | null;
    gesture_preferences: GesturePreferences;
    completed_experiences: string[];
    created_at: string;
}

// ─── Profile helpers ────────────────────────────────────────────
export async function getProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }
    return data as UserProfile;
}

export async function upsertProfile(
    userId: string,
    updates: Partial<UserProfile>
): Promise<boolean> {
    const { error } = await supabase
        .from("profiles")
        .upsert({ id: userId, ...updates, updated_at: new Date().toISOString() });

    if (error) {
        console.error("Error upserting profile:", error);
        return false;
    }
    return true;
}

export async function saveGesturePreferences(
    userId: string,
    prefs: GesturePreferences
): Promise<boolean> {
    return upsertProfile(userId, { gesture_preferences: prefs });
}

export async function markExperienceCompleted(
    userId: string,
    experienceId: string,
    currentCompleted: string[]
): Promise<boolean> {
    const updated = Array.from(new Set([...currentCompleted, experienceId]));
    return upsertProfile(userId, { completed_experiences: updated });
}