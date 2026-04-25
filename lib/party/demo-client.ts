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
// Game constants for physics
const ARENA_WIDTH = 1200
const ARENA_HEIGHT = 700
const PLAYER_SPEED = 5
const DASH_SPEED = 15
const DASH_DURATION = 150 // ms
const DASH_COOLDOWN = 3000 // ms
const ABILITY_COOLDOWN = 5000 // ms
const SHOCKWAVE_RADIUS = 100
const SHOCKWAVE_DAMAGE = 20

export class DemoClient {
  private roomId: string
  private messageHandler: MessageHandler
  private connectHandler?: ConnectionHandler
  private disconnectHandler?: ConnectionHandler
  private _playerId: string
  private room: Room
  private connected = false
  private paused = false
  private gameLoopInterval: NodeJS.Timer | null = null
  private gameStartTime: number | null = null
  
  // Player input state
  private currentInput: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    ability: false,
  }
  
  // Game state tracking
  private playerStates: Map<string, {
    x: number
    y: number
    vx: number
    vy: number
    score: number
    health: number
    isDashing: boolean
    dashEndTime: number
    lastDashTime: number
    lastAbilityTime: number
  }> = new Map()

  constructor(options: DemoClientOptions, existingRoom?: Room | null, existingPlayerId?: string | null) {
    this.roomId = options.roomId
    this.messageHandler = options.onMessage
    this.connectHandler = options.onConnect
    this.disconnectHandler = options.onDisconnect
    this._playerId = existingPlayerId || generatePlayerId()
    
    this.room = existingRoom || {
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

  updateHandlers(onMessage: MessageHandler, onConnect?: ConnectionHandler, onDisconnect?: ConnectionHandler): void {
    this.messageHandler = onMessage
    this.connectHandler = onConnect
    this.disconnectHandler = onDisconnect
    this.paused = false
    
    // Re-trigger connect if already connected
    if (this.connected) {
      this.connectHandler?.()
      // Send current room state
      this.messageHandler({ type: "room_state", room: { ...this.room } })
      
      // If game was in progress, restart the game loop immediately
      if (this.room.state === "playing" || this.room.state === "countdown") {
        if (!this.gameLoopInterval) {
          this.continueGameLoop()
        }
      }
    }
  }

  getRoom(): Room {
    return { ...this.room }
  }

  pause(): void {
    this.paused = true
    // Don't stop the game loop, just pause updates
  }

  resumeGame(): void {
    this.paused = false
    if (this.room.state === "playing" && !this.gameLoopInterval) {
      // Resume the game loop
      this.continueGameLoop()
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
    // Store the time when game will start
    this.gameStartTime = Date.now() + 3000
    isGameRunning = true
    this.messageHandler({ type: "countdown_start", countdown: 3, startTime: this.gameStartTime })
    
    // Start the game after countdown
    setTimeout(() => {
      if (!this.connected) return
      this.room.state = "playing"
      this.startGameLoop()
    }, 3000)
  }

  private continueGameLoop(): void {
    // Resume game from where it left off
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now()
    }
    this.runGameLoop()
  }

  private startGameLoop(): void {
    // Start fresh game
    this.gameStartTime = Date.now()
    this.runGameLoop()
  }

  private initializePlayerStates(): void {
    // Initialize player positions in a circle around the center
    const centerX = ARENA_WIDTH / 2
    const centerY = ARENA_HEIGHT / 2
    const radius = 150
    
    this.room.players.forEach((player, i) => {
      const angle = (i / this.room.players.length) * Math.PI * 2
      this.playerStates.set(player.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        score: 0,
        health: 100,
        isDashing: false,
        dashEndTime: 0,
        lastDashTime: 0,
        lastAbilityTime: 0,
      })
    })
  }

  private runGameLoop(): void {
    const startTime = this.gameStartTime || Date.now()
    
    // Initialize player positions
    this.initializePlayerStates()
    
    // Store pickups with positions
    const pickups = [
      { id: "p1", type: "energy" as const, x: 150, y: 150, collected: false },
      { id: "p2", type: "energy" as const, x: ARENA_WIDTH - 150, y: 150, collected: false },
      { id: "p3", type: "boost" as const, x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, collected: false },
      { id: "p4", type: "energy" as const, x: 150, y: ARENA_HEIGHT - 150, collected: false },
      { id: "p5", type: "energy" as const, x: ARENA_WIDTH - 150, y: ARENA_HEIGHT - 150, collected: false },
    ]
    
    this.gameLoopInterval = setInterval(() => {
      if (!this.connected || this.paused) {
        return
      }
      
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const timeRemaining = Math.max(0, this.room.settings.matchDuration - elapsed)
      
      // Process player movement
      this.room.players.forEach((player, index) => {
        const state = this.playerStates.get(player.id)
        if (!state) return
        
        // Get input - only process for the human player
        const isHumanPlayer = player.id === this._playerId
        const input = isHumanPlayer ? this.currentInput : this.getAIInput(player.id, index, now)
        
        // Calculate velocity based on input
        let speed = PLAYER_SPEED
        
        // Handle dashing
        if (state.isDashing && now < state.dashEndTime) {
          speed = DASH_SPEED
        } else if (state.isDashing) {
          state.isDashing = false
        }
        
        // Start dash if requested and cooldown is over
        if (input.dash && !state.isDashing && now - state.lastDashTime > DASH_COOLDOWN) {
          state.isDashing = true
          state.dashEndTime = now + DASH_DURATION
          state.lastDashTime = now
        }
        
        // Calculate movement direction
        let dx = 0
        let dy = 0
        if (input.up) dy -= 1
        if (input.down) dy += 1
        if (input.left) dx -= 1
        if (input.right) dx += 1
        
        // Normalize diagonal movement
        if (dx !== 0 && dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy)
          dx /= len
          dy /= len
        }
        
        // Apply velocity
        state.vx = dx * speed
        state.vy = dy * speed
        
        // Update position
        state.x += state.vx
        state.y += state.vy
        
        // Keep player in bounds
        state.x = Math.max(20, Math.min(ARENA_WIDTH - 20, state.x))
        state.y = Math.max(20, Math.min(ARENA_HEIGHT - 20, state.y))
        
        // Handle ability (shockwave)
        if (input.ability && now - state.lastAbilityTime > ABILITY_COOLDOWN) {
          state.lastAbilityTime = now
          // Check for nearby players to damage
          this.room.players.forEach(otherPlayer => {
            if (otherPlayer.id === player.id) return
            const otherState = this.playerStates.get(otherPlayer.id)
            if (!otherState) return
            
            const dist = Math.sqrt(
              Math.pow(otherState.x - state.x, 2) + 
              Math.pow(otherState.y - state.y, 2)
            )
            
            if (dist < SHOCKWAVE_RADIUS) {
              otherState.health -= SHOCKWAVE_DAMAGE
              state.score += 50 // Points for hitting
              
              // Knockback
              const angle = Math.atan2(otherState.y - state.y, otherState.x - state.x)
              otherState.x += Math.cos(angle) * 50
              otherState.y += Math.sin(angle) * 50
              
              // Keep in bounds after knockback
              otherState.x = Math.max(20, Math.min(ARENA_WIDTH - 20, otherState.x))
              otherState.y = Math.max(20, Math.min(ARENA_HEIGHT - 20, otherState.y))
            }
          })
        }
        
        // Check pickup collisions
        pickups.forEach(pickup => {
          if (pickup.collected) return
          const dist = Math.sqrt(
            Math.pow(pickup.x - state.x, 2) + 
            Math.pow(pickup.y - state.y, 2)
          )
          if (dist < 30) {
            pickup.collected = true
            state.score += pickup.type === "boost" ? 100 : 25
            
            // Respawn pickup after 5 seconds
            setTimeout(() => {
              pickup.collected = false
              pickup.x = Math.random() * (ARENA_WIDTH - 100) + 50
              pickup.y = Math.random() * (ARENA_HEIGHT - 100) + 50
            }, 5000)
          }
        })
      })
      
      // Build game state
      const gameState: GameState = {
        players: this.room.players.map(player => {
          const state = this.playerStates.get(player.id)!
          return {
            ...player,
            x: state.x,
            y: state.y,
            vx: state.vx,
            vy: state.vy,
            score: state.score,
            health: state.health,
            dashCooldown: Math.max(0, DASH_COOLDOWN - (now - state.lastDashTime)) / 1000,
            abilityCooldown: Math.max(0, ABILITY_COOLDOWN - (now - state.lastAbilityTime)) / 1000,
          }
        }),
        pickups: pickups.filter(p => !p.collected),
        hazards: [],
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
    }, 1000 / 60) // 60 FPS updates for smoother gameplay
  }
  
  // Simple AI for bots
  private getAIInput(playerId: string, index: number, now: number): InputState {
    const state = this.playerStates.get(playerId)
    if (!state) return { up: false, down: false, left: false, right: false, dash: false, ability: false }
    
    // Simple wandering AI
    const time = now / 1000 + index * 2
    const targetX = ARENA_WIDTH / 2 + Math.sin(time * 0.5) * 300
    const targetY = ARENA_HEIGHT / 2 + Math.cos(time * 0.7) * 200
    
    const dx = targetX - state.x
    const dy = targetY - state.y
    
    // Chase human player occasionally
    const humanState = this.playerStates.get(this._playerId)
    if (humanState && Math.random() < 0.3) {
      const distToHuman = Math.sqrt(
        Math.pow(humanState.x - state.x, 2) +
        Math.pow(humanState.y - state.y, 2)
      )
      
      // Use ability when close to human
      const useAbility = distToHuman < 80 && now - state.lastAbilityTime > ABILITY_COOLDOWN
      
      return {
        up: humanState.y < state.y - 10,
        down: humanState.y > state.y + 10,
        left: humanState.x < state.x - 10,
        right: humanState.x > state.x + 10,
        dash: distToHuman < 150 && Math.random() < 0.05,
        ability: useAbility,
      }
    }
    
    return {
      up: dy < -10,
      down: dy > 10,
      left: dx < -10,
      right: dx > 10,
      dash: Math.random() < 0.01,
      ability: Math.random() < 0.005,
    }
  }

  private stopGameLoop(): void {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
  }

  sendInput(input: InputState, _sequenceNumber: number): void {
    // Store the input to be processed in the game loop
    this.currentInput = { ...input }
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

// Singleton instance - persists across page navigations
let demoClientInstance: DemoClient | null = null
let lastRoomId: string | null = null

// Store game state globally to persist across navigations
let persistedRoom: Room | null = null
let persistedPlayerId: string | null = null
let gameStartTime: number | null = null
let isGameRunning = false

export function getDemoClient(): DemoClient | null {
  return demoClientInstance
}

export function createDemoClient(options: DemoClientOptions): DemoClient {
  // If we already have a client for this room, update handlers and return
  if (demoClientInstance && lastRoomId === options.roomId) {
    demoClientInstance.updateHandlers(options.onMessage, options.onConnect, options.onDisconnect)
    return demoClientInstance
  }
  
  // Check if we have persisted state for this room (from navigation)
  const shouldRestoreState = lastRoomId === options.roomId && persistedRoom !== null
  
  // Clean up existing instance if switching rooms
  if (demoClientInstance && lastRoomId !== options.roomId) {
    demoClientInstance.disconnect()
    demoClientInstance = null
    persistedRoom = null
    persistedPlayerId = null
    gameStartTime = null
    isGameRunning = false
  }
  
  lastRoomId = options.roomId
  
  // Create new instance, restoring state if available
  if (shouldRestoreState) {
    demoClientInstance = new DemoClient(options, persistedRoom, persistedPlayerId)
  } else {
    demoClientInstance = new DemoClient(options, null, null)
  }
  
  return demoClientInstance
}

export function destroyDemoClient(): void {
  // Don't fully destroy - just stop updating, keep state for navigation
  if (demoClientInstance) {
    // Save state before "destroying"
    persistedRoom = demoClientInstance.getRoom()
    persistedPlayerId = demoClientInstance.playerId
    demoClientInstance.pause()
  }
}

export function fullDestroyDemoClient(): void {
  if (demoClientInstance) {
    demoClientInstance.disconnect()
    demoClientInstance = null
    lastRoomId = null
    persistedRoom = null
    persistedPlayerId = null
    gameStartTime = null
    isGameRunning = false
  }
}
