import { create } from "zustand"
import { persist } from "zustand/middleware"
import type {
  Player,
  PlayerColor,
  Room,
  RoomState,
  GameState,
  Pickup,
  Hazard,
  InputState,
  RoomSettings,
} from "@/types/game"
import { MATCH } from "@/lib/game/constants"

interface LocalSettings {
  nickname: string
  color: PlayerColor
  soundEnabled: boolean
  musicEnabled: boolean
  reducedMotion: boolean
  highContrast: boolean
}

interface GameStore {
  // Connection state
  isConnected: boolean
  isConnecting: boolean
  connectionError: string | null
  playerId: string | null

  // Room state
  room: Room | null
  roomCode: string | null

  // Game state
  gameState: GameState | null
  localInput: InputState

  // Local settings (persisted)
  settings: LocalSettings

  // UI state
  showEndMatch: boolean
  finalScores: { playerId: string; nickname: string; score: number; color: PlayerColor }[]

  // Actions - Connection
  setConnected: (connected: boolean) => void
  setConnecting: (connecting: boolean) => void
  setConnectionError: (error: string | null) => void
  setPlayerId: (id: string | null) => void

  // Actions - Room
  setRoom: (room: Room | null) => void
  setRoomCode: (code: string | null) => void
  updatePlayer: (playerId: string, updates: Partial<Player>) => void
  addPlayer: (player: Player) => void
  removePlayer: (playerId: string) => void
  setRoomState: (state: RoomState) => void
  updateRoomSettings: (settings: Partial<RoomSettings>) => void

  // Actions - Game
  setGameState: (state: GameState | null) => void
  updateLocalInput: (input: Partial<InputState>) => void
  resetLocalInput: () => void

  // Actions - Settings
  updateSettings: (settings: Partial<LocalSettings>) => void

  // Actions - UI
  setShowEndMatch: (show: boolean) => void
  setFinalScores: (scores: { playerId: string; nickname: string; score: number; color: PlayerColor }[]) => void

  // Actions - Reset
  resetGame: () => void
  resetAll: () => void
}

const defaultInput: InputState = {
  up: false,
  down: false,
  left: false,
  right: false,
  dash: false,
  ability: false,
}

const defaultSettings: LocalSettings = {
  nickname: "",
  color: "cyan",
  soundEnabled: true,
  musicEnabled: true,
  reducedMotion: false,
  highContrast: false,
}

const defaultGameState: GameState = {
  players: [],
  pickups: [],
  hazards: [],
  timeRemaining: MATCH.DEFAULT_DURATION,
  matchState: "lobby",
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      isConnected: false,
      isConnecting: false,
      connectionError: null,
      playerId: null,
      room: null,
      roomCode: null,
      gameState: null,
      localInput: { ...defaultInput },
      settings: { ...defaultSettings },
      showEndMatch: false,
      finalScores: [],

      // Connection actions
      setConnected: (connected) => set({ isConnected: connected }),
      setConnecting: (connecting) => set({ isConnecting: connecting }),
      setConnectionError: (error) => set({ connectionError: error }),
      setPlayerId: (id) => set({ playerId: id }),

      // Room actions
      setRoom: (room) => set({ room }),
      setRoomCode: (code) => set({ roomCode: code }),

      updatePlayer: (playerId, updates) => {
        const room = get().room
        if (!room) return
        set({
          room: {
            ...room,
            players: room.players.map((p) =>
              p.id === playerId ? { ...p, ...updates } : p
            ),
          },
        })
      },

      addPlayer: (player) => {
        const room = get().room
        if (!room) return
        set({
          room: {
            ...room,
            players: [...room.players, player],
          },
        })
      },

      removePlayer: (playerId) => {
        const room = get().room
        if (!room) return
        set({
          room: {
            ...room,
            players: room.players.filter((p) => p.id !== playerId),
          },
        })
      },

      setRoomState: (state) => {
        const room = get().room
        if (!room) return
        set({
          room: { ...room, state },
        })
      },

      updateRoomSettings: (settings) => {
        const room = get().room
        if (!room) return
        set({
          room: {
            ...room,
            settings: { ...room.settings, ...settings },
          },
        })
      },

      // Game actions
      setGameState: (state) => set({ gameState: state }),

      updateLocalInput: (input) =>
        set((state) => ({
          localInput: { ...state.localInput, ...input },
        })),

      resetLocalInput: () => set({ localInput: { ...defaultInput } }),

      // Settings actions
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      // UI actions
      setShowEndMatch: (show) => set({ showEndMatch: show }),
      setFinalScores: (scores) => set({ finalScores: scores }),

      // Reset actions
      resetGame: () =>
        set({
          gameState: null,
          localInput: { ...defaultInput },
          showEndMatch: false,
          finalScores: [],
        }),

      resetAll: () =>
        set({
          isConnected: false,
          isConnecting: false,
          connectionError: null,
          playerId: null,
          room: null,
          roomCode: null,
          gameState: null,
          localInput: { ...defaultInput },
          showEndMatch: false,
          finalScores: [],
        }),
    }),
    {
      name: "neon-drift-storage",
      partialize: (state) => ({ settings: state.settings }),
    }
  )
)

// Selector hooks for common patterns
// These return PRIMITIVE values only to avoid infinite loops
export const useIsHost = () => 
  useGameStore((state) => state.room?.hostId === state.playerId && state.playerId !== null)

export const useCurrentPlayerId = () =>
  useGameStore((state) => state.playerId)

export const useRoomPlayers = () =>
  useGameStore((state) => state.room?.players ?? [])

// Return primitives to avoid snapshot caching issues
export const useReadyCountReady = () =>
  useGameStore((state) => state.room?.players?.filter((p) => p.isReady).length ?? 0)

export const useReadyCountTotal = () =>
  useGameStore((state) => state.room?.players?.length ?? 0)

export const useCanStartGame = () =>
  useGameStore((state) => {
    if (!state.room || !state.playerId) return false
    if (state.room.hostId !== state.playerId) return false
    if (state.room.players.length < 2) return false
    return state.room.players.every((p) => p.isReady)
  })
