"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { createPartyClient, destroyPartyClient, getPartyClient, type PartyClient } from "@/lib/party/client"
import type { ServerMessage, InputState, PlayerColor } from "@/types/game"

interface UsePartySocketOptions {
  roomId: string
  nickname: string
  color: PlayerColor
  onMessage: (message: ServerMessage) => void
  enabled?: boolean
}

interface UsePartySocketReturn {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  socketId: string | null
  sendInput: (input: InputState, sequenceNumber: number) => void
  toggleReady: () => void
  startGame: () => void
  leave: () => void
  reconnect: () => void
}

export function usePartySocket({
  roomId,
  nickname,
  color,
  onMessage,
  enabled = true,
}: UsePartySocketOptions): UsePartySocketReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [socketId, setSocketId] = useState<string | null>(null)
  
  const clientRef = useRef<PartyClient | null>(null)
  const messageHandlerRef = useRef(onMessage)

  // Keep message handler ref updated
  useEffect(() => {
    messageHandlerRef.current = onMessage
  }, [onMessage])

  const connect = useCallback(() => {
    if (!enabled || !nickname) return

    setIsConnecting(true)
    setError(null)

    const client = createPartyClient({
      roomId,
      onMessage: (message) => {
        messageHandlerRef.current(message)
      },
      onConnect: () => {
        setIsConnected(true)
        setIsConnecting(false)
        setError(null)

        const partyClient = getPartyClient()
        if (partyClient) {
          setSocketId(partyClient.socketId)
          partyClient.join(nickname, color)
        }
      },
      onDisconnect: () => {
        setIsConnected(false)
        setSocketId(null)
      },
      onError: (err) => {
        setError(err.message)
        setIsConnecting(false)
        setIsConnected(false)
      },
    })

    clientRef.current = client
    client.connect()
  }, [roomId, nickname, color, enabled])

  // Connect on mount
  useEffect(() => {
    connect()

    return () => {
      destroyPartyClient()
      clientRef.current = null
    }
  }, [connect])

  const sendInput = useCallback((input: InputState, sequenceNumber: number) => {
    const client = getPartyClient()
    if (client?.isConnected) {
      client.sendInput(input, sequenceNumber)
    }
  }, [])

  const toggleReady = useCallback(() => {
    const client = getPartyClient()
    if (client?.isConnected) {
      client.toggleReady()
    }
  }, [])

  const startGame = useCallback(() => {
    const client = getPartyClient()
    if (client?.isConnected) {
      client.startGame()
    }
  }, [])

  const leave = useCallback(() => {
    const client = getPartyClient()
    if (client?.isConnected) {
      client.leave()
    }
    destroyPartyClient()
    setIsConnected(false)
    setSocketId(null)
  }, [])

  const reconnect = useCallback(() => {
    destroyPartyClient()
    clientRef.current = null
    connect()
  }, [connect])

  return {
    isConnected,
    isConnecting,
    error,
    socketId,
    sendInput,
    toggleReady,
    startGame,
    leave,
    reconnect,
  }
}
