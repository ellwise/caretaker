import * as CANNON from "cannon-es"
import * as THREE from "three"
import { defaultMaterial } from "../utils/materials.js"
import { MeshBody } from "../utils/MeshBody.js"
import { noise4 } from "../utils/random.js"
import { sand0, sand1, sand2, sand3, sand4, sand5, sand6, sand7, sand8, sand9 } from "../utils/colours.js"
import { horizon, rockRadius, rockHeight, playingRadius } from "../parameters.js"
import { scene, world } from "../base.js"


const segments = 100
const geometry = new THREE.PlaneGeometry(1, 1, segments, segments)

// deform geometry
const nPos = []
const v3 = new THREE.Vector3()
for (let j = 0; j < geometry.attributes.position.count; j++) {
  v3.fromBufferAttribute(geometry.attributes.position, j)
  nPos.push(v3.clone())
}
geometry.userData.nPos = nPos

export const updateRefractor = (t) => {
  mesh.geometry.userData.nPos.forEach((p, idx) => {
  	let ns = noise4(p.x, p.y, p.z, t) * 1
    v3.copy(p).multiplyScalar(3 * playingRadius).addScaledVector(p, ns * 3 * playingRadius);
    mesh.geometry.attributes.position.setXYZ(idx, v3.x, v3.y, v3.z);
  })
  mesh.geometry.computeVertexNormals();
  mesh.geometry.attributes.position.needsUpdate = true;
}

const material = new THREE.MeshPhysicalMaterial({
  roughness: 0,
  transmission: 1,
  thickness: 2,
  specularIntensity: 1,  // turn off specular reflections
  clearcoat: 1,
  side: THREE.DoubleSide, // refract from inside rather than outside
})
let mesh = new THREE.Mesh( geometry, material );
mesh.rotation.set(-Math.PI/2, 0, 0)
//mesh.receiveShadow = true


mesh.position.set(0, 50, 0)

scene.add(mesh)