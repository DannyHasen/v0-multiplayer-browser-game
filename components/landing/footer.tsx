"use client"

import Link from "next/link"
import { Zap } from "lucide-react"

export function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-border">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary" />
            <span className="font-bold text-lg">
              <span className="text-primary">NEON</span> DRIFT
            </span>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-to-play" className="hover:text-foreground transition-colors">
              How to Play
            </Link>
            <Link href="/play" className="hover:text-primary transition-colors">
              Play Now
            </Link>
          </nav>

          {/* Copyright */}
          <div className="text-sm text-muted-foreground">
            Built with PartyKit + Next.js
          </div>
        </div>
      </div>
    </footer>
  )
}
