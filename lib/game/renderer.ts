import type { Player, Pickup, Hazard, Projectile, BossState, MeleeEnemy, BombState, StormState, GameState, MapTheme, ControlZoneState } from "@/types/game"
import { PLAYER_COLORS } from "@/types/game"
import { ARENA, PLAYER, PICKUP, MAP_THEMES, VISUAL } from "./constants"

interface RenderContext {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  scale: number
  offsetX: number
  offsetY: number
  time: number
  theme: MapTheme
}

// Trail history for each player
const playerTrails: Map<string, { x: number; y: number; opacity: number }[]> = new Map()

export function initRenderer(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  // Enable anti-aliasing
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = "high"

  return ctx
}

export function resizeCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()

  canvas.width = rect.width * dpr
  canvas.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  canvas.style.width = `${rect.width}px`
  canvas.style.height = `${rect.height}px`

  return { width: rect.width, height: rect.height }
}

export function render(
  ctx: CanvasRenderingContext2D,
  gameState: GameState,
  currentPlayerId: string | null,
  canvasWidth: number,
  canvasHeight: number,
  theme: MapTheme = "cyber"
) {
  const time = Date.now()

  // Calculate scale to fit arena in canvas
  const scaleX = canvasWidth / ARENA.WIDTH
  const scaleY = canvasHeight / ARENA.HEIGHT
  const scale = Math.min(scaleX, scaleY) * 0.95

  // Center the arena
  const offsetX = (canvasWidth - ARENA.WIDTH * scale) / 2
  const offsetY = (canvasHeight - ARENA.HEIGHT * scale) / 2

  const renderCtx: RenderContext = {
    ctx,
    width: canvasWidth,
    height: canvasHeight,
    scale,
    offsetX,
    offsetY,
    time,
    theme,
  }

  // Clear canvas
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // Draw layers in order
  drawBackground(renderCtx)
  drawGrid(renderCtx)
  drawStorm(renderCtx, gameState.storm ?? null)
  drawControlZone(renderCtx, gameState.controlZone ?? null)
  drawHazards(renderCtx, gameState.hazards)
  drawBombs(renderCtx, gameState.bombs ?? [])
  drawPickups(renderCtx, gameState.pickups)
  drawProjectiles(renderCtx, gameState.projectiles ?? [])
  drawTrails(renderCtx, gameState.players)
  drawBosses(renderCtx, gameState.bosses ?? (gameState.boss ? [gameState.boss] : []))
  drawMeleeEnemies(renderCtx, gameState.meleeEnemies ?? [])
  drawPlayers(renderCtx, gameState.players, currentPlayerId, gameState.bountyPlayerId ?? null)
  drawEffects(renderCtx, gameState.players)
}

function drawBackground(ctx: RenderContext) {
  const themeConfig = MAP_THEMES[ctx.theme]

  // Background gradient
  const gradient = ctx.ctx.createRadialGradient(
    ctx.width / 2,
    ctx.height / 2,
    0,
    ctx.width / 2,
    ctx.height / 2,
    Math.max(ctx.width, ctx.height)
  )
  gradient.addColorStop(0, themeConfig.gridColor)
  gradient.addColorStop(1, themeConfig.background)

  ctx.ctx.fillStyle = gradient
  ctx.ctx.fillRect(0, 0, ctx.width, ctx.height)

  // Arena boundary
  ctx.ctx.strokeStyle = themeConfig.gridGlow
  ctx.ctx.lineWidth = 2
  ctx.ctx.shadowColor = themeConfig.gridGlow
  ctx.ctx.shadowBlur = 10
  ctx.ctx.strokeRect(
    ctx.offsetX,
    ctx.offsetY,
    ARENA.WIDTH * ctx.scale,
    ARENA.HEIGHT * ctx.scale
  )
  ctx.ctx.shadowBlur = 0
}

function drawGrid(ctx: RenderContext) {
  const themeConfig = MAP_THEMES[ctx.theme]
  const gridSize = 60 * ctx.scale
  const pulse = Math.sin(ctx.time * 0.001) * 0.2 + 0.8

  ctx.ctx.strokeStyle = `${themeConfig.gridColor}`
  ctx.ctx.lineWidth = 1

  // Vertical lines
  for (let x = ctx.offsetX; x <= ctx.offsetX + ARENA.WIDTH * ctx.scale; x += gridSize) {
    ctx.ctx.beginPath()
    ctx.ctx.moveTo(x, ctx.offsetY)
    ctx.ctx.lineTo(x, ctx.offsetY + ARENA.HEIGHT * ctx.scale)
    ctx.ctx.globalAlpha = 0.3 * pulse
    ctx.ctx.stroke()
  }

  // Horizontal lines
  for (let y = ctx.offsetY; y <= ctx.offsetY + ARENA.HEIGHT * ctx.scale; y += gridSize) {
    ctx.ctx.beginPath()
    ctx.ctx.moveTo(ctx.offsetX, y)
    ctx.ctx.lineTo(ctx.offsetX + ARENA.WIDTH * ctx.scale, y)
    ctx.ctx.globalAlpha = 0.3 * pulse
    ctx.ctx.stroke()
  }

  ctx.ctx.globalAlpha = 1
}

function drawStorm(ctx: RenderContext, storm: StormState | null) {
  if (!storm?.active) return

  const x = ctx.offsetX + storm.x * ctx.scale
  const y = ctx.offsetY + storm.y * ctx.scale
  const radius = storm.radius * ctx.scale
  const arenaX = ctx.offsetX
  const arenaY = ctx.offsetY
  const arenaW = ARENA.WIDTH * ctx.scale
  const arenaH = ARENA.HEIGHT * ctx.scale
  const pulse = Math.sin(ctx.time * 0.004) * 0.18 + 0.82

  ctx.ctx.save()
  ctx.ctx.beginPath()
  ctx.ctx.rect(arenaX, arenaY, arenaW, arenaH)
  ctx.ctx.arc(x, y, radius, 0, Math.PI * 2, true)
  ctx.ctx.fillStyle = `rgba(255, 42, 110, ${0.12 * pulse})`
  ctx.ctx.fill("evenodd")

  ctx.ctx.beginPath()
  ctx.ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.ctx.strokeStyle = `rgba(255, 70, 130, ${0.75 * pulse})`
  ctx.ctx.lineWidth = 3
  ctx.ctx.shadowColor = "#ff3c78"
  ctx.ctx.shadowBlur = 18
  ctx.ctx.stroke()

  ctx.ctx.beginPath()
  ctx.ctx.arc(x, y, Math.max(0, radius - 8 * ctx.scale), 0, Math.PI * 2)
  ctx.ctx.strokeStyle = `rgba(255, 255, 255, ${0.22 * pulse})`
  ctx.ctx.lineWidth = 1
  ctx.ctx.stroke()
  ctx.ctx.restore()
  ctx.ctx.shadowBlur = 0
}

function drawControlZone(ctx: RenderContext, controlZone: ControlZoneState | null) {
  if (!controlZone?.active) return

  const themeConfig = MAP_THEMES[ctx.theme]
  const x = ctx.offsetX + controlZone.x * ctx.scale
  const y = ctx.offsetY + controlZone.y * ctx.scale
  const radius = controlZone.radius * ctx.scale
  const pulse = Math.sin(ctx.time * 0.005) * 0.18 + 0.82
  const holderAlpha = controlZone.holders.length > 0 ? 0.2 : 0.09

  ctx.ctx.save()
  ctx.ctx.beginPath()
  ctx.ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.ctx.fillStyle = controlZone.contested
    ? `rgba(255, 122, 47, ${holderAlpha * pulse})`
    : `${themeConfig.gridGlow}${controlZone.holders.length > 0 ? "33" : "18"}`
  ctx.ctx.fill()

  ctx.ctx.beginPath()
  ctx.ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.ctx.strokeStyle = controlZone.contested ? "rgba(255, 122, 47, 0.9)" : themeConfig.gridGlow
  ctx.ctx.lineWidth = 3
  ctx.ctx.shadowColor = controlZone.contested ? "#ff7a2f" : themeConfig.gridGlow
  ctx.ctx.shadowBlur = 22
  ctx.ctx.stroke()

  ctx.ctx.beginPath()
  ctx.ctx.arc(x, y, radius * 0.68, 0, Math.PI * 2)
  ctx.ctx.strokeStyle = "rgba(255, 255, 255, 0.24)"
  ctx.ctx.lineWidth = 1
  ctx.ctx.setLineDash([8 * ctx.scale, 8 * ctx.scale])
  ctx.ctx.stroke()
  ctx.ctx.restore()
  ctx.ctx.setLineDash([])
  ctx.ctx.shadowBlur = 0
}

function drawHazards(ctx: RenderContext, hazards: Hazard[]) {
  hazards.forEach((hazard) => {
    const x = ctx.offsetX + hazard.x * ctx.scale
    const y = ctx.offsetY + hazard.y * ctx.scale
    const w = hazard.width * ctx.scale
    const h = hazard.height * ctx.scale

    // Warning pattern
    const pulse = Math.sin(ctx.time * 0.003) * 0.3 + 0.7

    ctx.ctx.fillStyle = `rgba(255, 60, 60, ${0.2 * pulse})`
    ctx.ctx.fillRect(x, y, w, h)

    // Border
    ctx.ctx.strokeStyle = `rgba(255, 60, 60, ${0.8 * pulse})`
    ctx.ctx.lineWidth = 2
    ctx.ctx.shadowColor = "#ff3c3c"
    ctx.ctx.shadowBlur = 10
    ctx.ctx.strokeRect(x, y, w, h)
    ctx.ctx.shadowBlur = 0

    // Diagonal stripes pattern
    ctx.ctx.save()
    ctx.ctx.beginPath()
    ctx.ctx.rect(x, y, w, h)
    ctx.ctx.clip()

    ctx.ctx.strokeStyle = `rgba(255, 60, 60, ${0.4 * pulse})`
    ctx.ctx.lineWidth = 2
    const stripeSpacing = 15 * ctx.scale
    for (let i = -h; i < w + h; i += stripeSpacing) {
      ctx.ctx.beginPath()
      ctx.ctx.moveTo(x + i, y)
      ctx.ctx.lineTo(x + i + h, y + h)
      ctx.ctx.stroke()
    }
    ctx.ctx.restore()
  })
}

function drawPickups(ctx: RenderContext, pickups: Pickup[]) {
  pickups.forEach((pickup) => {
    if (pickup.collected) return

    const x = ctx.offsetX + pickup.x * ctx.scale
    const y = ctx.offsetY + pickup.y * ctx.scale
    const size = PICKUP.SIZE * ctx.scale

    const pulse = Math.sin(ctx.time * 0.004 + pickup.x * 0.01) * 0.3 + 1
    const rotation = ctx.time * 0.002

    ctx.ctx.save()
    ctx.ctx.translate(x, y)
    ctx.ctx.rotate(rotation)

    // Glow
    const color =
      pickup.type === "energy" ? "#00ffff" :
      pickup.type === "shield" ? "#00ff88" :
      pickup.type === "freeze" ? "#7dd3ff" :
      pickup.type === "burn" ? "#ff5a2f" :
      pickup.type === "heal" ? "#5cff8d" :
      pickup.type === "maxHealth" ? "#ffcf5a" :
      pickup.type === "bomb" ? "#ffffff" :
      pickup.type === "magnet" ? "#b56cff" :
      pickup.type === "multiplier" ? "#ffd166" :
      "#ffff00"
    ctx.ctx.shadowColor = color
    ctx.ctx.shadowBlur = 20 * pulse

    // Inner fill
    ctx.ctx.beginPath()
    if (pickup.type === "energy") {
      // Diamond shape for energy
      ctx.ctx.moveTo(0, -size * pulse)
      ctx.ctx.lineTo(size * pulse, 0)
      ctx.ctx.lineTo(0, size * pulse)
      ctx.ctx.lineTo(-size * pulse, 0)
      ctx.ctx.closePath()
    } else if (pickup.type === "shield") {
      // Shield shape
      ctx.ctx.moveTo(0, -size * pulse)
      ctx.ctx.quadraticCurveTo(size * pulse, -size * 0.4 * pulse, size * 0.7 * pulse, size * 0.45 * pulse)
      ctx.ctx.quadraticCurveTo(0, size * pulse, -size * 0.7 * pulse, size * 0.45 * pulse)
      ctx.ctx.quadraticCurveTo(-size * pulse, -size * 0.4 * pulse, 0, -size * pulse)
      ctx.ctx.closePath()
    } else if (pickup.type === "boost") {
      // Star shape for boost
      const spikes = 5
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? size * pulse : size * pulse * 0.5
        const angle = (Math.PI / spikes) * i - Math.PI / 2
        const px = Math.cos(angle) * radius
        const py = Math.sin(angle) * radius
        if (i === 0) ctx.ctx.moveTo(px, py)
        else ctx.ctx.lineTo(px, py)
      }
      ctx.ctx.closePath()
    } else if (pickup.type === "freeze") {
      // Snowflake-like cross
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6
        const px = Math.cos(angle) * size * pulse
        const py = Math.sin(angle) * size * pulse
        ctx.ctx.moveTo(0, 0)
        ctx.ctx.lineTo(px, py)
      }
    } else if (pickup.type === "burn") {
      // Flame shard
      ctx.ctx.moveTo(0, -size * pulse)
      ctx.ctx.bezierCurveTo(size * pulse, -size * 0.25 * pulse, size * 0.45 * pulse, size * pulse, 0, size * pulse)
      ctx.ctx.bezierCurveTo(-size * pulse, size * 0.35 * pulse, -size * 0.35 * pulse, -size * 0.2 * pulse, 0, -size * pulse)
      ctx.ctx.closePath()
    } else if (pickup.type === "heal") {
      // Medical cross
      const arm = size * 0.38 * pulse
      const length = size * pulse
      ctx.ctx.rect(-arm, -length, arm * 2, length * 2)
      ctx.ctx.rect(-length, -arm, length * 2, arm * 2)
    } else if (pickup.type === "maxHealth") {
      // Fortified health hex
      const sides = 6
      for (let i = 0; i < sides; i++) {
        const angle = (Math.PI * 2 * i) / sides - Math.PI / 2
        const px = Math.cos(angle) * size * pulse
        const py = Math.sin(angle) * size * pulse
        if (i === 0) ctx.ctx.moveTo(px, py)
        else ctx.ctx.lineTo(px, py)
      }
      ctx.ctx.closePath()
    } else if (pickup.type === "magnet") {
      // Twin arcs for magnet pull
      ctx.ctx.arc(-size * 0.32 * pulse, 0, size * 0.62 * pulse, Math.PI * 0.35, Math.PI * 1.65)
      ctx.ctx.moveTo(size * 0.32 * pulse + Math.cos(Math.PI * 1.35) * size * 0.62 * pulse, Math.sin(Math.PI * 1.35) * size * 0.62 * pulse)
      ctx.ctx.arc(size * 0.32 * pulse, 0, size * 0.62 * pulse, Math.PI * 1.35, Math.PI * 0.65, true)
    } else if (pickup.type === "multiplier") {
      // Score multiplier X
      ctx.ctx.moveTo(-size * pulse, -size * 0.55 * pulse)
      ctx.ctx.lineTo(size * pulse, size * 0.55 * pulse)
      ctx.ctx.moveTo(size * pulse, -size * 0.55 * pulse)
      ctx.ctx.lineTo(-size * pulse, size * 0.55 * pulse)
    } else {
      // Bomb orb
      ctx.ctx.arc(0, 0, size * 0.85 * pulse, 0, Math.PI * 2)
    }

    if (pickup.type === "freeze" || pickup.type === "magnet" || pickup.type === "multiplier") {
      ctx.ctx.strokeStyle = color
      ctx.ctx.lineWidth = 4 * ctx.scale
      ctx.ctx.lineCap = "round"
      ctx.ctx.stroke()
    } else {
      ctx.ctx.fillStyle = color
      ctx.ctx.fill()
    }

    ctx.ctx.restore()
    ctx.ctx.shadowBlur = 0
  })
}

function drawProjectiles(ctx: RenderContext, projectiles: Projectile[]) {
  projectiles.forEach((projectile) => {
    const x = ctx.offsetX + projectile.x * ctx.scale
    const y = ctx.offsetY + projectile.y * ctx.scale
    const radius = projectile.radius * ctx.scale
    const pulse = Math.sin(ctx.time * 0.01 + projectile.x) * 0.2 + 0.8
    const color = projectile.type === "bomb" ? "#ffffff" : "#ff3c78"

    ctx.ctx.beginPath()
    ctx.ctx.arc(x, y, radius, 0, Math.PI * 2)
    ctx.ctx.fillStyle = projectile.type === "bomb" ? `rgba(255, 255, 255, ${0.45 * pulse})` : `rgba(255, 80, 120, ${0.75 * pulse})`
    ctx.ctx.shadowColor = color
    ctx.ctx.shadowBlur = 18
    ctx.ctx.fill()

    ctx.ctx.beginPath()
    ctx.ctx.arc(x, y, radius * 0.45, 0, Math.PI * 2)
    ctx.ctx.fillStyle = "#ffffff"
    ctx.ctx.fill()
    ctx.ctx.shadowBlur = 0
  })
}

function drawBombs(ctx: RenderContext, bombs: BombState[]) {
  bombs.forEach((bomb) => {
    const x = ctx.offsetX + bomb.x * ctx.scale
    const y = ctx.offsetY + bomb.y * ctx.scale
    const radius = 24 * ctx.scale
    const fuseRemaining = Math.max(0, bomb.explodeAt - ctx.time)
    const pulse = 1 + (1 - fuseRemaining / 1500) * 0.35

    ctx.ctx.beginPath()
    ctx.ctx.arc(x, y, bomb.radius * ctx.scale, 0, Math.PI * 2)
    ctx.ctx.fillStyle = "rgba(255, 255, 255, 0.06)"
    ctx.ctx.fill()
    ctx.ctx.strokeStyle = "rgba(255, 255, 255, 0.22)"
    ctx.ctx.lineWidth = 2
    ctx.ctx.stroke()

    ctx.ctx.save()
    ctx.ctx.translate(x, y)
    ctx.ctx.scale(pulse, pulse)
    ctx.ctx.beginPath()
    ctx.ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.ctx.fillStyle = "#111111"
    ctx.ctx.shadowColor = "#ffffff"
    ctx.ctx.shadowBlur = 18
    ctx.ctx.fill()
    ctx.ctx.strokeStyle = "#ffffff"
    ctx.ctx.lineWidth = 3
    ctx.ctx.stroke()
    ctx.ctx.restore()
    ctx.ctx.shadowBlur = 0
  })
}

function drawBosses(ctx: RenderContext, bosses: BossState[]) {
  bosses.forEach((boss) => drawBoss(ctx, boss))
}

function drawBoss(ctx: RenderContext, boss: BossState | null) {
  if (!boss) return

  const x = ctx.offsetX + boss.x * ctx.scale
  const y = ctx.offsetY + boss.y * ctx.scale
  const size = 48 * ctx.scale
  const angle = Math.atan2(boss.vy, boss.vx)
  const pulse = Math.sin(ctx.time * 0.004) * 0.12 + 1

  ctx.ctx.save()
  ctx.ctx.translate(x, y)
  ctx.ctx.rotate(Number.isFinite(angle) ? angle : 0)
  ctx.ctx.scale(pulse, pulse)

  ctx.ctx.shadowColor = "#ff3c78"
  ctx.ctx.shadowBlur = 28
  ctx.ctx.fillStyle = "#21000d"
  ctx.ctx.strokeStyle = "#ff3c78"
  ctx.ctx.lineWidth = 3

  ctx.ctx.beginPath()
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8
    const r = i % 2 === 0 ? size : size * 0.72
    const px = Math.cos(a) * r
    const py = Math.sin(a) * r
    if (i === 0) ctx.ctx.moveTo(px, py)
    else ctx.ctx.lineTo(px, py)
  }
  ctx.ctx.closePath()
  ctx.ctx.fill()
  ctx.ctx.stroke()

  ctx.ctx.beginPath()
  ctx.ctx.moveTo(size * 0.8, 0)
  ctx.ctx.lineTo(size * 0.2, -size * 0.25)
  ctx.ctx.lineTo(size * 0.2, size * 0.25)
  ctx.ctx.closePath()
  ctx.ctx.fillStyle = "#ffffff"
  ctx.ctx.fill()
  ctx.ctx.restore()
  ctx.ctx.shadowBlur = 0

  const barWidth = size * 2.2
  const barHeight = 6
  const healthPercent = Math.max(0, boss.health / boss.maxHealth)
  ctx.ctx.fillStyle = "rgba(0, 0, 0, 0.6)"
  ctx.ctx.fillRect(x - barWidth / 2, y - size - 18, barWidth, barHeight)
  ctx.ctx.fillStyle = "#ff3c78"
  ctx.ctx.fillRect(x - barWidth / 2, y - size - 18, barWidth * healthPercent, barHeight)

  ctx.ctx.font = `bold ${12 * Math.min(ctx.scale, 1.2)}px sans-serif`
  ctx.ctx.textAlign = "center"
  ctx.ctx.textBaseline = "top"
  ctx.ctx.fillStyle = "#ff9ab7"
  ctx.ctx.shadowColor = "#000000"
  ctx.ctx.shadowBlur = 4
  ctx.ctx.fillText(boss.nickname, x, y + size + 10)
  ctx.ctx.shadowBlur = 0
}

function drawMeleeEnemies(ctx: RenderContext, enemies: MeleeEnemy[]) {
  enemies.forEach((enemy) => {
    const x = ctx.offsetX + enemy.x * ctx.scale
    const y = ctx.offsetY + enemy.y * ctx.scale
    const size = enemy.radius * ctx.scale
    const angle = Math.atan2(enemy.vy, enemy.vx)
    const frozen = ctx.time < (enemy.freezeUntil ?? 0)

    ctx.ctx.save()
    ctx.ctx.translate(x, y)
    ctx.ctx.rotate(Number.isFinite(angle) ? angle : 0)
    ctx.ctx.shadowColor = frozen ? "#7dd3ff" : "#ff7a1a"
    ctx.ctx.shadowBlur = 18
    ctx.ctx.fillStyle = frozen ? "#062338" : "#2a0b00"
    ctx.ctx.strokeStyle = frozen ? "#7dd3ff" : "#ff7a1a"
    ctx.ctx.lineWidth = 3

    ctx.ctx.beginPath()
    ctx.ctx.moveTo(size, 0)
    ctx.ctx.lineTo(-size * 0.65, -size * 0.72)
    ctx.ctx.lineTo(-size * 0.35, 0)
    ctx.ctx.lineTo(-size * 0.65, size * 0.72)
    ctx.ctx.closePath()
    ctx.ctx.fill()
    ctx.ctx.stroke()
    ctx.ctx.restore()
    ctx.ctx.shadowBlur = 0

    const healthPercent = Math.max(0, enemy.health / enemy.maxHealth)
    ctx.ctx.fillStyle = "rgba(0, 0, 0, 0.55)"
    ctx.ctx.fillRect(x - size, y - size - 12, size * 2, 5)
    ctx.ctx.fillStyle = frozen ? "#7dd3ff" : "#ff7a1a"
    ctx.ctx.fillRect(x - size, y - size - 12, size * 2 * healthPercent, 5)
  })
}

function drawTrails(ctx: RenderContext, players: Player[]) {
  players.forEach((player) => {
    let trail = playerTrails.get(player.id)
    if (!trail) {
      trail = []
      playerTrails.set(player.id, trail)
    }

    // Add current position to trail
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    if (speed > 0.5) {
      trail.unshift({ x: player.x, y: player.y, opacity: 1 })
    }

    // Limit trail length and decay opacity
    while (trail.length > VISUAL.TRAIL_LENGTH) {
      trail.pop()
    }

    // Draw trail
    const color = PLAYER_COLORS[player.color]
    trail.forEach((point, i) => {
      point.opacity *= 0.9

      if (point.opacity < 0.05) return

      const x = ctx.offsetX + point.x * ctx.scale
      const y = ctx.offsetY + point.y * ctx.scale
      const size = (PLAYER.SIZE * ctx.scale * (1 - i / trail!.length)) * 0.5

      ctx.ctx.beginPath()
      ctx.ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.ctx.fillStyle = `${color}${Math.floor(point.opacity * 40).toString(16).padStart(2, "0")}`
      ctx.ctx.fill()
    })
  })
}

function drawPlayers(ctx: RenderContext, players: Player[], currentPlayerId: string | null, bountyPlayerId: string | null) {
  // Sort so current player is drawn last (on top)
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.id === currentPlayerId) return 1
    if (b.id === currentPlayerId) return -1
    return 0
  })

  sortedPlayers.forEach((player) => {
    const x = ctx.offsetX + player.x * ctx.scale
    const y = ctx.offsetY + player.y * ctx.scale
    const size = PLAYER.SIZE * ctx.scale
    const color = PLAYER_COLORS[player.color]
    const isCurrentPlayer = player.id === currentPlayerId
    const isBounty = player.id === bountyPlayerId

    // Direction indicator
    const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy)
    const angle = speed > 0.1 ? Math.atan2(player.vy, player.vx) : 0

    ctx.ctx.save()
    ctx.ctx.translate(x, y)
    ctx.ctx.rotate(angle)

    // Respawn and invulnerability effects
    if (player.isRespawning) {
      ctx.ctx.globalAlpha = 0.25
    } else if (player.isInvulnerable) {
      const flash = Math.sin(ctx.time * 0.02) > 0
      ctx.ctx.globalAlpha = flash ? 1 : 0.5
    }

    // Outer glow
    ctx.ctx.shadowColor = color
    ctx.ctx.shadowBlur = isCurrentPlayer ? 25 : 15

    if (isBounty && !player.isRespawning) {
      const bountyPulse = Math.sin(ctx.time * 0.008) * 0.18 + 0.82
      ctx.ctx.save()
      ctx.ctx.rotate(-angle)
      ctx.ctx.beginPath()
      ctx.ctx.arc(0, 0, size * 1.75, 0, Math.PI * 2)
      ctx.ctx.strokeStyle = `rgba(255, 207, 90, ${0.85 * bountyPulse})`
      ctx.ctx.lineWidth = 3
      ctx.ctx.shadowColor = "#ffcf5a"
      ctx.ctx.shadowBlur = 20
      ctx.ctx.stroke()
      ctx.ctx.restore()
    }

    // Main body (hexagon-ish shape)
    ctx.ctx.beginPath()
    const sides = 6
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2
      const px = Math.cos(a) * size
      const py = Math.sin(a) * size
      if (i === 0) ctx.ctx.moveTo(px, py)
      else ctx.ctx.lineTo(px, py)
    }
    ctx.ctx.closePath()

    // Fill with gradient
    const gradient = ctx.ctx.createRadialGradient(0, 0, 0, 0, 0, size)
    gradient.addColorStop(0, color)
    gradient.addColorStop(0.7, color)
    gradient.addColorStop(1, `${color}80`)
    ctx.ctx.fillStyle = gradient
    ctx.ctx.fill()

    // Border
    ctx.ctx.strokeStyle = "#ffffff"
    ctx.ctx.lineWidth = 2
    ctx.ctx.stroke()

    // Direction triangle
    if (speed > 0.3) {
      ctx.ctx.beginPath()
      ctx.ctx.moveTo(size * 1.2, 0)
      ctx.ctx.lineTo(size * 0.7, -size * 0.3)
      ctx.ctx.lineTo(size * 0.7, size * 0.3)
      ctx.ctx.closePath()
      ctx.ctx.fillStyle = "#ffffff"
      ctx.ctx.fill()
    }

    ctx.ctx.restore()
    ctx.ctx.shadowBlur = 0
    ctx.ctx.globalAlpha = 1

    // Health bar (only for damaged players)
    const maxHealth = player.maxHealth ?? PLAYER.MAX_HEALTH
    if (player.health < maxHealth) {
      const barWidth = size * 2
      const barHeight = 6
      const barX = x - barWidth / 2
      const barY = y - size - 15

      // Background
      ctx.ctx.fillStyle = "rgba(0, 0, 0, 0.5)"
      ctx.ctx.fillRect(barX, barY, barWidth, barHeight)

      // Health fill
      const healthPercent = player.health / maxHealth
      const healthColor = healthPercent > 0.5 ? "#00ff00" : healthPercent > 0.25 ? "#ffff00" : "#ff0000"
      ctx.ctx.fillStyle = healthColor
      ctx.ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight)

      // Border
      ctx.ctx.strokeStyle = "#ffffff"
      ctx.ctx.lineWidth = 1
      ctx.ctx.strokeRect(barX, barY, barWidth, barHeight)
    }

    // Nickname
    ctx.ctx.font = `bold ${12 * Math.min(ctx.scale, 1.2)}px sans-serif`
    ctx.ctx.textAlign = "center"
    ctx.ctx.textBaseline = "top"
    ctx.ctx.fillStyle = "#ffffff"
    ctx.ctx.shadowColor = "#000000"
    ctx.ctx.shadowBlur = 4
    ctx.ctx.fillText(player.nickname, x, y + size + 8)
    ctx.ctx.shadowBlur = 0
  })
}

function drawEffects(ctx: RenderContext, players: Player[]) {
  // Draw shockwave effects for players who recently used ability
  players.forEach((player) => {
    const timeSinceAbility = ctx.time - player.lastAbilityTime
    if (timeSinceAbility >= 0 && timeSinceAbility < 500) {
      const x = ctx.offsetX + player.x * ctx.scale
      const y = ctx.offsetY + player.y * ctx.scale
      const progress = timeSinceAbility / 500
      const radius = progress * PLAYER.ABILITY_RANGE * ctx.scale
      const opacity = 1 - progress

      ctx.ctx.beginPath()
      ctx.ctx.arc(x, y, radius, 0, Math.PI * 2)
      ctx.ctx.strokeStyle = `${PLAYER_COLORS[player.color]}${Math.floor(opacity * 255).toString(16).padStart(2, "0")}`
      ctx.ctx.lineWidth = 3
      ctx.ctx.stroke()
    }

    // Dash effect
    const timeSinceDash = ctx.time - player.lastDashTime
    if (timeSinceDash >= 0 && timeSinceDash < 200) {
      const x = ctx.offsetX + player.x * ctx.scale
      const y = ctx.offsetY + player.y * ctx.scale
      const progress = timeSinceDash / 200
      const size = PLAYER.SIZE * ctx.scale * (1 + progress * 0.5)
      const opacity = 1 - progress

      ctx.ctx.beginPath()
      ctx.ctx.arc(x, y, size, 0, Math.PI * 2)
      ctx.ctx.fillStyle = `${PLAYER_COLORS[player.color]}${Math.floor(opacity * 100).toString(16).padStart(2, "0")}`
      ctx.ctx.fill()
    }
  })
}

// Cleanup trails for disconnected players
export function cleanupTrails(activePlayerIds: string[]) {
  const toDelete: string[] = []
  playerTrails.forEach((_, id) => {
    if (!activePlayerIds.includes(id)) {
      toDelete.push(id)
    }
  })
  toDelete.forEach((id) => playerTrails.delete(id))
}
