import * as CANNON from "cannon-es"
import * as THREE from "three"
import { defaultMaterial } from "./utils/materials.js"
import { MeshBody } from "./utils/MeshBody.js"
import { noise3 } from "./utils/random.js"
import { sand0, sand1, sand2, sand3, sand4, sand5, sand6, sand7, sand8, sand9 } from "./utils/colours.js"
import { horizon, rockRadius, rockHeight, playingRadius } from "./parameters.js"
import { scene, world } from "./base.js"


const createContourMesh = (colour, radius, scale, offsets) => {

    // deform geometry
    const segments = 50  // angular discretisation
    const geometry = new THREE.CircleGeometry(1, segments)  // radius is set later
    
    const nPos = []
    const v3 = new THREE.Vector3()
    for (let j = 0; j < geometry.attributes.position.count; j++) {
      v3.fromBufferAttribute(geometry.attributes.position, j)
      const euler = new THREE.Euler(-Math.PI / 2, 0, 0)
      v3.applyEuler(euler)
      nPos.push(v3.clone())
    }
    geometry.userData.nPos = nPos
    geometry.userData.nPos.forEach(
      (p, j) => {
        const ns = 0.75 * noise3(
          p.x + offsets.x / radius,
          p.y + offsets.y / radius,
          p.z + offsets.z / radius,
        )
        v3.copy(p).multiplyScalar(scale * radius).addScaledVector(p, scale * ns * radius)
        geometry.attributes.position.setXYZ(j, v3.x, v3.y, v3.z)
      },
    )
    geometry.computeVertexNormals()
    const material = new THREE.MeshToonMaterial({color: colour})
    const mesh = new THREE.Mesh(geometry, material)
    mesh.receiveShadow = true

    return mesh

}

const createDiscMesh = (colour, radius) => {
  const segments = 128
  const geometry = new THREE.CircleGeometry(radius, segments)
  const material = new THREE.MeshToonMaterial({ color: colour })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.rotation.set(-Math.PI / 2, 0, 0)
  mesh.receiveShadow = true
  return mesh
}

// contours around rock
const contourRadius = Math.sqrt(rockRadius**2 - rockHeight**2)
const contourMesh1 = createContourMesh(sand0, contourRadius, 1.2, {x: 0, y: -rockHeight, z: 0})
const contourMesh2 = createContourMesh(sand2, contourRadius, 1.3, {x: 0, y: -rockHeight, z: 0})
const contourMesh3 = createContourMesh(sand0, contourRadius, 1.35, {x: 0, y: -rockHeight, z: 0})
const contourMesh4 = createContourMesh(sand2, contourRadius, 1.4, {x: 0, y: -rockHeight, z: 0})
const contourMesh5 = createContourMesh(sand1, contourRadius, 1.45, {x: 0, y: -rockHeight, z: 0})
contourMesh1.position.set(0, 0.05, 0)
contourMesh2.position.set(0, 0.04, 0)
contourMesh3.position.set(0, 0.03, 0)
contourMesh4.position.set(0, 0.02, 0)
contourMesh5.position.set(0, 0.01, 0)

// disc defining playing area
const discMesh = createDiscMesh(sand3, playingRadius)
discMesh.position.set(0, 0, 0)
const shape = new CANNON.Plane()
const body = new CANNON.Body({ mass: 0 }) // unaffected by gravity
body.position.copy(discMesh.position)
body.quaternion.copy(discMesh.quaternion)
body.addShape(shape)
body.material = defaultMaterial

// disc out to the horizon
const subsurfaceMesh = createDiscMesh(sand5, horizon)
subsurfaceMesh.position.set(0, -0.01, 0)

// combined mesh
const mesh = new THREE.Group()
mesh.add(contourMesh1)
mesh.add(contourMesh2)
mesh.add(contourMesh3)
mesh.add(contourMesh4)
mesh.add(contourMesh5)
mesh.add(discMesh)
mesh.add(subsurfaceMesh)
mesh.receiveShadow = true
mesh.position.set(0, 0, 0)

export const pair = new MeshBody(mesh, body)

pair.addTo(scene, world)

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
