import * as CANNON from "cannon-es"
import * as THREE from "three"
import { concreteMaterial } from "./materials.js"
import * as openSimplexNoise from "open-simplex-noise"

const rockColor = 0x808487
const selectedColor = 0xff0000
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

const attachRaycastSelector = (rockMesh, mouse, camera) => {
  // colour selected face
  let selected
  const highlightFace = color => {
    const { face } = selected
    const colorAttribute = selected.object.geometry.attributes.color
    colorAttribute.setXYZ(face.a, color.r, color.g, color.b)
    colorAttribute.setXYZ(face.b, color.r, color.g, color.b)
    colorAttribute.setXYZ(face.c, color.r, color.g, color.b)
    colorAttribute.needsUpdate = true
  }

  // raycast to select face
  let intersects
  const raycaster = new THREE.Raycaster()
  const raycastSelector = () => {
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects([rockMesh])
    if (intersects.length > 0) {
      if (selected !== intersects[0].object) {
        // remove highlight on the currently selected face
        if (selected) {
          highlightFace(new THREE.Color(rockColor))
        }
        // select and highlight the new face
        selected = intersects[0]
        highlightFace(new THREE.Color(selectedColor))
      }
    } else {
      // remove highlight on the currently selected face
      if (selected) {
        highlightFace(new THREE.Color(rockColor))
      }
      selected = null
    }
  }
  // "click"
  window.addEventListener("mousemove", raycastSelector)
}

export { createRock, attachRaycastSelector }
