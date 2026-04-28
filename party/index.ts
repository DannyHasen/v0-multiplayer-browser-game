import type * as Party from "partykit/server"
import type {
  Player,
  PlayerColor,
  Room,
  RoomState,
  GameState,
  Pickup,
  Hazard,
  ClientMessage,
  ServerMessage,
  InputState,
  RoomSettings,
} from "../types/game"

// Game constants (duplicated to avoid import issues in PartyKit)
const ARENA = { WIDTH: 1200, HEIGHT: 800, PADDING: 50 }
const PLAYER = {
  SIZE: 30,
  MAX_SPEED: 5,
  ACCELERATION: 0.4,
  FRICTION: 0.92,
  DASH_SPEED: 15,
  DASH_COOLDOWN: 3000,
  DASH_INVULNERABILITY: 200,
  ABILITY_COOLDOWN: 5000,
  ABILITY_RANGE: 120,
  ABILITY_DAMAGE: 15,
  ABILITY_KNOCKBACK: 8,
  MAX_HEALTH: 100,
}
const PICKUP = {
  SIZE: 20,
  ENERGY_POINTS: 10,
  SPAWN_INTERVAL: 5000,
  MAX_PICKUPS: 8,
  RESPAWN_DELAY: 3000,
}
const MATCH = {
  DEFAULT_DURATION: 180,
  COUNTDOWN_SECONDS: 3,
  HIT_POINTS: 25,
  SURVIVAL_POINTS_PER_SECOND: 1,
}
const NETWORK = { TICK_RATE: 60 }

function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function distance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

function getRandomSpawnPosition(): { x: number; y: number } {
  return {
    x: ARENA.PADDING + Math.random() * (ARENA.WIDTH - 2 * ARENA.PADDING),
    y: ARENA.PADDING + Math.random() * (ARENA.HEIGHT - 2 * ARENA.PADDING),
  }
}

function createPlayer(id: string, nickname: string, color: PlayerColor, isHost: boolean): Player {
  const spawn = getRandomSpawnPosition()
  return {
    id,
    nickname,
    color,
    x: spawn.x,
    y: spawn.y,
    vx: 0,
    vy: 0,
    health: PLAYER.MAX_HEALTH,
    score: 0,
    isReady: false,
    isHost,
    dashCooldown: 0,
    abilityCooldown: 0,
    isInvulnerable: false,
    lastDashTime: 0,
    lastAbilityTime: 0,
    connected: true,
  }
}

function createPickup(): Pickup {
  const spawn = getRandomSpawnPosition()
  return {
    id: generateId(),
    x: spawn.x,
    y: spawn.y,
    type: Math.random() > 0.8 ? "boost" : "energy",
    collected: false,
  }
}

function createHazards(): Hazard[] {
  const hazards: Hazard[] = []
  
  // Static hazards in corners and edges
  const staticPositions = [
    { x: 100, y: 100, w: 80, h: 80 },
    { x: ARENA.WIDTH - 180, y: 100, w: 80, h: 80 },
    { x: 100, y: ARENA.HEIGHT - 180, w: 80, h: 80 },
    { x: ARENA.WIDTH - 180, y: ARENA.HEIGHT - 180, w: 80, h: 80 },
  ]
  
  staticPositions.forEach((pos) => {
    hazards.push({
      id: generateId(),
      x: pos.x,
      y: pos.y,
      width: pos.w,
      height: pos.h,
      type: "static",
    })
  })

  // Moving hazards
  hazards.push({
    id: generateId(),
    x: ARENA.WIDTH / 2 - 30,
    y: 150,
    width: 60,
    height: 60,
    type: "moving",
    vx: 2,
    vy: 0,
    patternStartX: 200,
    patternEndX: ARENA.WIDTH - 200,
  })

  hazards.push({
    id: generateId(),
    x: 150,
    y: ARENA.HEIGHT / 2 - 30,
    width: 60,
    height: 60,
    type: "moving",
    vx: 0,
    vy: 2,
    patternStartY: 200,
    patternEndY: ARENA.HEIGHT - 200,
  })

  return hazards
}

export default class GameServer implements Party.Server {
  room: Room
  gameState: GameState | null = null
  playerInputs: Map<string, InputState> = new Map()
  gameLoopInterval: ReturnType<typeof setInterval> | null = null
  lastTickTime: number = 0
  lastPickupSpawn: number = 0

  constructor(readonly party: Party.Party) {
    // Initialize room
    this.room = {
      id: party.id,
      code: party.id,
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

  onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Send current room state to the new connection
    this.sendToConnection(conn, { type: "room_state", room: this.room })
  }

  onMessage(message: string, sender: Party.Connection) {
    try {
      const data = JSON.parse(message) as ClientMessage

      switch (data.type) {
        case "join":
          this.handleJoin(sender, data.nickname, data.color)
          break
        case "ready":
          this.handleReady(sender)
          break
        case "settings":
          this.handleSettings(sender, data.settings)
          break
        case "start":
          this.handleStart(sender)
          break
        case "input":
          this.handleInput(sender, data.input)
          break
        case "reset":
          this.handleReset(sender)
          break
        case "leave":
          this.handleLeave(sender)
          break
      }
    } catch (e) {
      console.error("Failed to parse message:", e)
    }
  }

  onClose(conn: Party.Connection) {
    const player = this.room.players.find((p) => p.id === conn.id)
    if (player) {
      player.connected = false
      
      // If in lobby, remove the player
      if (this.room.state === "lobby") {
        this.room.players = this.room.players.filter((p) => p.id !== conn.id)
        
        // Transfer host if needed
        if (this.room.hostId === conn.id && this.room.players.length > 0) {
          this.room.hostId = this.room.players[0].id
          this.room.players[0].isHost = true
        }
        
        this.broadcast({ type: "player_left", playerId: conn.id })
        this.broadcast({ type: "room_state", room: this.room })
      }
    }
  }

  handleJoin(conn: Party.Connection, nickname: string, color: PlayerColor) {
    // Check if room is full
    if (this.room.players.length >= this.room.settings.maxPlayers) {
      this.sendToConnection(conn, { type: "error", message: "Room is full" })
      return
    }

    // Check if game is already in progress
    if (this.room.state !== "lobby") {
      this.sendToConnection(conn, { type: "error", message: "Game already in progress" })
      return
    }

    // Check for duplicate nickname
    const existingNickname = this.room.players.find(
      (p) => p.nickname.toLowerCase() === nickname.toLowerCase()
    )
    if (existingNickname) {
      nickname = `${nickname}${this.room.players.length + 1}`
    }

    // Create player
    const isHost = this.room.players.length === 0
    const player = createPlayer(conn.id, nickname, color, isHost)
    
    if (isHost) {
      this.room.hostId = conn.id
    }

    this.room.players.push(player)

    // Broadcast to all
    this.broadcast({ type: "player_joined", player })
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleReady(conn: Party.Connection) {
    const player = this.room.players.find((p) => p.id === conn.id)
    if (player && this.room.state === "lobby") {
      player.isReady = !player.isReady
      this.broadcast({ type: "player_ready", playerId: conn.id, isReady: player.isReady })
      this.broadcast({ type: "room_state", room: this.room })
    }
  }

  handleSettings(conn: Party.Connection, settings: Partial<RoomSettings>) {
    if (conn.id !== this.room.hostId || this.room.state !== "lobby") {
      return
    }

    this.room.settings = {
      ...this.room.settings,
      ...settings,
      maxPlayers: settings.maxPlayers
        ? clamp(settings.maxPlayers, Math.max(2, this.room.players.length), 8)
        : this.room.settings.maxPlayers,
    }
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleStart(conn: Party.Connection) {
    // Only host can start
    if (conn.id !== this.room.hostId) {
      this.sendToConnection(conn, { type: "error", message: "Only the host can start the game" })
      return
    }

    // Need at least 2 players
    if (this.room.players.length < 2) {
      this.sendToConnection(conn, { type: "error", message: "Need at least 2 players" })
      return
    }

    // All players must be ready
    const allReady = this.room.players.every((p) => p.isReady || p.id === this.room.hostId)
    if (!allReady) {
      this.sendToConnection(conn, { type: "error", message: "Not all players are ready" })
      return
    }

    // Start countdown
    this.room.state = "countdown"
    this.broadcast({ type: "countdown_start", startTime: Date.now() + MATCH.COUNTDOWN_SECONDS * 1000 })

    // Start game after countdown
    setTimeout(() => {
      this.startGame()
    }, MATCH.COUNTDOWN_SECONDS * 1000)
  }

  handleInput(conn: Party.Connection, input: InputState) {
    if (this.room.state === "playing") {
      this.playerInputs.set(conn.id, input)
    }
  }

  handleLeave(conn: Party.Connection) {
    this.room.players = this.room.players.filter((p) => p.id !== conn.id)
    
    // Transfer host if needed
    if (this.room.hostId === conn.id && this.room.players.length > 0) {
      this.room.hostId = this.room.players[0].id
      this.room.players[0].isHost = true
    }

    this.broadcast({ type: "player_left", playerId: conn.id })
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleReset(conn: Party.Connection) {
    if (this.room.state === "ended" || conn.id === this.room.hostId) {
      this.resetToLobby()
    }
  }

  startGame() {
    this.room.state = "playing"
    this.room.matchStartTime = Date.now()
    this.room.matchEndTime = Date.now() + this.room.settings.matchDuration * 1000

    // Reset player positions and scores
    this.room.players.forEach((player) => {
      const spawn = getRandomSpawnPosition()
      player.x = spawn.x
      player.y = spawn.y
      player.vx = 0
      player.vy = 0
      player.health = PLAYER.MAX_HEALTH
      player.score = 0
      player.dashCooldown = 0
      player.abilityCooldown = 0
      player.isInvulnerable = false
    })

    // Initialize game state
    const pickups: Pickup[] = []
    for (let i = 0; i < 5; i++) {
      pickups.push(createPickup())
    }

    this.gameState = {
      players: this.room.players,
      pickups,
      hazards: createHazards(),
      timeRemaining: this.room.settings.matchDuration,
      matchState: "playing",
    }

    this.lastTickTime = Date.now()
    this.lastPickupSpawn = Date.now()

    // Start game loop
    this.gameLoopInterval = setInterval(() => {
      this.gameLoop()
    }, 1000 / NETWORK.TICK_RATE)

    // Broadcast initial game state
    this.broadcast({ type: "room_state", room: this.room })
    this.broadcast({ type: "game_state", state: this.gameState })
  }

  gameLoop() {
    if (!this.gameState || this.room.state !== "playing") return

    const now = Date.now()
    const deltaTime = (now - this.lastTickTime) / 1000
    this.lastTickTime = now

    // Update time remaining
    const elapsed = (now - (this.room.matchStartTime || 0)) / 1000
    this.gameState.timeRemaining = Math.max(0, this.room.settings.matchDuration - elapsed)

    // Check for match end
    if (this.gameState.timeRemaining <= 0) {
      this.endMatch()
      return
    }

    // Update players
    this.gameState.players.forEach((player) => {
      const input = this.playerInputs.get(player.id) || {
        up: false,
        down: false,
        left: false,
        right: false,
        dash: false,
        ability: false,
      }

      // Update cooldowns
      player.dashCooldown = Math.max(0, player.dashCooldown - deltaTime * 1000)
      player.abilityCooldown = Math.max(0, player.abilityCooldown - deltaTime * 1000)

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

      // Handle dash
      if (input.dash && player.dashCooldown <= 0 && (dx !== 0 || dy !== 0)) {
        player.vx = dx * PLAYER.DASH_SPEED
        player.vy = dy * PLAYER.DASH_SPEED
        player.dashCooldown = PLAYER.DASH_COOLDOWN
        player.isInvulnerable = true
        player.lastDashTime = now
      }

      // Handle ability (shockwave)
      if (input.ability && player.abilityCooldown <= 0) {
        player.abilityCooldown = PLAYER.ABILITY_COOLDOWN
        player.lastAbilityTime = now

        // Hit nearby players
        this.gameState!.players.forEach((other) => {
          if (other.id === player.id) return
          if (other.isInvulnerable) return

          const dist = distance(player.x, player.y, other.x, other.y)
          if (dist < PLAYER.ABILITY_RANGE) {
            // Apply knockback
            const angle = Math.atan2(other.y - player.y, other.x - player.x)
            other.vx += Math.cos(angle) * PLAYER.ABILITY_KNOCKBACK
            other.vy += Math.sin(angle) * PLAYER.ABILITY_KNOCKBACK
            other.health -= PLAYER.ABILITY_DAMAGE
            player.score += MATCH.HIT_POINTS

            this.broadcast({
              type: "player_hit",
              attackerId: player.id,
              targetId: other.id,
              damage: PLAYER.ABILITY_DAMAGE,
            })
          }
        })
      }

      // Remove invulnerability after dash
      if (player.isInvulnerable && now - player.lastDashTime > PLAYER.DASH_INVULNERABILITY) {
        player.isInvulnerable = false
      }

      // Apply acceleration
      player.vx += dx * PLAYER.ACCELERATION
      player.vy += dy * PLAYER.ACCELERATION

      // Apply friction
      player.vx *= PLAYER.FRICTION
      player.vy *= PLAYER.FRICTION

      // Clamp velocity
      const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
      if (speed > PLAYER.MAX_SPEED && !player.isInvulnerable) {
        player.vx = (player.vx / speed) * PLAYER.MAX_SPEED
        player.vy = (player.vy / speed) * PLAYER.MAX_SPEED
      }

      // Update position
      player.x += player.vx
      player.y += player.vy

      // Keep in bounds
      player.x = clamp(player.x, PLAYER.SIZE, ARENA.WIDTH - PLAYER.SIZE)
      player.y = clamp(player.y, PLAYER.SIZE, ARENA.HEIGHT - PLAYER.SIZE)

      // Survival points
      player.score += MATCH.SURVIVAL_POINTS_PER_SECOND * deltaTime
    })

    // Update moving hazards
    this.gameState.hazards.forEach((hazard) => {
      if (hazard.type === "moving") {
        hazard.x += hazard.vx || 0
        hazard.y += hazard.vy || 0

        // Bounce at pattern bounds
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
      }
    })

    // Check pickup collisions
    this.gameState.pickups.forEach((pickup) => {
      if (pickup.collected) return

      this.gameState!.players.forEach((player) => {
        const dist = distance(player.x, player.y, pickup.x, pickup.y)
        if (dist < PLAYER.SIZE + PICKUP.SIZE) {
          pickup.collected = true
          pickup.respawnAt = now + PICKUP.RESPAWN_DELAY
          player.score += PICKUP.ENERGY_POINTS

          this.broadcast({
            type: "pickup_collected",
            pickupId: pickup.id,
            playerId: player.id,
            points: PICKUP.ENERGY_POINTS,
          })
        }
      })
    })

    // Respawn pickups
    this.gameState.pickups.forEach((pickup) => {
      if (pickup.collected && pickup.respawnAt && now >= pickup.respawnAt) {
        const spawn = getRandomSpawnPosition()
        pickup.x = spawn.x
        pickup.y = spawn.y
        pickup.collected = false
        pickup.respawnAt = undefined
      }
    })

    // Spawn new pickups
    if (
      now - this.lastPickupSpawn > PICKUP.SPAWN_INTERVAL &&
      this.gameState.pickups.filter((p) => !p.collected).length < PICKUP.MAX_PICKUPS
    ) {
      this.gameState.pickups.push(createPickup())
      this.lastPickupSpawn = now
    }

    // Broadcast game state
    this.broadcast({ type: "game_state", state: this.gameState })
  }

  endMatch() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }

    this.room.state = "ended"

    // Calculate final scores
    const finalScores = this.gameState!.players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: Math.round(p.score),
        color: p.color,
      }))
      .sort((a, b) => b.score - a.score)

    this.broadcast({ type: "match_end", finalScores })
    this.broadcast({ type: "room_state", room: this.room })

    // Reset to lobby after a delay
    setTimeout(() => {
      this.resetToLobby()
    }, 10000)
  }

  resetToLobby() {
    this.room.state = "lobby"
    this.room.matchStartTime = undefined
    this.room.matchEndTime = undefined
    this.gameState = null
    this.playerInputs.clear()

    // Reset player ready states
    this.room.players.forEach((p) => {
      p.isReady = false
      p.score = 0
      p.health = PLAYER.MAX_HEALTH
    })

    this.broadcast({ type: "room_state", room: this.room })
  }

  sendToConnection(conn: Party.Connection, message: ServerMessage) {
    conn.send(JSON.stringify(message))
  }

  broadcast(message: ServerMessage) {
    this.party.broadcast(JSON.stringify(message))
  }
}
