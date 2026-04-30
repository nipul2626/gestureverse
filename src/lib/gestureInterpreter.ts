import type { HandLandmark, GestureName } from "@/store/gestureStore";

// ─── Landmark indices (MediaPipe 21-point hand model) ──────────
export const LANDMARKS = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const;

// ─── Helpers ───────────────────────────────────────────────────
function distance(a: HandLandmark, b: HandLandmark): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2);
}

function isFingerExtended(
    lm: HandLandmark[],
    tipIdx: number,
    pipIdx: number,
    mcpIdx: number
): boolean {
    // Finger is extended if tip is farther from wrist than pip
    const tipDist = distance(lm[tipIdx], lm[LANDMARKS.WRIST]);
    const pipDist = distance(lm[pipIdx], lm[LANDMARKS.WRIST]);
    const mcpDist = distance(lm[mcpIdx], lm[LANDMARKS.WRIST]);
    return tipDist > pipDist && pipDist > mcpDist * 0.9;
}

function isThumbExtended(lm: HandLandmark[]): boolean {
    return distance(lm[LANDMARKS.THUMB_TIP], lm[LANDMARKS.INDEX_MCP]) >
        distance(lm[LANDMARKS.THUMB_IP], lm[LANDMARKS.INDEX_MCP]);
}

function fingerStates(lm: HandLandmark[]): {
    thumb: boolean;
    index: boolean;
    middle: boolean;
    ring: boolean;
    pinky: boolean;
} {
    return {
        thumb: isThumbExtended(lm),
        index: isFingerExtended(lm, LANDMARKS.INDEX_TIP, LANDMARKS.INDEX_PIP, LANDMARKS.INDEX_MCP),
        middle: isFingerExtended(lm, LANDMARKS.MIDDLE_TIP, LANDMARKS.MIDDLE_PIP, LANDMARKS.MIDDLE_MCP),
        ring: isFingerExtended(lm, LANDMARKS.RING_TIP, LANDMARKS.RING_PIP, LANDMARKS.RING_MCP),
        pinky: isFingerExtended(lm, LANDMARKS.PINKY_TIP, LANDMARKS.PINKY_PIP, LANDMARKS.PINKY_MCP),
    };
}

// ─── Pinch detection ──────────────────────────────────────────
export function getPinchDistance(lm: HandLandmark[]): number {
    return distance(lm[LANDMARKS.THUMB_TIP], lm[LANDMARKS.INDEX_TIP]);
}

export function isPinching(lm: HandLandmark[], threshold = 0.06): boolean {
    return getPinchDistance(lm) < threshold;
}

// ─── Palm center ──────────────────────────────────────────────
export function getPalmCenter(lm: HandLandmark[]): { x: number; y: number } {
    const x = (lm[LANDMARKS.WRIST].x + lm[LANDMARKS.MIDDLE_MCP].x) / 2;
    const y = (lm[LANDMARKS.WRIST].y + lm[LANDMARKS.MIDDLE_MCP].y) / 2;
    return { x, y };
}

// ─── Hand openness (0–1) ──────────────────────────────────────
export function getHandOpenness(lm: HandLandmark[]): number {
    const fingers = fingerStates(lm);
    const extended = [fingers.index, fingers.middle, fingers.ring, fingers.pinky].filter(Boolean).length;
    return extended / 4;
}

// ─── Main gesture classifier ──────────────────────────────────
export function classifyGesture(
    lm: HandLandmark[],
    sensitivity = 0.7
): { gesture: GestureName; confidence: number } {
    if (!lm || lm.length < 21) return { gesture: "none", confidence: 0 };

    const fingers = fingerStates(lm);
    const pinchDist = getPinchDistance(lm);
    const allExtended = fingers.index && fingers.middle && fingers.ring && fingers.pinky;
    const allClosed = !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky;

    // ── Open Palm ──────────────────────────────────────────────
    if (allExtended && fingers.thumb) {
        return { gesture: "open_palm", confidence: 0.92 };
    }

    // ── Closed Fist ───────────────────────────────────────────
    if (allClosed && !fingers.thumb) {
        return { gesture: "closed_fist", confidence: 0.9 };
    }

    // ── Pinch ─────────────────────────────────────────────────
    if (pinchDist < 0.06 * (1 / sensitivity)) {
        return { gesture: "pinch", confidence: Math.max(0.7, 1 - pinchDist * 10) };
    }

    // ── Pointing (index only) ─────────────────────────────────
    if (fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        return { gesture: "pointing", confidence: 0.88 };
    }

    // ── Peace / Victory ───────────────────────────────────────
    if (fingers.index && fingers.middle && !fingers.ring && !fingers.pinky) {
        return { gesture: "peace", confidence: 0.85 };
    }

    // ── Thumbs Up ─────────────────────────────────────────────
    if (fingers.thumb && !fingers.index && !fingers.middle && !fingers.ring && !fingers.pinky) {
        const thumbTip = lm[LANDMARKS.THUMB_TIP];
        const wrist = lm[LANDMARKS.WRIST];
        if (thumbTip.y < wrist.y) {
            return { gesture: "thumbs_up", confidence: 0.87 };
        }
        return { gesture: "thumbs_down", confidence: 0.84 };
    }

    return { gesture: "none", confidence: 0 };
}

// ─── Swipe detection (from landmark history) ─────────────────
export function detectSwipe(
    history: HandLandmark[][]
): { gesture: GestureName; confidence: number } | null {
    if (history.length < 5) return null;

    const recent = history.slice(-5);
    const first = getPalmCenter(recent[0]);
    const last = getPalmCenter(recent[recent.length - 1]);

    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const speed = Math.sqrt(dx * dx + dy * dy);

    if (speed < 0.08) return null;

    if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -0.08) return { gesture: "swipe_left", confidence: Math.min(speed * 5, 0.95) };
        if (dx > 0.08) return { gesture: "swipe_right", confidence: Math.min(speed * 5, 0.95) };
    } else {
        if (dy < -0.08) return { gesture: "swipe_up", confidence: Math.min(speed * 5, 0.95) };
        if (dy > 0.08) return { gesture: "swipe_down", confidence: Math.min(speed * 5, 0.95) };
    }

    return null;
}

// ─── Two-hand zoom detection ──────────────────────────────────
export function detectZoom(
    prevHands: HandLandmark[][],
    currHands: HandLandmark[][]
): { gesture: GestureName; confidence: number } | null {
    if (prevHands.length < 2 || currHands.length < 2) return null;

    const prevDist = distance(
        getPalmCenter(prevHands[0]) as unknown as HandLandmark,
        getPalmCenter(prevHands[1]) as unknown as HandLandmark
    );
    const currDist = distance(
        getPalmCenter(currHands[0]) as unknown as HandLandmark,
        getPalmCenter(currHands[1]) as unknown as HandLandmark
    );

    const delta = currDist - prevDist;
    if (Math.abs(delta) < 0.02) return null;

    if (delta > 0.02) return { gesture: "zoom_in", confidence: Math.min(delta * 10, 0.9) };
    if (delta < -0.02) return { gesture: "zoom_out", confidence: Math.min(-delta * 10, 0.9) };

    return null;
}

// ─── Gesture label map (for UI display) ──────────────────────
export const GESTURE_LABELS: Record<GestureName, string> = {
    open_palm: "Open Palm",
    closed_fist: "Closed Fist",
    pointing: "Pointing",
    pinch: "Pinch",
    peace: "Peace ✌",
    thumbs_up: "Thumbs Up 👍",
    thumbs_down: "Thumbs Down 👎",
    swipe_left: "Swipe Left",
    swipe_right: "Swipe Right",
    swipe_up: "Swipe Up",
    swipe_down: "Swipe Down",
    rotate_cw: "Rotate →",
    rotate_ccw: "Rotate ←",
    zoom_in: "Zoom In",
    zoom_out: "Zoom Out",
    none: "—",
};

// ─── Gesture emoji map ────────────────────────────────────────
export const GESTURE_EMOJI: Record<GestureName, string> = {
    open_palm: "🖐",
    closed_fist: "✊",
    pointing: "☝️",
    pinch: "🤌",
    peace: "✌️",
    thumbs_up: "👍",
    thumbs_down: "👎",
    swipe_left: "👈",
    swipe_right: "👉",
    swipe_up: "👆",
    swipe_down: "👇",
    rotate_cw: "🔄",
    rotate_ccw: "🔃",
    zoom_in: "🔍",
    zoom_out: "🔎",
    none: "—",
};