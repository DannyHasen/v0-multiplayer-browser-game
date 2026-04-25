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

  constructor(options: DemoClientOptions, existingRoom?: Room | null, existingPlayerId?: string | null, existingGameStartTime?: number | null) {
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
    
    // Restore game start time if provided (for page navigation during game)
    if (existingGameStartTime) {
      this.gameStartTime = existingGameStartTime
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

  getGameStartTime(): number | null {
    return this.gameStartTime
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
    
    // Add bots after a short delay to let settings load from store
    setTimeout(() => this.addDemoPlayers(), 500)
    
    // Send room state
    this.messageHandler({ type: "room_state", room: { ...this.room } })
    this.messageHandler({ type: "player_joined", player })
  }
  
  // Allow updating settings from the UI
  updateSettings(settings: Partial<RoomSettings>): void {
    this.room.settings = { ...this.room.settings, ...settings }
    this.messageHandler({ type: "room_state", room: { ...this.room } })
  }

  private botsAdded = false
  
  private addDemoPlayers(): void {
    // Prevent adding bots multiple times
    if (this.botsAdded) return
    this.botsAdded = true
    
    const aiColors: PlayerColor[] = ["magenta", "yellow", "lime"]
    const aiNames = ["NeonBot", "CyberAce", "PixelPunk"]
    
    // Simple: add 1 bot for 2-player game, or fill up to maxPlayers-1 for larger games
    const maxPlayers = this.room.settings.maxPlayers
    const slotsForBots = maxPlayers - 1 // Leave 1 slot for the human
    const numBots = Math.min(slotsForBots, 3) // Cap at 3 bots max
    

    
    for (let i = 0; i < numBots; i++) {
      setTimeout(() => {
        if (!this.connected) return
        
        // Double-check we haven't exceeded maxPlayers
        if (this.room.players.length >= maxPlayers) {

          return
        }
        
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
    
    // Store pickups with positions and respawn tracking
    const pickups: Array<{
      id: string
      type: "energy" | "boost"
      x: number
      y: number
      collected: boolean
      respawnAt?: number
    }> = [
      { id: "p1", type: "energy", x: 150, y: 150, collected: false },
      { id: "p2", type: "energy", x: ARENA_WIDTH - 150, y: 150, collected: false },
      { id: "p3", type: "boost", x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, collected: false },
      { id: "p4", type: "energy", x: 150, y: ARENA_HEIGHT - 150, collected: false },
      { id: "p5", type: "energy", x: ARENA_WIDTH - 150, y: ARENA_HEIGHT - 150, collected: false },
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
              otherState.health = Math.max(0, otherState.health - SHOCKWAVE_DAMAGE)
              state.score += 50 // Points for hitting
              
              // Bonus points for knockout
              if (otherState.health <= 0) {
                state.score += 200
                // Respawn the knocked out player
                otherState.health = 100
                otherState.x = ARENA_WIDTH / 2 + (Math.random() - 0.5) * 200
                otherState.y = ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 200
              } else {
                // Knockback only if not knocked out
                const angle = Math.atan2(otherState.y - state.y, otherState.x - state.x)
                otherState.x += Math.cos(angle) * 50
                otherState.y += Math.sin(angle) * 50
                
                // Keep in bounds after knockback
                otherState.x = Math.max(20, Math.min(ARENA_WIDTH - 20, otherState.x))
                otherState.y = Math.max(20, Math.min(ARENA_HEIGHT - 20, otherState.y))
              }
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
            pickup.respawnAt = now + 5000 // Track when to respawn
            state.score += pickup.type === "boost" ? 100 : 25
          }
        })
      })
      
      // Handle pickup respawning (outside of player loop)
      pickups.forEach(pickup => {
        if (pickup.collected && pickup.respawnAt && now >= pickup.respawnAt) {
          pickup.collected = false
          pickup.respawnAt = undefined
          pickup.x = Math.random() * (ARENA_WIDTH - 200) + 100
          pickup.y = Math.random() * (ARENA_HEIGHT - 200) + 100
        }
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
        isGameRunning = false
        const scores = gameState.players
          .map(p => ({ playerId: p.id, nickname: p.nickname, score: p.score, color: p.color }))
          .sort((a, b) => b.score - a.score)
        this.messageHandler({ type: "game_end", scores })
      }
    }, 1000 / 60) // 60 FPS updates
  }
  
  // AI state tracking (persistent per bot)
  private aiTargets: Map<string, { x: number; y: number; changeAt: number; mode: "wander" | "chase" | "flee" }> = new Map()
  
  // Different AI personalities - each bot behaves differently
  private getAIInput(playerId: string, index: number, now: number): InputState {
    const state = this.playerStates.get(playerId)
    if (!state) return { up: false, down: false, left: false, right: false, dash: false, ability: false }
    
    const humanState = this.playerStates.get(this._playerId)
    
    // Each bot has different aggression based on index
    // Bot 0: Aggressive chaser, Bot 1: Wanderer/collector, Bot 2: Cautious/flanker
    const personality = index % 3
    
    // Get or create AI target with mode
    let aiTarget = this.aiTargets.get(playerId)
    if (!aiTarget || now > aiTarget.changeAt) {
      // Different target selection based on personality
      let mode: "wander" | "chase" | "flee" = "wander"
      let newX = Math.random() * (ARENA_WIDTH - 200) + 100
      let newY = Math.random() * (ARENA_HEIGHT - 200) + 100
      let duration = 3000 + Math.random() * 2000
      
      if (personality === 0) {
        // Aggressive: mostly chase, sometimes wander
        mode = Math.random() < 0.7 ? "chase" : "wander"
        duration = 2000 + Math.random() * 1000
      } else if (personality === 1) {
        // Collector: mostly wander to pickups, rarely chase
        mode = Math.random() < 0.2 ? "chase" : "wander"
        duration = 4000 + Math.random() * 2000
      } else {
        // Cautious: mix of everything, sometimes runs away
        const roll = Math.random()
        mode = roll < 0.3 ? "chase" : roll < 0.5 ? "flee" : "wander"
        duration = 2500 + Math.random() * 1500
      }
      
      aiTarget = { x: newX, y: newY, changeAt: now + duration, mode }
      this.aiTargets.set(playerId, aiTarget)
    }
    
    let targetX = aiTarget.x
    let targetY = aiTarget.y
    let shouldDash = false
    let shouldAbility = false
    
    if (humanState) {
      const distToHuman = Math.sqrt(
        Math.pow(humanState.x - state.x, 2) +
        Math.pow(humanState.y - state.y, 2)
      )
      
      if (aiTarget.mode === "chase" && distToHuman < 400) {
        // Chase but with offset so bots don't stack on same spot
        const offsetAngle = (index * Math.PI * 2 / 3) + now / 2000
        const offsetDist = 40
        targetX = humanState.x + Math.cos(offsetAngle) * offsetDist
        targetY = humanState.y + Math.sin(offsetAngle) * offsetDist
        
        // Dash occasionally when chasing
        if (distToHuman > 150 && distToHuman < 250 && Math.random() < 0.02 && now - state.lastDashTime > DASH_COOLDOWN) {
          shouldDash = true
        }
      } else if (aiTarget.mode === "flee" && distToHuman < 200) {
        // Run away from player
        const angle = Math.atan2(state.y - humanState.y, state.x - humanState.x)
        targetX = state.x + Math.cos(angle) * 150
        targetY = state.y + Math.sin(angle) * 150
        
        // Dash to escape
        if (distToHuman < 100 && now - state.lastDashTime > DASH_COOLDOWN) {
          shouldDash = true
        }
      }
      // else: keep wandering to random target
      
      // Use ability when very close, but not all at once
      if (distToHuman < 80 && now - state.lastAbilityTime > ABILITY_COOLDOWN) {
        // Stagger ability usage by bot index
        if (Math.random() < 0.5) {
          shouldAbility = true
        }
      }
    }
    
    // Clamp target to arena
    targetX = Math.max(50, Math.min(ARENA_WIDTH - 50, targetX))
    targetY = Math.max(50, Math.min(ARENA_HEIGHT - 50, targetY))
    
    const dx = targetX - state.x
    const dy = targetY - state.y
    const deadzone = 20
    
    return {
      up: dy < -deadzone,
      down: dy > deadzone,
      left: dx < -deadzone,
      right: dx > deadzone,
      dash: shouldDash,
      ability: shouldAbility,
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
    demoClientInstance = new DemoClient(options, persistedRoom, persistedPlayerId, gameStartTime)
  } else {
    demoClientInstance = new DemoClient(options, null, null, null)
  }
  
  return demoClientInstance
}

export function destroyDemoClient(): void {
  // Don't fully destroy - just stop updating, keep state for navigation
  if (demoClientInstance) {
    // Save state before "destroying"
    persistedRoom = demoClientInstance.getRoom()
    persistedPlayerId = demoClientInstance.playerId
    gameStartTime = demoClientInstance.getGameStartTime()
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
