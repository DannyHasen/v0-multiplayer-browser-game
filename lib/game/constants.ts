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

export const DIFFICULTY_LEVELS = {
  casual: {
    name: "Casual",
    description: "More room to recover, softer hazards, and slower pressure.",
  },
  standard: {
    name: "Standard",
    description: "The intended mix of scoring, danger, and warden pressure.",
  },
  hardcore: {
    name: "Hardcore",
    description: "Faster scaling, heavier hits, and more frequent arena events.",
  },
} as const

export const GAME_MODES = {
  score: {
    name: "Score Rush",
    description: "Classic free-for-all. Collect, fight, survive, and finish with the highest score.",
  },
  warden: {
    name: "Warden Hunt",
    description: "Wardens are worth more, pickups are worth less, and boss damage becomes the main path to winning.",
  },
  survival: {
    name: "Survival",
    description: "Stay alive for passive points. Deaths hurt more, but clean rotations pay off.",
  },
  control: {
    name: "Rift Control",
    description: "Hold the glowing control zone for steady points while the arena tries to push you out.",
  },
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
    description: "Balanced corners, clean center fights, and predictable patrol lanes.",
    background: "#0a0a1a",
    gridColor: "#1a1a3a",
    gridGlow: "#00ffff",
    accentColor: "#ff00ff",
  },
  neon: {
    name: "Neon Pulse",
    description: "Fast horizontal and vertical lanes that reward sharp rotations.",
    background: "#0d0015",
    gridColor: "#1a0a2a",
    gridGlow: "#ff00ff",
    accentColor: "#00ffff",
  },
  void: {
    name: "Void Rift",
    description: "Diagonal pressure and awkward angles make escapes less obvious.",
    background: "#050510",
    gridColor: "#101020",
    gridGlow: "#8800ff",
    accentColor: "#00ff88",
  },
  frost: {
    name: "Cryo Lab",
    description: "Tight mid-map crossings with more defensive pickups and freeze routes.",
    background: "#06131a",
    gridColor: "#123044",
    gridGlow: "#7dd3ff",
    accentColor: "#d8fbff",
  },
  foundry: {
    name: "Solar Foundry",
    description: "Dangerous lanes, stronger combat pickups, and less forgiveness near the edges.",
    background: "#170b08",
    gridColor: "#2a1710",
    gridGlow: "#ff7a2f",
    accentColor: "#ffd166",
  },
  garden: {
    name: "Overgrowth",
    description: "A maze-like arena with side pockets, safer healing routes, and ambush corners.",
    background: "#07140e",
    gridColor: "#123326",
    gridGlow: "#32e875",
    accentColor: "#ffcf5a",
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
