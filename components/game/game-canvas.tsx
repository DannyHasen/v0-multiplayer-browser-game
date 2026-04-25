"use client"

import { useEffect, useRef, useCallback } from "react"
import { render, initRenderer, resizeCanvas, cleanupTrails } from "@/lib/game/renderer"
import { InputHandler } from "@/lib/game/input"
import type { GameState, InputState, MapTheme } from "@/types/game"

interface GameCanvasProps {
  gameState: GameState | null
  currentPlayerId: string | null
  theme: MapTheme
  onInput: (input: InputState) => void
}

export function GameCanvas({ gameState, currentPlayerId, theme, onInput }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const animationRef = useRef<number>()
  const inputHandlerRef = useRef<InputHandler | null>(null)
  const dimensionsRef = useRef({ width: 0, height: 0 })

  // Handle input changes
  const handleInputChange = useCallback((input: InputState) => {
    onInput(input)
  }, [onInput])

  // Initialize canvas and input handler
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = initRenderer(canvas)
    if (!ctx) return

    ctxRef.current = ctx

    // Set up input handler
    inputHandlerRef.current = new InputHandler({
      onInputChange: handleInputChange,
    })
    inputHandlerRef.current.attach()

    // Handle resize
    const handleResize = () => {
      const canvas = canvasRef.current
      const ctx = ctxRef.current
      if (!canvas || !ctx) return

      // Reset the transform before resizing
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      dimensionsRef.current = resizeCanvas(canvas, ctx)
    }

    handleResize()
    window.addEventListener("resize", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      inputHandlerRef.current?.detach()
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [handleInputChange])

  // Render loop
  useEffect(() => {
    const animate = () => {
      const ctx = ctxRef.current
      const canvas = canvasRef.current

      if (ctx && canvas && gameState) {
        // Clean up trails for disconnected players
        cleanupTrails(gameState.players.map(p => p.id))

        // Render the game
        render(
          ctx,
          gameState,
          currentPlayerId,
          dimensionsRef.current.width,
          dimensionsRef.current.height,
          theme
        )
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [gameState, currentPlayerId, theme])

  // Expose input handler methods for mobile controls
  useEffect(() => {
    const handler = inputHandlerRef.current
    if (handler) {
      // Attach to window for mobile control components to access
      ;(window as unknown as { gameInputHandler: InputHandler }).gameInputHandler = handler
    }

    return () => {
      delete (window as unknown as { gameInputHandler?: InputHandler }).gameInputHandler
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block"
      style={{ touchAction: "none" }}
    />
  )
}
