import * as CANNON from "cannon-es"
import * as THREE from "three"
import { camera, controls, gui, mouse, scene, stats, world, effect } from "./base.js"
import { updateLighting } from "./lighting.js"
// import { composer, updateSun } from "./postprocessing.js"
// import { refractor, updateRefractor } from "./refractor.js"
// import { updateRefractor } from "./sea.js"
import { createSphere, linkSpheres, repelSpheres, addSeed } from "./coral.js"
import { meshbody as rockPair, faces as rockFaces, attachRaycast, removeHighlight, addHighlight } from "./rock.js"
import { pair as groundPair } from "./sand.js"
import { MeshBody } from "./utils/MeshBody.js"
import { Coral } from "./coral.js"

let elapsedTime
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
const updateList = []
const registerMeshBodyPair = (pair) => updateList.push(pair)

/**
 * Spheres
 */

// create first row
const spheres = [[]]
const radius = 1
for (let j = 0; j < 5; j++) {
  spheres[0].push(createSphere(radius))
  const pair = new MeshBody(spheres[0][j].mesh, spheres[0][j].body)
  pair.addTo(scene, world)
  registerMeshBodyPair(pair)
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
      const pair = new MeshBody(newSpheres[newSpheres.length - 1].mesh, newSpheres[newSpheres.length - 1].body)
      pair.addTo(scene, world)
      registerMeshBodyPair(pair)
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
registerMeshBodyPair(rockPair)
attachRaycast(rockPair.mesh, mouse, camera, "mousemove", removeHighlight, addHighlight)
const clickHandler = (selected, intersects) => {
  console.log(selected.faceIndex)
  const rockFaceIsEmpty = rockFaces[selected.faceIndex].data === undefined
  const polypInInventory = params.polypData !== undefined
  const rockFaceHasPolyp = rockFaces[selected.faceIndex].data?.isPolyp
  const newSelection = intersects.length > 0 && intersects[0].object !== selected
  const algaeInInventory = params.algae !== 0xffffff

  // if the rock face is empty
  // and the inventory has a polyp
  // then place that polyp on the rock face
  if (rockFaceIsEmpty && polypInInventory) {
    params.polypData.data.meshbody.mesh.position.copy(selected.faceCentroid)
    params.polypData.data.meshbody.body.position.copy(selected.faceCentroid)
    params.polypData.data.meshbody.mesh.visible = true
    rockFaces[selected.faceIndex] = params.polypData
    params.polypData = undefined
    inventory.controllers[1].setValue("")
    return
  }

  // if the rock face is empty
  // and the raycast is intersecting something
  // and the first thing being intersected is different to the current selection
  // then create and register a new coral
  if (rockFaceIsEmpty && newSelection) {
    const position = selected.faceCentroid
    rockFaces[selected.faceIndex].data = new Coral(elapsedTime, position)
    registerMeshBodyPair(rockFaces[selected.faceIndex].data.meshbody)
    return
  }

  // if the rock face has coral
  // and the inventory has no algae
  // then partially bleach it
  // and extract algae
  if (!rockFaceIsEmpty && !rockFaceHasPolyp && !algaeInInventory) {
    const rgb = rockFaces[selected.faceIndex].data.meshbody.mesh.material.color
    const colour = new THREE.Color(rgb.r, rgb.g, rgb.b)
    inventory.controllers[0].setValue(colour.getHex())
    if (rockFaces[selected.faceIndex].data.bleached < 1) {
      rockFaces[selected.faceIndex].data.bleached += 0.5
    }
    colour.lerpHSL(new THREE.Color(0xffffff), rockFaces[selected.faceIndex].data.bleached) // bleach
    rockFaces[selected.faceIndex].data.meshbody.mesh.material.color = colour
    return
  }

  // if the rock face has coral
  // and the inventory has algae
  // then donate the algae to the coral
  if (!rockFaceIsEmpty && !rockFaceHasPolyp) {
    const rgb = rockFaces[selected.faceIndex].data.meshbody.mesh.material.color
    const colour = new THREE.Color(rgb.r, rgb.g, rgb.b)
    colour.lerpHSL(new THREE.Color(params.algae), 0.5)
    rockFaces[selected.faceIndex].data.meshbody.mesh.material.color = colour
    inventory.controllers[0].setValue(0xffffff)
    return
  }

  // if the face has a polyp
  // and the inventory is empty
  // then remove it from the face and put it into the inventory
  if (rockFaceHasPolyp && !polypInInventory) {
    params.polypData = rockFaces[selected.faceIndex]
    rockFaces[selected.faceIndex] = { type: "empty", data: undefined }
    inventory.controllers[1].setValue(params.polypData.data.meshbody.mesh.uuid) // Face ${selected.faceIndex}
    params.polypData.data.meshbody.mesh.visible = false
    return
  }
}
attachRaycast(rockPair.mesh, mouse, camera, "click", undefined, clickHandler)

/*
 *  Constrain coral to floor
 */
for (let j = 0; j < spheres[0].length; j += 2) {
  world.addConstraint(
    new CANNON.PointToPointConstraint(
      spheres[0][j].body,
      new CANNON.Vec3(0, -1, 0),
      groundPair.body,
      new CANNON.Vec3(1.2 * (2 * j - 4), 25, 0),
    ),
  )
}

/**
 * Animate
 */

console.log(rockFaces)
const clock = new THREE.Clock()
const tick = () => {
  const delta = clock.getDelta()
  elapsedTime = clock.getElapsedTime()

  // Physics Update
  world.step(1 / 75, delta, 5)

  // updateRefractor(elapsedTime)
  // refractor.position.copy(camera.position)

  // Update Meshes to match Bodies
  for (const pair of updateList) {
    pair.synchronise()
  }

  // Update Lighting
  updateLighting(elapsedTime)
  // updateSun(elapsedTime)

  // Update coral
  for (const face of rockFaces) {
    if (face.data !== undefined) {
      face.data.update(elapsedTime)
    }
  }

  // Grow new coral
  // iterate through faces
  for (let j = 0; j < rockFaces.length; j++) {
    // if a coral is a certain age, randomly decide whether to grow a new polyp
    if (rockFaces[j].data !== undefined) {
      if (rockFaces[j].data.age > 10) {
        // grow it on any neighbouring face that is free
        for (const k of rockFaces[j].neighbours) {
          if (!rockFaces[j].data.hasBred && rockFaces[k].data === undefined) {
            const position = rockFaces[k].faceCentroid
            rockFaces[k].data = new Coral(elapsedTime, position)
            registerMeshBodyPair(rockFaces[k].data.meshbody)
            rockFaces[j].data.hasBred = true
            console.log(k)
          }
        }
      }
    }
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
