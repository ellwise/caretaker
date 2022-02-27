import * as CANNON from "cannon-es"
import * as dat from "lil-gui"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js"
import Stats from "three/examples/jsm/libs/stats.module.js"
import { Vector3 } from "three"
import { concretePlasticContact, defaultDefaultContact, plasticPlasticContact } from "./materials.js"

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
}
const canvas = document.querySelector("canvas.webgl")

// Stats
const stats = new Stats()
document.body.appendChild(stats.dom)

// Scene
const scene = new THREE.Scene()
const axes = new THREE.AxesHelper(10)
scene.add(axes)

// Base camera
const camera = new THREE.PerspectiveCamera(27, sizes.width / sizes.height, 0.1, 500)
camera.position.set(-60, 30, 60)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new Vector3(0, 5, 0)
controls.enableDamping = true
controls.enablePan = false

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0xc7fdf7) // background color
const effect = new OutlineEffect(renderer, {defaultThickness: 0.005})

// Mouse
const mouse = new THREE.Vector2()
window.addEventListener("mousemove", event => {
  mouse.x = (event.clientX / sizes.width) * 2 - 1
  mouse.y = (-event.clientY / sizes.height) * 2 + 1
})

// Sizes
window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth
  sizes.height = window.innerHeight

  // Update camera
  camera.aspect = sizes.width / sizes.height
  camera.updateProjectionMatrix()

  // Update renderer
  renderer.setSize(sizes.width, sizes.height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

// Physics World
const world = new CANNON.World()
world.broadphase = new CANNON.SAPBroadphase(world) // GridBroadphase(world)  //
world.broadphase.useBoundingBoxes = true
world.allowSleep = false // to ensure we keep colliding when things stop moving
world.solver.iterations = 10 // default is 10

world.addContactMaterial(concretePlasticContact)
world.addContactMaterial(plasticPlasticContact)
world.addContactMaterial(defaultDefaultContact)
world.defaultContactMaterial = defaultDefaultContact

// GUI for debugging things
const gui = new dat.GUI()

export { camera, controls, effect, gui, mouse, scene, stats, world }
