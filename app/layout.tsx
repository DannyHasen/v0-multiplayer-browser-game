import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({ 
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({ 
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: 'Neon Drift Arena | Real-Time Multiplayer Browser Game',
  description: 'Fast-paced multiplayer action in a neon cyber-arcade. Control glowing hovercrafts, collect energy orbs, and outmaneuver opponents in 3-minute matches.',
  keywords: ['multiplayer game', 'browser game', 'real-time', 'arcade', 'neon', 'action game'],
  authors: [{ name: 'Neon Drift Arena' }],
  openGraph: {
    title: 'Neon Drift Arena',
    description: 'Fast-paced multiplayer action in a neon cyber-arcade',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Neon Drift Arena',
    description: 'Fast-paced multiplayer action in a neon cyber-arcade',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#00ffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark bg-background`}>
      <body className="font-sans antialiased min-h-screen overflow-x-hidden">
        {children}
        <Toaster 
          position="top-center"
          toastOptions={{
            style: {
              background: 'oklch(0.12 0.02 270)',
              border: '1px solid oklch(0.25 0.04 280)',
              color: 'oklch(0.95 0.01 270)',
            },
          }}
        />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
