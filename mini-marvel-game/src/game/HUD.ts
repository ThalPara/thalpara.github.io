export class HUD {
  private root: HTMLDivElement
  private healthFill: HTMLDivElement
  private enemyText: HTMLDivElement

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div')
    this.root.id = 'hud'
    this.root.innerHTML = `
      <div class="hud-row">
        <div class="health">
          <div class="health-fill" style="width: 100%"></div>
          <div class="health-label">HEALTH</div>
        </div>
        <div class="spacer"></div>
        <div class="enemy">
          <div class="enemy-label">ENEMIES</div>
          <div class="enemy-count">0</div>
        </div>
      </div>
      <div class="tips">WASD to move · Space to jump · Click/F to shoot</div>
      <div class="crosshair"></div>
    `
    parent.appendChild(this.root)

    this.healthFill = this.root.querySelector('.health-fill') as HTMLDivElement
    this.enemyText = this.root.querySelector('.enemy-count') as HTMLDivElement
  }

  setHealth01(value01: number) {
    const clamped = Math.max(0, Math.min(1, value01))
    this.healthFill.style.width = `${clamped * 100}%`
    this.healthFill.style.background = clamped > 0.5 ? '#3bd16f' : clamped > 0.25 ? '#ffcf5a' : '#ff5d5d'
  }

  setEnemyCount(count: number) {
    this.enemyText.textContent = String(count)
  }
}