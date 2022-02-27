import * as CANNON from "cannon-es"
import * as THREE from "three"
import { concreteMaterial } from "./materials.js"
import * as openSimplexNoise from "open-simplex-noise"

const rockColor = 0x808487
const selectedColor = 0xff3333
const numShades = 6

const createRock = (position, radius, detail) => {
  // geometry - nb: BufferGeometry is already non-indexed (i.e. faces don't share vertices)
  const geometry = new THREE.IcosahedronGeometry(1, detail)  // radius has no effect here?

  // deform geometry
  let nPos = []
  let v3 = new THREE.Vector3()
  for (let j=0; j<geometry.attributes.position.count; j++){
    v3.fromBufferAttribute(geometry.attributes.position, j).normalize()
    nPos.push(v3.clone())
  }
  geometry.userData.nPos = nPos
  let seed = Date.now()
  let noise = openSimplexNoise.makeNoise3D(seed)
  geometry.userData.nPos.forEach(
    (p, j) => {
      let ns = noise(p.x, p.y, p.z) * 0.75
      v3.copy(p).multiplyScalar(radius).addScaledVector(p, ns * radius)
      geometry.attributes.position.setXYZ(j, v3.x, v3.y, v3.z)
    }
  )
  geometry.computeVertexNormals()
  geometry.attributes.position.needsUpdate = true

  // face colouring
  const shades = new Uint8Array(numShades)
  for (let j = 0; j <= shades.length; j++) {
    shades[j] = (j / shades.length) * 256
  }
  const gradientMap = new THREE.DataTexture(shades, shades.length, 1, THREE.RedFormat)
  gradientMap.needsUpdate = true
  const colors = []
  for (let j = 0; j < geometry.attributes.position.count; j += 3) {
    const color = new THREE.Color(rockColor)
    colors.push(color.r, color.g, color.b)
    colors.push(color.r, color.g, color.b)
    colors.push(color.r, color.g, color.b)
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

  // mesh
  const material = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradientMap })
  const mesh = new THREE.Mesh(geometry, material)
  // mesh.castShadow = true
  mesh.receiveShadow = true
  mesh.position.set(...position)

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
  body.position.set(...position)

  return { mesh: mesh, body: body }
}

// colour selected face
const colourFace = (color, selected) => {
  const { face } = selected
  const colorAttribute = selected.object.geometry.attributes.color
  colorAttribute.setXYZ(face.a, color.r, color.g, color.b)
  colorAttribute.setXYZ(face.b, color.r, color.g, color.b)
  colorAttribute.setXYZ(face.c, color.r, color.g, color.b)
  colorAttribute.needsUpdate = true
}

const removeHighlight = (selected, intersects) => {
  // raycast is intersecting something
  if (intersects.length > 0) {
    // the first thing being intersected is different to the current selection
    if (selected !== intersects[0].object) {
      // remove colour on the currently selected face if something is already selected
      colourFace(new THREE.Color(rockColor), selected)
    }
  } else {
    // remove colour on the currently selected face
    colourFace(new THREE.Color(rockColor), selected)
  }
}

const addHighlight = (selected, intersects) => {
  // raycast is intersecting something
  if (intersects.length > 0) {
    // the first thing being intersected is different to the current selection
    if (selected !== intersects[0].object) {
      // colour the new face
      colourFace(new THREE.Color(selectedColor), selected)
    }
  }
}

const attachRaycast = (rockMesh, mouse, camera, event, preAction, postAction) => {

  // raycast to select face
  let selected, intersects
  const raycaster = new THREE.Raycaster()
  const raycastSelector = () => {
    const updateSelected = (selected, intersects) => {
      // raycast is intersecting something
      if (intersects.length > 0) {
        // the first thing being intersected is different to the current selection
        if (selected !== intersects[0].object) {
          const testSelected = intersects[0]
          const faceVertexA = new THREE.Vector3().fromBufferAttribute(testSelected.object.geometry.attributes.position, testSelected.face.a)
          const faceVertexB = new THREE.Vector3().fromBufferAttribute(testSelected.object.geometry.attributes.position, testSelected.face.b)
          const faceVertexC = new THREE.Vector3().fromBufferAttribute(testSelected.object.geometry.attributes.position, testSelected.face.c)
          const rockPosition = new THREE.Vector3(...testSelected.object.position)
          // face is fully above ground
          if (faceVertexA.y > -rockPosition.y && faceVertexB.y > -rockPosition.y && faceVertexC.y > -rockPosition.y) {
            let v = new THREE.Vector3()
            v.add(rockPosition)
            v.add(faceVertexA.multiplyScalar(1/3))
            v.add(faceVertexB.multiplyScalar(1/3))
            v.add(faceVertexC.multiplyScalar(1/3))
            selected = testSelected
            selected.faceCentroid = v
          }
        }
      } else {
        // nothing is being intersected
        selected = null
      }
      return selected
    }
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects([rockMesh])
    preAction && selected ? preAction(selected, intersects) : null
    selected = updateSelected(selected, intersects)
    postAction && selected ? postAction(selected, intersects) : null
  }
  window.addEventListener(event, raycastSelector)
}

export { createRock, attachRaycast, removeHighlight, addHighlight }
