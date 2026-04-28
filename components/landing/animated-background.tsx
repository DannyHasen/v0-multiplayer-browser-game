"use client"

import { useEffect, useRef, useCallback } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  hue: number
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const mouseRef = useRef({ x: 0, y: 0 })
  const animationRef = useRef<number | null>(null)

  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = []
    const count = Math.floor((width * height) / 15000) // Density based on screen size
    
    for (let i = 0; i < Math.min(count, 80); i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        size: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.5 ? 195 : 330, // Cyan or Magenta
      })
    }
    particlesRef.current = particles
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      initParticles(rect.width, rect.height)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }

    const drawGrid = (width: number, height: number, time: number) => {
      const gridSize = 60
      const perspective = 0.002
      
      ctx.strokeStyle = `oklch(0.20 0.05 280 / 0.4)`
      ctx.lineWidth = 1

      // Vertical lines
      for (let x = 0; x <= width; x += gridSize) {
        const wave = Math.sin(time * 0.001 + x * 0.01) * 2
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x + wave, height)
        ctx.stroke()
      }

      // Horizontal lines with perspective
      for (let y = 0; y <= height; y += gridSize) {
        const yOffset = Math.sin(time * 0.0008 + y * 0.005) * 3
        ctx.beginPath()
        ctx.moveTo(0, y + yOffset)
        ctx.lineTo(width, y + yOffset)
        ctx.stroke()
      }

      // Glow effect on mouse position
      const gradient = ctx.createRadialGradient(
        mouseRef.current.x,
        mouseRef.current.y,
        0,
        mouseRef.current.x,
        mouseRef.current.y,
        200
      )
      gradient.addColorStop(0, `oklch(0.85 0.18 195 / 0.08)`)
      gradient.addColorStop(1, `transparent`)
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }

    const drawParticles = (time: number) => {
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around screen
        const rect = canvas.getBoundingClientRect()
        if (particle.x < 0) particle.x = rect.width
        if (particle.x > rect.width) particle.x = 0
        if (particle.y < 0) particle.y = rect.height
        if (particle.y > rect.height) particle.y = 0

        // Pulsing opacity
        const pulse = Math.sin(time * 0.002 + particle.x * 0.01) * 0.2 + 0.8

        // Draw particle with glow
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `oklch(0.85 0.18 ${particle.hue} / ${particle.opacity * pulse})`
        ctx.fill()

        // Glow effect
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2)
        ctx.fillStyle = `oklch(0.85 0.18 ${particle.hue} / ${particle.opacity * pulse * 0.2})`
        ctx.fill()
      })
    }

    const drawConnections = () => {
      const particles = particlesRef.current
      const maxDistance = 100

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < maxDistance) {
            const opacity = (1 - distance / maxDistance) * 0.15
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `oklch(0.85 0.18 195 / ${opacity})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }
    }

    const animate = (time: number) => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Background
      ctx.fillStyle = `oklch(0.06 0.02 270)`
      ctx.fillRect(0, 0, rect.width, rect.height)

      drawGrid(rect.width, rect.height, time)
      drawConnections()
      drawParticles(time)

      animationRef.current = requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)
    window.addEventListener("mousemove", handleMouseMove)
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      window.removeEventListener("mousemove", handleMouseMove)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [initParticles])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  )
}
