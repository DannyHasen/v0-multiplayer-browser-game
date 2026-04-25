// Neon Drift Arena - Game Types

export interface Player {
  id: string
  nickname: string
  color: PlayerColor
  x: number
  y: number
  vx: number
  vy: number
  health: number
  score: number
  isReady: boolean
  isHost: boolean
  dashCooldown: number
  abilityCooldown: number
  isInvulnerable: boolean
  lastDashTime: number
  lastAbilityTime: number
  connected: boolean
}

export type PlayerColor =
  | "cyan"
  | "magenta"
  | "yellow"
  | "lime"
  | "orange"
  | "pink"
  | "teal"
  | "purple"

export const PLAYER_COLORS: Record<PlayerColor, string> = {
  cyan: "#00ffff",
  magenta: "#ff00ff",
  yellow: "#ffff00",
  lime: "#00ff00",
  orange: "#ff8800",
  pink: "#ff69b4",
  teal: "#00ffcc",
  purple: "#aa00ff",
}

export interface Room {
  id: string
  code: string
  players: Player[]
  state: RoomState
  settings: RoomSettings
  matchStartTime?: number
  matchEndTime?: number
  hostId: string
}

export type RoomState = "lobby" | "countdown" | "playing" | "ended"

export interface RoomSettings {
  maxPlayers: number
  matchDuration: number // seconds
  mapTheme: MapTheme
}

export type MapTheme = "cyber" | "neon" | "void"

export interface GameState {
  players: Player[]
  pickups: Pickup[]
  hazards: Hazard[]
  timeRemaining: number
  matchState: RoomState
}

export interface Pickup {
  id: string
  x: number
  y: number
  type: PickupType
  collected: boolean
  respawnAt?: number
}

export type PickupType = "energy" | "boost"

export interface Hazard {
  id: string
  x: number
  y: number
  width: number
  height: number
  type: HazardType
  vx?: number
  vy?: number
  patternStartX?: number
  patternStartY?: number
  patternEndX?: number
  patternEndY?: number
}

export type HazardType = "static" | "moving"

export interface InputState {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  dash: boolean
  ability: boolean
}

export interface PlayerInput {
  playerId: string
  input: InputState
  timestamp: number
  sequenceNumber: number
}

// Events from Client to Server
export type ClientMessage =
  | { type: "join"; nickname: string; color: PlayerColor }
  | { type: "ready" }
  | { type: "start" }
  | { type: "input"; input: InputState; sequenceNumber: number }
  | { type: "leave" }

// Events from Server to Client
export type ServerMessage =
  | { type: "room_state"; room: Room }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "player_ready"; playerId: string; isReady: boolean }
  | { type: "countdown_start"; startTime: number }
  | { type: "game_state"; state: GameState }
  | { type: "player_hit"; attackerId: string; targetId: string; damage: number }
  | { type: "pickup_collected"; pickupId: string; playerId: string; points: number }
  | { type: "match_end"; finalScores: { playerId: string; nickname: string; score: number; color: PlayerColor }[] }
  | { type: "error"; message: string }

// Match end statistics
export interface PlayerStats {
  playerId: string
  nickname: string
  color: PlayerColor
  score: number
  pickupsCollected: number
  knockouts: number
  survivalTime: number
}

// Local storage keys
export const STORAGE_KEYS = {
  NICKNAME: "neon-drift-nickname",
  COLOR: "neon-drift-color",
  SETTINGS: "neon-drift-settings",
} as const

// Sound effects (placeholder for future implementation)
export type SoundEffect =
  | "dash"
  | "ability"
  | "pickup"
  | "hit"
  | "countdown"
  | "matchStart"
  | "matchEnd"
