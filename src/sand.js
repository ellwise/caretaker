import * as CANNON from "cannon-es"
import * as THREE from "three"
import { defaultMaterial } from "./materials.js"

const sandColor = 0xfff77a

const createSandPatch = (position, rotation, radius) => {
  const segments = 128
  const geometry = new THREE.CircleGeometry(radius, segments)
  const material = new THREE.MeshStandardMaterial({ color: sandColor })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.receiveShadow = true
  mesh.position.set(...position)
  mesh.rotation.set(...rotation)

  const shape = new CANNON.Plane()
  const body = new CANNON.Body({ mass: 0 }) // unaffected by gravity
  body.position.set(...position)
  body.quaternion.copy(mesh.quaternion)
  // body.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
  body.addShape(shape)
  body.material = defaultMaterial

  return { mesh: mesh, body: body }
}

export { createSandPatch }

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
