import './style.css'
import { Game } from './game/Game'

const container = document.querySelector<HTMLDivElement>('#app')!

const game = new Game(container)

window.addEventListener('resize', () => game.handleResize())

// Expose for quick debug
// @ts-expect-error attach for dev convenience
window.game = game
