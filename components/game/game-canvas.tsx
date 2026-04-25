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

      if (ctx && canvas) {
        const width = dimensionsRef.current.width
        const height = dimensionsRef.current.height
        
        if (gameState && gameState.players.length > 0) {
          // Clean up trails for disconnected players
          cleanupTrails(gameState.players.map(p => p.id))

          // Render the game
          render(
            ctx,
            gameState,
            currentPlayerId,
            width,
            height,
            theme
          )
        } else {
          // Show waiting screen when no game state
          ctx.fillStyle = "#0a0a12"
          ctx.fillRect(0, 0, width, height)
          
          // Draw grid pattern
          ctx.strokeStyle = "rgba(0, 255, 255, 0.1)"
          ctx.lineWidth = 1
          const gridSize = 40
          for (let x = 0; x < width; x += gridSize) {
            ctx.beginPath()
            ctx.moveTo(x, 0)
            ctx.lineTo(x, height)
            ctx.stroke()
          }
          for (let y = 0; y < height; y += gridSize) {
            ctx.beginPath()
            ctx.moveTo(0, y)
            ctx.lineTo(width, y)
            ctx.stroke()
          }
          
          // Draw waiting text
          ctx.fillStyle = "#00ffff"
          ctx.font = "bold 24px 'Geist Sans', sans-serif"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText("Starting game...", width / 2, height / 2)
          
          // Pulsing effect
          const pulse = Math.sin(Date.now() / 500) * 0.3 + 0.7
          ctx.globalAlpha = pulse
          ctx.fillStyle = "#ff00ff"
          ctx.fillText("Get ready!", width / 2, height / 2 + 40)
          ctx.globalAlpha = 1
        }
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
