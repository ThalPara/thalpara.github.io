import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Input } from './Input'
import { HUD } from './HUD'
import { Bullet } from './Projectile'

export type PlayerDeps = {
  scene: THREE.Scene
  world: CANNON.World
  input: Input
  camera: THREE.Camera
  hud: HUD
}

export class Player {
  private world: CANNON.World
  private input: Input
  private hud: HUD
  private camera: THREE.Camera

  private mesh: THREE.Group
  private body: CANNON.Body

  private shootCooldown = 0
  private readonly shootInterval = 0.25

  private onGround = false
  private readonly moveForce = 110
  private readonly maxSpeed = 6
  private readonly jumpVelocity = 5.5

  private health = 100
  private readonly maxHealth = 100

  private bullets: Bullet[] = []

  constructor(deps: PlayerDeps) {
    this.world = deps.world
    this.input = deps.input
    this.camera = deps.camera
    this.hud = deps.hud

    // Visual: simple capsule-ish hero with color accents
    const group = new THREE.Group()

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x3a8fff, roughness: 0.5, metalness: 0.1 })
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xff4655, roughness: 0.4, metalness: 0.2 })

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 8, 16), bodyMat)
    torso.castShadow = true
    torso.position.y = 1.1
    group.add(torso)

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), trimMat)
    head.castShadow = true
    head.position.y = 2.0
    group.add(head)

    const shoulderL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), trimMat)
    shoulderL.position.set(-0.55, 1.5, 0)
    shoulderL.castShadow = true
    const shoulderR = shoulderL.clone()
    shoulderR.position.x = 0.55
    group.add(shoulderL, shoulderR)

    deps.scene.add(group)
    this.mesh = group

    // Physics: sphere approximation
    const shape = new CANNON.Sphere(0.5)
    this.body = new CANNON.Body({ mass: 8, shape, position: new CANNON.Vec3(0, 3, 0), linearDamping: 0.2 })

    this.body.addEventListener('collide', (e: any) => {
      const contact = e.contact
      // If we hit something below us, consider grounded
      if (contact && contact.ni) {
        // normal points from bi to bj; if it points up in world space, we likely hit the ground
        const worldNormal = contact.ni as CANNON.Vec3
        if (worldNormal.y > 0.5 || this.body.velocity.y === 0) {
          this.onGround = true
        }
      }
    })

    deps.world.addBody(this.body)

    this.syncMeshFromBody()

    this.hud.setHealth01(this.health / this.maxHealth)
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount)
    this.hud.setHealth01(this.health / this.maxHealth)
  }

  heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount)
    this.hud.setHealth01(this.health / this.maxHealth)
  }

  isDead(): boolean {
    return this.health <= 0
  }

  fixedUpdate(dt: number) {
    // Shooting cooldown
    if (this.shootCooldown > 0) this.shootCooldown -= dt

    // Movement
    const axis = this.input.getMoveAxis()

    // Determine forward/right vectors from camera projection onto ground plane
    const cameraForward = new THREE.Vector3()
    this.camera.getWorldDirection(cameraForward)
    cameraForward.y = 0
    cameraForward.normalize()
    const cameraRight = new THREE.Vector3().crossVectors(cameraForward, new THREE.Vector3(0, 1, 0)).negate()

    const wishDir = new THREE.Vector3()
    wishDir.addScaledVector(cameraForward, axis.y)
    wishDir.addScaledVector(cameraRight, axis.x)
    if (wishDir.lengthSq() > 0) wishDir.normalize()

    const force = new CANNON.Vec3(wishDir.x * this.moveForce, 0, wishDir.z * this.moveForce)
    this.body.applyForce(force)

    // Clamp horizontal speed
    const vel = this.body.velocity
    const horizSpeed = Math.hypot(vel.x, vel.z)
    if (horizSpeed > this.maxSpeed) {
      const scale = this.maxSpeed / horizSpeed
      vel.x *= scale
      vel.z *= scale
    }

    // Jump
    if (this.onGround && this.input.isJumping()) {
      vel.y = this.jumpVelocity
      this.onGround = false
    }

    // Shooting
    if (this.input.isShooting() && this.shootCooldown <= 0) {
      this.shoot()
      this.shootCooldown = this.shootInterval
    }

    // Update bullets physics-side
    for (const b of this.bullets) b.fixedUpdate(dt)

    this.syncMeshFromBody()

    // Orient the hero to face move direction if moving
    if (wishDir.lengthSq() > 0.0001) {
      const targetQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), wishDir)
      this.mesh.quaternion.slerp(targetQuat, 0.2)
    }
  }

  update(dt: number) {
    for (const b of this.bullets) b.update(dt)
    // Remove dead bullets
    this.bullets = this.bullets.filter((b) => !b.isDisposed())
  }

  private syncMeshFromBody() {
    this.mesh.position.set(this.body.position.x, this.body.position.y - 0.0, this.body.position.z)
  }

  private shoot() {
    const muzzle = this.getPosition().clone().add(new THREE.Vector3(0, 1.2, 0))
    const dir = this.getForward()
    const bullet = new Bullet({ scene: this.mesh.parent as THREE.Scene, world: this.world, origin: muzzle, direction: dir })
    this.bullets.push(bullet)
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z)
  }

  getForward(): THREE.Vector3 {
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(this.mesh.quaternion)
    fwd.y = 0
    return fwd.normalize()
  }

  getBody(): CANNON.Body {
    return this.body
  }

  getHealth(): number {
    return this.health
  }
}