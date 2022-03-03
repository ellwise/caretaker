import * as CANNON from "cannon-es"
import * as THREE from "three"
import { camera, controls, effect, gui, mouse, scene, stats, world } from "./base.js"
import { createSphere, linkSpheres, repelSpheres, addSeed } from "./coral.js"
import { createRock, attachRaycast, removeHighlight, addHighlight } from "./rock.js"
import { createSubsurface, createSandPatch } from "./sand.js"

const params = {
  floorSize: 50,
  sphereVelocity: 20,
  gravity: 9.81, // positive = upwards (buoyancy)
  replicationFactor: 0.4,
  algae: 0xffffff,
  polyp: "",
  polypData: undefined,
}
const developmentOptions = gui.addFolder("Developer Options")
developmentOptions.add(params, "gravity", 0, 2 * params.gravity, 0.01).onChange(v => world.gravity.set(0, params.gravity, 0))
developmentOptions.add(params, "replicationFactor", 0, 1, 0.01).onChange(v => { params.replicationFactor = v })
developmentOptions.close()

const inventory = gui.addFolder("Inventory")
inventory.addColor(params, "algae")
inventory.add(params, "polyp")
inventory.controllers.forEach(c => c.disable())

/**
 * Debug
 */

world.gravity.set(0, params.gravity, 0) // si earth gravity

/**
 * Update List
 */
const registeredMeshesBodies = []
const registerMeshBodyPair = (mesh, body) => registeredMeshesBodies.push({ mesh: mesh, body: body })

/**
 * Spheres
 */

// create first row
const spheres = [[]]
const radius = 1
for (let j = 0; j < 5; j++) {
  spheres[0].push(createSphere(radius))
  scene.add(spheres[0][j].mesh)
  world.addBody(spheres[0][j].body)
  registerMeshBodyPair(spheres[0][j].mesh, spheres[0][j].body)
}

// link first row
for (let j = 0; j < spheres[0].length - 1; j++) {
  linkSpheres(spheres[0][j].body, spheres[0][j + 1].body, radius, world)
}

params.growSheet = () => {
  // add a new row of spheres
  const newSpheres = []
  for (let j = 0; j < spheres[spheres.length - 1].length; j++) {
    const num = Math.random() < params.replicationFactor ? 2 : 1
    for (let k = 0; k < num; k++) {
      newSpheres.push(
        createSphere(
          radius,
          spheres[spheres.length - 1][j].body.position,
          spheres.length,
        ),
      )
      scene.add(newSpheres[newSpheres.length - 1].mesh)
      world.addBody(newSpheres[newSpheres.length - 1].body)
      registerMeshBodyPair(newSpheres[newSpheres.length - 1].mesh, newSpheres[newSpheres.length - 1].body)
      linkSpheres(
        spheres[spheres.length - 1][j].body,
        newSpheres[newSpheres.length - 1].body,
        radius,
        world,
      )
    }
  }
  spheres.push(newSpheres)
  // join the spheres in the new row
  for (let j = 0; j < spheres[spheres.length - 1].length - 1; j++) {
    linkSpheres(
      spheres[spheres.length - 1][j].body,
      spheres[spheres.length - 1][j + 1].body,
      radius,
      world,
    )
  }
  // repel spheres that are doubly-separated (to straighten edges)
  for (let j = 0; j < spheres[spheres.length - 1].length - 2; j++) {
    repelSpheres(
      spheres[spheres.length - 1][j].body,
      spheres[spheres.length - 1][j + 2].body,
      world,
    )
  }
}
developmentOptions.add(params, "growSheet")

/*
 *  Rock
 */
const rockPosition = new THREE.Vector3(0, 5, 0)
const rockRadius = 10
const rockDetail = 1
const { mesh: rockMesh, body: rockBody, faces: rockFaces } = createRock(rockPosition, rockRadius, rockDetail)
scene.add(rockMesh)
world.addBody(rockBody)
registerMeshBodyPair(rockMesh, rockBody)
attachRaycast(rockMesh, mouse, camera, "mousemove", removeHighlight, addHighlight)
const clickHandler = (selected, intersects) => {
  if (rockFaces[selected.faceIndex].type === "empty") {
    // place either coral or a polyp if empty
    if (params.polypData !== undefined) {
      // place the polyp from the inventory
      params.polypData.data.mesh.position.copy(selected.faceCentroid)
      params.polypData.data.body.position.copy(selected.faceCentroid)
      params.polypData.data.mesh.visible = true
      rockFaces[selected.faceIndex] = params.polypData
      params.polypData = undefined
      inventory.controllers[1].setValue("")
    } else {
      // randomly generate a coral or polyp
      const { mesh, body, isPolyp } = addSeed(selected, intersects)
      scene.add(mesh)
      world.addBody(body)
      registerMeshBodyPair(mesh, body)
      rockFaces[selected.faceIndex] = {
        type: isPolyp ? "polyp" : "coral",
        data: {
          faceIndex: selected.faceIndex,
          mesh: mesh,
          body: body,
          bleached: 0,
        },
      }
    }
  } else if (rockFaces[selected.faceIndex].type === "coral") {
    // if the face has coral
    if (params.algae === 0xffffff) {
      // if the inventory has no algae, partially bleach it and extract algae
      const rgb = rockFaces[selected.faceIndex].data.mesh.material.color
      let colour = new THREE.Color(rgb.r, rgb.g, rgb.b)
      inventory.controllers[0].setValue(colour.getHex())
      const hsl = {}
      colour.getHSL(hsl)
      if (rockFaces[selected.faceIndex].data.bleached < 1) {
        rockFaces[selected.faceIndex].data.bleached += 0.5
      }
      hsl.l = hsl.l + rockFaces[selected.faceIndex].data.bleached * hsl.l // bleach
      colour = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
      rockFaces[selected.faceIndex].data.mesh.material.color = colour
    } else {
      // else donate the algae to the coral - not sure this is quite right - seems to retain some colour in the algae over time
      const rgb = rockFaces[selected.faceIndex].data.mesh.material.color
      let colour = new THREE.Color(rgb.r, rgb.g, rgb.b)
      const hslSelected = {}
      colour.getHSL(hslSelected)
      const hslAlgae = {}
      new THREE.Color(params.algae).getHSL(hslAlgae)
      const hsl = {
        h: (hslSelected.h + hslAlgae.h) / 2 % 360,
        s: (hslSelected.s + hslAlgae.s) / 2,
        l: (hslSelected.l + hslAlgae.l) / 2,
      }
      colour = new THREE.Color().setHSL(hsl.h, hsl.s, hsl.l)
      rockFaces[selected.faceIndex].data.mesh.material.color = colour
      inventory.controllers[0].setValue(0xffffff)
    }
  } else if (rockFaces[selected.faceIndex].type === "polyp") {
    // if the face has a polyp, remove it from the face and put it into the inventory
    if (params.polypData === undefined) {
      // but only if the inventory is empty, otherwise do nothing
      params.polypData = rockFaces[selected.faceIndex]
      rockFaces[selected.faceIndex] = { type: "empty", data: undefined }
      inventory.controllers[1].setValue(params.polypData.data.mesh.uuid) // Face ${selected.faceIndex}
      params.polypData.data.mesh.visible = false
    }
  }
}
attachRaycast(rockMesh, mouse, camera, "click", undefined, clickHandler)

/**
 * Floor
 */
const floorRadius = params.floorSize / 2
const floorPosition = new THREE.Vector3(0, 0, 0)
const floorRotation = new THREE.Vector3(-Math.PI * 0.5, 0, 0)
const subsurfaceMesh = createSubsurface(floorPosition, floorRotation, 10 * floorRadius)
scene.add(subsurfaceMesh)
const { mesh: floorMesh, body: floorBody } = createSandPatch(floorPosition, floorRotation, floorRadius)
scene.add(floorMesh)
world.addBody(floorBody)

/*
 *  Constrain coral to floor
 */
for (let j = 0; j < spheres[0].length; j += 2) {
  world.addConstraint(
    new CANNON.PointToPointConstraint(
      spheres[0][j].body,
      new CANNON.Vec3(0, -1, 0),
      floorBody,
      new CANNON.Vec3(1.2 * (2 * j - 4), 15, 0),
    ),
  )
}

/*
 *  Lighting
 */

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 100 // needs to correspond to distance I want shadows to reach? i.e. floorSize?
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
  for (const pair of registeredMeshesBodies) {
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
