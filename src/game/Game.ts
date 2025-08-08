import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { Input } from './Input'
import { Player } from './Player'
import { EnemyManager } from './EnemyManager'
import { HUD } from './HUD'

export class Game {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private clock: THREE.Clock

  // Physics
  private world: CANNON.World

  // Entities
  private player: Player
  private enemies: EnemyManager

  // Helpers
  private input: Input
  private hud: HUD

  private backgroundColor = new THREE.Color('#0b0e14')
  private isRunning = true
  private accumulator = 0
  private readonly fixedTimeStep = 1 / 60
  private readonly maxSubSteps = 3

  constructor(container: HTMLElement) {
    this.container = container

    this.scene = new THREE.Scene()
    this.scene.background = this.backgroundColor
    this.clock = new THREE.Clock()

    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 500)
    this.camera.position.set(0, 2, 6)

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.container.appendChild(this.renderer.domElement)

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    this.scene.add(ambient)

    const dir = new THREE.DirectionalLight(0xffffff, 1.0)
    dir.position.set(6, 10, 4)
    dir.castShadow = true
    dir.shadow.mapSize.set(2048, 2048)
    dir.shadow.camera.near = 1
    dir.shadow.camera.far = 40
    dir.shadow.camera.left = -20
    dir.shadow.camera.right = 20
    dir.shadow.camera.top = 20
    dir.shadow.camera.bottom = -20
    this.scene.add(dir)

    // Physics world
    this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) })

    // Ground (visual)
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.95, metalness: 0.0 })
    const groundGeo = new THREE.PlaneGeometry(200, 200)
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.rotation.x = -Math.PI / 2
    groundMesh.receiveShadow = true
    this.scene.add(groundMesh)

    // Ground (physics)
    const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane(), material: new CANNON.Material('ground') })
    groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0)
    this.world.addBody(groundBody)

    // Subtle environment mesh
    const grid = new THREE.GridHelper(200, 200, 0x334, 0x224)
    ;(grid.material as THREE.Material).transparent = true
    ;(grid.material as THREE.Material).opacity = 0.35
    this.scene.add(grid)

    // Systems
    this.input = new Input(this.renderer.domElement)
    this.hud = new HUD(document.body)

    // Entities
    this.player = new Player({ scene: this.scene, world: this.world, input: this.input, camera: this.camera, hud: this.hud })
    this.enemies = new EnemyManager({ scene: this.scene, world: this.world, player: this.player })

    this.handleResize()
    this.loop = this.loop.bind(this)
    requestAnimationFrame(this.loop)
  }

  handleResize() {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }

  private loop() {
    if (!this.isRunning) return

    const dt = this.clock.getDelta()

    // Fixed-step physics
    this.accumulator += dt
    let substeps = 0
    while (this.accumulator >= this.fixedTimeStep && substeps < this.maxSubSteps) {
      this.world.step(this.fixedTimeStep)
      this.player.fixedUpdate(this.fixedTimeStep)
      this.enemies.fixedUpdate(this.fixedTimeStep)
      this.accumulator -= this.fixedTimeStep
      substeps++
    }

    // Variable-step updates
    this.player.update(dt)
    this.enemies.update(dt)

    // Camera follow: smooth chase camera offset behind player
    const target = this.player.getPosition()
    const playerForward = this.player.getForward()
    const desired = target
      .clone()
      .add(new THREE.Vector3(0, 2.5, 0))
      .add(playerForward.clone().multiplyScalar(-6))

    this.camera.position.lerp(desired, 1 - Math.pow(0.001, dt))
    this.camera.lookAt(target.clone().add(new THREE.Vector3(0, 1, 0)))

    // Render
    this.renderer.render(this.scene, this.camera)

    requestAnimationFrame(this.loop)
  }
}