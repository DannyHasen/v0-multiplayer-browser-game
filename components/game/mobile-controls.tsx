"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Zap, Radio } from "lucide-react"
import type { InputHandler } from "@/lib/game/input"

interface MobileControlsProps {
  dashCooldown: number
  abilityCooldown: number
}

export function MobileControls({ dashCooldown, abilityCooldown }: MobileControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [isTouch, setIsTouch] = useState(false)
  const [joystickActive, setJoystickActive] = useState(false)
  const touchIdRef = useRef<number | null>(null)

  // Check if touch device
  useEffect(() => {
    setIsTouch("ontouchstart" in window || navigator.maxTouchPoints > 0)
  }, [])

  const getInputHandler = useCallback((): InputHandler | null => {
    return (window as unknown as { gameInputHandler?: InputHandler }).gameInputHandler || null
  }, [])

  const handleJoystickStart = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault()
    setJoystickActive(true)

    if ("touches" in e) {
      touchIdRef.current = e.touches[0].identifier
    }
  }, [])

  const handleJoystickMove = useCallback((e: TouchEvent | MouseEvent) => {
    if (!joystickActive || !joystickRef.current || !knobRef.current) return

    let clientX: number, clientY: number

    if ("touches" in e) {
      const touch = Array.from(e.touches).find(t => t.identifier === touchIdRef.current)
      if (!touch) return
      clientX = touch.clientX
      clientY = touch.clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    const rect = joystickRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const maxRadius = rect.width / 2 - 20

    let dx = clientX - centerX
    let dy = clientY - centerY
    const distance = Math.sqrt(dx * dx + dy * dy)

    // Clamp to max radius
    if (distance > maxRadius) {
      dx = (dx / distance) * maxRadius
      dy = (dy / distance) * maxRadius
    }

    // Update knob position
    knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`

    // Normalize and send to input handler
    const normalizedX = dx / maxRadius
    const normalizedY = dy / maxRadius
    const handler = getInputHandler()
    handler?.setDirection(normalizedX, normalizedY)
  }, [joystickActive, getInputHandler])

  const handleJoystickEnd = useCallback(() => {
    setJoystickActive(false)
    touchIdRef.current = null

    if (knobRef.current) {
      knobRef.current.style.transform = "translate(-50%, -50%)"
    }

    const handler = getInputHandler()
    handler?.setDirection(0, 0)
  }, [getInputHandler])

  // Global event listeners for joystick
  useEffect(() => {
    if (!joystickActive) return

    const handleMove = (e: TouchEvent | MouseEvent) => handleJoystickMove(e)
    const handleEnd = () => handleJoystickEnd()

    window.addEventListener("touchmove", handleMove, { passive: false })
    window.addEventListener("touchend", handleEnd)
    window.addEventListener("mousemove", handleMove)
    window.addEventListener("mouseup", handleEnd)

    return () => {
      window.removeEventListener("touchmove", handleMove)
      window.removeEventListener("touchend", handleEnd)
      window.removeEventListener("mousemove", handleMove)
      window.removeEventListener("mouseup", handleEnd)
    }
  }, [joystickActive, handleJoystickMove, handleJoystickEnd])

  const handleDash = useCallback((pressed: boolean) => {
    const handler = getInputHandler()
    handler?.setDash(pressed)
  }, [getInputHandler])

  const handleAbility = useCallback((pressed: boolean) => {
    const handler = getInputHandler()
    handler?.setAbility(pressed)
  }, [getInputHandler])

  // Don't render on non-touch devices
  if (!isTouch) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-40">
      {/* Virtual Joystick */}
      <div
        ref={joystickRef}
        className="absolute bottom-8 left-8 w-32 h-32 rounded-full bg-card/30 border-2 border-primary/30 pointer-events-auto"
        onTouchStart={handleJoystickStart}
        onMouseDown={handleJoystickStart}
      >
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 w-14 h-14 rounded-full bg-primary/50 border-2 border-primary transform -translate-x-1/2 -translate-y-1/2 transition-none"
          style={{ touchAction: "none" }}
        />
      </div>

      {/* Action buttons */}
      <div className="absolute bottom-8 right-8 flex flex-col gap-4 pointer-events-auto">
        {/* Dash button */}
        <button
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            dashCooldown <= 0
              ? "bg-primary/50 border-2 border-primary neon-glow-cyan active:scale-95"
              : "bg-muted/30 border-2 border-muted"
          }`}
          onTouchStart={(e) => {
            e.preventDefault()
            handleDash(true)
          }}
          onTouchEnd={() => handleDash(false)}
          onMouseDown={() => handleDash(true)}
          onMouseUp={() => handleDash(false)}
          onMouseLeave={() => handleDash(false)}
          disabled={dashCooldown > 0}
        >
          {dashCooldown > 0 ? (
            <span className="text-sm font-mono">{Math.ceil(dashCooldown / 1000)}</span>
          ) : (
            <Zap className="w-6 h-6" />
          )}
        </button>

        {/* Ability button */}
        <button
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
            abilityCooldown <= 0
              ? "bg-accent/50 border-2 border-accent neon-glow-magenta active:scale-95"
              : "bg-muted/30 border-2 border-muted"
          }`}
          onTouchStart={(e) => {
            e.preventDefault()
            handleAbility(true)
          }}
          onTouchEnd={() => handleAbility(false)}
          onMouseDown={() => handleAbility(true)}
          onMouseUp={() => handleAbility(false)}
          onMouseLeave={() => handleAbility(false)}
          disabled={abilityCooldown > 0}
        >
          {abilityCooldown > 0 ? (
            <span className="text-sm font-mono">{Math.ceil(abilityCooldown / 1000)}</span>
          ) : (
            <Radio className="w-6 h-6" />
          )}
        </button>
      </div>
    </div>
  )
}
