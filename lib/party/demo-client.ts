import type {
  Room,
  Player,
  PlayerColor,
  InputState,
  GameState,
  ServerMessage,
  RoomSettings,
  Pickup,
  Hazard,
  Projectile,
  BossState,
} from "@/types/game"
import { MATCH } from "@/lib/game/constants"

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
const ARENA_HEIGHT = 800
const PLAYER_RADIUS = 30
const PLAYER_SPEED = 5
const DASH_SPEED = 15
const DASH_DURATION = 150 // ms
const DASH_COOLDOWN = 3000 // ms
const ABILITY_COOLDOWN = 5000 // ms
const SHOCKWAVE_RADIUS = 100
const SHOCKWAVE_DAMAGE = 20
const BOOST_DURATION = 3000 // ms
const BOOST_MULTIPLIER = 1.6
const SHIELD_DURATION = 4000 // ms
const PICKUP_RESPAWN_DELAY = 5000 // ms
const HAZARD_DAMAGE = 12
const HAZARD_HIT_COOLDOWN = 700 // ms
const RESPAWN_DELAY = 2000 // ms
const RESPAWN_INVULNERABILITY = 1200 // ms
const MAX_BOTS = 7
const BOSS_SPEED = 1.45
const BOSS_RADIUS = 48
const BOSS_CONTACT_DAMAGE = 20
const BOSS_FIRE_INTERVAL = 1300
const BOSS_PROJECTILE_SPEED = 7
const BOSS_PROJECTILE_RADIUS = 12
const BOSS_PROJECTILE_DAMAGE = 18
const PROJECTILE_LIFETIME = 3500

const BOT_PROFILES: Array<{ nickname: string; color: PlayerColor }> = [
  { nickname: "NeonBot", color: "magenta" },
  { nickname: "CyberAce", color: "yellow" },
  { nickname: "PixelPunk", color: "lime" },
  { nickname: "ByteRider", color: "orange" },
  { nickname: "GlitchKid", color: "pink" },
  { nickname: "TurboHex", color: "teal" },
  { nickname: "VoidRunner", color: "purple" },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function createDemoPickups(): Pickup[] {
  return [
    { id: "p1", type: "energy", x: 150, y: 150, collected: false },
    { id: "p2", type: "energy", x: ARENA_WIDTH - 150, y: 150, collected: false },
    { id: "p3", type: "boost", x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 + 180, collected: false },
    { id: "p4", type: "energy", x: 150, y: ARENA_HEIGHT - 150, collected: false },
    { id: "p5", type: "energy", x: ARENA_WIDTH - 150, y: ARENA_HEIGHT - 150, collected: false },
    { id: "p6", type: "shield", x: ARENA_WIDTH / 2, y: 140, collected: false },
    { id: "p7", type: "shield", x: ARENA_WIDTH / 2, y: ARENA_HEIGHT - 140, collected: false },
  ]
}

function createDemoHazards(): Hazard[] {
  return [
    { id: "h1", type: "static", x: 100, y: 100, width: 80, height: 80 },
    { id: "h2", type: "static", x: ARENA_WIDTH - 180, y: 100, width: 80, height: 80 },
    { id: "h3", type: "static", x: 100, y: ARENA_HEIGHT - 180, width: 80, height: 80 },
    { id: "h4", type: "static", x: ARENA_WIDTH - 180, y: ARENA_HEIGHT - 180, width: 80, height: 80 },
    {
      id: "h5",
      type: "moving",
      x: ARENA_WIDTH / 2 - 30,
      y: 150,
      width: 60,
      height: 60,
      vx: 2.4,
      vy: 0,
      patternStartX: 220,
      patternEndX: ARENA_WIDTH - 220,
    },
    {
      id: "h6",
      type: "moving",
      x: 160,
      y: ARENA_HEIGHT / 2 - 30,
      width: 60,
      height: 60,
      vx: 0,
      vy: 2.2,
      patternStartY: 220,
      patternEndY: ARENA_HEIGHT - 220,
    },
  ]
}

function circleRectCollide(
  cx: number,
  cy: number,
  radius: number,
  rx: number,
  ry: number,
  rw: number,
  rh: number
): boolean {
  const closestX = clamp(cx, rx, rx + rw)
  const closestY = clamp(cy, ry, ry + rh)
  const dx = cx - closestX
  const dy = cy - closestY
  return dx * dx + dy * dy < radius * radius
}

type DemoPlayerState = {
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
  boostUntil: number
  shieldUntil: number
  lastHazardHitTime: number
  respawnInvulnerableUntil: number
  respawnAt: number | null
}

export class DemoClient {
  private roomId: string
  private messageHandler: MessageHandler
  private connectHandler?: ConnectionHandler
  private disconnectHandler?: ConnectionHandler
  private _playerId: string
  private room: Room
  private connected = false
  private paused = false
  private gameLoopInterval: ReturnType<typeof setInterval> | null = null
  private gameStartTime: number | null = null
  private gamePickups: Pickup[] = []
  private hazards: Hazard[] = []
  private projectiles: Projectile[] = []
  private boss: BossState | null = null
  private lastBossFireTime = 0
  
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
  private playerStates: Map<string, DemoPlayerState> = new Map()

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
      
      if (this.room.state === "countdown" && this.gameStartTime) {
        this.messageHandler({ type: "countdown_start", startTime: this.gameStartTime })
      }

      // If game was in progress, restart the game loop immediately.
      if (this.room.state === "playing") {
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
    if (this.connected) return

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
    
    // Send room state
    this.messageHandler({ type: "room_state", room: { ...this.room } })
    this.messageHandler({ type: "player_joined", player })
  }
  
  // Allow updating settings from the UI
  updateSettings(settings: Partial<RoomSettings>): void {
    this.room.settings = {
      ...this.room.settings,
      ...settings,
      maxPlayers: settings.maxPlayers
        ? clamp(settings.maxPlayers, 2, 8)
        : this.room.settings.maxPlayers,
    }
    this.trimBotsToMaxPlayers()
    this.messageHandler({ type: "room_state", room: { ...this.room } })
  }

  addBot(): boolean {
    if (this.room.state !== "lobby") return false
    if (this.room.players.length >= this.room.settings.maxPlayers) return false
    if (this.getBotCount() >= MAX_BOTS) return false

    const nextBotIndex = this.getNextBotIndex()
    if (nextBotIndex === -1) return false

    const profile = BOT_PROFILES[nextBotIndex]
    const botId = `bot-${profile.nickname.toLowerCase()}-${this.roomId}`
    if (this.room.players.some((player) => player.id === botId)) return false

    const botNumber = this.getBotCount()
    const botPlayer: Player = {
      id: botId,
      nickname: profile.nickname,
      color: profile.color,
      x: 200 + (botNumber % 4) * 220,
      y: 200 + Math.floor(botNumber / 4) * 180,
      vx: 0,
      vy: 0,
      health: 100,
      score: 0,
      isReady: true,
      isHost: false,
      dashCooldown: 0,
      abilityCooldown: 0,
      isInvulnerable: false,
      lastDashTime: 0,
      lastAbilityTime: 0,
      connected: true,
    }

    this.room.players.push(botPlayer)
    this.messageHandler({ type: "player_joined", player: botPlayer })
    this.messageHandler({ type: "room_state", room: { ...this.room } })
    return true
  }

  fillWithBots(): number {
    let added = 0
    while (this.addBot()) {
      added += 1
    }
    return added
  }

  private getBotCount(): number {
    return this.room.players.filter((player) => player.id.startsWith("bot-")).length
  }

  private getNextBotIndex(): number {
    return BOT_PROFILES.findIndex((profile) =>
      !this.room.players.some((player) => player.id === `bot-${profile.nickname.toLowerCase()}-${this.roomId}`)
    )
  }

  private trimBotsToMaxPlayers(): void {
    while (this.room.players.length > this.room.settings.maxPlayers) {
      const botIndex = this.room.players.findLastIndex((player) => player.id.startsWith("bot-"))
      if (botIndex === -1) break
      const [removed] = this.room.players.splice(botIndex, 1)
      this.messageHandler({ type: "player_left", playerId: removed.id })
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
    this.messageHandler({ type: "room_state", room: { ...this.room } })
    this.messageHandler({ type: "countdown_start", startTime: this.gameStartTime })
    
    // Start the game after countdown
    setTimeout(() => {
      if (!this.connected || this.room.state !== "countdown") return
      this.room.state = "playing"
      this.startGameLoop()
    }, 3000)
  }

  private continueGameLoop(): void {
    // Resume game from where it left off
    if (!this.gameStartTime) {
      this.gameStartTime = Date.now()
    }
    if (this.playerStates.size === 0) {
      this.initializePlayerStates()
    }
    if (this.gamePickups.length === 0) {
      this.gamePickups = createDemoPickups()
    }
    if (this.hazards.length === 0) {
      this.hazards = createDemoHazards()
    }
    if (!this.boss) {
      this.boss = this.createBoss()
    }
    this.runGameLoop()
  }

  private startGameLoop(): void {
    // Start fresh game
    this.gameStartTime = Date.now()
    this.playerStates.clear()
    this.aiTargets.clear()
    this.initializePlayerStates()
    this.gamePickups = createDemoPickups()
    this.hazards = createDemoHazards()
    this.projectiles = []
    this.boss = this.createBoss()
    this.lastBossFireTime = Date.now()
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
        boostUntil: 0,
        shieldUntil: 0,
        lastHazardHitTime: 0,
        respawnInvulnerableUntil: Date.now() + RESPAWN_INVULNERABILITY,
        respawnAt: null,
      })
    })
  }

  private runGameLoop(): void {
    const startTime = this.gameStartTime || Date.now()

    this.stopGameLoop()
    this.room.state = "playing"
    this.messageHandler({ type: "room_state", room: { ...this.room } })

    this.gameLoopInterval = setInterval(() => {
      if (!this.connected || this.paused) {
        return
      }
      
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const timeRemaining = Math.max(0, this.room.settings.matchDuration - elapsed)

      this.updateHazards()
      this.updateBoss(now)
      this.updateProjectiles(now)
      
      // Process player movement
      this.room.players.forEach((player, index) => {
        const state = this.playerStates.get(player.id)
        if (!state) return

        if (state.respawnAt) {
          if (now >= state.respawnAt) {
            this.finishRespawn(state, now)
          } else {
            state.vx = 0
            state.vy = 0
            return
          }
        }
        
        // Get input - only process for the human player
        const isHumanPlayer = player.id === this._playerId
        const input = isHumanPlayer ? this.currentInput : this.getAIInput(player.id, index, now)
        
        // Calculate velocity based on input
        let speed = now < state.boostUntil ? PLAYER_SPEED * BOOST_MULTIPLIER : PLAYER_SPEED
        
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
        state.x = clamp(state.x, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
        state.y = clamp(state.y, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)

        this.applyHazardCollisions(player.id, state, now)
        
        // Handle ability (shockwave)
        if (input.ability && now - state.lastAbilityTime > ABILITY_COOLDOWN) {
          state.lastAbilityTime = now

          if (this.boss) {
            const distToBoss = Math.sqrt(
              Math.pow(this.boss.x - state.x, 2) +
              Math.pow(this.boss.y - state.y, 2)
            )

            if (distToBoss < SHOCKWAVE_RADIUS + BOSS_RADIUS) {
              this.boss.health = Math.max(0, this.boss.health - SHOCKWAVE_DAMAGE)
              state.score += 75
              const angle = Math.atan2(this.boss.y - state.y, this.boss.x - state.x)
              this.boss.vx += Math.cos(angle) * 4
              this.boss.vy += Math.sin(angle) * 4

              if (this.boss.health <= 0) {
                state.score += 350
                this.boss = this.createBoss()
                this.lastBossFireTime = now + 1500
              }
            }
          }

          // Check for nearby players to damage
          this.room.players.forEach(otherPlayer => {
            if (otherPlayer.id === player.id) return
            const otherState = this.playerStates.get(otherPlayer.id)
            if (!otherState) return
            if (
              otherState.respawnAt ||
              otherState.isDashing ||
              now < otherState.shieldUntil ||
              now < otherState.respawnInvulnerableUntil
            ) return
            
            const dist = Math.sqrt(
              Math.pow(otherState.x - state.x, 2) + 
              Math.pow(otherState.y - state.y, 2)
            )
            
            if (dist < SHOCKWAVE_RADIUS) {
              otherState.health = Math.max(0, otherState.health - SHOCKWAVE_DAMAGE)
              state.score += 50 // Points for hitting

              this.messageHandler({
                type: "player_hit",
                attackerId: player.id,
                targetId: otherPlayer.id,
                damage: SHOCKWAVE_DAMAGE,
              })
               
              // Bonus points for knockout
              if (otherState.health <= 0) {
                state.score += 200
                this.startRespawn(otherState, now)
              } else {
                // Knockback only if not knocked out
                const angle = Math.atan2(otherState.y - state.y, otherState.x - state.x)
                otherState.x += Math.cos(angle) * 50
                otherState.y += Math.sin(angle) * 50
                
                // Keep in bounds after knockback
                otherState.x = clamp(otherState.x, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
                otherState.y = clamp(otherState.y, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
              }
            }
          })
        }
        
        // Check pickup collisions
        this.gamePickups.forEach(pickup => {
          if (pickup.collected) return
          const dist = Math.sqrt(
            Math.pow(pickup.x - state.x, 2) + 
            Math.pow(pickup.y - state.y, 2)
          )
          if (dist < PLAYER_RADIUS + 20) {
            pickup.collected = true
            pickup.respawnAt = now + PICKUP_RESPAWN_DELAY
            const points = pickup.type === "boost" ? 40 : 25
            state.score += points

            if (pickup.type === "boost") {
              state.boostUntil = now + BOOST_DURATION
            } else if (pickup.type === "shield") {
              state.shieldUntil = now + SHIELD_DURATION
            }

            this.messageHandler({
              type: "pickup_collected",
              pickupId: pickup.id,
              playerId: player.id,
              points,
            })
          }
        })
      })
      
      // Handle pickup respawning (outside of player loop)
      this.gamePickups.forEach(pickup => {
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
            dashCooldown: Math.max(0, DASH_COOLDOWN - (now - state.lastDashTime)),
            abilityCooldown: Math.max(0, ABILITY_COOLDOWN - (now - state.lastAbilityTime)),
            isInvulnerable: state.isDashing || now < state.respawnInvulnerableUntil || now < state.shieldUntil,
            isRespawning: state.respawnAt !== null,
            respawnAt: state.respawnAt ?? undefined,
            lastDashTime: state.lastDashTime,
            lastAbilityTime: state.lastAbilityTime,
          }
        }),
        pickups: this.gamePickups.filter(p => !p.collected),
        hazards: this.hazards.map(hazard => ({ ...hazard })),
        projectiles: this.projectiles.map(projectile => ({ ...projectile })),
        boss: this.boss ? { ...this.boss } : null,
        timeRemaining,
        matchState: "playing",
      }
      
      this.messageHandler({ type: "game_state", state: gameState })
      
      // End game when time runs out
      if (timeRemaining <= 0) {
        this.stopGameLoop()
        this.room.state = "ended"
        isGameRunning = false
        const finalScores = gameState.players
          .map(p => ({ playerId: p.id, nickname: p.nickname, score: Math.round(p.score), color: p.color }))
          .sort((a, b) => b.score - a.score)
        this.messageHandler({ type: "match_end", finalScores })
        this.messageHandler({ type: "room_state", room: { ...this.room } })

        setTimeout(() => {
          if (this.room.state === "ended") {
            this.resetToLobby()
          }
        }, 8000)
      }
    }, 1000 / 60) // 60 FPS updates
  }

  private createBoss(): BossState {
    const maxHealth = 320 + this.room.players.length * 35
    return {
      id: "boss",
      nickname: "Arena Warden",
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      vx: 0,
      vy: 0,
      health: maxHealth,
      maxHealth,
      targetPlayerId: null,
      fireCooldown: BOSS_FIRE_INTERVAL,
    }
  }

  private updateBoss(now: number): void {
    if (!this.boss) return

    const livingPlayers = this.room.players
      .map((player) => ({ player, state: this.playerStates.get(player.id) }))
      .filter((entry): entry is { player: Player; state: DemoPlayerState } =>
        Boolean(entry.state && !entry.state.respawnAt)
      )

    if (livingPlayers.length === 0) {
      this.boss.vx *= 0.9
      this.boss.vy *= 0.9
      this.boss.x = clamp(this.boss.x + this.boss.vx, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS)
      this.boss.y = clamp(this.boss.y + this.boss.vy, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS)
      return
    }

    let target = livingPlayers[0]
    let targetDistance = Number.POSITIVE_INFINITY
    livingPlayers.forEach((entry) => {
      const dist = Math.hypot(entry.state.x - this.boss!.x, entry.state.y - this.boss!.y)
      if (dist < targetDistance) {
        target = entry
        targetDistance = dist
      }
    })

    this.boss.targetPlayerId = target.player.id
    const angle = Math.atan2(target.state.y - this.boss.y, target.state.x - this.boss.x)
    this.boss.vx = this.boss.vx * 0.92 + Math.cos(angle) * BOSS_SPEED
    this.boss.vy = this.boss.vy * 0.92 + Math.sin(angle) * BOSS_SPEED
    this.boss.x = clamp(this.boss.x + this.boss.vx, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS)
    this.boss.y = clamp(this.boss.y + this.boss.vy, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS)
    this.boss.fireCooldown = Math.max(0, BOSS_FIRE_INTERVAL - (now - this.lastBossFireTime))

    livingPlayers.forEach(({ player, state }) => {
      const dist = Math.hypot(state.x - this.boss!.x, state.y - this.boss!.y)
      if (dist < BOSS_RADIUS + PLAYER_RADIUS && now - state.lastHazardHitTime > HAZARD_HIT_COOLDOWN) {
        state.lastHazardHitTime = now
        const knockbackAngle = Math.atan2(state.y - this.boss!.y, state.x - this.boss!.x)
        state.vx = Math.cos(knockbackAngle) * 10
        state.vy = Math.sin(knockbackAngle) * 10
        state.x = clamp(state.x + Math.cos(knockbackAngle) * 36, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
        state.y = clamp(state.y + Math.sin(knockbackAngle) * 36, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
        this.damagePlayer(player.id, state, BOSS_CONTACT_DAMAGE, now, this.boss!.id)
      }
    })

    if (now - this.lastBossFireTime >= BOSS_FIRE_INTERVAL && targetDistance < 760) {
      this.lastBossFireTime = now
      const projectileId = `boss-shot-${now}-${Math.random().toString(36).slice(2, 6)}`
      this.projectiles.push({
        id: projectileId,
        x: this.boss.x,
        y: this.boss.y,
        vx: Math.cos(angle) * BOSS_PROJECTILE_SPEED,
        vy: Math.sin(angle) * BOSS_PROJECTILE_SPEED,
        radius: BOSS_PROJECTILE_RADIUS,
        damage: BOSS_PROJECTILE_DAMAGE,
        ownerId: this.boss.id,
        type: "boss",
        expiresAt: now + PROJECTILE_LIFETIME,
      })
    }
  }

  private updateProjectiles(now: number): void {
    this.projectiles = this.projectiles.filter((projectile) => {
      projectile.x += projectile.vx
      projectile.y += projectile.vy

      if (
        now >= projectile.expiresAt ||
        projectile.x < -50 ||
        projectile.x > ARENA_WIDTH + 50 ||
        projectile.y < -50 ||
        projectile.y > ARENA_HEIGHT + 50
      ) {
        return false
      }

      for (const player of this.room.players) {
        const state = this.playerStates.get(player.id)
        if (!state || state.respawnAt || now < state.shieldUntil || now < state.respawnInvulnerableUntil) continue

        const dist = Math.hypot(projectile.x - state.x, projectile.y - state.y)
        if (dist < projectile.radius + PLAYER_RADIUS) {
          const angle = Math.atan2(state.y - projectile.y, state.x - projectile.x)
          state.vx = Math.cos(angle) * 9
          state.vy = Math.sin(angle) * 9
          this.damagePlayer(player.id, state, projectile.damage, now, projectile.ownerId)
          return false
        }
      }

      return true
    })
  }

  private updateHazards(): void {
    this.hazards.forEach((hazard) => {
      if (hazard.type !== "moving") return

      hazard.x += hazard.vx || 0
      hazard.y += hazard.vy || 0

      if (hazard.patternStartX !== undefined && hazard.patternEndX !== undefined) {
        if (hazard.x <= hazard.patternStartX || hazard.x + hazard.width >= hazard.patternEndX) {
          hazard.vx = -(hazard.vx || 0)
        }
      }

      if (hazard.patternStartY !== undefined && hazard.patternEndY !== undefined) {
        if (hazard.y <= hazard.patternStartY || hazard.y + hazard.height >= hazard.patternEndY) {
          hazard.vy = -(hazard.vy || 0)
        }
      }
    })
  }

  private applyHazardCollisions(playerId: string, state: DemoPlayerState, now: number): void {
    if (
      state.respawnAt ||
      now < state.respawnInvulnerableUntil ||
      now < state.shieldUntil ||
      now - state.lastHazardHitTime < HAZARD_HIT_COOLDOWN
    ) {
      return
    }

    const hazard = this.hazards.find((candidate) =>
      circleRectCollide(
        state.x,
        state.y,
        PLAYER_RADIUS,
        candidate.x,
        candidate.y,
        candidate.width,
        candidate.height
      )
    )

    if (!hazard) return

    state.lastHazardHitTime = now

    const hazardCenterX = hazard.x + hazard.width / 2
    const hazardCenterY = hazard.y + hazard.height / 2
    const angle = Math.atan2(state.y - hazardCenterY, state.x - hazardCenterX)
    state.vx = Math.cos(angle) * 8
    state.vy = Math.sin(angle) * 8
    state.x = clamp(state.x + Math.cos(angle) * 24, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
    state.y = clamp(state.y + Math.sin(angle) * 24, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
    this.damagePlayer(playerId, state, HAZARD_DAMAGE, now, "hazard")
  }

  private damagePlayer(playerId: string, state: DemoPlayerState, damage: number, now: number, attackerId: string): void {
    if (state.respawnAt || now < state.shieldUntil || now < state.respawnInvulnerableUntil) return

    state.health = Math.max(0, state.health - damage)
    this.messageHandler({
      type: "player_hit",
      attackerId,
      targetId: playerId,
      damage,
    })

    if (state.health <= 0) {
      this.startRespawn(state, now)
    }
  }

  private startRespawn(state: DemoPlayerState, now: number): void {
    state.health = 0
    state.vx = 0
    state.vy = 0
    state.isDashing = false
    state.dashEndTime = 0
    state.boostUntil = 0
    state.shieldUntil = 0
    state.respawnAt = now + RESPAWN_DELAY
    state.respawnInvulnerableUntil = 0
    state.score = Math.max(0, state.score - 50)
  }

  private finishRespawn(state: DemoPlayerState, now: number): void {
    state.health = 100
    state.x = ARENA_WIDTH / 2 + (Math.random() - 0.5) * 220
    state.y = ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 220
    state.vx = 0
    state.vy = 0
    state.isDashing = false
    state.dashEndTime = 0
    state.boostUntil = 0
    state.shieldUntil = 0
    state.respawnAt = null
    state.respawnInvulnerableUntil = now + RESPAWN_INVULNERABILITY
  }

  resetToLobby(): void {
    this.stopGameLoop()
    this.room.state = "lobby"
    this.gameStartTime = null
    this.playerStates.clear()
    this.gamePickups = []
    this.hazards = []
    this.projectiles = []
    this.boss = null
    this.lastBossFireTime = 0
    this.currentInput = {
      up: false,
      down: false,
      left: false,
      right: false,
      dash: false,
      ability: false,
    }

    this.room.players.forEach((player) => {
      player.isReady = false
      player.score = 0
      player.health = 100
      player.vx = 0
      player.vy = 0
      player.isInvulnerable = false
      player.isRespawning = false
      player.respawnAt = undefined
      player.dashCooldown = 0
      player.abilityCooldown = 0
    })

    isGameRunning = false
    this.messageHandler({ type: "room_state", room: { ...this.room } })
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
