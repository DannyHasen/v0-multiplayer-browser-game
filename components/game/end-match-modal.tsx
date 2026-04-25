"use client"

import { motion } from "framer-motion"
import { Trophy, Medal, RotateCcw, Home, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PLAYER_COLORS, type PlayerColor } from "@/types/game"

interface FinalScore {
  playerId: string
  nickname: string
  score: number
  color: PlayerColor
}

interface EndMatchModalProps {
  finalScores: FinalScore[]
  currentPlayerId: string | null
  onPlayAgain: () => void
  onReturnToLobby: () => void
  onLeave: () => void
}

export function EndMatchModal({
  finalScores,
  currentPlayerId,
  onPlayAgain,
  onReturnToLobby,
  onLeave,
}: EndMatchModalProps) {
  const winner = finalScores[0]
  const isWinner = winner?.playerId === currentPlayerId
  const currentPlayerRank = finalScores.findIndex((s) => s.playerId === currentPlayerId) + 1

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-md bg-card border border-border rounded-xl overflow-hidden"
      >
        {/* Winner banner */}
        <div 
          className="p-6 text-center"
          style={{
            background: `linear-gradient(135deg, ${PLAYER_COLORS[winner?.color || "cyan"]}20, transparent)`,
          }}
        >
          {isWinner ? (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold text-primary neon-text-cyan mb-2"
              >
                Victory!
              </motion.h2>
              <p className="text-muted-foreground">You dominated the arena!</p>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <Medal className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-3xl font-bold mb-2"
              >
                #{currentPlayerRank} Place
              </motion.h2>
              <p className="text-muted-foreground">
                <span 
                  className="font-semibold"
                  style={{ color: PLAYER_COLORS[winner?.color || "cyan"] }}
                >
                  {winner?.nickname}
                </span>{" "}
                wins with {winner?.score} points!
              </p>
            </>
          )}
        </div>

        {/* Leaderboard */}
        <div className="p-4 border-t border-border">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Final Standings
          </h3>
          <div className="space-y-2">
            {finalScores.map((player, index) => (
              <motion.div
                key={player.playerId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`flex items-center gap-3 p-3 rounded-lg ${
                  player.playerId === currentPlayerId
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-secondary/30"
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  index === 0 ? "bg-yellow-500/20 text-yellow-500" :
                  index === 1 ? "bg-gray-400/20 text-gray-400" :
                  index === 2 ? "bg-orange-600/20 text-orange-600" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {index + 1}
                </div>

                {/* Player info */}
                <div
                  className="w-8 h-8 rounded-full"
                  style={{
                    backgroundColor: `${PLAYER_COLORS[player.color]}30`,
                    border: `2px solid ${PLAYER_COLORS[player.color]}`,
                  }}
                />
                <span className={`flex-1 font-medium ${
                  player.playerId === currentPlayerId ? "text-primary" : ""
                }`}>
                  {player.nickname}
                  {player.playerId === currentPlayerId && (
                    <span className="text-xs text-muted-foreground ml-2">(You)</span>
                  )}
                </span>

                {/* Score */}
                <span className="font-mono font-bold">
                  {player.score}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-border flex flex-col gap-2">
          <Button
            onClick={onPlayAgain}
            className="w-full neon-glow-cyan bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Play Again
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onReturnToLobby}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Return to Lobby
            </Button>
            <Button
              variant="outline"
              onClick={onLeave}
              className="flex-1"
            >
              <Home className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
