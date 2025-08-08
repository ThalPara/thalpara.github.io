import * as THREE from 'three'
import * as CANNON from 'cannon-es'

export type ProjectileDeps = {
  scene: THREE.Scene
  world: CANNON.World
  origin: THREE.Vector3
  direction: THREE.Vector3
}

export class Bullet {
  private world: CANNON.World
  private scene: THREE.Scene
  private mesh: THREE.Mesh
  private body: CANNON.Body
  private disposed = false

  private ttl = 3.0

  constructor(deps: ProjectileDeps) {
    this.world = deps.world
    this.scene = deps.scene

    const geo = new THREE.SphereGeometry(0.08, 12, 12)
    const mat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0x331100, emissiveIntensity: 0.6 })
    this.mesh = new THREE.Mesh(geo, mat)
    this.mesh.castShadow = true
    this.scene.add(this.mesh)

    const shape = new CANNON.Sphere(0.08)
    this.body = new CANNON.Body({ mass: 0.05, shape, position: new CANNON.Vec3(deps.origin.x, deps.origin.y, deps.origin.z), linearDamping: 0.01 })

    const speed = 22
    this.body.velocity.set(deps.direction.x * speed, deps.direction.y * speed, deps.direction.z * speed)

    this.body.addEventListener('collide', () => {
      // Mark for removal on any collision; enemy reacts via their own collision handler
      this.dispose()
    })

    this.world.addBody(this.body)
    this.sync()
  }

  fixedUpdate(dt: number) {
    this.ttl -= dt
    if (this.ttl <= 0) {
      this.dispose()
    }
  }

  update(_dt: number) {
    this.sync()
  }

  isDisposed(): boolean {
    return this.disposed
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