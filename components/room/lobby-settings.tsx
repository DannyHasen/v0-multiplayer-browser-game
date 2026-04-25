"use client"

import { useCallback, useMemo, memo } from "react"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Settings } from "lucide-react"
import type { RoomSettings, MapTheme } from "@/types/game"
import { MAP_THEMES, MATCH } from "@/lib/game/constants"

interface LobbySettingsProps {
  settings: RoomSettings
  onSettingsChange: (settings: Partial<RoomSettings>) => void
  isHost: boolean
}

export const LobbySettings = memo(function LobbySettings({ settings, onSettingsChange, isHost }: LobbySettingsProps) {
  const handleDurationChange = useCallback((value: number[]) => {
    onSettingsChange({ matchDuration: value[0] })
  }, [onSettingsChange])

  const handleMaxPlayersChange = useCallback((value: string) => {
    onSettingsChange({ maxPlayers: parseInt(value, 10) })
  }, [onSettingsChange])

  const handleThemeChange = useCallback((value: MapTheme) => {
    onSettingsChange({ mapTheme: value })
  }, [onSettingsChange])
  
  // Memoize the slider value to prevent re-renders
  const sliderValue = useMemo(() => [settings.matchDuration], [settings.matchDuration])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    return `${mins} min`
  }

  return (
    <div className="space-y-6 p-4 rounded-lg bg-card/50 border border-border">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Settings className="w-5 h-5 text-primary" />
        <span>Match Settings</span>
        {!isHost && (
          <span className="text-xs text-muted-foreground ml-2">(Host only)</span>
        )}
      </div>

      {/* Match Duration */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Match Duration</Label>
          <span className="text-sm text-primary font-mono">
            {formatDuration(settings.matchDuration)}
          </span>
        </div>
        <Slider
          value={sliderValue}
          onValueChange={handleDurationChange}
          min={MATCH.MIN_DURATION}
          max={MATCH.MAX_DURATION}
          step={30}
          disabled={!isHost}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>1 min</span>
          <span>5 min</span>
        </div>
      </div>

      {/* Max Players */}
      <div className="space-y-3">
        <Label>Max Players</Label>
        <Select
          value={settings.maxPlayers.toString()}
          onValueChange={handleMaxPlayersChange}
          disabled={!isHost}
        >
          <SelectTrigger className="bg-card border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[2, 3, 4, 5, 6, 7, 8].map((num) => (
              <SelectItem key={num} value={num.toString()}>
                {num} Players
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Map Theme */}
      <div className="space-y-3">
        <Label>Arena Theme</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(MAP_THEMES) as MapTheme[]).map((theme) => (
            <button
              key={theme}
              onClick={() => isHost && handleThemeChange(theme)}
              disabled={!isHost}
              className={`
                p-3 rounded-lg border text-center transition-all
                ${settings.mapTheme === theme
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card/50 hover:border-primary/50"
                }
                ${!isHost && "opacity-50 cursor-not-allowed"}
              `}
              style={{
                boxShadow: settings.mapTheme === theme
                  ? `0 0 15px ${MAP_THEMES[theme].gridGlow}40`
                  : undefined,
              }}
            >
              <div
                className="w-full h-8 rounded mb-2"
                style={{
                  background: `linear-gradient(135deg, ${MAP_THEMES[theme].background}, ${MAP_THEMES[theme].gridGlow}40)`,
                }}
              />
              <span className="text-xs font-medium">{MAP_THEMES[theme].name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
})
