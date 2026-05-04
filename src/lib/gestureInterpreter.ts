// src/lib/gestureInterpreter.ts
// GestureVerse v2 — Phase 1: Full gesture interpreter with type classification,
// continuous/discrete/hold separation, snap, wave, orbit, palm-facing detection.

import type { NormalizedLandmark } from '@mediapipe/hands'

// ─── Gesture Names ────────────────────────────────────────────────────────────

export type GestureName =
    | 'open_palm'
    | 'closed_fist'
    | 'pinch'
    | 'pointing'
    | 'peace'
    | 'thumbs_up'
    | 'thumbs_down'
    | 'swipe_left'
    | 'swipe_right'
    | 'swipe_up'
    | 'swipe_down'
    | 'rotate_cw'
    | 'rotate_ccw'
    | 'zoom_in'
    | 'zoom_out'
    | 'snap'
    | 'wave'
    | 'grab'
    | 'magnetic_pull'
    | 'wrist_tilt'
    | 'none'

// ─── Gesture Type Classification ──────────────────────────────────────────────

export const CONTINUOUS_GESTURES: ReadonlySet<GestureName> = new Set([
    'open_palm',
    'closed_fist',
    'pointing',
    'pinch',
    'peace',
    'grab',
    'magnetic_pull',
    'wrist_tilt',
])

export const DISCRETE_GESTURES: ReadonlySet<GestureName> = new Set([
    'swipe_left',
    'swipe_right',
    'swipe_up',
    'swipe_down',
    'snap',
    'wave',
    'thumbs_up',
    'thumbs_down',
    'rotate_cw',
    'rotate_ccw',
])

export const HOLD_GESTURES: ReadonlySet<GestureName> = new Set([
    'zoom_in',
    'zoom_out',
])

/** Cooldown in ms before a discrete gesture can fire again */
export const GESTURE_COOLDOWN_MS: Readonly<Partial<Record<GestureName, number>>> = {
    swipe_left: 400,
    swipe_right: 400,
    swipe_up: 400,
    swipe_down: 400,
    snap: 300,
    wave: 600,
    thumbs_up: 500,
    thumbs_down: 500,
    rotate_cw: 200,
    rotate_ccw: 200,
}

// ─── Landmark Indices ─────────────────────────────────────────────────────────

const LM = {
    WRIST: 0,
    THUMB_CMC: 1, THUMB_MCP: 2, THUMB_IP: 3, THUMB_TIP: 4,
    INDEX_MCP: 5, INDEX_PIP: 6, INDEX_DIP: 7, INDEX_TIP: 8,
    MIDDLE_MCP: 9, MIDDLE_PIP: 10, MIDDLE_DIP: 11, MIDDLE_TIP: 12,
    RING_MCP: 13, RING_PIP: 14, RING_DIP: 15, RING_TIP: 16,
    PINKY_MCP: 17, PINKY_PIP: 18, PINKY_DIP: 19, PINKY_TIP: 20,
} as const

export const FINGERTIP_INDICES = [4, 8, 12, 16, 20] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LandmarkPoint {
    x: number
    y: number
    z: number
}

export interface GestureResult {
    gesture: GestureName
    confidence: number
    palmCenter: LandmarkPoint
    pinchDistance: number
    wristTiltAngle: number
    palmFacingCamera: boolean
    fingersExtended: boolean[]
}

export interface SwipeState {
    history: LandmarkPoint[]  // rolling 10-frame palm center history
    lastSwipeGesture: GestureName | null
    lastSwipeTime: number
}

export interface WaveState {
    signChanges: number
    lastX: number
    startTime: number
    velocities: number[]
}

export interface SnapState {
    wasPinched: boolean
    pinchOpenFrames: number
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function dist2D(a: LandmarkPoint, b: LandmarkPoint): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    return Math.sqrt(dx * dx + dy * dy)
}

function dist3D(a: LandmarkPoint, b: LandmarkPoint): number {
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

export function getPalmCenter(lm: LandmarkPoint[]): LandmarkPoint {
    // Average of wrist + 4 MCP joints
    const indices = [LM.WRIST, LM.INDEX_MCP, LM.MIDDLE_MCP, LM.RING_MCP, LM.PINKY_MCP]
    let x = 0, y = 0, z = 0
    for (const i of indices) { x += lm[i].x; y += lm[i].y; z += lm[i].z }
    const n = indices.length
    return { x: x / n, y: y / n, z: z / n }
}

/** Returns booleans for [thumb, index, middle, ring, pinky] extended */
function getFingersExtended(lm: LandmarkPoint[], handedness: 'Left' | 'Right'): boolean[] {
    const wrist = lm[LM.WRIST]

    // Thumb: compare tip x-position to IP joint (mirrored for left hand)
    const thumbExtended = handedness === 'Right'
        ? lm[LM.THUMB_TIP].x < lm[LM.THUMB_IP].x
        : lm[LM.THUMB_TIP].x > lm[LM.THUMB_IP].x

    // Other fingers: tip y < PIP y means extended (lower y = higher on screen)
    const indexExtended = lm[LM.INDEX_TIP].y < lm[LM.INDEX_PIP].y
    const middleExtended = lm[LM.MIDDLE_TIP].y < lm[LM.MIDDLE_PIP].y
    const ringExtended = lm[LM.RING_TIP].y < lm[LM.RING_PIP].y
    const pinkyExtended = lm[LM.PINKY_TIP].y < lm[LM.PINKY_PIP].y

    // Also check wrist distance for more reliability
    void wrist // used implicitly via y-coordinate system

    return [thumbExtended, indexExtended, middleExtended, ringExtended, pinkyExtended]
}

export function getPinchDistance(lm: LandmarkPoint[]): number {
    return dist3D(lm[LM.THUMB_TIP], lm[LM.INDEX_TIP])
}

export function getHandOpenness(lm: LandmarkPoint[]): number {
    if (lm.length < 21) return 0

    const palm = lm[LM.WRIST]
    const tips = [LM.INDEX_TIP, LM.MIDDLE_TIP, LM.RING_TIP, LM.PINKY_TIP]

    let total = 0

    for (const tip of tips) {
        const dx = lm[tip].x - palm.x
        const dy = lm[tip].y - palm.y
        total += Math.sqrt(dx * dx + dy * dy)
    }

    // normalize (tweak if needed)
    return Math.min(total / 1.5, 1)
}

function getWristTiltAngle(lm: LandmarkPoint[]): number {
    const wrist = lm[LM.WRIST]
    const middleMCP = lm[LM.MIDDLE_MCP]
    return Math.atan2(middleMCP.y - wrist.y, middleMCP.x - wrist.x)
}

/**
 * Detect if palm is facing the camera.
 * Compare the cross-product of wrist→index_mcp and wrist→pinky_mcp
 * to determine palm normal direction.
 */
function isPalmFacingCamera(lm: LandmarkPoint[], handedness: 'Left' | 'Right'): boolean {
    const wrist = lm[LM.WRIST]
    const indexMCP = lm[LM.INDEX_MCP]
    const pinkyMCP = lm[LM.PINKY_MCP]

    // Vectors from wrist
    const v1 = { x: indexMCP.x - wrist.x, y: indexMCP.y - wrist.y, z: indexMCP.z - wrist.z }
    const v2 = { x: pinkyMCP.x - wrist.x, y: pinkyMCP.y - wrist.y, z: pinkyMCP.z - wrist.z }

    // Cross product z-component (simplified for 2D facing check)
    const crossZ = v1.x * v2.y - v1.y * v2.x

    // For right hand: positive crossZ = palm facing camera
    // For left hand: negative crossZ = palm facing camera
    const threshold = 0.01
    return handedness === 'Right' ? crossZ > threshold : crossZ < -threshold
}

// ─── Core Gesture Classification ──────────────────────────────────────────────

/**
 * Classify the static hand pose from landmarks.
 * Returns gesture name + confidence (0–1).
 */
export function classifyGesture(
    lm: LandmarkPoint[],
    handedness: 'Left' | 'Right'
): { gesture: GestureName; confidence: number } {
    if (lm.length < 21) return { gesture: 'none', confidence: 0 }

    const [thumb, index, middle, ring, pinky] = getFingersExtended(lm, handedness)
    const pinchDist = getPinchDistance(lm)
    const allExtended = thumb && index && middle && ring && pinky
    const allCurled = !index && !middle && !ring && !pinky

    // ── OPEN PALM ──────────────────────────────────────────────────────────────
    if (allExtended) {
        return { gesture: 'open_palm', confidence: 0.95 }
    }

    // ── PINCH ──────────────────────────────────────────────────────────────────
    if (pinchDist < 0.05 && !middle && !ring && !pinky) {
        return { gesture: 'pinch', confidence: Math.min(1, (0.05 - pinchDist) / 0.05 + 0.6) }
    }

    // ── POINTING ───────────────────────────────────────────────────────────────
    if (index && !middle && !ring && !pinky) {
        return { gesture: 'pointing', confidence: 0.9 }
    }

    // ── PEACE / V-SIGN ─────────────────────────────────────────────────────────
    if (index && middle && !ring && !pinky) {
        return { gesture: 'peace', confidence: 0.88 }
    }

    // ── CLOSED FIST ────────────────────────────────────────────────────────────
    if (allCurled && !thumb) {
        return { gesture: 'closed_fist', confidence: 0.92 }
    }

    // ── GRAB (fist with slight curl — distinguished by wrist-tip distances) ────
    if (allCurled) {
        const wrist = lm[LM.WRIST]
        const indexTip = lm[LM.INDEX_TIP]
        const dist = dist2D(wrist, indexTip)
        if (dist < 0.15) {
            return { gesture: 'grab', confidence: 0.85 }
        }
        return { gesture: 'closed_fist', confidence: 0.85 }
    }

    // ── THUMBS UP ──────────────────────────────────────────────────────────────
    if (thumb && !index && !middle && !ring && !pinky) {
        const thumbTip = lm[LM.THUMB_TIP]
        const thumbMCP = lm[LM.THUMB_MCP]
        if (thumbTip.y < thumbMCP.y - 0.04) {
            return { gesture: 'thumbs_up', confidence: 0.88 }
        }
    }

    // ── THUMBS DOWN ────────────────────────────────────────────────────────────
    if (thumb && !index && !middle && !ring && !pinky) {
        const thumbTip = lm[LM.THUMB_TIP]
        const thumbMCP = lm[LM.THUMB_MCP]
        if (thumbTip.y > thumbMCP.y + 0.04) {
            return { gesture: 'thumbs_down', confidence: 0.88 }
        }
    }

    // ── MAGNETIC PULL (open palm facing camera) ────────────────────────────────
    if (allExtended && isPalmFacingCamera(lm, handedness)) {
        // Check fingers pointing forward (z-depth of tips vs MCP joints)
        const middleTip = lm[LM.MIDDLE_TIP]
        const middleMCP = lm[LM.MIDDLE_MCP]
        if (middleTip.z < middleMCP.z - 0.05) {
            return { gesture: 'magnetic_pull', confidence: 0.82 }
        }
    }

    return { gesture: 'none', confidence: 0 }
}

// ─── Swipe Detection ──────────────────────────────────────────────────────────

/**
 * Detects swipe gestures from a rolling history of palm positions.
 * Clears history after a swipe fires.
 * Returns the swipe gesture name or null.
 */
export function detectSwipe(
    state: SwipeState,
    currentPalm: LandmarkPoint,
    now: number
): { swipe: GestureName | null; shouldClearHistory: boolean; isDoubleSwipe: boolean } {
    // Always maintain rolling 10-frame window
    state.history.push({ ...currentPalm })
    if (state.history.length > 10) {
        state.history.shift()
    }

    if (state.history.length < 5) {
        return { swipe: null, shouldClearHistory: false, isDoubleSwipe: false }
    }

    const first = state.history[0]
    const last = state.history[state.history.length - 1]

    const dx = last.x - first.x
    const dy = last.y - first.y
    const speed = Math.sqrt(dx * dx + dy * dy)

    // Require minimum movement speed
    if (speed < 0.12) {
        return { swipe: null, shouldClearHistory: false, isDoubleSwipe: false }
    }

    const angle = Math.atan2(dy, dx)
    const absAngle = Math.abs(angle)

    let detected: GestureName | null = null

    // Horizontal swipes (within ±45° of horizontal)
    if (absAngle < Math.PI / 4) {
        detected = dx > 0 ? 'swipe_right' : 'swipe_left'
    }
    // Vertical swipes (within ±45° of vertical)
    else if (absAngle > 3 * Math.PI / 4 || (absAngle > Math.PI / 4 && absAngle < 3 * Math.PI / 4)) {
        if (Math.abs(dy) > Math.abs(dx)) {
            detected = dy > 0 ? 'swipe_down' : 'swipe_up'
        }
    }

    if (!detected) {
        return { swipe: null, shouldClearHistory: false, isDoubleSwipe: false }
    }

    // Check double swipe (same direction within 600ms)
    const isDouble =
        state.lastSwipeGesture === detected &&
        now - state.lastSwipeTime < 600

    // Update state
    state.lastSwipeGesture = detected
    state.lastSwipeTime = now

    return { swipe: detected, shouldClearHistory: true, isDoubleSwipe: isDouble }
}

// ─── Wave Detection ───────────────────────────────────────────────────────────

const WAVE_WINDOW_MS = 800
const WAVE_MIN_SIGN_CHANGES = 3
const WAVE_MIN_VELOCITY = 0.008

/**
 * Detects a wave gesture from palm X velocity sign changes.
 * Returns true if wave detected this frame.
 */
export function detectWave(state: WaveState, currentX: number, now: number): boolean {
    const velocity = currentX - state.lastX
    state.lastX = currentX

    // Track velocity history for sign change counting
    state.velocities.push(velocity)
    if (state.velocities.length > 20) state.velocities.shift()

    // Reset if time window expired
    if (now - state.startTime > WAVE_WINDOW_MS) {
        state.signChanges = 0
        state.startTime = now
        state.velocities = []
        return false
    }

    // Count sign changes in velocity (direction reversals)
    if (
        state.velocities.length >= 2 &&
        Math.abs(velocity) > WAVE_MIN_VELOCITY
    ) {
        const prev = state.velocities[state.velocities.length - 2]
        if (Math.abs(prev) > WAVE_MIN_VELOCITY && Math.sign(velocity) !== Math.sign(prev)) {
            state.signChanges++
        }
    }

    if (state.signChanges >= WAVE_MIN_SIGN_CHANGES) {
        // Reset for next wave detection
        state.signChanges = 0
        state.velocities = []
        state.startTime = now
        return true
    }

    return false
}

export function createWaveState(): WaveState {
    return { signChanges: 0, lastX: 0, startTime: Date.now(), velocities: [] }
}

// ─── Snap Detection ───────────────────────────────────────────────────────────

const SNAP_OPEN_FRAMES_REQUIRED = 3
const SNAP_PINCH_THRESHOLD = 0.05
const SNAP_OPEN_THRESHOLD = 0.12

/**
 * Detects a snap gesture: rapid pinch → open in < 3 frames.
 * Tracks pinch → release transition.
 */
export function detectSnap(state: SnapState, pinchDist: number): boolean {
    const isPinched = pinchDist < SNAP_PINCH_THRESHOLD

    if (isPinched) {
        state.wasPinched = true
        state.pinchOpenFrames = 0
        return false
    }

    if (state.wasPinched && pinchDist > SNAP_OPEN_THRESHOLD) {
        state.pinchOpenFrames++
        if (state.pinchOpenFrames <= SNAP_OPEN_FRAMES_REQUIRED) {
            // Rapid open after pinch = snap!
            state.wasPinched = false
            state.pinchOpenFrames = 0
            return true
        }
    }

    // Not pinched and not snapping
    if (!isPinched && state.pinchOpenFrames > SNAP_OPEN_FRAMES_REQUIRED) {
        state.wasPinched = false
        state.pinchOpenFrames = 0
    }

    return false
}

export function createSnapState(): SnapState {
    return { wasPinched: false, pinchOpenFrames: 0 }
}

// ─── Orbit Detection ──────────────────────────────────────────────────────────

export interface OrbitState {
    angles: number[]
    positions: LandmarkPoint[]
    center: { x: number; y: number } | null
    radius: number
    isActive: boolean
}

const ORBIT_MIN_ANGULAR_VELOCITY = 0.1  // radians per frame
const ORBIT_MIN_FRAMES = 10

export function detectOrbit(state: OrbitState, palm: LandmarkPoint): boolean {
    state.positions.push({ ...palm })
    if (state.positions.length > 20) state.positions.shift()

    if (state.positions.length < 5) return false

    // Compute approximate center from recent positions
    const n = state.positions.length
    const cx = state.positions.reduce((s, p) => s + p.x, 0) / n
    const cy = state.positions.reduce((s, p) => s + p.y, 0) / n

    // Compute angles from center for each position
    const angles = state.positions.map(p =>
        Math.atan2(p.y - cy, p.x - cx)
    )

    // Count consistent angle deltas
    let consistentFrames = 0
    let totalDelta = 0
    for (let i = 1; i < angles.length; i++) {
        let delta = angles[i] - angles[i - 1]
        // Normalize to [-π, π]
        if (delta > Math.PI) delta -= 2 * Math.PI
        if (delta < -Math.PI) delta += 2 * Math.PI
        if (Math.abs(delta) > ORBIT_MIN_ANGULAR_VELOCITY) {
            consistentFrames++
            totalDelta += delta
        }
    }

    if (consistentFrames >= ORBIT_MIN_FRAMES) {
        state.center = { x: cx, y: cy }
        state.radius = Math.sqrt(
            state.positions.reduce((s, p) => s + (p.x - cx) ** 2 + (p.y - cy) ** 2, 0) / n
        )
        state.isActive = true
        return true
    }

    return false
}

export function createOrbitState(): OrbitState {
    return { angles: [], positions: [], center: null, radius: 0, isActive: false }
}

// ─── Two-Hand Calculations ────────────────────────────────────────────────────

export interface TwoHandData {
    distance: number
    prevDistance: number
    angle: number
    prevAngle: number
    midpoint: { x: number; y: number }
    expanding: boolean
    compressing: boolean
    rotating: boolean
    rotationDelta: number
}

export function calcTwoHandData(
    leftPalm: LandmarkPoint,
    rightPalm: LandmarkPoint,
    prevData: TwoHandData | null
): TwoHandData {
    const dx = rightPalm.x - leftPalm.x
    const dy = rightPalm.y - leftPalm.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx)

    const prevDistance = prevData?.distance ?? distance
    const prevAngle = prevData?.angle ?? angle

    const distanceDelta = distance - prevDistance
    const angleDelta = (() => {
        let d = angle - prevAngle
        if (d > Math.PI) d -= 2 * Math.PI
        if (d < -Math.PI) d += 2 * Math.PI
        return d
    })()

    return {
        distance,
        prevDistance,
        angle,
        prevAngle,
        midpoint: {
            x: (leftPalm.x + rightPalm.x) / 2,
            y: (leftPalm.y + rightPalm.y) / 2,
        },
        expanding: distanceDelta > 0.015,
        compressing: distanceDelta < -0.015,
        rotating: Math.abs(angleDelta) > 0.02,
        rotationDelta: angleDelta,
    }
}

// ─── Full Gesture Result Builder ──────────────────────────────────────────────

export function buildGestureResult(
    lm: LandmarkPoint[],
    handedness: 'Left' | 'Right'
): GestureResult {
    const classified = classifyGesture(lm, handedness)
    const center = getPalmCenter(lm)
    const pinchDist = getPinchDistance(lm)
    const tiltAngle = getWristTiltAngle(lm)
    const palmFacing = isPalmFacingCamera(lm, handedness)
    const fingers = getFingersExtended(lm, handedness)

    return {
        gesture: classified.gesture,
        confidence: classified.confidence,
        palmCenter: center,
        pinchDistance: pinchDist,
        wristTiltAngle: tiltAngle,
        palmFacingCamera: palmFacing,
        fingersExtended: fingers,
    }
}

export function normalizeLandmarks(
    raw: NormalizedLandmark[]
): LandmarkPoint[] {
    return raw.map(lm => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 }))
}