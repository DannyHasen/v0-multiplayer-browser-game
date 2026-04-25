"use client"

import { Wifi, WifiOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type ConnectionStatus = "connected" | "connecting" | "disconnected" | "error"

interface ConnectionBadgeProps {
  status: ConnectionStatus
  className?: string
}

export function ConnectionBadge({ status, className }: ConnectionBadgeProps) {
  const statusConfig = {
    connected: {
      icon: Wifi,
      label: "Connected",
      color: "text-green-500",
      bg: "bg-green-500/10",
      border: "border-green-500/30",
    },
    connecting: {
      icon: Loader2,
      label: "Connecting",
      color: "text-yellow-500",
      bg: "bg-yellow-500/10",
      border: "border-yellow-500/30",
    },
    disconnected: {
      icon: WifiOff,
      label: "Disconnected",
      color: "text-muted-foreground",
      bg: "bg-muted/10",
      border: "border-muted/30",
    },
    error: {
      icon: WifiOff,
      label: "Error",
      color: "text-destructive",
      bg: "bg-destructive/10",
      border: "border-destructive/30",
    },
  }

  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm",
        config.bg,
        config.border,
        className
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4",
          config.color,
          status === "connecting" && "animate-spin"
        )}
      />
      <span className={config.color}>{config.label}</span>
    </div>
  )
}
