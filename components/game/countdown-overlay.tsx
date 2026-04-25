"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"

interface CountdownOverlayProps {
  startTime: number
  onComplete: () => void
}

export function CountdownOverlay({ startTime, onComplete }: CountdownOverlayProps) {
  const [count, setCount] = useState<number | "GO">(3)

  useEffect(() => {
    const updateCount = () => {
      const now = Date.now()
      const remaining = Math.ceil((startTime - now) / 1000)

      if (remaining <= 0) {
        setCount("GO")
        setTimeout(onComplete, 800)
      } else if (remaining <= 3) {
        setCount(remaining)
      }
    }

    updateCount()
    const interval = setInterval(updateCount, 100)

    return () => clearInterval(interval)
  }, [startTime, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={count}
          initial={{ scale: 2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ 
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className={`text-9xl font-bold ${
            count === "GO" 
              ? "text-primary neon-text-cyan" 
              : "text-foreground"
          }`}
        >
          {count}
        </motion.div>
      </AnimatePresence>

      {/* Pulse rings */}
      <motion.div
        initial={{ scale: 0.5, opacity: 1 }}
        animate={{ scale: 3, opacity: 0 }}
        transition={{ duration: 1, repeat: Infinity }}
        className="absolute w-32 h-32 rounded-full border-2 border-primary/50"
      />
    </motion.div>
  )
}
