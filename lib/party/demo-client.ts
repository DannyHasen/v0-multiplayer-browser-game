import type { Room, Player, PlayerColor, InputState, GameState, ServerMessage } from "@/types/game"
import { MATCH, PLAYER_COLORS } from "@/lib/game/constants"

export type MessageHandler = (message: ServerMessage) => void
export type ConnectionHandler = () => void
export type ErrorHandler = (error: Error) => void

interface DemoClientOptions {
  roomId: string
  onMessage: MessageHandler
  onConnect?: ConnectionHandler
  onDisconnect?: ConnectionHandler
  onError?: ErrorHandler
}

// Generate a random player ID
function generatePlayerId(): string {
  return Math.random().toString(36).substring(2, 15)
}

// Demo client that simulates a multiplayer session locally
export class DemoClient {
  private roomId: string
  private messageHandler: MessageHandler
  private connectHandler?: ConnectionHandler
  private disconnectHandler?: ConnectionHandler
  private _playerId: string
  private room: Room
  private connected = false
  private gameLoopInterval: NodeJS.Timer | null = null

  constructor(options: DemoClientOptions) {
    this.roomId = options.roomId
    this.messageHandler = options.onMessage
    this.connectHandler = options.onConnect
    this.disconnectHandler = options.onDisconnect
    this._playerId = generatePlayerId()
    
    this.room = {
      id: this.roomId,
      code: this.roomId,
      players: [],
      state: "lobby",
      settings: {
        maxPlayers: 8,
        matchDuration: MATCH.DEFAULT_DURATION,
        mapTheme: "cyber",
      },
      hostId: "",
    }
  }

  connect(): void {
    // Simulate connection delay
    setTimeout(() => {
      this.connected = true
      this.connectHandler?.()
    }, 100)
  }

  disconnect(): void {
    this.connected = false
    this.stopGameLoop()
    this.disconnectHandler?.()
  }

  join(nickname: string, color: PlayerColor): void {
    // Prevent duplicate joins
    if (this.room.players.some(p => p.id === this._playerId)) {
      return
    }
    
    const isFirstPlayer = this.room.players.length === 0
    const player: Player = {
      id: this._playerId,
      nickname,
      color,
      x: 400,
      y: 300,
      vx: 0,
      vy: 0,
      health: 100,
      score: 0,
      isReady: false,
      isHost: isFirstPlayer,
      dashCooldown: 0,
      abilityCooldown: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      lastAbilityTime: 0,
      connected: true,
    }
    
    this.room.players.push(player)
    if (player.isHost) {
      this.room.hostId = player.id
    }
    
    // Add some AI players for demo
    this.addDemoPlayers()
    
    // Send room state
    this.messageHandler({ type: "room_state", room: { ...this.room } })
    this.messageHandler({ type: "player_joined", player })
  }

  private botsAdded = false
  
  private addDemoPlayers(): void {
    // Prevent adding bots multiple times
    if (this.botsAdded) return
    this.botsAdded = true
    
    // Add 1-2 AI players after a short delay
    const aiColors: PlayerColor[] = ["magenta", "yellow", "lime"]
    const aiNames = ["NeonBot", "CyberAce", "PixelPunk"]
    
    const numBots = Math.floor(Math.random() * 2) + 1
    
    for (let i = 0; i < numBots; i++) {
      setTimeout(() => {
        if (!this.connected) return
        
        const aiId = `bot-${i}-${this.roomId}`
        
        // Don't add if already exists
        if (this.room.players.some(p => p.id === aiId)) return
        
        const aiPlayer: Player = {
          id: aiId,
          nickname: aiNames[i],
          color: aiColors[i],
          x: 200 + i * 200,
          y: 200 + i * 100,
          vx: 0,
          vy: 0,
          health: 100,
          score: 0,
          isReady: false,
          isHost: false,
          dashCooldown: 0,
          abilityCooldown: 0,
          isInvulnerable: false,
          lastDashTime: 0,
          lastAbilityTime: 0,
          connected: true,
        }
        
        this.room.players.push(aiPlayer)
        this.messageHandler({ type: "room_state", room: { ...this.room } })
        this.messageHandler({ type: "player_joined", player: aiPlayer })
        
        // AI players ready up after a bit
        setTimeout(() => {
          if (!this.connected) return
          const playerIndex = this.room.players.findIndex(p => p.id === aiId)
          if (playerIndex !== -1) {
            this.room.players[playerIndex].isReady = true
            this.messageHandler({ type: "room_state", room: { ...this.room } })
          }
        }, 1000 + Math.random() * 2000)
      }, 500 + i * 1000)
    }
  }

  toggleReady(): void {
    const playerIndex = this.room.players.findIndex(p => p.id === this._playerId)
    if (playerIndex !== -1) {
      this.room.players[playerIndex].isReady = !this.room.players[playerIndex].isReady
      this.messageHandler({ type: "room_state", room: { ...this.room } })
    }
  }

  startGame(): void {
    if (this.room.hostId !== this._playerId) return
    if (!this.room.players.every(p => p.isReady)) return
    if (this.room.players.length < 2) return
    
    this.room.state = "countdown"
    this.messageHandler({ type: "countdown_start", countdown: 3 })
    
    // Start the game after countdown
    setTimeout(() => {
      this.room.state = "playing"
      this.startGameLoop()
    }, 3000)
  }

  private startGameLoop(): void {
    // Simulate game state updates
    const startTime = Date.now()
    
    this.gameLoopInterval = setInterval(() => {
      if (!this.connected) {
        this.stopGameLoop()
        return
      }
      
      const elapsed = (Date.now() - startTime) / 1000
      const timeRemaining = Math.max(0, this.room.settings.matchDuration - elapsed)
      
      // Create game state with player positions
      const gameState: GameState = {
        players: this.room.players.map((p, i) => ({
          ...p,
          x: 400 + Math.sin(Date.now() / 1000 + i) * 200,
          y: 300 + Math.cos(Date.now() / 800 + i) * 150,
          vx: Math.cos(Date.now() / 500 + i) * 2,
          vy: Math.sin(Date.now() / 500 + i) * 2,
          health: 100,
          score: Math.floor(elapsed * 10 + i * 20),
        })),
        pickups: [
          { id: "1", type: "energy", x: 200, y: 200, collected: false },
          { id: "2", type: "energy", x: 600, y: 400, collected: false },
          { id: "3", type: "boost", x: 400, y: 300, collected: false },
        ],
        hazards: [
          { id: "h1", type: "static", x: 100, y: 100, width: 60, height: 60 },
        ],
        timeRemaining,
        matchState: "playing",
      }
      
      this.messageHandler({ type: "game_state", state: gameState })
      
      // End game when time runs out
      if (timeRemaining <= 0) {
        this.stopGameLoop()
        this.room.state = "ended"
        const scores = gameState.players
          .map(p => ({ playerId: p.id, nickname: p.nickname, score: p.score, color: p.color }))
          .sort((a, b) => b.score - a.score)
        this.messageHandler({ type: "game_end", scores })
      }
    }, 1000 / 30) // 30 FPS updates
  }

  private stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
  }

  sendInput(input: InputState, sequenceNumber: number): void {
    // In demo mode, input is processed locally by the game renderer
  }

  leave(): void {
    const playerIndex = this.room.players.findIndex(p => p.id === this._playerId)
    if (playerIndex !== -1) {
      this.room.players.splice(playerIndex, 1)
    }
    this.disconnect()
  }

  get isConnected(): boolean {
    return this.connected
  }

  get socketId(): string {
    return this._playerId
  }

  get playerId(): string {
    return this._playerId
  }
}

// Singleton instance
let demoClientInstance: DemoClient | null = null
let lastRoomId: string | null = null

export function getDemoClient(): DemoClient | null {
  return demoClientInstance
}

export function createDemoClient(options: DemoClientOptions): DemoClient {
  // If we already have a client for this room, return it instead of creating a new one
  if (demoClientInstance && lastRoomId === options.roomId && demoClientInstance.isConnected) {
    return demoClientInstance
  }
  
  // Clean up existing instance if any
  if (demoClientInstance) {
    demoClientInstance.disconnect()
    demoClientInstance = null
  }
  
  lastRoomId = options.roomId
  demoClientInstance = new DemoClient(options)
  return demoClientInstance
}

export function destroyDemoClient(): void {
  if (demoClientInstance) {
    demoClientInstance.disconnect()
    demoClientInstance = null
    lastRoomId = null
  }
}
