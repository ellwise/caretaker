import * as CANNON from "cannon-es"
import * as THREE from "three"
import { concreteMaterial } from "./utils/materials.js"
import { noise3 } from "./utils/random.js"
import { stone8 as rockColour, selectedColour } from "./utils/colours.js"
import { MeshBody } from "./utils/MeshBody.js"
import { scene, world } from "./base.js"
import { rockHeight } from "./parameters.js"
import { faceAdjacency } from "./utils/geometry.js"

const numShades = 6
const rockRadius = 10
const rockDetail = 1

const createRock = (radius, detail) => {
  // geometry - nb: BufferGeometry is already non-indexed (i.e. faces don't share vertices)
  const geometry = new THREE.IcosahedronGeometry(1, detail) // radius has no effect here?

  // deform geometry
  const nPos = []
  const v3 = new THREE.Vector3()
  for (let j = 0; j < geometry.attributes.position.count; j++) {
    v3.fromBufferAttribute(geometry.attributes.position, j).normalize()
    nPos.push(v3.clone())
  }
  geometry.userData.nPos = nPos
  geometry.userData.nPos.forEach(
    (p, j) => {
      const ns = noise3(p.x, p.y, p.z) * 0.75
      v3.copy(p).multiplyScalar(radius).addScaledVector(p, ns * radius)
      geometry.attributes.position.setXYZ(j, v3.x, v3.y, v3.z)
    },
  )
  geometry.computeVertexNormals()
  // geometry.attributes.position.needsUpdate = true

  // ensure faces can be coloured individually
  const shades = new Uint8Array(numShades)
  for (let j = 0; j <= shades.length; j++) {
    shades[j] = (j / shades.length) * 256
  }
  const gradientMap = new THREE.DataTexture(shades, shades.length, 1, THREE.RedFormat)
  gradientMap.needsUpdate = true
  const colors = []
  for (let j = 0; j < geometry.attributes.position.count; j += 3) {
    const color = new THREE.Color(rockColour)
    colors.push(color.r, color.g, color.b)
    colors.push(color.r, color.g, color.b)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

  // mesh
  const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = false // prevent self-shadow artefacts
  mesh.position.set(0, rockHeight, 0)

  // shape
  const geometryVertices = geometry.attributes.position.array
  const shapeVertices = []
  for (let i = 0; i < geometryVertices.length; i += 3) {
    shapeVertices.push(new CANNON.Vec3(geometryVertices[i], geometryVertices[i + 1], geometryVertices[i + 2]))
  }
  const shapeFaces = []
  for (let i = 0; i < geometryVertices.length / 3; i += 3) {
    shapeFaces.push([i, i + 1, i + 2])
  }
  const shape = new CANNON.ConvexPolyhedron({ vertices: shapeVertices, faces: shapeFaces })

  // body
  const body = new CANNON.Body({ mass: 0, shape: shape }) // unaffected by gravity
  body.material = concreteMaterial // adding this after creation sets collisionResponse to true?
  body.position.copy(mesh.position)

  return new MeshBody(mesh, body)
}

// create a single rock
export const meshbody = createRock(rockRadius, rockDetail)
meshbody.addTo(scene, world)

// face data
export const faces = []
const numVertices = meshbody.mesh.geometry.attributes.position.count
for (let j = 0; j < numVertices; j += 3) {
  // put the vertices of each face into an array
  const faceVertices = []
  for (let k = 0; k < 3; k++) {
    faceVertices.push(new THREE.Vector3().fromBufferAttribute(meshbody.mesh.geometry.attributes.position, j + k))
  }
  const v = new THREE.Vector3()
  const rockPosition = new THREE.Vector3(...meshbody.mesh.position)
  // remember, vertices have relative positions... hence we need to add rockPosition
  v.add(rockPosition)
  v.add(faceVertices[0].multiplyScalar(1 / 3))
  v.add(faceVertices[1].multiplyScalar(1 / 3))
  v.add(faceVertices[2].multiplyScalar(1 / 3))
  console.log(v)
  console.log(faceVertices)
  console.log("===================")
  faces.push({ data: undefined, faceCentroid: v })
}
const adjacentIndexes = faceAdjacency(meshbody.mesh.geometry)
for (let j = 0; j < faces.length; j++) {
  faces[j].neighbours = adjacentIndexes[j]
}

// colour selected face
const colourFace = (selected, color) => {
  const colorAttribute = selected.object.geometry.attributes.color
  colorAttribute.setXYZ(selected.face.a, color.r, color.g, color.b)
  colorAttribute.setXYZ(selected.face.b, color.r, color.g, color.b)
  colorAttribute.setXYZ(selected.face.c, color.r, color.g, color.b)
  colorAttribute.needsUpdate = true
}

export const removeHighlight = (selected, intersects) => {
  // if the raycast isn't intersecting anything
  // or the first thing being intersected is different to the current selection
  // then remove colour on the currently selected face
  if (intersects.length === 0 || intersects[0].object !== selected) {
    colourFace(selected, new THREE.Color(rockColour))
  }
}

export const addHighlight = (selected, _) => {
  // colour the new face
  colourFace(selected, new THREE.Color(selectedColour))
}

export const attachRaycast = (rockMesh, mouse, camera, event, preAction, postAction) => {
  // raycast to select face
  let selected, intersects
  const raycaster = new THREE.Raycaster()
  const raycastSelector = () => {
    const updateSelected = (selected, intersects) => {
      // if the raycast doesn't intersect anything, the selection is null
      if (intersects.length === 0) return null

      // if the first thing the raycast intersects is the current selection
      // then keep that selection and exit early
      if (intersects[0].object === selected) return selected

      // if the raycast intersects a face that's below ground
      // then the selection is null
      const testSelected = intersects[0]
      const testSelectedVertices = testSelected.object.geometry.attributes.position
      const faceVertexA = new THREE.Vector3().fromBufferAttribute(testSelectedVertices, testSelected.face.a)
      const faceVertexB = new THREE.Vector3().fromBufferAttribute(testSelectedVertices, testSelected.face.b)
      const faceVertexC = new THREE.Vector3().fromBufferAttribute(testSelectedVertices, testSelected.face.c)
      const rockPosition = new THREE.Vector3(...testSelected.object.position)
      if (faceVertexA.y < -rockPosition.y) return null
      if (faceVertexB.y < -rockPosition.y) return null
      if (faceVertexC.y < -rockPosition.y) return null

      // otherwise, the selection should be the raycast intersection
      const v = new THREE.Vector3()
      v.add(rockPosition)
      v.add(faceVertexA.divideScalar(3))
      v.add(faceVertexB.divideScalar(3))
      v.add(faceVertexC.divideScalar(3))
      testSelected.faceCentroid = v
      return testSelected
    }
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects([rockMesh])
    if (preAction && selected) preAction(selected, intersects)
    selected = updateSelected(selected, intersects)
    if (postAction && selected) postAction(selected, intersects)
  }
  window.addEventListener(event, raycastSelector)
}
