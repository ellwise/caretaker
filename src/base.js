import * as CANNON from "cannon-es"
import * as dat from "lil-gui"
import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { OutlineEffect } from "three/examples/jsm/effects/OutlineEffect.js"
import Stats from "three/examples/jsm/libs/stats.module.js"
import { Vector3 } from "three"
import { concretePlasticContact, defaultDefaultContact, plasticPlasticContact } from "./utils/materials.js"
import { horizon } from "./parameters.js"
import {water0, water1, water2, water3, water4} from "./utils/colours.js"


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
scene.fog = new THREE.FogExp2(water0, 0.01)
scene.background = new THREE.Color(water0)
//scene.add(new THREE.AxesHelper(10))

// Base camera
const camera = new THREE.PerspectiveCamera(27, sizes.width / sizes.height, 0.1, 2 * horizon)
camera.position.set(-60, 30, 60)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new Vector3(0, 10, 0)
controls.enableDamping = true
controls.enablePan = false
controls.minPolarAngle = -Math.PI / 2
controls.maxPolarAngle = Math.PI / 2
controls.minDistance = 30
controls.maxDistance = 150

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true, // no effect on post-processing pipelines?
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
// renderer.toneMapping = THREE.CineonToneMapping
//renderer.toneMappingExposure = 10
const effect = new OutlineEffect(renderer, { defaultThickness: 0.005 })

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

export { camera, controls, gui, mouse, scene, stats, world, renderer, effect }
