"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, ArrowLeft } from "lucide-react"
import { useGameStore } from "@/store/game-store"
import { PLAYER_COLORS, type PlayerColor } from "@/types/game"
import { generateRoomCode, isValidRoomCode, isValidNickname } from "@/lib/game/constants"
import Link from "next/link"

const colorOptions: PlayerColor[] = [
  "cyan", "magenta", "yellow", "lime", 
  "orange", "pink", "teal", "purple"
]

export function RoomForm() {
  const router = useRouter()
  const { settings, updateSettings } = useGameStore()
  
  const [nickname, setNickname] = useState(settings.nickname || "")
  const [selectedColor, setSelectedColor] = useState<PlayerColor>(settings.color || "cyan")
  const [joinCode, setJoinCode] = useState("")
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  // Load saved settings
  useEffect(() => {
    if (settings.nickname) setNickname(settings.nickname)
    if (settings.color) setSelectedColor(settings.color)
  }, [settings])

  const handleCreate = async () => {
    setError("")
    
    if (!isValidNickname(nickname)) {
      setError("Nickname must be 2-16 characters")
      return
    }

    setIsCreating(true)
    
    // Save settings
    updateSettings({ nickname: nickname.trim(), color: selectedColor })
    
    // Generate room code and navigate
    const roomCode = generateRoomCode()
    router.push(`/lobby/${roomCode}`)
  }

  const handleJoin = async () => {
    setError("")
    
    if (!isValidNickname(nickname)) {
      setError("Nickname must be 2-16 characters")
      return
    }

    const code = joinCode.toUpperCase().trim()
    if (!isValidRoomCode(code)) {
      setError("Invalid room code. Must be 6 characters.")
      return
    }

    setIsJoining(true)
    
    // Save settings
    updateSettings({ nickname: nickname.trim(), color: selectedColor })
    
    // Navigate to lobby
    router.push(`/lobby/${code}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back link */}
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        {/* Title */}
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-primary">Join</span> the Arena
        </h1>
        <p className="text-muted-foreground mb-8">
          Set up your profile and enter the battle
        </p>

        {/* Player Setup */}
        <div className="space-y-6 mb-8">
          {/* Nickname */}
          <div className="space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={16}
              className="bg-card border-border focus:border-primary"
            />
          </div>

          {/* Color picker */}
          <div className="space-y-2">
            <Label>Choose your color</Label>
            <div className="grid grid-cols-4 gap-3">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`
                    w-full aspect-square rounded-lg transition-all duration-200
                    ${selectedColor === color 
                      ? "ring-2 ring-offset-2 ring-offset-background scale-105" 
                      : "hover:scale-105"
                    }
                  `}
                  style={{ 
                    backgroundColor: PLAYER_COLORS[color],
                    boxShadow: selectedColor === color 
                      ? `0 0 20px ${PLAYER_COLORS[color]}80` 
                      : `0 0 10px ${PLAYER_COLORS[color]}40`,
                    ringColor: PLAYER_COLORS[color],
                  }}
                  aria-label={`Select ${color} color`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Create / Join Tabs */}
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="create" className="gap-2">
              <Plus className="w-4 h-4" />
              Create Room
            </TabsTrigger>
            <TabsTrigger value="join" className="gap-2">
              <Users className="w-4 h-4" />
              Join Room
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Create a new room and share the code with friends
              </p>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !nickname.trim()}
                className="w-full h-12 text-lg font-semibold neon-glow-cyan bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="join">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roomCode">Room Code</Label>
                <Input
                  id="roomCode"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  maxLength={6}
                  className="bg-card border-border focus:border-primary font-mono text-center text-2xl tracking-widest uppercase"
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={isJoining || !nickname.trim() || joinCode.length !== 6}
                className="w-full h-12 text-lg font-semibold neon-glow-magenta bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error message */}
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 text-sm text-destructive text-center"
          >
            {error}
          </motion.p>
        )}
      </motion.div>
    </div>
  )
}
