"use client"

import { useEffect, useState, useCallback, use } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Copy, Check, Play, LogOut, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { AnimatedBackground } from "@/components/landing/animated-background"
import { PlayerList } from "@/components/room/player-list"
import { LobbySettings } from "@/components/room/lobby-settings"
import { ConnectionBadge } from "@/components/room/connection-badge"
import { useGameStore, useIsHost, useReadyCount, useCanStartGame } from "@/store/game-store"
import { createPartyClient, destroyPartyClient, getPartyClient } from "@/lib/party/client"
import type { ServerMessage, RoomSettings, Room, Player } from "@/types/game"
import { MATCH } from "@/lib/game/constants"
import Link from "next/link"

export default function LobbyPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  
  const {
    settings,
    room,
    playerId,
    isConnected,
    isConnecting,
    connectionError,
    setRoom,
    setPlayerId,
    setConnected,
    setConnecting,
    setConnectionError,
    updateRoomSettings,
    resetAll,
  } = useGameStore()

  const isHost = useIsHost()
  const { ready, total } = useReadyCount()
  const canStart = useCanStartGame()

  // Handle incoming messages from the server
  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "room_state":
        setRoom(message.room)
        break
      case "player_joined":
        toast.success(`${message.player.nickname} joined the room`)
        break
      case "player_left":
        toast.info("A player left the room")
        break
      case "countdown_start":
        // Navigate to game page
        router.push(`/game/${roomId}`)
        break
      case "error":
        toast.error(message.message)
        if (message.message.includes("not found") || message.message.includes("full")) {
          router.push("/play")
        }
        break
    }
  }, [setRoom, router, roomId])

  // Connect to PartyKit on mount
  useEffect(() => {
    if (!settings.nickname) {
      router.push("/play")
      return
    }

    setConnecting(true)
    setConnectionError(null)

    const client = createPartyClient({
      roomId,
      onMessage: handleMessage,
      onConnect: () => {
        setConnected(true)
        setConnecting(false)
        // Send join message
        const partyClient = getPartyClient()
        if (partyClient) {
          partyClient.join(settings.nickname, settings.color)
          setPlayerId(partyClient.socketId)
        }
      },
      onDisconnect: () => {
        setConnected(false)
        toast.error("Disconnected from server")
      },
      onError: (error) => {
        setConnectionError(error.message)
        setConnecting(false)
        toast.error("Connection error")
      },
    })

    client.connect()

    return () => {
      destroyPartyClient()
    }
  }, [roomId, settings.nickname, settings.color, handleMessage, router, setConnected, setConnecting, setConnectionError, setPlayerId])

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomId)
      setCopied(true)
      toast.success("Room code copied!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleToggleReady = () => {
    const client = getPartyClient()
    if (client) {
      client.toggleReady()
    }
  }

  const handleStartGame = () => {
    const client = getPartyClient()
    if (client && canStart) {
      client.startGame()
    }
  }

  const handleLeave = () => {
    const client = getPartyClient()
    if (client) {
      client.leave()
    }
    resetAll()
    router.push("/play")
  }

  const handleSettingsChange = (newSettings: Partial<RoomSettings>) => {
    updateRoomSettings(newSettings)
    // TODO: Send settings update to server
  }

  const currentPlayer = room?.players.find(p => p.id === playerId)
  const connectionStatus = isConnecting ? "connecting" : isConnected ? "connected" : connectionError ? "error" : "disconnected"

  // Default room state for UI before server responds
  const displayRoom: Room = room || {
    id: roomId,
    code: roomId,
    players: [],
    state: "lobby",
    settings: {
      maxPlayers: 8,
      matchDuration: MATCH.DEFAULT_DURATION,
      mapTheme: "cyber",
    },
    hostId: "",
  }

  return (
    <main className="relative min-h-screen">
      <AnimatedBackground />
      
      <div className="relative z-10 max-w-4xl mx-auto p-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link 
            href="/play"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Leave Lobby
          </Link>
          <ConnectionBadge status={connectionStatus} />
        </div>

        {/* Room code */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <p className="text-sm text-muted-foreground mb-2">Room Code</p>
          <div className="inline-flex items-center gap-3">
            <span className="text-4xl font-bold font-mono tracking-widest text-primary">
              {roomId}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={handleCopyCode}
              className="h-10 w-10"
            >
              {copied ? (
                <Check className="w-4 h-4 text-green-500" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Share this code with friends to join
          </p>
        </motion.div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Player list */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-card/50 border border-border"
          >
            <PlayerList
              players={displayRoom.players}
              currentPlayerId={playerId}
              hostId={displayRoom.hostId}
            />
          </motion.div>

          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <LobbySettings
              settings={displayRoom.settings}
              onSettingsChange={handleSettingsChange}
              isHost={isHost}
            />
          </motion.div>
        </div>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
        >
          <Button
            variant="outline"
            onClick={handleLeave}
            className="w-full sm:w-auto gap-2"
          >
            <LogOut className="w-4 h-4" />
            Leave Room
          </Button>

          {isHost ? (
            <Button
              onClick={handleStartGame}
              disabled={!canStart}
              className="w-full sm:w-auto gap-2 neon-glow-cyan bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="w-4 h-4" />
              Start Game ({ready}/{total} Ready)
            </Button>
          ) : (
            <Button
              onClick={handleToggleReady}
              className={`w-full sm:w-auto gap-2 ${
                currentPlayer?.isReady
                  ? "bg-green-500/20 text-green-500 border-green-500/50 hover:bg-green-500/30"
                  : "neon-glow-magenta bg-accent text-accent-foreground hover:bg-accent/90"
              }`}
              variant={currentPlayer?.isReady ? "outline" : "default"}
            >
              {currentPlayer?.isReady ? (
                <>
                  <Check className="w-4 h-4" />
                  Ready!
                </>
              ) : (
                "Ready Up"
              )}
            </Button>
          )}
        </motion.div>

        {/* Ready status message */}
        <p className="text-center text-sm text-muted-foreground mt-4">
          {total < 2
            ? "Waiting for more players to join..."
            : ready < total
              ? `Waiting for ${total - ready} player${total - ready > 1 ? "s" : ""} to ready up...`
              : isHost
                ? "All players ready! Start the game when ready."
                : "All players ready! Waiting for host to start..."}
        </p>
      </div>
    </main>
  )
}
