import {
  createDemoClient,
  destroyDemoClient,
  fullDestroyDemoClient,
  getDemoClient,
  type DemoClient,
  type MessageHandler,
  type ConnectionHandler,
  type ErrorHandler,
} from "@/lib/party/demo-client"
import {
  createPartyClient,
  destroyPartyClient,
  fullDestroyPartyClient,
  getPartyClient,
  type PartyClient,
} from "@/lib/party/client"
import type { InputState, PlayerColor, Room, RoomSettings } from "@/types/game"

interface GameClientOptions {
  roomId: string
  onMessage: MessageHandler
  onConnect?: ConnectionHandler
  onDisconnect?: ConnectionHandler
  onError?: ErrorHandler
}

export type GameClient = {
  connect: () => void
  join: (nickname: string, color: PlayerColor) => void
  toggleReady: () => void
  startGame: () => void
  sendInput: (input: InputState, sequenceNumber: number) => void
  leave: () => void
  updateSettings: (settings: Partial<RoomSettings>) => void
  fillWithBots: () => number
  kickPlayer: (playerId: string) => void
  resetToLobby: () => void
  getRoom: () => Room
  readonly isConnected: boolean
  readonly playerId: string | null
}

export const isRealtimeMultiplayer =
  process.env.NEXT_PUBLIC_MULTIPLAYER_MODE === "party" ||
  process.env.NEXT_PUBLIC_REAL_MULTIPLAYER === "true"

export function getGameClient(): GameClient | null {
  return (isRealtimeMultiplayer ? getPartyClient() : getDemoClient()) as GameClient | null
}

export function createGameClient(options: GameClientOptions): GameClient {
  return (isRealtimeMultiplayer ? createPartyClient(options) : createDemoClient(options)) as GameClient
}

export function destroyGameClient(): void {
  if (isRealtimeMultiplayer) {
    destroyPartyClient()
  } else {
    destroyDemoClient()
  }
}

export function fullDestroyGameClient(): void {
  if (isRealtimeMultiplayer) {
    fullDestroyPartyClient()
  } else {
    fullDestroyDemoClient()
  }
}

export function getGameClientPlayerId(client: DemoClient | PartyClient | GameClient | null): string | null {
  return client?.playerId ?? null
}
