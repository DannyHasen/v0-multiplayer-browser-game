"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Timer, Zap, Radio, Copy, Check } from "lucide-react"
import { useState } from "react"
import { Progress } from "@/components/ui/progress"
import { formatTime, PLAYER } from "@/lib/game/constants"
import { PLAYER_COLORS, type Player, type GameState } from "@/types/game"

interface HUDOverlayProps {
  gameState: GameState
  currentPlayer: Player | null
  roomCode: string
}

export function HUDOverlay({ gameState, currentPlayer, roomCode }: HUDOverlayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Sort players by score for leaderboard
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score)

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-start justify-between">
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
                <span>{currentPlayer.health}/{PLAYER.MAX_HEALTH}</span>
              </div>
              <Progress 
                value={(currentPlayer.health / PLAYER.MAX_HEALTH) * 100} 
                className="h-2"
              />
            </div>
          </motion.div>
        )}

        {/* Timer */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-border"
        >
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            <span className="text-2xl font-mono font-bold">
              {formatTime(gameState.timeRemaining)}
            </span>
          </div>
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
