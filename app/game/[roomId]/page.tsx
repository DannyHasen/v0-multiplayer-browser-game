"use client"

import { useEffect, useCallback, useState, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { GameCanvas } from "@/components/game/game-canvas"
import { HUDOverlay, type CombatNotice } from "@/components/game/hud-overlay"
import { CountdownOverlay } from "@/components/game/countdown-overlay"
import { EndMatchModal } from "@/components/game/end-match-modal"
import { MobileControls } from "@/components/game/mobile-controls"
import { useGameStore } from "@/store/game-store"
import {
  createGameClient,
  destroyGameClient,
  fullDestroyGameClient,
  getGameClient,
  getGameClientPlayerId,
} from "@/lib/party/session-client"
import type { ServerMessage, GameState, InputState } from "@/types/game"
import { MATCH } from "@/lib/game/constants"

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  
  const {
    settings,
    room,
    playerId,
    gameState,
    setRoom,
    setGameState,
    setPlayerId,
    setConnected,
    showEndMatch,
    setShowEndMatch,
    finalScores,
    setFinalScores,
    resetAll,
  } = useGameStore()

  const [showCountdown, setShowCountdown] = useState(false)
  const [countdownStartTime, setCountdownStartTime] = useState(0)
  const [combatNotices, setCombatNotices] = useState<CombatNotice[]>([])
  const sequenceNumberRef = useRef(0)

  const getAttackerName = useCallback((attackerId: string) => {
    const latestState = useGameStore.getState().gameState
    if (attackerId === "boss") {
      return latestState?.boss?.nickname ?? "Arena Warden"
    }
    if (attackerId === "hazard") {
      return "Arena hazard"
    }
    if (attackerId === "storm") {
      return "Pulse ring"
    }
    if (attackerId === "burn") {
      return "burn"
    }

    const meleeEnemy = latestState?.meleeEnemies?.find((enemy) => enemy.id === attackerId)
    if (meleeEnemy) {
      return meleeEnemy.nickname
    }

    return latestState?.players.find((player) => player.id === attackerId)?.nickname ?? attackerId
  }, [])

  const pushCombatNotice = useCallback((message: string, tone: CombatNotice["tone"] = "danger") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setCombatNotices((current) => [{ id, message, tone }, ...current].slice(0, 2))
    window.setTimeout(() => {
      setCombatNotices((current) => current.filter((notice) => notice.id !== id))
    }, 2200)
  }, [])

  // Handle incoming messages
  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "room_state":
        setRoom(message.room)
        break
      case "countdown_start":
        setCountdownStartTime(message.startTime)
        setShowCountdown(true)
        break
      case "game_state":
        setGameState(message.state)
        break
      case "player_hit":
        if (message.targetId === playerId) {
          pushCombatNotice(`${getAttackerName(message.attackerId)} hit you for ${message.damage}`)
        }
        break
      case "pickup_collected":
        break
      case "match_end":
        setFinalScores(message.finalScores)
        setShowEndMatch(true)
        break
      case "error":
        toast.error(message.message)
        break
    }
  }, [setRoom, setGameState, setFinalScores, setShowEndMatch, playerId, getAttackerName, pushCombatNotice])

  // Connect using demo client
  useEffect(() => {
    if (!settings.nickname) {
      router.push("/play")
      return
    }

    // Create or get the selected local-demo or realtime PartyKit client.
    const client = createGameClient({
      roomId,
      onMessage: handleMessage,
      onConnect: () => {
        setConnected(true)
        const activeClient = getGameClient()
        if (activeClient) {
          setPlayerId(getGameClientPlayerId(activeClient))
          // The game should already be running from lobby, but if not, join and start
          const room = activeClient.getRoom()
          if (room.players.length === 0) {
            // Re-join if needed
            activeClient.join(settings.nickname, settings.color)
          }
        }
      },
      onDisconnect: () => {
        setConnected(false)
      },
      onError: () => {
        toast.error("Connection error")
      },
    })

    client.connect()

    return () => {
      destroyGameClient()
    }
  }, [roomId, settings, handleMessage, router, setConnected, setPlayerId])

  // Handle input changes
  const handleInput = useCallback((input: InputState) => {
    const client = getGameClient()
    if (client?.isConnected) {
      sequenceNumberRef.current += 1
      client.sendInput(input, sequenceNumberRef.current)
    }
  }, [])

  // Handle countdown complete
  const handleCountdownComplete = useCallback(() => {
    setShowCountdown(false)
  }, [])

  // End match actions
  const handlePlayAgain = useCallback(() => {
    setShowEndMatch(false)
    setGameState(null)
    getGameClient()?.resetToLobby()
    router.push(`/lobby/${roomId}`)
  }, [setShowEndMatch, setGameState, router, roomId])

  const handleReturnToLobby = useCallback(() => {
    setShowEndMatch(false)
    setGameState(null)
    router.push(`/lobby/${roomId}`)
  }, [setShowEndMatch, setGameState, router, roomId])

  const handleLeave = useCallback(() => {
    fullDestroyGameClient()
    resetAll()
    router.push("/play")
  }, [resetAll, router])

  // Get current player
  const currentPlayer = gameState?.players.find(p => p.id === playerId) || null

  // Default game state for rendering
  const displayGameState: GameState = gameState || {
    players: [],
    pickups: [],
    hazards: [],
    timeRemaining: MATCH.DEFAULT_DURATION,
    matchState: "lobby",
  }

  return (
    <main className="fixed inset-0 bg-background overflow-hidden">
      {/* Game canvas */}
      <GameCanvas
        gameState={displayGameState}
        currentPlayerId={playerId}
        theme={room?.settings.mapTheme || "cyber"}
        onInput={handleInput}
      />

      {/* HUD Overlay */}
      {gameState && gameState.matchState === "playing" && (
        <HUDOverlay
          gameState={gameState}
          currentPlayer={currentPlayer}
          roomCode={roomId}
          combatNotices={combatNotices}
        />
      )}

      {/* Mobile controls */}
      {gameState && gameState.matchState === "playing" && currentPlayer && (
        <MobileControls
          dashCooldown={currentPlayer.dashCooldown}
          abilityCooldown={currentPlayer.abilityCooldown}
        />
      )}

      {/* Countdown overlay */}
      <AnimatePresence>
        {showCountdown && (
          <CountdownOverlay
            startTime={countdownStartTime}
            onComplete={handleCountdownComplete}
          />
        )}
      </AnimatePresence>

      {/* End match modal */}
      <AnimatePresence>
        {showEndMatch && (
          <EndMatchModal
            finalScores={finalScores}
            currentPlayerId={playerId}
            onPlayAgain={handlePlayAgain}
            onReturnToLobby={handleReturnToLobby}
            onLeave={handleLeave}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
