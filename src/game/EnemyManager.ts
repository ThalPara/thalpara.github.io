import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Enemy } from './Enemy'
import { Player } from './Player'

export type EnemyManagerDeps = {
  scene: THREE.Scene
  world: CANNON.World
  player: Player
}

export class EnemyManager {
  private scene: THREE.Scene
  private world: CANNON.World
  private player: Player
  private enemies: Enemy[] = []

  private spawnTimer = 0
  private readonly spawnInterval = 2.5
  private readonly maxEnemies = 12

  constructor(deps: EnemyManagerDeps) {
    this.scene = deps.scene
    this.world = deps.world
    this.player = deps.player
  }

  fixedUpdate(dt: number) {
    // Spawn logic
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0 && this.enemies.length < this.maxEnemies) {
      this.spawnAroundPlayer()
      this.spawnTimer = this.spawnInterval
    }

    // Update enemies
    const playerPos = this.player.getPosition()
    for (const e of this.enemies) e.fixedUpdate(dt, playerPos)

    // Contact damage if close
    for (const e of this.enemies) {
      const d = e.getPosition().distanceToSquared(playerPos)
      if (d < 1.0) {
        this.player.takeDamage(5 * dt)
      }
    }

    // Cleanup
    this.enemies = this.enemies.filter((e) => !e.isDead())
  }

  update(_dt: number) {}

  private spawnAroundPlayer() {
    const center = this.player.getPosition()
    const radius = 10 + Math.random() * 15
    const angle = Math.random() * Math.PI * 2
    const pos = new THREE.Vector3(center.x + Math.cos(angle) * radius, 2, center.z + Math.sin(angle) * radius)

    const enemy = new Enemy({ scene: this.scene, world: this.world, position: pos })
    this.enemies.push(enemy)
  }
}