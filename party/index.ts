import type * as Party from "partykit/server"
import type {
  Player,
  PlayerColor,
  Room,
  GameState,
  Pickup,
  Hazard,
  ClientMessage,
  ServerMessage,
  InputState,
  RoomSettings,
  Projectile,
  BossState,
  MeleeEnemy,
  BombState,
  StormState,
  ArenaEventState,
} from "../types/game"

const ARENA_WIDTH = 1200
const ARENA_HEIGHT = 800
const PLAYER_RADIUS = 30
const PLAYER_SPEED = 5
const DASH_SPEED = 15
const DASH_DURATION = 150
const DASH_COOLDOWN = 3000
const ABILITY_COOLDOWN = 5000
const SHOCKWAVE_RADIUS = 100
const SHOCKWAVE_DAMAGE = 20
const BOOST_DURATION = 3000
const BOOST_MULTIPLIER = 1.6
const SHIELD_DURATION = 4000
const HEAL_AMOUNT = 40
const MAX_HEALTH_GAIN = 20
const MAX_HEALTH_CAP = 180
const FREEZE_DURATION = 2200
const BURN_DURATION = 4500
const BURN_TICK_DAMAGE = 8
const BURN_TICK_INTERVAL = 1000
const BOMB_FUSE = 1500
const BOMB_RADIUS = 160
const BOMB_DAMAGE = 45
const MAGNET_DURATION = 6500
const MAGNET_RADIUS = 250
const MAGNET_PULL_SPEED = 9
const SCORE_MULTIPLIER_DURATION = 8000
const SCORE_MULTIPLIER = 1.6
const PICKUP_RESPAWN_DELAY = 7500
const SUPPORT_PICKUP_RESPAWN_DELAY = 10500
const POWER_PICKUP_RESPAWN_DELAY = 14000
const MAX_HEALTH_PICKUP_RESPAWN_DELAY = 18000
const PICKUP_SAFE_SPAWN_MARGIN = 85
const HAZARD_DAMAGE = 12
const HAZARD_HIT_COOLDOWN = 700
const RESPAWN_DELAY = 2000
const RESPAWN_INVULNERABILITY = 1200
const DEATH_SCORE_PENALTY = 200
const MAX_BOTS = 7
const BOSS_KILL_REWARD = 450
const MIN_BOSS_COUNT = 2
const MAX_BOSS_COUNT = 4
const BOSS_SPEED = 0.5
const BOSS_MAX_SPEED = 1.35
const BOSS_RADIUS = 48
const BOSS_CONTACT_DAMAGE = 8
const BOSS_FIRE_INTERVAL = 1800
const BOSS_PROJECTILE_SPEED = 5.8
const BOSS_PROJECTILE_RADIUS = 12
const BOSS_PROJECTILE_DAMAGE = 14
const BOSS_PREFERRED_RANGE = 470
const BOSS_MIN_RANGE = 300
const PROJECTILE_LIFETIME = 3500
const MELEE_SPEED = 1.75
const MELEE_RADIUS = 34
const MELEE_DAMAGE = 18
const MELEE_HEALTH = 70
const MELEE_SPAWN_RATIOS = [0.55, 0.75, 0.9]
const ROUND_DAMAGE_SCALE = 0.45
const ROUND_REWARD_SCALE = 1.25
const ROUND_SPEED_SCALE = 0.14
const STORM_START_PROGRESS = 0.42
const STORM_END_PROGRESS = 0.96
const STORM_FINAL_RADIUS = 245
const STORM_DAMAGE = 10
const STORM_HIT_COOLDOWN = 1000
const ARENA_EVENT_FIRST_DELAY = 30000
const ARENA_EVENT_INTERVAL = 36000
const ARENA_EVENT_DURATION = 9000
const MAX_BONUS_PICKUPS = 7
const MATCH_DEFAULT_DURATION = 180
const COUNTDOWN_SECONDS = 3
const TICK_RATE = 60

const BOT_PROFILES: Array<{ nickname: string; color: PlayerColor }> = [
  { nickname: "NeonBot", color: "magenta" },
  { nickname: "CyberAce", color: "yellow" },
  { nickname: "PixelPunk", color: "lime" },
  { nickname: "ByteRider", color: "orange" },
  { nickname: "GlitchKid", color: "pink" },
  { nickname: "TurboTess", color: "teal" },
  { nickname: "NovaNode", color: "purple" },
]

type DemoPlayerState = {
  x: number
  y: number
  vx: number
  vy: number
  score: number
  health: number
  maxHealth: number
  isDashing: boolean
  dashEndTime: number
  lastDashTime: number
  lastAbilityTime: number
  boostUntil: number
  shieldUntil: number
  freezeUntil: number
  burnUntil: number
  lastBurnTick: number
  burnOwnerId: string | null
  magnetUntil: number
  scoreMultiplierUntil: number
  lastHazardHitTime: number
  lastStormHitTime: number
  respawnInvulnerableUntil: number
  respawnAt: number | null
}

type DamageResult = {
  damaged: boolean
  eliminated: boolean
  amount: number
}

type AIBehaviorMode = "wander" | "collect" | "harass" | "avoid" | "ambush"

type AITarget = {
  x: number
  y: number
  changeAt: number
  mode: AIBehaviorMode
  targetId?: string
  pickupId?: string
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 15)
}

function getRandomSpecialPickupType(): Pickup["type"] {
  const roll = Math.random()
  if (roll < 0.34) return "freeze"
  if (roll < 0.67) return "burn"
  return "bomb"
}

function shouldRotatePickupType(pickup: Pickup): boolean {
  return pickup.id === "p9" || pickup.id === "p10"
}

function rotatePickupType(pickup: Pickup): void {
  if (shouldRotatePickupType(pickup)) {
    pickup.type = getRandomSpecialPickupType()
  }
}

function getPickupRespawnDelay(type: Pickup["type"]): number {
  switch (type) {
    case "energy":
      return PICKUP_RESPAWN_DELAY
    case "boost":
    case "shield":
    case "heal":
      return SUPPORT_PICKUP_RESPAWN_DELAY
    case "maxHealth":
      return MAX_HEALTH_PICKUP_RESPAWN_DELAY
    default:
      return POWER_PICKUP_RESPAWN_DELAY
  }
}

function getEmptyInput(): InputState {
  return { up: false, down: false, left: false, right: false, dash: false, ability: false }
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

function createPlayer(id: string, nickname: string, color: PlayerColor, isHost: boolean): Player {
  return {
    id,
    nickname,
    color,
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
    vx: 0,
    vy: 0,
    health: 100,
    maxHealth: 100,
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

function createDemoPickups(): Pickup[] {
  return [
    { id: "p1", type: "energy", x: 150, y: 150, collected: false },
    { id: "p2", type: "energy", x: ARENA_WIDTH - 150, y: 150, collected: false },
    { id: "p3", type: "energy", x: 150, y: ARENA_HEIGHT - 150, collected: false },
    { id: "p4", type: "energy", x: ARENA_WIDTH - 150, y: ARENA_HEIGHT - 150, collected: false },
    { id: "p5", type: "boost", x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 + 190, collected: false },
    { id: "p6", type: "shield", x: ARENA_WIDTH / 2, y: 140, collected: false },
    { id: "p7", type: "heal", x: ARENA_WIDTH / 2 - 180, y: ARENA_HEIGHT / 2 + 115, collected: false },
    { id: "p8", type: "maxHealth", x: ARENA_WIDTH / 2 + 180, y: ARENA_HEIGHT / 2 + 115, collected: false },
    { id: "p9", type: getRandomSpecialPickupType(), x: ARENA_WIDTH / 2 - 270, y: ARENA_HEIGHT / 2, collected: false },
    { id: "p10", type: getRandomSpecialPickupType(), x: ARENA_WIDTH / 2 + 270, y: ARENA_HEIGHT / 2, collected: false },
    { id: "p11", type: "magnet", x: ARENA_WIDTH / 2 - 145, y: ARENA_HEIGHT / 2 - 165, collected: false },
    { id: "p12", type: "multiplier", x: ARENA_WIDTH / 2 + 145, y: ARENA_HEIGHT / 2 - 165, collected: false },
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

export default class GameServer implements Party.Server {
  room: Room
  gameState: GameState | null = null
  playerInputs: Map<string, InputState> = new Map()
  playerStates: Map<string, DemoPlayerState> = new Map()
  gameLoopInterval: ReturnType<typeof setInterval> | null = null
  gamePickups: Pickup[] = []
  hazards: Hazard[] = []
  projectiles: Projectile[] = []
  boss: BossState | null = null
  extraBosses: BossState[] = []
  meleeEnemies: MeleeEnemy[] = []
  bombs: BombState[] = []
  aiTargets: Map<string, AITarget> = new Map()
  gameStartTime: number | null = null
  lastBossFireTime = 0
  extraBossFireTimes: Map<string, number> = new Map()
  lastArenaEventTime = 0
  arenaEvent: ArenaEventState | null = null
  bonusPickupCounter = 0

  constructor(readonly party: Party.Party) {
    this.room = {
      id: party.id,
      code: party.id,
      players: [],
      state: "lobby",
      settings: {
        maxPlayers: 8,
        matchDuration: MATCH_DEFAULT_DURATION,
        mapTheme: "cyber",
      },
      hostId: "",
    }
  }

  onConnect(conn: Party.Connection) {
    this.sendToConnection(conn, { type: "room_state", room: this.room })
    if (this.gameState) {
      this.sendToConnection(conn, { type: "game_state", state: this.gameState })
    }
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
        case "fill_bots":
          this.handleFillWithBots(sender)
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
    } catch (error) {
      console.error("Failed to parse message:", error)
    }
  }

  onClose(conn: Party.Connection) {
    const player = this.room.players.find((candidate) => candidate.id === conn.id)
    if (!player) return

    player.connected = false
    this.removePlayer(conn.id)
  }

  handleJoin(conn: Party.Connection, nickname: string, color: PlayerColor) {
    const existingPlayer = this.room.players.find((player) => player.id === conn.id)
    if (existingPlayer) {
      existingPlayer.connected = true
      this.sendToConnection(conn, { type: "room_state", room: this.room })
      return
    }

    if (this.room.players.length >= this.room.settings.maxPlayers) {
      this.sendToConnection(conn, { type: "error", message: "Room is full" })
      return
    }

    if (this.room.state !== "lobby") {
      this.sendToConnection(conn, { type: "error", message: "Game already in progress" })
      return
    }

    if (this.room.players.some((player) => player.nickname.toLowerCase() === nickname.toLowerCase())) {
      nickname = `${nickname}${this.room.players.length + 1}`
    }

    const isHost = this.room.players.length === 0
    const player = createPlayer(conn.id, nickname, color, isHost)
    if (isHost) {
      this.room.hostId = conn.id
    }

    this.room.players.push(player)
    this.broadcast({ type: "player_joined", player })
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleReady(conn: Party.Connection) {
    const player = this.room.players.find((candidate) => candidate.id === conn.id)
    if (!player || this.room.state !== "lobby") return

    player.isReady = !player.isReady
    this.broadcast({ type: "player_ready", playerId: conn.id, isReady: player.isReady })
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleSettings(conn: Party.Connection, settings: Partial<RoomSettings>) {
    if (conn.id !== this.room.hostId || this.room.state !== "lobby") return

    const humanCount = this.room.players.filter((player) => !this.isBot(player.id)).length
    this.room.settings = {
      ...this.room.settings,
      ...settings,
      maxPlayers: settings.maxPlayers
        ? clamp(settings.maxPlayers, Math.max(2, humanCount), 8)
        : this.room.settings.maxPlayers,
    }
    this.trimBotsToMaxPlayers()
    this.broadcast({ type: "room_state", room: this.room })
  }

  handleFillWithBots(conn: Party.Connection) {
    if (conn.id !== this.room.hostId || this.room.state !== "lobby") return

    const addedPlayers: Player[] = []
    while (this.room.players.length < this.room.settings.maxPlayers && this.getBotCount() < MAX_BOTS) {
      const bot = this.createBot()
      if (!bot) break
      this.room.players.push(bot)
      addedPlayers.push(bot)
    }

    addedPlayers.forEach((player) => {
      this.broadcast({ type: "player_joined", player })
    })
    this.broadcast({ type: "room_state", room: this.room })
  }

  createBot(): Player | null {
    const nextBotIndex = this.getNextBotIndex()
    if (nextBotIndex === -1) return null

    const profile = BOT_PROFILES[nextBotIndex]
    const botNumber = this.getBotCount()
    const bot = createPlayer(
      `bot-${profile.nickname.toLowerCase()}-${this.room.id}`,
      profile.nickname,
      profile.color,
      false
    )

    bot.x = 200 + (botNumber % 4) * 220
    bot.y = 200 + Math.floor(botNumber / 4) * 180
    bot.isReady = true
    bot.connected = true

    return bot
  }

  getBotCount(): number {
    return this.room.players.filter((player) => this.isBot(player.id)).length
  }

  getNextBotIndex(): number {
    return BOT_PROFILES.findIndex((profile) =>
      !this.room.players.some((player) => player.id === `bot-${profile.nickname.toLowerCase()}-${this.room.id}`)
    )
  }

  trimBotsToMaxPlayers() {
    while (this.room.players.length > this.room.settings.maxPlayers) {
      const botIndex = this.room.players.findLastIndex((player) => this.isBot(player.id))
      if (botIndex === -1) break
      const [removed] = this.room.players.splice(botIndex, 1)
      this.playerInputs.delete(removed.id)
      this.playerStates.delete(removed.id)
      this.aiTargets.delete(removed.id)
      this.broadcast({ type: "player_left", playerId: removed.id })
    }
  }

  isBot(playerId: string): boolean {
    return playerId.startsWith("bot-")
  }

  handleStart(conn: Party.Connection) {
    if (conn.id !== this.room.hostId) {
      this.sendToConnection(conn, { type: "error", message: "Only the host can start the game" })
      return
    }

    if (this.room.players.length < 2) {
      this.sendToConnection(conn, { type: "error", message: "Need at least 2 players" })
      return
    }

    if (!this.room.players.every((player) => player.isReady)) {
      this.sendToConnection(conn, { type: "error", message: "Not all players are ready" })
      return
    }

    this.room.state = "countdown"
    this.broadcast({ type: "room_state", room: this.room })
    this.broadcast({ type: "countdown_start", startTime: Date.now() + COUNTDOWN_SECONDS * 1000 })

    setTimeout(() => {
      if (this.room.state === "countdown") {
        this.startGame()
      }
    }, COUNTDOWN_SECONDS * 1000)
  }

  handleInput(conn: Party.Connection, input: InputState) {
    if (this.room.state === "playing") {
      this.playerInputs.set(conn.id, input)
    }
  }

  handleLeave(conn: Party.Connection) {
    this.removePlayer(conn.id)
  }

  handleReset(conn: Party.Connection) {
    if (this.room.state === "ended" || conn.id === this.room.hostId) {
      this.resetToLobby()
    }
  }

  removePlayer(playerId: string) {
    const beforeCount = this.room.players.length
    this.room.players = this.room.players.filter((player) => player.id !== playerId)
    this.playerInputs.delete(playerId)
    this.playerStates.delete(playerId)
    this.aiTargets.delete(playerId)

    if (beforeCount === this.room.players.length) return

    const humanPlayers = this.room.players.filter((player) => !this.isBot(player.id))
    if (humanPlayers.length === 0) {
      this.stopGameLoop()
      this.resetRuntimeState()
      this.room.players = []
      this.room.state = "lobby"
      this.room.hostId = ""
    } else if (this.room.hostId === playerId) {
      this.room.hostId = humanPlayers[0].id
      this.room.players.forEach((player) => {
        player.isHost = player.id === this.room.hostId
      })
    }

    if (this.room.players.length === 0) {
      this.stopGameLoop()
      this.resetRuntimeState()
      this.room.state = "lobby"
      this.room.hostId = ""
    }

    this.broadcast({ type: "player_left", playerId })
    this.broadcast({ type: "room_state", room: this.room })
  }

  startGame() {
    this.stopGameLoop()
    this.room.state = "playing"
    this.gameStartTime = Date.now()
    this.room.matchStartTime = this.gameStartTime
    this.room.matchEndTime = this.gameStartTime + this.room.settings.matchDuration * 1000
    this.initializePlayerStates()
    this.gamePickups = createDemoPickups()
    this.hazards = createDemoHazards()
    this.projectiles = []
    const now = Date.now()
    this.boss = this.createBoss(0, now)
    this.extraBosses = []
    this.extraBossFireTimes.clear()
    this.ensureBossCount(now)
    this.meleeEnemies = []
    this.bombs = []
    this.aiTargets.clear()
    this.lastBossFireTime = now
    this.lastArenaEventTime = now
    this.arenaEvent = null
    this.bonusPickupCounter = 0

    this.gameLoopInterval = setInterval(() => {
      this.gameLoop()
    }, 1000 / TICK_RATE)

    this.broadcast({ type: "room_state", room: this.room })
  }

  initializePlayerStates() {
    const centerX = ARENA_WIDTH / 2
    const centerY = ARENA_HEIGHT / 2
    const radius = 150

    this.playerStates.clear()
    this.room.players.forEach((player, index) => {
      const angle = (index / this.room.players.length) * Math.PI * 2
      this.playerStates.set(player.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        score: 0,
        health: 100,
        maxHealth: 100,
        isDashing: false,
        dashEndTime: 0,
        lastDashTime: 0,
        lastAbilityTime: 0,
        boostUntil: 0,
        shieldUntil: 0,
        freezeUntil: 0,
        burnUntil: 0,
        lastBurnTick: 0,
        burnOwnerId: null,
        magnetUntil: 0,
        scoreMultiplierUntil: 0,
        lastHazardHitTime: 0,
        lastStormHitTime: 0,
        respawnInvulnerableUntil: Date.now() + RESPAWN_INVULNERABILITY,
        respawnAt: null,
      })
      player.score = 0
      player.health = 100
      player.maxHealth = 100
      player.isRespawning = false
      player.respawnAt = undefined
      player.isInvulnerable = true
    })
  }

  gameLoop() {
    if (!this.gameStartTime || this.room.state !== "playing") return

    const now = Date.now()
    const elapsed = (now - this.gameStartTime) / 1000
    const timeRemaining = Math.max(0, this.room.settings.matchDuration - elapsed)
    const storm = this.getStormState(now)

    this.updateHazards()
    this.ensureBossCount(now)
    this.updateBoss(now)
    this.updateExtraBosses(now)
    this.updateMeleeEnemies(now, elapsed)
    this.updateProjectiles(now)
    this.updateBombs(now)
    this.updateArenaEvent(now, elapsed)

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

      this.applyBurnTick(player.id, state, now)
      if (state.respawnAt) return

      const input = now < state.freezeUntil
        ? getEmptyInput()
        : this.isBot(player.id)
          ? this.getAIInput(player.id, index, now)
          : this.playerInputs.get(player.id) ?? getEmptyInput()
      let speed = now < state.boostUntil ? PLAYER_SPEED * BOOST_MULTIPLIER : PLAYER_SPEED

      if (state.isDashing && now < state.dashEndTime) {
        speed = DASH_SPEED
      } else if (state.isDashing) {
        state.isDashing = false
      }

      if (input.dash && !state.isDashing && now - state.lastDashTime > DASH_COOLDOWN) {
        state.isDashing = true
        state.dashEndTime = now + DASH_DURATION
        state.lastDashTime = now
      }

      let dx = 0
      let dy = 0
      if (input.up) dy -= 1
      if (input.down) dy += 1
      if (input.left) dx -= 1
      if (input.right) dx += 1

      if (dx !== 0 && dy !== 0) {
        const len = Math.hypot(dx, dy)
        dx /= len
        dy /= len
      }

      state.vx = dx * speed
      state.vy = dy * speed
      state.x += state.vx
      state.y += state.vy
      state.x = clamp(state.x, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
      state.y = clamp(state.y, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)

      this.applyHazardCollisions(player.id, state, now)
      this.applyStormPressure(player.id, state, now, storm)

      if (input.ability && now - state.lastAbilityTime > ABILITY_COOLDOWN) {
        this.useShockwave(player, state, now)
      }

      this.applyMagnetPull(state, now)
      this.collectPickups(player, state, now)
    })

    this.respawnPickups(now)
    this.gameState = this.buildGameState(now, timeRemaining, storm)
    this.broadcast({ type: "game_state", state: this.gameState })

    if (timeRemaining <= 0) {
      this.endMatch()
    }
  }

  useShockwave(player: Player, state: DemoPlayerState, now: number) {
    state.lastAbilityTime = now

    if (this.boss) {
      const distToBoss = Math.hypot(this.boss.x - state.x, this.boss.y - state.y)
      if (distToBoss < SHOCKWAVE_RADIUS + BOSS_RADIUS) {
        this.boss.health = Math.max(0, this.boss.health - this.scaleDamage(SHOCKWAVE_DAMAGE, now))
        this.addScore(state, 75, now)
        const angle = Math.atan2(this.boss.y - state.y, this.boss.x - state.x)
        this.boss.vx += Math.cos(angle) * 4
        this.boss.vy += Math.sin(angle) * 4

        if (this.boss.health <= 0) {
          this.addScore(state, BOSS_KILL_REWARD, now)
          this.boss = this.createBoss()
          this.lastBossFireTime = now + 1500
        }
      }
    }

    this.extraBosses = this.extraBosses.filter((boss) => {
      const distToBoss = Math.hypot(boss.x - state.x, boss.y - state.y)
      if (distToBoss >= SHOCKWAVE_RADIUS + BOSS_RADIUS) return true

      boss.health = Math.max(0, boss.health - this.scaleDamage(SHOCKWAVE_DAMAGE, now))
      this.addScore(state, 75, now)
      const angle = Math.atan2(boss.y - state.y, boss.x - state.x)
      boss.vx += Math.cos(angle) * 4
      boss.vy += Math.sin(angle) * 4

      if (boss.health <= 0) {
        this.addScore(state, BOSS_KILL_REWARD, now)
        this.extraBossFireTimes.delete(boss.id)
      }

      return boss.health > 0
    })

    this.meleeEnemies = this.meleeEnemies.filter((enemy) => {
      const distToEnemy = Math.hypot(enemy.x - state.x, enemy.y - state.y)
      if (distToEnemy >= SHOCKWAVE_RADIUS + enemy.radius) return true

      enemy.health -= this.scaleDamage(SHOCKWAVE_DAMAGE, now)
      this.addScore(state, 35, now)
      const knockbackAngle = Math.atan2(enemy.y - state.y, enemy.x - state.x)
      enemy.x = clamp(enemy.x + Math.cos(knockbackAngle) * 45, enemy.radius, ARENA_WIDTH - enemy.radius)
      enemy.y = clamp(enemy.y + Math.sin(knockbackAngle) * 45, enemy.radius, ARENA_HEIGHT - enemy.radius)

      if (enemy.health <= 0) {
        this.addScore(state, 100, now)
        return false
      }

      return true
    })

    this.room.players.forEach((otherPlayer) => {
      if (otherPlayer.id === player.id) return
      const otherState = this.playerStates.get(otherPlayer.id)
      if (!otherState) return
      if (
        otherState.respawnAt ||
        otherState.isDashing ||
        now < otherState.shieldUntil ||
        now < otherState.respawnInvulnerableUntil
      ) return

      const dist = Math.hypot(otherState.x - state.x, otherState.y - state.y)
      if (dist >= SHOCKWAVE_RADIUS) return

      const hit = this.damagePlayer(otherPlayer.id, otherState, SHOCKWAVE_DAMAGE, now, player.id)
      if (!hit.damaged) return

      this.addScore(state, 50, now)
      if (hit.eliminated) {
        this.addScore(state, 200, now)
      } else {
        const angle = Math.atan2(otherState.y - state.y, otherState.x - state.x)
        otherState.x = clamp(otherState.x + Math.cos(angle) * 50, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
        otherState.y = clamp(otherState.y + Math.sin(angle) * 50, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
      }
    })
  }

  collectPickups(player: Player, state: DemoPlayerState, now: number) {
    this.gamePickups.forEach((pickup) => {
      if (pickup.collected) return

      const dist = Math.hypot(pickup.x - state.x, pickup.y - state.y)
      if (dist >= PLAYER_RADIUS + 20) return

      pickup.collected = true
      pickup.respawnAt = now + getPickupRespawnDelay(pickup.type)
      const points = this.getPickupPoints(pickup.type, now, state)
      state.score += points
      this.applyPickupEffect(pickup.type, player.id, state, now)
      this.broadcast({
        type: "pickup_collected",
        pickupId: pickup.id,
        playerId: player.id,
        points,
        pickupType: pickup.type,
      })
    })
  }

  respawnPickups(now: number) {
    this.gamePickups = this.gamePickups.filter((pickup) =>
      !pickup.id.startsWith("bonus-") || !pickup.collected || (pickup.respawnAt ?? 0) > now
    )
    this.gamePickups.forEach((pickup) => {
      if (pickup.collected && pickup.respawnAt && now >= pickup.respawnAt) {
        pickup.collected = false
        pickup.respawnAt = undefined
        rotatePickupType(pickup)
        const position = this.getPickupSpawnPosition(now)
        pickup.x = position.x
        pickup.y = position.y
      }
    })
  }

  buildGameState(now: number, timeRemaining: number, storm: StormState | null): GameState {
    return {
      players: this.room.players.map((player) => {
        const state = this.playerStates.get(player.id)
        if (!state) return player

        return {
          ...player,
          x: state.x,
          y: state.y,
          vx: state.vx,
          vy: state.vy,
          score: state.score,
          health: state.health,
          maxHealth: state.maxHealth,
          dashCooldown: Math.max(0, DASH_COOLDOWN - (now - state.lastDashTime)),
          abilityCooldown: Math.max(0, ABILITY_COOLDOWN - (now - state.lastAbilityTime)),
          isInvulnerable: state.isDashing || now < state.respawnInvulnerableUntil || now < state.shieldUntil,
          boostUntil: state.boostUntil,
          shieldUntil: state.shieldUntil,
          freezeUntil: state.freezeUntil,
          burnUntil: state.burnUntil,
          magnetUntil: state.magnetUntil,
          scoreMultiplierUntil: state.scoreMultiplierUntil,
          isRespawning: state.respawnAt !== null,
          respawnAt: state.respawnAt ?? undefined,
          lastDashTime: state.lastDashTime,
          lastAbilityTime: state.lastAbilityTime,
        }
      }),
      pickups: this.gamePickups.filter((pickup) => !pickup.collected),
      hazards: this.hazards.map((hazard) => ({ ...hazard })),
      projectiles: this.projectiles.map((projectile) => ({ ...projectile })),
      boss: this.boss ? { ...this.boss } : null,
      bosses: this.getAllBosses().map((boss) => ({ ...boss })),
      meleeEnemies: this.meleeEnemies.map((enemy) => ({ ...enemy })),
      bombs: this.bombs.map((bomb) => ({ ...bomb })),
      storm,
      arenaEvent: this.arenaEvent ? { ...this.arenaEvent } : null,
      timeRemaining,
      matchState: "playing",
    }
  }

  getRoundProgress(now: number): number {
    if (!this.gameStartTime || this.room.settings.matchDuration <= 0) return 0

    const elapsed = Math.max(0, (now - this.gameStartTime) / 1000)
    return clamp(elapsed / this.room.settings.matchDuration, 0, 1)
  }

  scaleDamage(base: number, now: number): number {
    return Math.max(1, Math.round(base * (1 + this.getRoundProgress(now) * ROUND_DAMAGE_SCALE)))
  }

  scaleReward(base: number, now: number): number {
    return Math.max(1, Math.round(base * (1 + this.getRoundProgress(now) * ROUND_REWARD_SCALE)))
  }

  scaleSpeed(base: number, now: number): number {
    return base * (1 + this.getRoundProgress(now) * ROUND_SPEED_SCALE)
  }

  getStormState(now: number): StormState | null {
    const progress = this.getRoundProgress(now)
    if (progress < STORM_START_PROGRESS) return null

    const shrinkProgress = clamp(
      (progress - STORM_START_PROGRESS) / (STORM_END_PROGRESS - STORM_START_PROGRESS),
      0,
      1
    )
    const maxRadius = Math.hypot(ARENA_WIDTH, ARENA_HEIGHT) / 2 + PLAYER_RADIUS
    const easedProgress = shrinkProgress * shrinkProgress * (3 - 2 * shrinkProgress)

    return {
      x: ARENA_WIDTH / 2,
      y: ARENA_HEIGHT / 2,
      radius: maxRadius - (maxRadius - STORM_FINAL_RADIUS) * easedProgress,
      maxRadius,
      damage: this.scaleDamage(STORM_DAMAGE, now),
      active: true,
    }
  }

  getPickupSpawnPosition(now: number): { x: number; y: number } {
    const storm = this.getStormState(now)

    if (storm?.active) {
      const safeRadius = Math.max(120, storm.radius - PICKUP_SAFE_SPAWN_MARGIN)
      for (let attempt = 0; attempt < 24; attempt += 1) {
        const angle = Math.random() * Math.PI * 2
        const distance = Math.sqrt(Math.random()) * safeRadius
        const x = clamp(storm.x + Math.cos(angle) * distance, 100, ARENA_WIDTH - 100)
        const y = clamp(storm.y + Math.sin(angle) * distance, 100, ARENA_HEIGHT - 100)
        if (this.isPickupSpawnClear(x, y)) return { x, y }
      }
    }

    for (let attempt = 0; attempt < 18; attempt += 1) {
      const x = Math.random() * (ARENA_WIDTH - 200) + 100
      const y = Math.random() * (ARENA_HEIGHT - 200) + 100
      if (this.isPickupSpawnClear(x, y)) return { x, y }
    }

    return { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 }
  }

  isPickupSpawnClear(x: number, y: number): boolean {
    return !this.hazards.some((hazard) =>
      circleRectCollide(x, y, PLAYER_RADIUS + 12, hazard.x, hazard.y, hazard.width, hazard.height)
    )
  }

  addScore(state: DemoPlayerState | undefined, base: number, now: number): number {
    if (!state) return 0

    const points = Math.round(this.scaleReward(base, now) * this.getScoreMultiplier(state, now))
    state.score += points
    return points
  }

  getScoreMultiplier(state: DemoPlayerState, now: number): number {
    return now < state.scoreMultiplierUntil ? SCORE_MULTIPLIER : 1
  }

  createBoss(index = 0, now = Date.now()): BossState {
    const maxHealth = 250 + this.room.players.length * 24 + index * 28
    const angle = -Math.PI / 2 + index * Math.PI
    const spawnRadius = index === 0 ? 0 : 210
    const id = index === 0 ? "boss" : `boss-${index + 1}`
    const boss = {
      id,
      nickname: index === 0 ? "Arena Warden" : `Arena Warden ${index + 1}`,
      x: clamp(ARENA_WIDTH / 2 + Math.cos(angle) * spawnRadius, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS),
      y: clamp(ARENA_HEIGHT / 2 + Math.sin(angle) * spawnRadius, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS),
      vx: 0,
      vy: 0,
      health: maxHealth,
      maxHealth,
      targetPlayerId: null,
      fireCooldown: BOSS_FIRE_INTERVAL,
    }

    if (index > 0) {
      this.extraBossFireTimes.set(id, now + index * 420)
    }

    return boss
  }

  getAllBosses(): BossState[] {
    return [...(this.boss ? [this.boss] : []), ...this.extraBosses]
  }

  getDesiredBossCount(now: number): number {
    const progress = this.getRoundProgress(now)
    let count = MIN_BOSS_COUNT

    if (this.room.settings.matchDuration >= 240 && progress > 0.45) {
      count += 1
    }
    if ((this.room.settings.matchDuration >= 300 || this.room.players.length >= 5) && progress > 0.72) {
      count += 1
    }

    return clamp(count, MIN_BOSS_COUNT, MAX_BOSS_COUNT)
  }

  ensureBossCount(now: number) {
    if (!this.boss) {
      this.boss = this.createBoss(0, now)
      this.lastBossFireTime = now + 600
    }

    const desiredCount = this.getDesiredBossCount(now)
    while (this.getAllBosses().length < desiredCount) {
      const index = this.getAllBosses().length
      this.extraBosses.push(this.createBoss(index, now))
    }
  }

  updateExtraBosses(now: number) {
    const livingPlayers = this.getLivingPlayerEntries()
    this.extraBosses = this.extraBosses.filter((boss, index) => {
      if (boss.health <= 0) {
        this.extraBossFireTimes.delete(boss.id)
        return false
      }

      this.updateBossUnit(boss, index + 1, now, livingPlayers)
      return true
    })
  }

  updateBossUnit(
    boss: BossState,
    index: number,
    now: number,
    livingPlayers: Array<{ player: Player; state: DemoPlayerState }>
  ) {
    if (livingPlayers.length === 0) {
      boss.vx *= 0.9
      boss.vy *= 0.9
      boss.x = clamp(boss.x + boss.vx, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS)
      boss.y = clamp(boss.y + boss.vy, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS)
      return
    }

    let target = livingPlayers[0]
    let targetDistance = Number.POSITIVE_INFINITY
    livingPlayers.forEach((entry) => {
      const dist = Math.hypot(entry.state.x - boss.x, entry.state.y - boss.y)
      if (dist < targetDistance) {
        target = entry
        targetDistance = dist
      }
    })

    boss.targetPlayerId = target.player.id
    const progress = this.getRoundProgress(now)
    const bossAcceleration = this.scaleSpeed(BOSS_SPEED * 0.86, now)
    const bossMaxSpeed = this.scaleSpeed(BOSS_MAX_SPEED * 0.92, now)
    const fireInterval = BOSS_FIRE_INTERVAL * (1.18 - progress * 0.22 + index * 0.08)
    const projectileSpeed = this.scaleSpeed(BOSS_PROJECTILE_SPEED * 0.95, now)
    const angle = Math.atan2(target.state.y - boss.y, target.state.x - boss.x)
    const flankAngle = angle + (index % 2 === 0 ? -Math.PI / 2 : Math.PI / 2)
    const movementAngle =
      targetDistance < BOSS_MIN_RANGE
        ? angle + Math.PI
        : targetDistance > BOSS_PREFERRED_RANGE + 140
          ? angle
          : flankAngle
    const acceleration =
      targetDistance < BOSS_MIN_RANGE
        ? bossAcceleration
        : targetDistance > BOSS_PREFERRED_RANGE + 140
          ? bossAcceleration * 0.68
          : bossAcceleration * 0.42

    let separationX = 0
    let separationY = 0
    this.getAllBosses().forEach((otherBoss) => {
      if (otherBoss.id === boss.id) return
      const dx = boss.x - otherBoss.x
      const dy = boss.y - otherBoss.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      if (distance > BOSS_RADIUS * 4) return
      const push = (1 - distance / (BOSS_RADIUS * 4)) * 0.65
      separationX += (dx / distance) * push
      separationY += (dy / distance) * push
    })

    boss.vx = boss.vx * 0.9 + Math.cos(movementAngle) * acceleration + separationX
    boss.vy = boss.vy * 0.9 + Math.sin(movementAngle) * acceleration + separationY
    const bossSpeed = Math.hypot(boss.vx, boss.vy)
    if (bossSpeed > bossMaxSpeed) {
      boss.vx = (boss.vx / bossSpeed) * bossMaxSpeed
      boss.vy = (boss.vy / bossSpeed) * bossMaxSpeed
    }
    boss.x = clamp(boss.x + boss.vx, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS)
    boss.y = clamp(boss.y + boss.vy, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS)

    const lastFireTime = this.extraBossFireTimes.get(boss.id) ?? now
    boss.fireCooldown = Math.max(0, fireInterval - (now - lastFireTime))

    livingPlayers.forEach(({ player, state }) => {
      const dist = Math.hypot(state.x - boss.x, state.y - boss.y)
      if (dist < BOSS_RADIUS + PLAYER_RADIUS && now - state.lastHazardHitTime > HAZARD_HIT_COOLDOWN) {
        state.lastHazardHitTime = now
        const knockbackAngle = Math.atan2(state.y - boss.y, state.x - boss.x)
        state.vx = Math.cos(knockbackAngle) * 9
        state.vy = Math.sin(knockbackAngle) * 9
        state.x = clamp(state.x + Math.cos(knockbackAngle) * 32, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
        state.y = clamp(state.y + Math.sin(knockbackAngle) * 32, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
        this.damagePlayer(player.id, state, BOSS_CONTACT_DAMAGE, now, boss.id)
      }
    })

    if (now - lastFireTime >= fireInterval && targetDistance < 780) {
      this.extraBossFireTimes.set(boss.id, now)
      this.projectiles.push({
        id: `${boss.id}-shot-${now}-${generateId().slice(0, 6)}`,
        x: boss.x,
        y: boss.y,
        vx: Math.cos(angle) * projectileSpeed,
        vy: Math.sin(angle) * projectileSpeed,
        radius: BOSS_PROJECTILE_RADIUS,
        damage: Math.max(10, BOSS_PROJECTILE_DAMAGE - 2),
        ownerId: boss.id,
        type: "boss",
        expiresAt: now + PROJECTILE_LIFETIME,
      })
    }
  }

  fireBossVolley(now: number) {
    this.getAllBosses().forEach((boss, bossIndex) => {
      const shots = 3
      for (let index = 0; index < shots; index += 1) {
        const angle = (Math.PI * 2 * index) / shots + bossIndex * 0.45
        this.projectiles.push({
          id: `${boss.id}-volley-${now}-${index}`,
          x: boss.x,
          y: boss.y,
          vx: Math.cos(angle) * (BOSS_PROJECTILE_SPEED * 0.82),
          vy: Math.sin(angle) * (BOSS_PROJECTILE_SPEED * 0.82),
          radius: BOSS_PROJECTILE_RADIUS,
          damage: Math.max(8, BOSS_PROJECTILE_DAMAGE - 4),
          ownerId: boss.id,
          type: "boss",
          expiresAt: now + PROJECTILE_LIFETIME,
        })
      }
    })
  }

  triggerArenaEvent(now: number) {
    const roll = Math.random()
    if (roll < 0.34) {
      this.spawnBonusPickups(now)
      this.arenaEvent = {
        id: `event-${now}`,
        name: "Supply Surge",
        description: "Fresh powerups are scattering inside the arena.",
        endsAt: now + ARENA_EVENT_DURATION,
        tone: "supply",
      }
      return
    }

    if (roll < 0.67) {
      const count = clamp(1 + Math.floor(this.room.players.length / 3), 2, 4)
      for (let index = 0; index < count; index += 1) {
        this.meleeEnemies.push(this.createMeleeEnemy(this.meleeEnemies.length, now))
      }
      this.arenaEvent = {
        id: `event-${now}`,
        name: "Hunter Rush",
        description: "Extra hunters are cutting through the safe zone.",
        endsAt: now + ARENA_EVENT_DURATION,
        tone: "danger",
      }
      return
    }

    this.fireBossVolley(now)
    this.arenaEvent = {
      id: `event-${now}`,
      name: "Warden Volley",
      description: "Wardens are firing a cross-map spread.",
      endsAt: now + ARENA_EVENT_DURATION,
      tone: "warden",
    }
  }

  updateArenaEvent(now: number, elapsed: number) {
    if (this.arenaEvent && now >= this.arenaEvent.endsAt) {
      this.arenaEvent = null
    }

    if (elapsed * 1000 < ARENA_EVENT_FIRST_DELAY || now - this.lastArenaEventTime < ARENA_EVENT_INTERVAL) {
      return
    }

    this.lastArenaEventTime = now
    this.triggerArenaEvent(now)
  }

  spawnBonusPickups(now: number) {
    const activeBonusPickups = this.gamePickups.filter((pickup) => pickup.id.startsWith("bonus-") && !pickup.collected)
    const count = Math.max(0, Math.min(4, MAX_BONUS_PICKUPS - activeBonusPickups.length))
    const types: Pickup["type"][] = ["energy", "boost", "shield", "heal", "magnet", "multiplier", getRandomSpecialPickupType()]

    for (let index = 0; index < count; index += 1) {
      const position = this.getPickupSpawnPosition(now)
      this.bonusPickupCounter += 1
      this.gamePickups.push({
        id: `bonus-${now}-${this.bonusPickupCounter}`,
        type: types[Math.floor(Math.random() * types.length)],
        x: position.x,
        y: position.y,
        collected: false,
      })
    }
  }

  updateBoss(now: number) {
    if (!this.boss) return

    const livingPlayers = this.getLivingPlayerEntries()
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
    const progress = this.getRoundProgress(now)
    const bossAcceleration = this.scaleSpeed(BOSS_SPEED, now)
    const bossMaxSpeed = this.scaleSpeed(BOSS_MAX_SPEED, now)
    const fireInterval = BOSS_FIRE_INTERVAL * (1 - progress * 0.28)
    const projectileSpeed = this.scaleSpeed(BOSS_PROJECTILE_SPEED, now)
    const angle = Math.atan2(target.state.y - this.boss.y, target.state.x - this.boss.x)
    const movementAngle =
      targetDistance < BOSS_MIN_RANGE
        ? angle + Math.PI
        : targetDistance > BOSS_PREFERRED_RANGE + 120
          ? angle
          : angle + Math.PI / 2
    const acceleration =
      targetDistance < BOSS_MIN_RANGE
        ? bossAcceleration
        : targetDistance > BOSS_PREFERRED_RANGE + 120
          ? bossAcceleration * 0.75
          : bossAcceleration * 0.35

    this.boss.vx = this.boss.vx * 0.9 + Math.cos(movementAngle) * acceleration
    this.boss.vy = this.boss.vy * 0.9 + Math.sin(movementAngle) * acceleration
    const bossSpeed = Math.hypot(this.boss.vx, this.boss.vy)
    if (bossSpeed > bossMaxSpeed) {
      this.boss.vx = (this.boss.vx / bossSpeed) * bossMaxSpeed
      this.boss.vy = (this.boss.vy / bossSpeed) * bossMaxSpeed
    }
    this.boss.x = clamp(this.boss.x + this.boss.vx, BOSS_RADIUS, ARENA_WIDTH - BOSS_RADIUS)
    this.boss.y = clamp(this.boss.y + this.boss.vy, BOSS_RADIUS, ARENA_HEIGHT - BOSS_RADIUS)
    this.boss.fireCooldown = Math.max(0, fireInterval - (now - this.lastBossFireTime))

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

    if (now - this.lastBossFireTime >= fireInterval && targetDistance < 760) {
      this.lastBossFireTime = now
      this.projectiles.push({
        id: `boss-shot-${now}-${generateId().slice(0, 6)}`,
        x: this.boss.x,
        y: this.boss.y,
        vx: Math.cos(angle) * projectileSpeed,
        vy: Math.sin(angle) * projectileSpeed,
        radius: BOSS_PROJECTILE_RADIUS,
        damage: BOSS_PROJECTILE_DAMAGE,
        ownerId: this.boss.id,
        type: "boss",
        expiresAt: now + PROJECTILE_LIFETIME,
      })
    }
  }

  updateProjectiles(now: number) {
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

  updateMeleeEnemies(now: number, elapsed: number) {
    const elapsedRatio = elapsed / this.room.settings.matchDuration
    const desiredCount = MELEE_SPAWN_RATIOS.filter((ratio) => elapsedRatio >= ratio).length
    const meleeSpeed = this.scaleSpeed(MELEE_SPEED, now)

    while (this.meleeEnemies.length < desiredCount) {
      this.meleeEnemies.push(this.createMeleeEnemy(this.meleeEnemies.length, now))
    }

    const livingPlayers = this.getLivingPlayerEntries()
    this.meleeEnemies = this.meleeEnemies.filter((enemy) => {
      if (enemy.health <= 0) return false

      if (now < (enemy.freezeUntil ?? 0) || livingPlayers.length === 0) {
        enemy.vx *= 0.7
        enemy.vy *= 0.7
        return true
      }

      let target = livingPlayers[0]
      let targetDistance = Number.POSITIVE_INFINITY
      livingPlayers.forEach((entry) => {
        const dist = Math.hypot(entry.state.x - enemy.x, entry.state.y - enemy.y)
        if (dist < targetDistance) {
          target = entry
          targetDistance = dist
        }
      })

      enemy.targetPlayerId = target.player.id
      const angle = Math.atan2(target.state.y - enemy.y, target.state.x - enemy.x)
      enemy.vx = Math.cos(angle) * meleeSpeed
      enemy.vy = Math.sin(angle) * meleeSpeed
      enemy.x = clamp(enemy.x + enemy.vx, enemy.radius, ARENA_WIDTH - enemy.radius)
      enemy.y = clamp(enemy.y + enemy.vy, enemy.radius, ARENA_HEIGHT - enemy.radius)

      if (targetDistance < enemy.radius + PLAYER_RADIUS && now - target.state.lastHazardHitTime > HAZARD_HIT_COOLDOWN) {
        target.state.lastHazardHitTime = now
        const knockbackAngle = Math.atan2(target.state.y - enemy.y, target.state.x - enemy.x)
        target.state.vx = Math.cos(knockbackAngle) * 8
        target.state.vy = Math.sin(knockbackAngle) * 8
        target.state.x = clamp(target.state.x + Math.cos(knockbackAngle) * 26, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
        target.state.y = clamp(target.state.y + Math.sin(knockbackAngle) * 26, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
        this.damagePlayer(target.player.id, target.state, MELEE_DAMAGE, now, enemy.id)
      }

      return true
    })
  }

  createMeleeEnemy(index: number, now: number): MeleeEnemy {
    const side = index % 4
    const margin = MELEE_RADIUS + 12
    const spawn = [
      { x: margin, y: ARENA_HEIGHT * 0.25 },
      { x: ARENA_WIDTH - margin, y: ARENA_HEIGHT * 0.75 },
      { x: ARENA_WIDTH * 0.25, y: margin },
      { x: ARENA_WIDTH * 0.75, y: ARENA_HEIGHT - margin },
    ][side]

    return {
      id: `hunter-${index + 1}`,
      nickname: `Hunter ${index + 1}`,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      radius: MELEE_RADIUS,
      targetPlayerId: null,
      health: MELEE_HEALTH,
      maxHealth: MELEE_HEALTH,
      spawnedAt: now,
      freezeUntil: 0,
    }
  }

  updateBombs(now: number) {
    this.bombs = this.bombs.filter((bomb) => {
      if (now < bomb.explodeAt) return true

      const ownerState = this.playerStates.get(bomb.ownerId)
      this.room.players.forEach((player) => {
        if (player.id === bomb.ownerId) return

        const state = this.playerStates.get(player.id)
        if (!state || state.respawnAt) return

        const dist = Math.hypot(state.x - bomb.x, state.y - bomb.y)
        if (dist < bomb.radius + PLAYER_RADIUS) {
          const falloff = 1 - dist / (bomb.radius + PLAYER_RADIUS)
          const damage = Math.round(BOMB_DAMAGE * Math.max(0.45, falloff))
          const angle = Math.atan2(state.y - bomb.y, state.x - bomb.x)
          state.vx = Math.cos(angle) * 12
          state.vy = Math.sin(angle) * 12
          const hit = this.damagePlayer(player.id, state, damage, now, bomb.ownerId)
          if (hit.damaged) this.addScore(ownerState, 35, now)
          if (hit.eliminated) this.addScore(ownerState, 150, now)
        }
      })

      this.meleeEnemies = this.meleeEnemies.filter((enemy) => {
        const dist = Math.hypot(enemy.x - bomb.x, enemy.y - bomb.y)
        if (dist < bomb.radius + enemy.radius) {
          enemy.health -= this.scaleDamage(BOMB_DAMAGE, now)
          this.addScore(ownerState, 35, now)
          if (enemy.health <= 0) this.addScore(ownerState, 100, now)
          return enemy.health > 0
        }
        return true
      })

      if (this.boss) {
        const dist = Math.hypot(this.boss.x - bomb.x, this.boss.y - bomb.y)
        if (dist < bomb.radius + BOSS_RADIUS) {
          this.boss.health = Math.max(0, this.boss.health - this.scaleDamage(BOMB_DAMAGE, now))
          this.addScore(ownerState, 75, now)
          if (this.boss.health <= 0) {
            this.addScore(ownerState, BOSS_KILL_REWARD, now)
            this.boss = this.createBoss()
            this.lastBossFireTime = now + 1500
          }
        }
      }

      this.extraBosses = this.extraBosses.filter((boss) => {
        const dist = Math.hypot(boss.x - bomb.x, boss.y - bomb.y)
        if (dist >= bomb.radius + BOSS_RADIUS) return true

        boss.health = Math.max(0, boss.health - this.scaleDamage(BOMB_DAMAGE, now))
        this.addScore(ownerState, 75, now)
        if (boss.health <= 0) {
          this.addScore(ownerState, BOSS_KILL_REWARD, now)
          this.extraBossFireTimes.delete(boss.id)
        }

        return boss.health > 0
      })

      return false
    })
  }

  applyMagnetPull(state: DemoPlayerState, now: number) {
    if (now >= state.magnetUntil) return

    this.gamePickups.forEach((pickup) => {
      if (pickup.collected) return

      const dx = state.x - pickup.x
      const dy = state.y - pickup.y
      const distance = Math.max(1, Math.hypot(dx, dy))
      if (distance > MAGNET_RADIUS) return

      const strength = MAGNET_PULL_SPEED * (1 - distance / MAGNET_RADIUS + 0.35)
      pickup.x = clamp(pickup.x + (dx / distance) * strength, 60, ARENA_WIDTH - 60)
      pickup.y = clamp(pickup.y + (dy / distance) * strength, 60, ARENA_HEIGHT - 60)
    })
  }

  getPickupPoints(type: Pickup["type"], now: number, state?: DemoPlayerState): number {
    const basePoints = (() => {
      switch (type) {
        case "boost":
          return 40
        case "shield":
        case "heal":
          return 30
        case "freeze":
        case "burn":
        case "bomb":
          return 35
        case "maxHealth":
          return 45
        case "magnet":
          return 35
        case "multiplier":
          return 40
        default:
          return 25
      }
    })()

    const points = this.scaleReward(basePoints, now)
    return state ? Math.round(points * this.getScoreMultiplier(state, now)) : points
  }

  applyPickupEffect(type: Pickup["type"], playerId: string, state: DemoPlayerState, now: number) {
    switch (type) {
      case "boost":
        state.boostUntil = now + BOOST_DURATION
        break
      case "shield":
        state.shieldUntil = now + SHIELD_DURATION
        break
      case "heal":
        state.health = Math.min(state.maxHealth, state.health + HEAL_AMOUNT)
        break
      case "maxHealth":
        state.maxHealth = Math.min(MAX_HEALTH_CAP, state.maxHealth + MAX_HEALTH_GAIN)
        state.health = Math.min(state.maxHealth, state.health + MAX_HEALTH_GAIN)
        break
      case "freeze":
        this.room.players.forEach((player) => {
          if (player.id === playerId) return
          const otherState = this.playerStates.get(player.id)
          if (!otherState || otherState.respawnAt) return
          otherState.freezeUntil = now + FREEZE_DURATION
          otherState.vx = 0
          otherState.vy = 0
          otherState.isDashing = false
        })
        this.meleeEnemies.forEach((enemy) => {
          enemy.freezeUntil = now + FREEZE_DURATION
          enemy.vx = 0
          enemy.vy = 0
        })
        this.lastBossFireTime += FREEZE_DURATION
        if (this.boss) {
          this.boss.vx *= 0.25
          this.boss.vy *= 0.25
        }
        this.extraBosses.forEach((boss) => {
          boss.vx *= 0.25
          boss.vy *= 0.25
          this.extraBossFireTimes.set(boss.id, (this.extraBossFireTimes.get(boss.id) ?? now) + FREEZE_DURATION)
        })
        break
      case "burn":
        this.room.players.forEach((player) => {
          if (player.id === playerId) return
          const otherState = this.playerStates.get(player.id)
          if (!otherState || otherState.respawnAt) return
          otherState.burnUntil = now + BURN_DURATION
          otherState.lastBurnTick = now
          otherState.burnOwnerId = playerId
          this.damagePlayer(player.id, otherState, BURN_TICK_DAMAGE, now, playerId)
        })
        this.meleeEnemies = this.meleeEnemies.filter((enemy) => {
          enemy.health -= this.scaleDamage(35, now)
          return enemy.health > 0
        })
        if (this.boss) {
          this.boss.health = Math.max(0, this.boss.health - this.scaleDamage(45, now))
        }
        this.extraBosses = this.extraBosses.filter((boss) => {
          boss.health = Math.max(0, boss.health - this.scaleDamage(45, now))
          if (boss.health <= 0) {
            this.extraBossFireTimes.delete(boss.id)
          }
          return boss.health > 0
        })
        break
      case "bomb":
        this.bombs.push({
          id: `bomb-${now}-${generateId().slice(0, 6)}`,
          x: state.x,
          y: state.y,
          radius: BOMB_RADIUS,
          explodeAt: now + BOMB_FUSE,
          ownerId: playerId,
        })
        break
      case "magnet":
        state.magnetUntil = now + MAGNET_DURATION
        break
      case "multiplier":
        state.scoreMultiplierUntil = now + SCORE_MULTIPLIER_DURATION
        break
    }
  }

  applyBurnTick(playerId: string, state: DemoPlayerState, now: number) {
    if (state.burnUntil <= now) {
      state.burnOwnerId = null
      return
    }

    if (now - state.lastBurnTick >= BURN_TICK_INTERVAL) {
      state.lastBurnTick = now
      this.damagePlayer(playerId, state, BURN_TICK_DAMAGE, now, state.burnOwnerId ?? "burn")
    }
  }

  updateHazards() {
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

  applyHazardCollisions(playerId: string, state: DemoPlayerState, now: number) {
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

  applyStormPressure(playerId: string, state: DemoPlayerState, now: number, storm: StormState | null) {
    if (
      !storm ||
      !storm.active ||
      state.respawnAt ||
      now < state.respawnInvulnerableUntil ||
      now < state.shieldUntil ||
      now - state.lastStormHitTime < STORM_HIT_COOLDOWN
    ) {
      return
    }

    const dx = state.x - storm.x
    const dy = state.y - storm.y
    const dist = Math.hypot(dx, dy)
    if (dist <= storm.radius - PLAYER_RADIUS * 0.4) return

    state.lastStormHitTime = now
    const angle = Math.atan2(storm.y - state.y, storm.x - state.x)
    state.vx = Math.cos(angle) * 6
    state.vy = Math.sin(angle) * 6
    state.x = clamp(state.x + Math.cos(angle) * 18, PLAYER_RADIUS, ARENA_WIDTH - PLAYER_RADIUS)
    state.y = clamp(state.y + Math.sin(angle) * 18, PLAYER_RADIUS, ARENA_HEIGHT - PLAYER_RADIUS)
    this.damagePlayer(playerId, state, STORM_DAMAGE, now, "storm")
  }

  damagePlayer(playerId: string, state: DemoPlayerState, damage: number, now: number, attackerId: string): DamageResult {
    if (state.respawnAt || now < state.shieldUntil || now < state.respawnInvulnerableUntil) {
      return { damaged: false, eliminated: false, amount: 0 }
    }

    const scaledDamage = this.scaleDamage(damage, now)
    state.health = Math.max(0, state.health - scaledDamage)
    const eliminated = state.health <= 0
    this.broadcast({
      type: "player_hit",
      attackerId,
      targetId: playerId,
      damage: scaledDamage,
      eliminated,
    })

    if (eliminated) {
      this.startRespawn(state, now)
    }

    return { damaged: true, eliminated, amount: scaledDamage }
  }

  startRespawn(state: DemoPlayerState, now: number) {
    state.health = 0
    state.vx = 0
    state.vy = 0
    state.isDashing = false
    state.dashEndTime = 0
    state.boostUntil = 0
    state.shieldUntil = 0
    state.freezeUntil = 0
    state.burnUntil = 0
    state.burnOwnerId = null
    state.magnetUntil = 0
    state.scoreMultiplierUntil = 0
    state.lastStormHitTime = 0
    state.respawnAt = now + RESPAWN_DELAY
    state.respawnInvulnerableUntil = 0
    state.score = Math.max(0, state.score - DEATH_SCORE_PENALTY)
  }

  finishRespawn(state: DemoPlayerState, now: number) {
    state.health = state.maxHealth
    state.x = ARENA_WIDTH / 2 + (Math.random() - 0.5) * 220
    state.y = ARENA_HEIGHT / 2 + (Math.random() - 0.5) * 220
    state.vx = 0
    state.vy = 0
    state.isDashing = false
    state.dashEndTime = 0
    state.boostUntil = 0
    state.shieldUntil = 0
    state.freezeUntil = 0
    state.burnUntil = 0
    state.burnOwnerId = null
    state.magnetUntil = 0
    state.scoreMultiplierUntil = 0
    state.lastStormHitTime = 0
    state.respawnAt = null
    state.respawnInvulnerableUntil = now + RESPAWN_INVULNERABILITY
  }

  getLivingPlayerEntries(excludePlayerId?: string): Array<{ player: Player; state: DemoPlayerState }> {
    return this.room.players
      .filter((player) => player.id !== excludePlayerId && player.connected)
      .map((player) => ({ player, state: this.playerStates.get(player.id) }))
      .filter((entry): entry is { player: Player; state: DemoPlayerState } =>
        Boolean(entry.state && !entry.state.respawnAt)
      )
  }

  getAIDangerTarget(state: DemoPlayerState, now: number): { x: number; y: number; urgency: number } | null {
    let fleeX = 0
    let fleeY = 0
    let urgency = 0

    const addDanger = (x: number, y: number, range: number, weight: number) => {
      const dx = state.x - x
      const dy = state.y - y
      const distance = Math.max(1, Math.hypot(dx, dy))
      if (distance > range) return

      const threat = (1 - distance / range) * weight
      fleeX += (dx / distance) * threat
      fleeY += (dy / distance) * threat
      urgency = Math.max(urgency, threat)
    }

    this.getAllBosses().forEach((boss) => {
      addDanger(boss.x, boss.y, BOSS_RADIUS + 250, 1.1)
    })

    this.meleeEnemies.forEach((enemy) => {
      addDanger(enemy.x, enemy.y, enemy.radius + 220, 1.4)
    })

    this.bombs.forEach((bomb) => {
      addDanger(bomb.x, bomb.y, bomb.radius + 120, 1.6)
    })

    this.projectiles.forEach((projectile) => {
      addDanger(
        projectile.x + projectile.vx * 8,
        projectile.y + projectile.vy * 8,
        projectile.radius + 130,
        1.25
      )
    })

    this.hazards.forEach((hazard) => {
      addDanger(
        hazard.x + hazard.width / 2,
        hazard.y + hazard.height / 2,
        Math.max(hazard.width, hazard.height) + 95,
        0.8
      )
    })

    const storm = this.getStormState(now)
    if (storm) {
      const stormDx = state.x - storm.x
      const stormDy = state.y - storm.y
      const stormDistance = Math.max(1, Math.hypot(stormDx, stormDy))
      if (stormDistance > storm.radius - 120) {
        addDanger(
          storm.x + (stormDx / stormDistance) * storm.radius,
          storm.y + (stormDy / stormDistance) * storm.radius,
          210,
          1.5
        )
      }
    }

    const fleeLength = Math.hypot(fleeX, fleeY)
    if (fleeLength < 0.05) return null

    const escapeDistance = 170 + urgency * 130
    return {
      x: clamp(state.x + (fleeX / fleeLength) * escapeDistance, 70, ARENA_WIDTH - 70),
      y: clamp(state.y + (fleeY / fleeLength) * escapeDistance, 70, ARENA_HEIGHT - 70),
      urgency,
    }
  }

  getBestAIPickup(state: DemoPlayerState, personality: number): Pickup | null {
    let bestPickup: Pickup | null = null
    let bestScore = Number.NEGATIVE_INFINITY

    this.gamePickups.forEach((pickup) => {
      if (pickup.collected) return

      const distance = Math.hypot(pickup.x - state.x, pickup.y - state.y)
      let value = -distance / 18

      switch (pickup.type) {
        case "heal":
          value += state.health < state.maxHealth * 0.7 ? 85 : 8
          break
        case "maxHealth":
          value += state.maxHealth < MAX_HEALTH_CAP ? 62 : 6
          break
        case "shield":
          value += state.health < state.maxHealth * 0.55 ? 45 : 24
          break
        case "freeze":
        case "burn":
        case "bomb":
          value += personality === 0 ? 44 : 34
          break
        case "boost":
          value += personality === 1 ? 38 : 28
          break
        case "magnet":
          value += personality === 1 ? 42 : 30
          break
        case "multiplier":
          value += personality === 2 ? 54 : 40
          break
        default:
          value += 20
      }

      if (value > bestScore) {
        bestScore = value
        bestPickup = pickup
      }
    })

    return bestPickup
  }

  getAIPlayerTarget(playerId: string, state: DemoPlayerState): { player: Player; state: DemoPlayerState } | null {
    const candidates = this.getLivingPlayerEntries(playerId)
    if (candidates.length === 0) return null

    const leader = [...candidates].sort((a, b) => b.state.score - a.state.score)[0]
    const nearest = candidates.reduce((best, candidate) => {
      const bestDistance = Math.hypot(best.state.x - state.x, best.state.y - state.y)
      const candidateDistance = Math.hypot(candidate.state.x - state.x, candidate.state.y - state.y)
      return candidateDistance < bestDistance ? candidate : best
    }, candidates[0])
    const human = candidates.find((candidate) => !this.isBot(candidate.player.id))

    const roll = Math.random()
    if (leader && roll < 0.36) return leader
    if (nearest && roll < 0.7) return nearest
    if (human && roll < 0.84) return human

    return candidates[Math.floor(Math.random() * candidates.length)]
  }

  chooseAITarget(playerId: string, index: number, state: DemoPlayerState, now: number): AITarget {
    const personality = index % 4
    const pickup = this.getBestAIPickup(state, personality)
    const lowHealth = state.health < state.maxHealth * 0.62

    let mode: AIBehaviorMode = "wander"
    const roll = Math.random()

    if (pickup && (lowHealth || roll < [0.26, 0.58, 0.34, 0.42][personality])) {
      mode = "collect"
    } else if (roll < [0.46, 0.18, 0.28, 0.22][personality]) {
      mode = "harass"
    } else if (roll < [0.64, 0.36, 0.62, 0.48][personality]) {
      mode = "ambush"
    }

    if (mode === "collect" && pickup) {
      return {
        x: pickup.x,
        y: pickup.y,
        changeAt: now + 2400 + Math.random() * 1600,
        mode,
        pickupId: pickup.id,
      }
    }

    if (mode === "harass" || mode === "ambush") {
      const target = this.getAIPlayerTarget(playerId, state)
      if (target) {
        const offsetAngle = (index + 1) * 1.73 + Math.random() * 0.6
        const offsetDistance = mode === "ambush" ? 145 : 78
        return {
          x: clamp(target.state.x + Math.cos(offsetAngle) * offsetDistance, 70, ARENA_WIDTH - 70),
          y: clamp(target.state.y + Math.sin(offsetAngle) * offsetDistance, 70, ARENA_HEIGHT - 70),
          changeAt: now + (mode === "ambush" ? 3000 : 2300) + Math.random() * 1600,
          mode,
          targetId: target.player.id,
        }
      }
    }

    return {
      x: Math.random() * (ARENA_WIDTH - 220) + 110,
      y: Math.random() * (ARENA_HEIGHT - 220) + 110,
      changeAt: now + 3400 + Math.random() * 2800,
      mode: "wander",
    }
  }

  resolveAITarget(target: AITarget, index: number, now: number): { x: number; y: number } {
    if (target.pickupId) {
      const pickup = this.gamePickups.find((candidate) => candidate.id === target.pickupId && !candidate.collected)
      if (pickup) return { x: pickup.x, y: pickup.y }
    }

    if (target.targetId) {
      const targetState = this.playerStates.get(target.targetId)
      if (targetState && !targetState.respawnAt) {
        const orbitAngle = (index + 1) * 1.9 + now / 2200
        const orbitDistance = target.mode === "ambush" ? 145 : 90
        const leadX = targetState.x + targetState.vx * 8
        const leadY = targetState.y + targetState.vy * 8

        return {
          x: clamp(leadX + Math.cos(orbitAngle) * orbitDistance, 70, ARENA_WIDTH - 70),
          y: clamp(leadY + Math.sin(orbitAngle) * orbitDistance, 70, ARENA_HEIGHT - 70),
        }
      }
    }

    return { x: target.x, y: target.y }
  }

  hasAIAttackTargetNearby(playerId: string, state: DemoPlayerState): boolean {
    const closePlayer = this.getLivingPlayerEntries(playerId).some(({ state: otherState }) =>
      Math.hypot(otherState.x - state.x, otherState.y - state.y) < SHOCKWAVE_RADIUS * 0.9
    )
    const closeBoss = this.getAllBosses().some((boss) =>
      Math.hypot(boss.x - state.x, boss.y - state.y) < SHOCKWAVE_RADIUS + BOSS_RADIUS
    )
    const closeHunter = this.meleeEnemies.some((enemy) =>
      Math.hypot(enemy.x - state.x, enemy.y - state.y) < SHOCKWAVE_RADIUS + enemy.radius
    )

    return closePlayer || closeBoss || closeHunter
  }

  getAIInput(playerId: string, index: number, now: number): InputState {
    const state = this.playerStates.get(playerId)
    if (!state) return getEmptyInput()

    const dangerTarget = this.getAIDangerTarget(state, now)
    let aiTarget = this.aiTargets.get(playerId)
    const targetReached = aiTarget ? Math.hypot(aiTarget.x - state.x, aiTarget.y - state.y) < 46 : false
    const pickupUnavailable = Boolean(
      aiTarget?.pickupId && !this.gamePickups.some((pickup) => pickup.id === aiTarget?.pickupId && !pickup.collected)
    )

    if (!aiTarget || now > aiTarget.changeAt || targetReached || pickupUnavailable) {
      aiTarget = this.chooseAITarget(playerId, index, state, now)
      this.aiTargets.set(playerId, aiTarget)
    }

    const resolvedTarget = dangerTarget ?? this.resolveAITarget(aiTarget, index, now)
    let targetX = clamp(resolvedTarget.x, 50, ARENA_WIDTH - 50)
    let targetY = clamp(resolvedTarget.y, 50, ARENA_HEIGHT - 50)
    let shouldDash = false
    let shouldAbility = false

    const distanceToTarget = Math.hypot(targetX - state.x, targetY - state.y)
    if (dangerTarget && dangerTarget.urgency > 0.62 && now - state.lastDashTime > DASH_COOLDOWN) {
      shouldDash = true
    } else if (
      aiTarget.mode === "collect" &&
      distanceToTarget > 95 &&
      distanceToTarget < 300 &&
      Math.random() < 0.012 &&
      now - state.lastDashTime > DASH_COOLDOWN
    ) {
      shouldDash = true
    } else if (
      (aiTarget.mode === "harass" || aiTarget.mode === "ambush") &&
      distanceToTarget > 160 &&
      distanceToTarget < 340 &&
      Math.random() < 0.008 &&
      now - state.lastDashTime > DASH_COOLDOWN
    ) {
      shouldDash = true
    }

    if (now - state.lastAbilityTime > ABILITY_COOLDOWN && this.hasAIAttackTargetNearby(playerId, state)) {
      shouldAbility = Math.random() < (aiTarget.mode === "harass" ? 0.018 : 0.01)
    }

    const dx = targetX - state.x
    const dy = targetY - state.y
    const deadzone = aiTarget.mode === "collect" ? 24 : 34

    return {
      up: dy < -deadzone,
      down: dy > deadzone,
      left: dx < -deadzone,
      right: dx > deadzone,
      dash: shouldDash,
      ability: shouldAbility,
    }
  }

  endMatch() {
    if (!this.gameState) return

    this.stopGameLoop()
    this.room.state = "ended"
    const finalScores = this.buildGameState(Date.now(), 0, this.getStormState(Date.now()))
      .players
      .map((player) => ({
        playerId: player.id,
        nickname: player.nickname,
        score: Math.round(player.score),
        color: player.color,
      }))
      .sort((a, b) => b.score - a.score)

    this.broadcast({ type: "match_end", finalScores })
    this.broadcast({ type: "room_state", room: this.room })

    setTimeout(() => {
      if (this.room.state === "ended") {
        this.resetToLobby()
      }
    }, 8000)
  }

  resetToLobby() {
    this.stopGameLoop()
    this.room.state = "lobby"
    this.room.matchStartTime = undefined
    this.room.matchEndTime = undefined
    this.resetRuntimeState()

    this.room.players.forEach((player, index) => {
      player.isReady = false
      player.isHost = index === 0
      player.score = 0
      player.health = 100
      player.maxHealth = 100
      player.vx = 0
      player.vy = 0
      player.isInvulnerable = false
      player.isRespawning = false
      player.respawnAt = undefined
      player.dashCooldown = 0
      player.abilityCooldown = 0
    })
    this.room.hostId = this.room.players[0]?.id ?? ""

    this.broadcast({ type: "room_state", room: this.room })
  }

  resetRuntimeState() {
    this.gameState = null
    this.playerStates.clear()
    this.playerInputs.clear()
    this.gamePickups = []
    this.hazards = []
    this.projectiles = []
    this.boss = null
    this.extraBosses = []
    this.meleeEnemies = []
    this.bombs = []
    this.aiTargets.clear()
    this.gameStartTime = null
    this.lastBossFireTime = 0
    this.extraBossFireTimes.clear()
    this.lastArenaEventTime = 0
    this.arenaEvent = null
    this.bonusPickupCounter = 0
  }

  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval)
      this.gameLoopInterval = null
    }
  }

  sendToConnection(conn: Party.Connection, message: ServerMessage) {
    conn.send(JSON.stringify(message))
  }

  broadcast(message: ServerMessage) {
    this.party.broadcast(JSON.stringify(message))
  }
}
