export class Input {
  private keyDown: Set<string> = new Set()
  private mouseDownLeft = false
  private element: HTMLElement
  private pointerLocked = false

  constructor(element: HTMLElement) {
    this.element = element

    window.addEventListener('keydown', (e) => this.keyDown.add(e.code))
    window.addEventListener('keyup', (e) => this.keyDown.delete(e.code))

    this.element.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseDownLeft = true
      if (!this.pointerLocked) this.requestPointerLock()
    })
    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouseDownLeft = false
    })

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.element
    })
  }

  private requestPointerLock() {
    this.element.requestPointerLock?.()
  }

  isShooting(): boolean {
    return this.mouseDownLeft || this.keyDown.has('KeyF')
  }

  isJumping(): boolean {
    return this.keyDown.has('Space')
  }

  getMoveAxis(): { x: number; y: number } {
    let x = 0
    let y = 0
    if (this.keyDown.has('KeyA') || this.keyDown.has('ArrowLeft')) x -= 1
    if (this.keyDown.has('KeyD') || this.keyDown.has('ArrowRight')) x += 1
    if (this.keyDown.has('KeyW') || this.keyDown.has('ArrowUp')) y += 1
    if (this.keyDown.has('KeyS') || this.keyDown.has('ArrowDown')) y -= 1
    const len = Math.hypot(x, y)
    if (len > 0) {
      x /= len
      y /= len
    }
    return { x, y }
  }
}