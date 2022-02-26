import * as CANNON from "cannon-es"
import * as THREE from "three"
import { camera, mouse } from "./base.js"
import { concreteMaterial } from "./materials.js"

// geometry
const rockRadius = 10
const detail = 0
const rockGeo = new THREE.IcosahedronGeometry(rockRadius, detail)
// nb: BufferGeometry is already non-indexed (i.e. faces don't share vertices)
const colors = []
for (let j = 0; j < rockGeo.attributes.position.count; j += 3) {
  const color = new THREE.Color(0x808487)
  colors.push(color.r, color.g, color.b)
  colors.push(color.r, color.g, color.b)
  colors.push(color.r, color.g, color.b)
}
rockGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3))

// material
const rockMat = new THREE.MeshToonMaterial({ vertexColors: true })
const rockMesh = new THREE.Mesh(rockGeo, rockMat)
rockMesh.castShadow = true
rockMesh.receiveShadow = true
rockMesh.position.set(-10, 5, -10)

// shape
const position = rockMesh.geometry.attributes.position.array
const rockPoints = []
for (let i = 0; i < position.length; i += 3) {
  rockPoints.push(new CANNON.Vec3(position[i], position[i + 1], position[i + 2]))
}
const rockFaces = []
for (let i = 0; i < position.length / 3; i += 3) {
  rockFaces.push([i, i + 1, i + 2])
}
// rockMesh.scale.set(0.95, 0.95, 0.95) // make smaller after collision body creation to avoid clipping?
const rockShape = new CANNON.ConvexPolyhedron({
  vertices: rockPoints,
  faces: rockFaces,
})

// body
const rockBody = new CANNON.Body({
  mass: 0, // so it's not affected by gravity! otherwise the body will move but the mesh will remain
  shape: rockShape,
})
rockBody.material = concreteMaterial // adding this after creation sets collisionResponse to true?
rockBody.position.copy(rockMesh.position)

// colour selected face
let intersected
const highlightFace = color => {
  const { face } = intersected
  const colorAttribute = intersected.object.geometry.attributes.color
  colorAttribute.setXYZ(face.a, color.r, color.g, color.b)
  colorAttribute.setXYZ(face.b, color.r, color.g, color.b)
  colorAttribute.setXYZ(face.c, color.r, color.g, color.b)
  colorAttribute.needsUpdate = true
}

// raycast to select faces
let intersects
const raycaster = new THREE.Raycaster()
// "click"
window.addEventListener("mousemove", () => {
  raycaster.setFromCamera(mouse, camera)
  intersects = raycaster.intersectObjects([rockMesh])

  if (intersects.length > 0) {
    if (intersected !== intersects[0].object) {
      // remove highlight on the currently selected face
      if (intersected) {
        highlightFace(new THREE.Color(0x808487))
      }
      // select and highlight the new face
      intersected = intersects[0]
      highlightFace(new THREE.Color("red"))
    }
  } else {
    // remove highlight on the currently selected face
    if (intersected) {
      highlightFace(new THREE.Color(0x808487))
    }
    intersected = null
  }
})

export { rockMesh, rockBody }
