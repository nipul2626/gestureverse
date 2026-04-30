import { create } from "zustand";

export type GestureName =
    | "open_palm"
    | "closed_fist"
    | "pointing"
    | "pinch"
    | "peace"
    | "thumbs_up"
    | "thumbs_down"
    | "swipe_left"
    | "swipe_right"
    | "swipe_up"
    | "swipe_down"
    | "rotate_cw"
    | "rotate_ccw"
    | "zoom_in"
    | "zoom_out"
    | "none";

export interface HandLandmark {
    x: number;
    y: number;
    z: number;
}

export interface DetectedHand {
    landmarks: HandLandmark[];
    handedness: "Left" | "Right";
    gesture: GestureName;
    confidence: number;
}

export interface GestureEvent {
    gesture: GestureName;
    hand: "Left" | "Right";
    confidence: number;
    timestamp: number;
    velocity?: { x: number; y: number };
    position?: { x: number; y: number };
}

interface GestureState {
    // Camera & engine
    cameraActive: boolean;
    engineReady: boolean;
    webcamSupported: boolean;

    // Detection results
    detectedHands: DetectedHand[];
    currentGesture: GestureName;
    gestureConfidence: number;
    lastGestureEvent: GestureEvent | null;

    // Calibration
    isCalibrated: boolean;
    calibrationStep: number;
    sensitivity: number;
    dominantHand: "left" | "right";

    // Performance
    fps: number;
    latency: number;

    // Gesture history (for velocity/swipe detection)
    landmarkHistory: HandLandmark[][];

    // Actions
    setCameraActive: (active: boolean) => void;
    setEngineReady: (ready: boolean) => void;
    setWebcamSupported: (supported: boolean) => void;
    setDetectedHands: (hands: DetectedHand[]) => void;
    setCurrentGesture: (gesture: GestureName, confidence: number) => void;
    setLastGestureEvent: (event: GestureEvent) => void;
    setCalibrated: (calibrated: boolean) => void;
    setCalibrationStep: (step: number) => void;
    setSensitivity: (sensitivity: number) => void;
    setDominantHand: (hand: "left" | "right") => void;
    setFps: (fps: number) => void;
    setLatency: (latency: number) => void;
    pushLandmarkHistory: (landmarks: HandLandmark[]) => void;
    reset: () => void;
}

const defaultState = {
    cameraActive: false,
    engineReady: false,
    webcamSupported: true,
    detectedHands: [],
    currentGesture: "none" as GestureName,
    gestureConfidence: 0,
    lastGestureEvent: null,
    isCalibrated: false,
    calibrationStep: 0,
    sensitivity: 0.7,
    dominantHand: "right" as const,
    fps: 0,
    latency: 0,
    landmarkHistory: [],
};

export const useGestureStore = create<GestureState>()((set, get) => ({
    ...defaultState,

    setCameraActive: (active) => set({ cameraActive: active }),
    setEngineReady: (ready) => set({ engineReady: ready }),
    setWebcamSupported: (supported) => set({ webcamSupported: supported }),

    setDetectedHands: (hands) => set({ detectedHands: hands }),

    setCurrentGesture: (gesture, confidence) =>
        set({ currentGesture: gesture, gestureConfidence: confidence }),

    setLastGestureEvent: (event) => set({ lastGestureEvent: event }),

    setCalibrated: (calibrated) => set({ isCalibrated: calibrated }),
    setCalibrationStep: (step) => set({ calibrationStep: step }),
    setSensitivity: (sensitivity) => set({ sensitivity }),
    setDominantHand: (hand) => set({ dominantHand: hand }),
    setFps: (fps) => set({ fps }),
    setLatency: (latency) => set({ latency }),

    pushLandmarkHistory: (landmarks) => {
        const history = get().landmarkHistory;
        const updated = [...history, landmarks].slice(-10); // keep last 10 frames
        set({ landmarkHistory: updated });
    },

    reset: () => set(defaultState),
}));