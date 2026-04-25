import type { InputState } from "@/types/game"

export type InputCallback = (input: InputState) => void

interface InputHandlerOptions {
  onInputChange: InputCallback
}

export class InputHandler {
  private input: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    dash: false,
    ability: false,
  }

  private onInputChange: InputCallback
  private keyMap: Map<string, keyof InputState> = new Map()
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private boundHandleKeyUp: (e: KeyboardEvent) => void
  private isAttached = false

  constructor(options: InputHandlerOptions) {
    this.onInputChange = options.onInputChange

    // Set up key mappings
    this.keyMap.set("KeyW", "up")
    this.keyMap.set("ArrowUp", "up")
    this.keyMap.set("KeyS", "down")
    this.keyMap.set("ArrowDown", "down")
    this.keyMap.set("KeyA", "left")
    this.keyMap.set("ArrowLeft", "left")
    this.keyMap.set("KeyD", "right")
    this.keyMap.set("ArrowRight", "right")
    this.keyMap.set("Space", "dash")
    this.keyMap.set("KeyE", "ability")
    this.keyMap.set("ShiftLeft", "ability")
    this.keyMap.set("ShiftRight", "ability")

    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleKeyUp = this.handleKeyUp.bind(this)
  }

  attach() {
    if (this.isAttached) return

    window.addEventListener("keydown", this.boundHandleKeyDown)
    window.addEventListener("keyup", this.boundHandleKeyUp)
    window.addEventListener("blur", this.handleBlur.bind(this))
    this.isAttached = true
  }

  detach() {
    if (!this.isAttached) return

    window.removeEventListener("keydown", this.boundHandleKeyDown)
    window.removeEventListener("keyup", this.boundHandleKeyUp)
    window.removeEventListener("blur", this.handleBlur.bind(this))
    this.isAttached = false
    this.resetInput()
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return
    }

    const action = this.keyMap.get(e.code)
    if (action && !this.input[action]) {
      e.preventDefault()
      this.input[action] = true
      this.onInputChange({ ...this.input })
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    const action = this.keyMap.get(e.code)
    if (action && this.input[action]) {
      this.input[action] = false
      this.onInputChange({ ...this.input })
    }
  }

  private handleBlur() {
    // Reset all inputs when window loses focus
    this.resetInput()
  }

  private resetInput() {
    const wasActive = Object.values(this.input).some((v) => v)
    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
      dash: false,
      ability: false,
    }
    if (wasActive) {
      this.onInputChange({ ...this.input })
    }
  }

  // For mobile controls
  setDirection(dx: number, dy: number) {
    const threshold = 0.3
    const newInput = {
      ...this.input,
      up: dy < -threshold,
      down: dy > threshold,
      left: dx < -threshold,
      right: dx > threshold,
    }

    if (
      newInput.up !== this.input.up ||
      newInput.down !== this.input.down ||
      newInput.left !== this.input.left ||
      newInput.right !== this.input.right
    ) {
      this.input = newInput
      this.onInputChange({ ...this.input })
    }
  }

  setDash(active: boolean) {
    if (this.input.dash !== active) {
      this.input.dash = active
      this.onInputChange({ ...this.input })
    }
  }

  setAbility(active: boolean) {
    if (this.input.ability !== active) {
      this.input.ability = active
      this.onInputChange({ ...this.input })
    }
  }

  getInput(): InputState {
    return { ...this.input }
  }
}
