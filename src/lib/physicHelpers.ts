// src/lib/physicsHelpers.ts
// GestureVerse v2 — Spring physics for object grab, move, and release.
// All math uses Three.js Vector3 (imported dynamically to avoid bundling Three on non-experience pages).

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SpringState {
    position: { x: number; y: number; z: number }
    velocity: { x: number; y: number; z: number }
}

export interface GrabPhysicsConfig {
    /** How quickly position follows target. Lower = more lag. Default: 0.12 */
    stiffness?: number
    /** Velocity dampening per frame. Default: 0.85 */
    damping?: number
    /** Max velocity magnitude per frame */
    maxSpeed?: number
}

// ─── Spring Physics ───────────────────────────────────────────────────────────

const DEFAULT_CONFIG: Required<GrabPhysicsConfig> = {
    stiffness: 0.12,
    damping: 0.85,
    maxSpeed: 0.08,
}

/**
 * Update spring state toward target position.
 * Call every animation frame while object is grabbed.
 */
export function updateSpring(
    state: SpringState,
    target: { x: number; y: number; z: number },
    config: GrabPhysicsConfig = {}
): SpringState {
    const { stiffness, damping, maxSpeed } = { ...DEFAULT_CONFIG, ...config }

    // Velocity = (target - current) * stiffness
    const vx = (target.x - state.position.x) * stiffness
    const vy = (target.y - state.position.y) * stiffness
    const vz = (target.z - state.position.z) * stiffness

    // Accumulate and dampen
    let nvx = (state.velocity.x + vx) * damping
    let nvy = (state.velocity.y + vy) * damping
    let nvz = (state.velocity.z + vz) * damping

    // Clamp max speed
    const speed = Math.sqrt(nvx * nvx + nvy * nvy + nvz * nvz)
    if (speed > maxSpeed) {
        const scale = maxSpeed / speed
        nvx *= scale
        nvy *= scale
        nvz *= scale
    }

    return {
        position: {
            x: state.position.x + nvx,
            y: state.position.y + nvy,
            z: state.position.z + nvz,
        },
        velocity: { x: nvx, y: nvy, z: nvz },
    }
}

/**
 * Create initial spring state at a given position.
 */
export function createSpringState(
    position: { x: number; y: number; z: number }
): SpringState {
    return {
        position: { ...position },
        velocity: { x: 0, y: 0, z: 0 },
    }
}

// ─── Webcam Space → Three.js World Space ─────────────────────────────────────

export interface WorldSpaceConfig {
    sceneWidth: number
    sceneHeight: number
    depth: number
}

/**
 * Map normalized webcam coords [0,1] to Three.js world space.
 * Mirrors X axis to match selfie view.
 */
export function webcamToWorld(
    normX: number,
    normY: number,
    config: WorldSpaceConfig
): { x: number; y: number; z: number } {
    return {
        x: (normX - 0.5) * -config.sceneWidth,   // mirrored
        y: (normY - 0.5) * -config.sceneHeight,   // inverted y
        z: config.depth,
    }
}

// ─── Radial Impulse ───────────────────────────────────────────────────────────

/**
 * Apply radial velocity impulse from a center point.
 * Used for snap/wave explosion effects.
 */
export function radialImpulse(
    objectPos: { x: number; y: number; z: number },
    center: { x: number; y: number; z: number },
    force: number,
    radius: number
): { x: number; y: number; z: number } {
    const dx = objectPos.x - center.x
    const dy = objectPos.y - center.y
    const dz = objectPos.z - center.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist > radius || dist < 0.001) return { x: 0, y: 0, z: 0 }

    const falloff = 1 - dist / radius
    const impulse = force * falloff / dist

    return {
        x: dx * impulse,
        y: dy * impulse,
        z: dz * impulse,
    }
}

// ─── Magnetic Pull Force ──────────────────────────────────────────────────────

/**
 * Compute magnetic pull force from palm position toward object.
 * Returns velocity delta to add to object's velocity.
 */
export function magneticPullForce(
    palmPos: { x: number; y: number; z: number },
    objectPos: { x: number; y: number; z: number },
    maxDistance: number = 2.5,
    forceMagnitude: number = 0.008
): { x: number; y: number; z: number } | null {
    const dx = palmPos.x - objectPos.x
    const dy = palmPos.y - objectPos.y
    const dz = palmPos.z - objectPos.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

    if (dist > maxDistance || dist < 0.001) return null

    // Stop pulling when very close (hover state)
    if (dist < 0.3) return { x: 0, y: 0, z: 0 }

    const factor = forceMagnitude / dist

    return {
        x: dx * factor,
        y: dy * factor,
        z: dz * factor,
    }
}

// ─── Push / Pull along Z ──────────────────────────────────────────────────────

/**
 * Detect push or pull gesture from a series of Z-velocity samples.
 * Returns 'push', 'pull', or null.
 */
export function detectPushPull(
    zVelocities: number[],
    threshold: number = 0.015
): 'push' | 'pull' | null {
    if (zVelocities.length < 5) return null

    const recent = zVelocities.slice(-5)
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length

    if (avg < -threshold) return 'push'   // moving toward camera = push
    if (avg > threshold) return 'pull'    // moving away = pull

    return null
}

// ─── Easing Utilities ─────────────────────────────────────────────────────────

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t
}

export function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3)
}

export function easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2
}

/**
 * Smooth damp: Unity-style smooth follow.
 * More natural than lerp for camera/object follow.
 */
export function smoothDamp(
    current: number,
    target: number,
    currentVelocity: { v: number },
    smoothTime: number,
    maxSpeed: number = Infinity,
    deltaTime: number = 1 / 60
): number {
    smoothTime = Math.max(0.0001, smoothTime)
    const omega = 2 / smoothTime
    const x = omega * deltaTime
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x)
    let change = current - target
    const originalTo = target

    const maxChange = maxSpeed * smoothTime
    change = Math.max(-maxChange, Math.min(maxChange, change))
    const newTarget = current - change

    const temp = (currentVelocity.v + omega * change) * deltaTime
    currentVelocity.v = (currentVelocity.v - omega * temp) * exp
    let output = newTarget + (change + temp) * exp

    if (originalTo - current > 0 === output > originalTo) {
        output = originalTo
        currentVelocity.v = (output - originalTo) / deltaTime
    }

    return output
}