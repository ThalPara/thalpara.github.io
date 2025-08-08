import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export type EnemyDeps = {
  scene: THREE.Scene
  world: CANNON.World
  position: THREE.Vector3
}

export class Enemy {
  private world: CANNON.World
  private scene: THREE.Scene
  private mesh: THREE.Mesh
  private body: CANNON.Body
  private health = 30
  private disposed = false

  private readonly speed = 55

  constructor(deps: EnemyDeps) {
    this.world = deps.world
    this.scene = deps.scene

    const geo = new THREE.IcosahedronGeometry(0.5, 1)
    const mat = new THREE.MeshStandardMaterial({ color: 0x9d4edd, roughness: 0.8, metalness: 0.0 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    this.scene.add(this.mesh)

    const shape = new CANNON.Sphere(0.5)
    this.body = new CANNON.Body({ mass: 5, shape, position: new CANNON.Vec3(deps.position.x, deps.position.y, deps.position.z), linearDamping: 0.15 })

    // React to bullets and player via collisions
    this.body.addEventListener('collide', (e: any) => {
      const other = e.body as CANNON.Body
      // Heuristic: small-mass fast bodies are bullets
      if (other.mass > 0 && other.mass < 0.2) {
        this.takeDamage(20)
      }
    })

    this.world.addBody(this.body)
    this.sync()
  }

  fixedUpdate(_dt: number, playerPos: THREE.Vector3) {
    // Seek the player with a simple force
    const dir = new THREE.Vector3(playerPos.x - this.body.position.x, 0, playerPos.z - this.body.position.z)
    const len = dir.length()
    if (len > 0.001) dir.multiplyScalar(1 / len)

    const force = new CANNON.Vec3(dir.x * this.speed, 0, dir.z * this.speed)
    this.body.applyForce(force)

    // Face the player
    if (len > 0.001) {
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir)
      this.mesh.quaternion.slerp(targetQuat, 0.15)
    }

    this.sync()
  }

  update(_dt: number) {}

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z)
  }

  getBody(): CANNON.Body {
    return this.body
  }

  isDead(): boolean {
    return this.health <= 0 || this.disposed
  }

  takeDamage(amount: number) {
    if (this.disposed) return
    this.health -= amount
    if (this.health <= 0) this.dispose()
  }

  private sync() {
    this.mesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z)
  }

  dispose() {
    if (this.disposed) return
    this.disposed = true
    this.world.removeBody(this.body)
    this.scene.remove(this.mesh)
    ;(this.mesh.geometry as THREE.BufferGeometry).dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}