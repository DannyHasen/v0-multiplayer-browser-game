"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Timer, Zap, Radio, Copy, Check, Skull, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { formatTime, PLAYER } from "@/lib/game/constants"
import { PLAYER_COLORS, type Player, type GameState } from "@/types/game"

interface HUDOverlayProps {
  gameState: GameState
  currentPlayer: Player | null
  roomCode: string
  combatNotices?: CombatNotice[]
}

export interface CombatNotice {
  id: string
  message: string
  tone: "danger" | "warning"
}

export function HUDOverlay({ gameState, currentPlayer, roomCode, combatNotices = [] }: HUDOverlayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sort players by score for leaderboard
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score)
  const respawnSeconds = currentPlayer?.respawnAt
    ? Math.max(0, Math.ceil((currentPlayer.respawnAt - Date.now()) / 1000))
    : 0
  const currentMaxHealth = currentPlayer?.maxHealth ?? PLAYER.MAX_HEALTH

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
        <div className="flex max-w-[260px] flex-col gap-2">
          {/* Player stats */}
          {currentPlayer && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border pointer-events-auto"
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                  style={{
                    backgroundColor: `${PLAYER_COLORS[currentPlayer.color]}20`,
                    border: `2px solid ${PLAYER_COLORS[currentPlayer.color]}`,
                  }}
                >
                  {currentPlayer.nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-sm">{currentPlayer.nickname}</div>
                  <div className="text-primary font-mono text-lg font-bold">
                    {Math.round(currentPlayer.score)}
                  </div>
                </div>
              </div>

              {/* Health bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Health</span>
                  <span>{currentPlayer.health}/{currentMaxHealth}</span>
                </div>
                <Progress 
                  value={(currentPlayer.health / currentMaxHealth) * 100} 
                  className="h-2"
                />
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {combatNotices.slice(0, 2).map((notice) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs backdrop-blur-sm ${
                  notice.tone === "danger"
                    ? "border-destructive/45 bg-destructive/12 text-destructive-foreground"
                    : "border-orange-400/40 bg-orange-400/10 text-orange-100"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{notice.message}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-border min-w-[170px]"
        >
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <span className="text-2xl font-mono font-bold">
              {formatTime(gameState.timeRemaining)}
            </span>
          </div>
          {gameState.boss && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
                <span>{gameState.boss.nickname}</span>
                <span>{Math.ceil(gameState.boss.health)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-destructive"
                  style={{ width: `${Math.max(0, (gameState.boss.health / gameState.boss.maxHealth) * 100)}%` }}
                />
              </div>
              {(gameState.meleeEnemies?.length ?? 0) > 0 && (
                <div className="mt-1 text-[10px] uppercase tracking-wider text-orange-400">
                  Hunters: {gameState.meleeEnemies?.length}
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Mini leaderboard */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border min-w-[140px]"
        >
          <div className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">
            Leaderboard
          </div>
          <div className="space-y-1">
            {sortedPlayers.slice(0, 4).map((player, index) => (
              <div 
                key={player.id} 
                className={`flex items-center justify-between text-sm ${
                  player.id === currentPlayer?.id ? "text-primary font-semibold" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-4">{index + 1}.</span>
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLAYER_COLORS[player.color] }}
                  />
                  <span className="truncate max-w-[60px]">{player.nickname}</span>
                </div>
                <span className="font-mono">{Math.round(player.score)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {currentPlayer?.isRespawning && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <div className="rounded-lg border border-destructive/50 bg-background/80 px-8 py-6 text-center backdrop-blur-sm">
            <Skull className="mx-auto mb-3 h-10 w-10 text-destructive" />
            <div className="text-2xl font-bold text-destructive">Respawning</div>
            <div className="mt-1 font-mono text-4xl text-foreground">{respawnSeconds}</div>
          </div>
        </motion.div>
      )}

      {/* Bottom bar - Cooldowns and Room Code */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
        {/* Cooldowns */}
        {currentPlayer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            {/* Dash cooldown */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border text-center min-w-[80px]">
              <div className="text-xs text-muted-foreground mb-1">Dash</div>
              <div className="relative">
                <Zap 
                  className={`w-6 h-6 mx-auto ${
                    currentPlayer.dashCooldown <= 0 ? "text-primary" : "text-muted"
                  }`} 
                />
                {currentPlayer.dashCooldown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-mono">
                      {Math.ceil(currentPlayer.dashCooldown / 1000)}s
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">SPACE</div>
            </div>

            {/* Ability cooldown */}
            <div className="bg-card/80 backdrop-blur-sm rounded-lg p-3 border border-border text-center min-w-[80px]">
              <div className="text-xs text-muted-foreground mb-1">Wave</div>
              <div className="relative">
                <Radio 
                  className={`w-6 h-6 mx-auto ${
                    currentPlayer.abilityCooldown <= 0 ? "text-accent" : "text-muted"
                  }`}
                />
                {currentPlayer.abilityCooldown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-mono">
                      {Math.ceil(currentPlayer.abilityCooldown / 1000)}s
                    </span>
                  </div>
                )}
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">E</div>
            </div>
          </motion.div>
        )}

        {/* Room code */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleCopyCode}
          className="bg-card/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-border flex items-center gap-2 pointer-events-auto hover:bg-card/90 transition-colors"
        >
          <span className="text-xs text-muted-foreground">Room:</span>
          <span className="font-mono font-bold text-primary">{roomCode}</span>
          {copied ? (
            <Check className="w-4 h-4 text-green-500" />
          ) : (
            <Copy className="w-4 h-4 text-muted-foreground" />
          )}
        </motion.button>
      </div>
    </div>
  )
}
