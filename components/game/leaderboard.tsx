"use client"

import { motion } from "framer-motion"
import { PLAYER_COLORS, type Player } from "@/types/game"

interface LeaderboardProps {
  players: Player[]
  currentPlayerId: string | null
  expanded?: boolean
}

export function Leaderboard({ players, currentPlayerId, expanded = false }: LeaderboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
  const displayPlayers = expanded ? sortedPlayers : sortedPlayers.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-card/80 backdrop-blur-sm rounded-lg border border-border overflow-hidden"
    >
      <div className="p-3 border-b border-border bg-secondary/30">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Leaderboard
        </h3>
      </div>

      <div className="p-2">
        {displayPlayers.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-2 p-2 rounded-md ${
              player.id === currentPlayerId
                ? "bg-primary/10"
                : index % 2 === 0
                  ? "bg-transparent"
                  : "bg-secondary/20"
            }`}
          >
            {/* Rank badge */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                index === 0
                  ? "bg-yellow-500/20 text-yellow-500"
                  : index === 1
                    ? "bg-gray-400/20 text-gray-400"
                    : index === 2
                      ? "bg-orange-600/20 text-orange-600"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {index + 1}
            </div>

            {/* Player color indicator */}
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: PLAYER_COLORS[player.color] }}
            />

            {/* Player name */}
            <span
              className={`flex-1 truncate text-sm ${
                player.id === currentPlayerId
                  ? "text-primary font-semibold"
                  : "text-foreground"
              }`}
            >
              {player.nickname}
            </span>

            {/* Score */}
            <span className="font-mono text-sm font-semibold">
              {Math.round(player.score)}
            </span>
          </motion.div>
        ))}
      </div>

      {!expanded && players.length > 5 && (
        <div className="px-3 py-2 text-center text-xs text-muted-foreground border-t border-border">
          +{players.length - 5} more players
        </div>
      )}
    </motion.div>
  )
}
