import * as CANNON from "cannon-es"
import * as THREE from "three"
import { Vector3 } from "three"
import { camera, controls, effect, gui, scene, stats, world } from "./base.js"
import { defaultMaterial, plasticMaterial } from "./materials.js"
import { rockMesh, rockBody } from "./rock.js"

const params = {

  floorSize: 50,
  sphereVelocity: 20,
  gravity: 9.81, // positive = upwards (buoyancy)
  replicationFactor: 0.4,
}

/**
 * Aux Functions
 */
const normRandom = () => {
  return (Math.random() - 0.5) * 2
}

/**
 * Debug
 */

world.gravity.set(0, params.gravity, 0) // si earth gravity
gui.add(params, "gravity", 0, 2 * params.gravity, 0.01).onChange(v => world.gravity.set(0, params.gravity, 0))
/**
 * Textures
 */
// const textureLoader = new THREE.TextureLoader()
// const cubeTextureLoader = new THREE.CubeTextureLoader()

/*
const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])
const objectTexture = textureLoader.load('/textures/1.png')
*/

/**
 * Update List
 */
// Holds object references to mesh and physics objects
// each element has a mesh and a body properties
const updateList = []

/**
 * Spheres
 */
const sphereGeo = new THREE.SphereGeometry(1, 32, 32)

const linkBodyMesh = (body, mesh) => {
  // raycast reference
  mesh.bodyID = updateList.length
  body.meshID = updateList.length
  // update list
  updateList.push({ mesh: mesh, body: body })
  // body.linearFactor = new CANNON.Vec3(0,0,0)
}

/*
const texture = new THREE.TextureLoader()
texture.load('textures/fourTone.jpg')
texture.minFilter = THREE.NearestFilter
texture.magFilter = THREE.NearestFilter
console.log(texture)
*/

const createSphere = (radius, position, rowNum) => {
  // Mesh
  const colour = new THREE.Color()
  rowNum === undefined ? colour.setHSL(0, 1, 0.6) : colour.setHSL(0.02 * rowNum % 360, 1, 0.6)
  const sphereMaterial = new THREE.MeshToonMaterial()
  sphereMaterial.color = colour
  // sphereMaterial.gradientMap = texture
  const sphereMesh = new THREE.Mesh(sphereGeo, sphereMaterial)
  sphereMesh.castShadow = true
  sphereMesh.scale.set(radius, radius, radius)
  if (position === undefined) {
    sphereMesh.position.set(0, 1, 0)
  } else {
    sphereMesh.position.set(position.x, position.y + 2 * radius, position.z)
  }
  scene.add(sphereMesh)

  // Physics
  const sphereShape = new CANNON.Sphere(radius)
  const sphereBody = new CANNON.Body({
    mass: 1.333 * radius * radius * radius * Math.PI, /* * Math.random() + .5, */
    shape: sphereShape,
    material: plasticMaterial,
    angularDamping: 0.8,
    linearDamping: 0.2,
  })
  sphereBody.position.copy(sphereMesh.position)
  world.addBody(sphereBody)
  linkBodyMesh(sphereBody, sphereMesh)

  return sphereBody
}

const linkSpheres = (s1, s2, radius) => {
  const pointConstraint = new CANNON.DistanceConstraint(
    s1, s2, 1.05 * 2 * radius,
  )
  world.addConstraint(pointConstraint)
}

const spheres = [[]]

const radius = 1
const s01 = createSphere(radius)
const s02 = createSphere(radius)
const s03 = createSphere(radius)
const s04 = createSphere(radius)
const s05 = createSphere(radius)
spheres[0].push(s01, s02, s03, s04, s05)

// link first row
linkSpheres(s01, s02, radius)
linkSpheres(s02, s03, radius)
linkSpheres(s03, s04, radius)
linkSpheres(s04, s05, radius)

const repelSpheres = (s1, s2) => {
  const spring = new CANNON.Spring(s1, s2, {
    localAnchorA: new CANNON.Vec3(0, 0, 0),
    localAnchorB: new CANNON.Vec3(0, 0, 0),
    restLength: 100,
    stiffness: 25,
    damping: 100,
  })

  // Compute the force after each step
  world.addEventListener("postStep", (event) => {
    spring.applyForce()
  })
}

gui.add(params, "replicationFactor", 0, 1, 0.01).onChange(v => { params.replicationFactor = v })

params.growSheet = () => {
  // add a new row of spheres
  const newSpheres = []
  for (let j = 0; j < spheres[spheres.length - 1].length; j++) {
    const num = Math.random() < params.replicationFactor ? 2 : 1
    for (let k = 0; k < num; k++) {
      newSpheres.push(
        createSphere(
          radius,
          spheres[spheres.length - 1][j].position,
          spheres.length,
        ),
      )
    }
    for (let k = 1; k <= num; k++) {
      linkSpheres(
        spheres[spheres.length - 1][j],
        newSpheres[newSpheres.length - k],
        radius,
      )
    }
  }
  // join the spheres in the new row
  spheres.push(newSpheres)
  for (let j = 0; j < spheres[spheres.length - 1].length - 1; j++) {
    linkSpheres(
      spheres[spheres.length - 1][j],
      spheres[spheres.length - 1][j + 1],
      radius,
    )
  }
  // repel spheres that are doubly-separated (to straighten edges)
  for (let j = 0; j < spheres[spheres.length - 1].length - 2; j++) {
    repelSpheres(
      spheres[spheres.length - 1][j],
      spheres[spheres.length - 1][j + 2],
    )
  }
}
gui.add(params, "growSheet")

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


/*
 *  Rock
 */
scene.add(rockMesh)
world.addBody(rockBody)

/**
 * Floor
 */
const floorGeo = new THREE.PlaneGeometry(params.floorSize, params.floorSize)
const floorMat = new THREE.MeshStandardMaterial({ color: 0xfff77a })
const planeShape = new CANNON.Plane()

// generator function
const makePlane = (position, rotation) => {
  const planeMesh = new THREE.Mesh(floorGeo, floorMat)
  planeMesh.receiveShadow = true
  planeMesh.rotation.set(...rotation)
  planeMesh.position.set(...position)

  const planeBody = new CANNON.Body({ mass: 0 })
  planeBody.position.copy(planeMesh.position)
  planeBody.quaternion.copy(planeMesh.quaternion)
  // planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
  planeBody.addShape(planeShape)
  planeBody.material = defaultMaterial

  world.addBody(planeBody)
  scene.add(planeMesh)

  return planeBody
}

const posVec = new Vector3()
const rotVec = new Vector3()
// floor
const floor = makePlane(posVec.set(0, 0, 0), rotVec.set(-Math.PI * 0.5, 0, 0))
const gc01 = new CANNON.PointToPointConstraint(
  s01, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(-4 * 1.05, 0, 0),
)
const gc03 = new CANNON.PointToPointConstraint(
  s03, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(0, 0, 0),
)
const gc05 = new CANNON.PointToPointConstraint(
  s05, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(4 * 1.05, 0, 0),
)
world.addConstraint(gc01)
world.addConstraint(gc03)
world.addConstraint(gc05)

/*
//roof
makePlane(posVec.set(0, params.floorSize, 0), rotVec.set(Math.PI * 0.5, 0, 0))

//walls
const wallOffset = params.floorSize / 2
makePlane(posVec.set(0, wallOffset, -wallOffset), rotVec.set(0, 0, 0))
makePlane(posVec.set(wallOffset, wallOffset, 0), rotVec.set(0, -Math.PI * 0.5, 0))
makePlane(posVec.set(0, wallOffset, wallOffset), rotVec.set(0, Math.PI * 1.0, 0))
makePlane(posVec.set(-wallOffset, wallOffset, 0), rotVec.set(0, -Math.PI * 1.5, 0))
*/


const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 100  // needs to correspond to distance I want shadows to reach? i.e. floorSize?
directionalLight.shadow.camera.left = -params.floorSize * 0.6
directionalLight.shadow.camera.top = params.floorSize * 0.6
directionalLight.shadow.camera.right = params.floorSize * 0.6
directionalLight.shadow.camera.bottom = -params.floorSize * 0.6
directionalLight.position.set(5, 5, 5)

scene.add(directionalLight.target)
scene.add(directionalLight)
directionalLight.position.set(
  params.floorSize / 2,
  params.floorSize / 2,
  params.floorSize / 2,
)
directionalLight.target.position.set(
  directionalLight.target.position.x,
  directionalLight.target.position.y,
  directionalLight.target.position.z,
)

/**
 * Animate
 */
const clock = new THREE.Clock()
const tick = () => {
  const delta = clock.getDelta()
  // const elapsedTime = clock.getElapsedTime()

  // Physics Update
  world.step(1 / 75, delta, 5)

  // Update Meshes
  for (const pair of updateList) {
    pair.mesh.position.copy(pair.body.position)
    pair.mesh.quaternion.copy(pair.body.quaternion)
  }

  // Update controls
  controls.update()

  // Render
  effect.render(scene, camera)

  // Stats update
  stats.update()

  // Call tick again on the next frame
  window.requestAnimationFrame(tick)
}

tick()
