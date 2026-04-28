export type GameSound =
  | "pickup"
  | "powerup"
  | "boost"
  | "shield"
  | "freeze"
  | "burn"
  | "bomb"
  | "heal"
  | "maxHealth"
  | "hit"
  | "respawnTick"
  | "respawn"
  | "countdown"

let audioContext: AudioContext | null = null
let unlockListenersAttached = false
let wantsBackgroundMusic = false
let backgroundGain: GainNode | null = null
let backgroundFilter: BiquadFilterNode | null = null
let backgroundOscillators: OscillatorNode[] = []
let backgroundPatternTimer: number | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null

  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext

    if (!AudioContextClass) return null
    audioContext = new AudioContextClass()
  }

  return audioContext
}

function stopUnlockListeners(): void {
  if (typeof window === "undefined") return
  window.removeEventListener("pointerdown", unlockGameAudio)
  window.removeEventListener("keydown", unlockGameAudio)
  window.removeEventListener("touchstart", unlockGameAudio)
  unlockListenersAttached = false
}

function unlockGameAudio(): void {
  const context = getAudioContext()
  if (!context) return

  void context.resume().then(() => {
    stopUnlockListeners()
    if (wantsBackgroundMusic) {
      startBackgroundMusic()
    }
  })
}

export function primeGameAudio(): void {
  if (typeof window === "undefined" || unlockListenersAttached) return

  const context = getAudioContext()
  if (!context || context.state !== "suspended") return

  window.addEventListener("pointerdown", unlockGameAudio, { passive: true })
  window.addEventListener("keydown", unlockGameAudio)
  window.addEventListener("touchstart", unlockGameAudio, { passive: true })
  unlockListenersAttached = true
}

function scheduleTone(
  frequency: number,
  durationMs: number,
  delayMs = 0,
  type: OscillatorType = "sine",
  volume = 0.035,
  destination?: AudioNode
): void {
  const context = getAudioContext()
  if (!context || context.state === "suspended") return

  const oscillator = context.createOscillator()
  const gain = context.createGain()
  const start = context.currentTime + delayMs / 1000
  const end = start + durationMs / 1000

  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  oscillator.connect(gain)
  gain.connect(destination ?? context.destination)
  oscillator.start(start)
  oscillator.stop(end + 0.03)
}

function scheduleNoise(
  durationMs: number,
  delayMs = 0,
  volume = 0.035,
  filterFrequency = 900
): void {
  const context = getAudioContext()
  if (!context || context.state === "suspended") return

  const frameCount = Math.max(1, Math.floor(context.sampleRate * (durationMs / 1000)))
  const buffer = context.createBuffer(1, frameCount, context.sampleRate)
  const channel = buffer.getChannelData(0)
  for (let index = 0; index < frameCount; index += 1) {
    channel[index] = (Math.random() * 2 - 1) * (1 - index / frameCount)
  }

  const source = context.createBufferSource()
  const filter = context.createBiquadFilter()
  const gain = context.createGain()
  const start = context.currentTime + delayMs / 1000
  const end = start + durationMs / 1000

  source.buffer = buffer
  filter.type = "lowpass"
  filter.frequency.setValueAtTime(filterFrequency, start)
  gain.gain.setValueAtTime(volume, start)
  gain.gain.exponentialRampToValueAtTime(0.0001, end)

  source.connect(filter)
  filter.connect(gain)
  gain.connect(context.destination)
  source.start(start)
  source.stop(end + 0.02)
}

export function playGameSound(sound: GameSound): void {
  primeGameAudio()

  switch (sound) {
    case "pickup":
      scheduleTone(660, 70, 0, "triangle", 0.03)
      scheduleTone(990, 90, 55, "triangle", 0.026)
      break
    case "powerup":
      scheduleTone(392, 80, 0, "square", 0.022)
      scheduleTone(587, 100, 85, "triangle", 0.03)
      scheduleTone(880, 120, 175, "triangle", 0.028)
      break
    case "boost":
      scheduleTone(420, 55, 0, "sawtooth", 0.02)
      scheduleTone(630, 65, 50, "sawtooth", 0.024)
      scheduleTone(945, 95, 110, "triangle", 0.026)
      break
    case "shield":
      scheduleTone(220, 140, 0, "sine", 0.026)
      scheduleTone(440, 180, 45, "sine", 0.022)
      break
    case "freeze":
      scheduleTone(880, 70, 0, "triangle", 0.022)
      scheduleTone(1174.66, 90, 70, "triangle", 0.02)
      scheduleTone(1760, 120, 150, "sine", 0.018)
      break
    case "burn":
      scheduleNoise(120, 0, 0.03, 1600)
      scheduleTone(330, 120, 30, "sawtooth", 0.024)
      scheduleTone(220, 160, 125, "sawtooth", 0.02)
      break
    case "bomb":
      scheduleTone(110, 110, 0, "square", 0.03)
      scheduleTone(82.41, 180, 130, "sawtooth", 0.026)
      break
    case "heal":
      scheduleTone(523.25, 90, 0, "sine", 0.024)
      scheduleTone(659.25, 100, 80, "sine", 0.024)
      scheduleTone(783.99, 120, 170, "sine", 0.022)
      break
    case "maxHealth":
      scheduleTone(392, 110, 0, "triangle", 0.026)
      scheduleTone(587, 120, 100, "triangle", 0.028)
      scheduleTone(784, 170, 220, "triangle", 0.026)
      break
    case "hit":
      scheduleNoise(90, 0, 0.04, 650)
      scheduleTone(128, 120, 0, "sawtooth", 0.022)
      break
    case "respawnTick":
      scheduleTone(420, 90, 0, "square", 0.024)
      break
    case "respawn":
      scheduleTone(440, 90, 0, "triangle", 0.028)
      scheduleTone(660, 120, 90, "triangle", 0.03)
      scheduleTone(990, 150, 210, "triangle", 0.026)
      break
    case "countdown":
      scheduleTone(330, 120, 0, "square", 0.026)
      scheduleTone(330, 120, 1000, "square", 0.026)
      scheduleTone(330, 120, 2000, "square", 0.026)
      scheduleTone(660, 220, 3000, "triangle", 0.035)
      break
  }
}

function scheduleBackgroundPattern(): void {
  if (!backgroundGain) return

  const notes = [220, 277.18, 329.63, 415.3]
  notes.forEach((note, index) => {
    scheduleTone(note, 180, index * 135, "triangle", 0.28, backgroundGain ?? undefined)
  })
}

export function startBackgroundMusic(): void {
  wantsBackgroundMusic = true
  primeGameAudio()

  const context = getAudioContext()
  if (!context || context.state === "suspended" || backgroundGain) return

  backgroundGain = context.createGain()
  backgroundFilter = context.createBiquadFilter()
  backgroundFilter.type = "lowpass"
  backgroundFilter.frequency.value = 700
  backgroundGain.gain.value = 0.014
  backgroundFilter.connect(backgroundGain)
  backgroundGain.connect(context.destination)

  const padFrequencies = [55, 82.41, 110]
  backgroundOscillators = padFrequencies.map((frequency, index) => {
    const oscillator = context.createOscillator()
    oscillator.type = index === 1 ? "triangle" : "sine"
    oscillator.frequency.value = frequency
    oscillator.connect(backgroundFilter!)
    oscillator.start()
    return oscillator
  })

  scheduleBackgroundPattern()
  backgroundPatternTimer = window.setInterval(scheduleBackgroundPattern, 4200)
}

export function stopBackgroundMusic(): void {
  wantsBackgroundMusic = false

  if (typeof window !== "undefined" && backgroundPatternTimer !== null) {
    window.clearInterval(backgroundPatternTimer)
  }
  backgroundPatternTimer = null

  backgroundOscillators.forEach((oscillator) => {
    try {
      oscillator.stop()
    } catch {
      // Oscillators can only be stopped once.
    }
    oscillator.disconnect()
  })
  backgroundOscillators = []

  backgroundFilter?.disconnect()
  backgroundGain?.disconnect()
  backgroundFilter = null
  backgroundGain = null
}
