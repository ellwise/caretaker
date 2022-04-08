import * as CANNON from "cannon-es"
import * as THREE from "three"
import { plasticMaterial } from "./utils/materials.js"
import { MeshBody } from "./utils/MeshBody.js"
import { scene, world } from "./base.js"

const numShades = 6
const seedColor = 0xff3333 // hsl(0, 1, 0.6)

const createSphere = (radius, position, rowNum, mass, colour) => {
  // geometry
  const widthSegments = 32
  const heightSegments = 32
  const geometry = new THREE.SphereGeometry(radius, widthSegments, heightSegments)

  // mesh
  if (colour === undefined) {
    colour = new THREE.Color(seedColor)
    if (rowNum !== undefined) {
      colour.setHSL(0.012 * rowNum % 360, 1, 0.6)
    }
  }
  const shades = new Uint8Array(numShades)
  for (let j = 0; j <= shades.length; j++) {
    shades[j] = (j / shades.length) * 256
  }
  const gradientMap = new THREE.DataTexture(shades, shades.length, 1, THREE.RedFormat)
  gradientMap.needsUpdate = true
  const material = new THREE.MeshToonMaterial({ color: colour, gradientMap: gradientMap })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  if (position === undefined) {
    mesh.position.set(0, 25, 0)
  } else {
    mesh.position.set(position.x, position.y + 2 * radius, position.z)
  }

  // shape
  const shape = new CANNON.Sphere(radius)

  // body
  const body = new CANNON.Body({
    mass: mass !== undefined ? mass : 1.333 * radius * radius * radius * Math.PI,
    shape: shape,
    material: plasticMaterial,
    angularDamping: 0.8,
    linearDamping: 0.2,
  })
  body.position.set(...mesh.position)

  return { mesh: mesh, body: body }
}

const linkSpheres = (s1, s2, radius, world) => {
  const pointConstraint = new CANNON.DistanceConstraint(
    s1, s2, 1.05 * 2 * radius,
  )
  world.addConstraint(pointConstraint)
}

const repelSpheres = (s1, s2, world) => {
  const spring = new CANNON.Spring(s1, s2, {
    localAnchorA: new CANNON.Vec3(0, 0, 0),
    localAnchorB: new CANNON.Vec3(0, 0, 0),
    restLength: 100,
    stiffness: 25,
    damping: 100,
  })

  // Compute the force after each step
  world.addEventListener("postStep", (event) => spring.applyForce())
}

const addSeed = (position) => {
  // colour the new face
  const colour = new THREE.Color(seedColor)
  colour.setHSL(Math.random(), 1, 0.6)
  const isPolyp = true // Math.random() > 0.5
  const radius = isPolyp ? 0.5 : 1
  const { mesh, body } = createSphere(radius, undefined, undefined, 0, colour)
  mesh.position.copy(position)
  body.position.copy(position)
  return { mesh: mesh, body: body, isPolyp: isPolyp }
}

export { createSphere, linkSpheres, repelSpheres, addSeed }

/*
params.jiggleBalls = () => {
  for (const pair of updateList) {
    pair.body.velocity.set(
      normRandom() * params.sphereVelocity,
      normRandom() * 5,
      normRandom() * params.sphereVelocity,
    )
  }
}
gui.add(params, "jiggleBalls")
params.jiggleBalls()

params.growBalls = () => {
  params.jiggleBalls()
  for (const pair of updateList) {
    const shape = pair.body.shapes[0]
    pair.body.removeShape(shape)
    shape.radius *= 1.05
    pair.body.addShape(shape)
    pair.mesh.scale.x *= 1.05
    pair.mesh.scale.y *= 1.05
    pair.mesh.scale.z *= 1.05
  }
}
gui.add(params, "growBalls")
params.growBalls()
*/

const transitionAge = 3

export class Coral {
  constructor (t, position) {
    this.birth = t
    this.age = 0
    const { mesh, body, isPolyp } = addSeed(position)
    const pair = new MeshBody(mesh, body)
    pair.addTo(scene, world)
    this.meshbody = pair
    this.isPolyp = isPolyp
    this.bleached = 0
    // this.faceIndex = selected.faceIndex
    this.growthSpurts = 0
    this.hasBred = false
  }

  grow () {} // run a simulation then freeze mesh/body
  update (t) {
    this.age = t - this.birth
    this.isPolyp = this.age < transitionAge
    const scale = 1.75
    let grow = false
    if (this.growthSpurts === 0 && this.age > transitionAge) {
      grow = true
      this.growthSpurts = 1
    } else if (this.growthSpurts === 1 && this.age > 2 * transitionAge) {
      grow = true
      this.growthSpurts = 2
    }
    if (grow) {
      this.meshbody.mesh.scale.x *= scale
      this.meshbody.mesh.scale.y *= scale
      this.meshbody.mesh.scale.z *= scale
      const shape = this.meshbody.body.shapes[0]
      this.meshbody.body.removeShape(shape)
      shape.radius *= scale
      this.meshbody.body.addShape(shape)
    }
    if (this.age > 3 * transitionAge) {
      this.meshbody.mesh.material.color = new THREE.Color(0xffffff)
      this.bleached += 1
    }
  } // grow at a certain age, respond to environment
}
