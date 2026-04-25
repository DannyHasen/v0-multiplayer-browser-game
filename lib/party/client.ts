import PartySocket from "partysocket"
import type { ClientMessage, ServerMessage, PlayerColor, InputState } from "@/types/game"

// PartyKit host - use environment variable or default to localhost in development
export const PARTYKIT_HOST =
  process.env.NEXT_PUBLIC_PARTYKIT_HOST || "localhost:1999"

export type MessageHandler = (message: ServerMessage) => void
export type ConnectionHandler = () => void
export type ErrorHandler = (error: Error) => void

interface PartyClientOptions {
  roomId: string
  onMessage: MessageHandler
  onConnect?: ConnectionHandler
  onDisconnect?: ConnectionHandler
  onError?: ErrorHandler
}

export class PartyClient {
  private socket: PartySocket | null = null
  private messageHandler: MessageHandler
  private connectHandler?: ConnectionHandler
  private disconnectHandler?: ConnectionHandler
  private errorHandler?: ErrorHandler
  private roomId: string
  private reconnecting = false

  constructor(options: PartyClientOptions) {
    this.roomId = options.roomId
    this.messageHandler = options.onMessage
    this.connectHandler = options.onConnect
    this.disconnectHandler = options.onDisconnect
    this.errorHandler = options.onError
  }

  connect(): void {
    if (this.socket) {
      this.socket.close()
    }

    try {
      this.socket = new PartySocket({
        host: PARTYKIT_HOST,
        room: this.roomId,
        party: "game",
      })

      this.socket.addEventListener("open", () => {
        this.reconnecting = false
        this.connectHandler?.()
      })

      this.socket.addEventListener("message", (event) => {
        try {
          const message = JSON.parse(event.data) as ServerMessage
          this.messageHandler(message)
        } catch (e) {
          console.error("Failed to parse message:", e)
        }
      })

      this.socket.addEventListener("close", () => {
        this.disconnectHandler?.()
      })

      this.socket.addEventListener("error", (event) => {
        this.errorHandler?.(new Error("WebSocket error"))
      })
    } catch (error) {
      this.errorHandler?.(error as Error)
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close()
      this.socket = null
    }
  }

  send(message: ClientMessage): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message))
    }
  }

  // Convenience methods for common actions
  join(nickname: string, color: PlayerColor): void {
    this.send({ type: "join", nickname, color })
  }

  toggleReady(): void {
    this.send({ type: "ready" })
  }

  startGame(): void {
    this.send({ type: "start" })
  }

  sendInput(input: InputState, sequenceNumber: number): void {
    this.send({ type: "input", input, sequenceNumber })
  }

  leave(): void {
    this.send({ type: "leave" })
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN
  }

  get socketId(): string | null {
    return this.socket?.id || null
  }
}

// Singleton instance for the current session
let clientInstance: PartyClient | null = null

export function getPartyClient(): PartyClient | null {
  return clientInstance
}

export function createPartyClient(options: PartyClientOptions): PartyClient {
  if (clientInstance) {
    clientInstance.disconnect()
  }
  clientInstance = new PartyClient(options)
  return clientInstance
}

export function destroyPartyClient(): void {
  if (clientInstance) {
    clientInstance.disconnect()
    clientInstance = null
  }
}
