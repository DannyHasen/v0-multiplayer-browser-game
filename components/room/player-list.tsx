"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Crown, Check, Wifi, WifiOff } from "lucide-react"
import { PLAYER_COLORS, type Player } from "@/types/game"
import { cn } from "@/lib/utils"

interface PlayerListProps {
  players: Player[]
  currentPlayerId: string | null
  hostId: string
}

export function PlayerList({ players, currentPlayerId, hostId }: PlayerListProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Players</h2>
        <span className="text-sm text-muted-foreground">
          {players.length}/8
        </span>
      </div>

      <AnimatePresence mode="popLayout">
        {players.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border transition-colors",
              player.id === currentPlayerId
                ? "bg-secondary/50 border-primary/50"
                : "bg-card/50 border-border"
            )}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
              style={{
                backgroundColor: `${PLAYER_COLORS[player.color]}20`,
                border: `2px solid ${PLAYER_COLORS[player.color]}`,
                boxShadow: `0 0 10px ${PLAYER_COLORS[player.color]}40`,
              }}
            >
              {player.nickname.charAt(0).toUpperCase()}
            </div>

            {/* Player info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">
                  {player.nickname}
                </span>
                {player.id === currentPlayerId && (
                  <span className="text-xs text-muted-foreground">(You)</span>
                )}
                {player.id === hostId && (
                  <Crown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {player.connected ? (
                  <span className="flex items-center gap-1 text-green-500">
                    <Wifi className="w-3 h-3" />
                    Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-destructive">
                    <WifiOff className="w-3 h-3" />
                    Disconnected
                  </span>
                )}
              </div>
            </div>

            {/* Ready status */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                player.isReady
                  ? "bg-green-500/20 text-green-500"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {player.isReady ? (
                <Check className="w-5 h-5" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Empty slots */}
      {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
        <div
          key={`empty-${i}`}
          className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border/50 text-muted-foreground"
        >
          <div className="w-10 h-10 rounded-full bg-muted/30 flex items-center justify-center">
            ?
          </div>
          <span className="text-sm">Waiting for player...</span>
        </div>
      ))}
    </div>
  )
}
