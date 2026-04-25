// Neon Drift Arena - Game Constants

// Arena dimensions
export const ARENA = {
  WIDTH: 1200,
  HEIGHT: 800,
  PADDING: 50,
} as const

// Player physics
export const PLAYER = {
  SIZE: 30,
  MAX_SPEED: 5,
  ACCELERATION: 0.4,
  FRICTION: 0.92,
  DASH_SPEED: 15,
  DASH_DURATION: 150, // ms
  DASH_COOLDOWN: 3000, // ms
  DASH_INVULNERABILITY: 200, // ms
  ABILITY_COOLDOWN: 5000, // ms
  ABILITY_RANGE: 120,
  ABILITY_DAMAGE: 15,
  ABILITY_KNOCKBACK: 8,
  MAX_HEALTH: 100,
  STARTING_SCORE: 0,
} as const

// Pickup settings
export const PICKUP = {
  SIZE: 20,
  ENERGY_POINTS: 10,
  BOOST_DURATION: 3000, // ms
  BOOST_MULTIPLIER: 1.5,
  SPAWN_INTERVAL: 5000, // ms
  MAX_PICKUPS: 8,
  RESPAWN_DELAY: 3000, // ms
} as const

// Hazard settings
export const HAZARD = {
  MIN_SIZE: 40,
  MAX_SIZE: 80,
  MOVING_SPEED: 2,
  DAMAGE: 10,
  STUN_DURATION: 500, // ms
} as const

// Match settings
export const MATCH = {
  DEFAULT_DURATION: 180, // 3 minutes
  MIN_DURATION: 60, // 1 minute
  MAX_DURATION: 300, // 5 minutes
  COUNTDOWN_SECONDS: 3,
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 8,
  SURVIVAL_POINTS_PER_SECOND: 1,
  HIT_POINTS: 25,
} as const

// Room settings
export const ROOM = {
  CODE_LENGTH: 6,
  CODE_CHARS: "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", // No I, O, 0, 1 to avoid confusion
  MAX_NICKNAME_LENGTH: 16,
  MIN_NICKNAME_LENGTH: 2,
} as const

// Network settings
export const NETWORK = {
  TICK_RATE: 60, // Server updates per second
  CLIENT_INTERPOLATION_DELAY: 50, // ms
  INPUT_BUFFER_SIZE: 32,
  RECONNECT_TIMEOUT: 10000, // ms
  HEARTBEAT_INTERVAL: 1000, // ms
} as const

// Visual settings
export const VISUAL = {
  TRAIL_LENGTH: 15,
  PARTICLE_LIFETIME: 1000, // ms
  GLOW_INTENSITY: 0.8,
  CAMERA_SMOOTHING: 0.1,
  SCREEN_SHAKE_INTENSITY: 5,
  SCREEN_SHAKE_DURATION: 200, // ms
} as const

// Z-index layers for rendering
export const RENDER_LAYERS = {
  BACKGROUND: 0,
  GRID: 1,
  HAZARDS: 2,
  PICKUPS: 3,
  TRAILS: 4,
  PLAYERS: 5,
  EFFECTS: 6,
  UI: 7,
} as const

// Map themes
export const MAP_THEMES = {
  cyber: {
    name: "Cyber Grid",
    background: "#0a0a1a",
    gridColor: "#1a1a3a",
    gridGlow: "#00ffff",
    accentColor: "#ff00ff",
  },
  neon: {
    name: "Neon Pulse",
    background: "#0d0015",
    gridColor: "#1a0a2a",
    gridGlow: "#ff00ff",
    accentColor: "#00ffff",
  },
  void: {
    name: "Void Rift",
    background: "#050510",
    gridColor: "#101020",
    gridGlow: "#8800ff",
    accentColor: "#00ff88",
  },
} as const

// Generate a room code
export function generateRoomCode(): string {
  let code = ""
  for (let i = 0; i < ROOM.CODE_LENGTH; i++) {
    code += ROOM.CODE_CHARS[Math.floor(Math.random() * ROOM.CODE_CHARS.length)]
  }
  return code
}

// Validate a room code
export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM.CODE_LENGTH) return false
  return code.split("").every((char) => ROOM.CODE_CHARS.includes(char))
}

// Validate a nickname
export function isValidNickname(nickname: string): boolean {
  const trimmed = nickname.trim()
  return (
    trimmed.length >= ROOM.MIN_NICKNAME_LENGTH &&
    trimmed.length <= ROOM.MAX_NICKNAME_LENGTH
  )
}

// Format time as MM:SS
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

// Calculate distance between two points
export function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Check if two circles collide
export function circlesCollide(
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number
): boolean {
  return distance(x1, y1, x2, y2) < r1 + r2
}

// Check if a circle collides with a rectangle
export function circleRectCollide(
  cx: number,
  cy: number,
  cr: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = Math.max(rx, Math.min(cx, rx + rw))
  const closestY = Math.max(ry, Math.min(cy, ry + rh))
  return distance(cx, cy, closestX, closestY) < cr
}

// Clamp a value between min and max
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// Linear interpolation
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t
}

// Normalize angle to -PI to PI
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return angle
}

// Get angle between two points
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1)
}
