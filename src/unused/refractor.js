import * as THREE from "three"

import { scene } from "../base.js"
import { noise4 } from "./random.js"

const refractorGeometry = new THREE.IcosahedronGeometry(10, 5)

// deform geometry
const nPos = []
const v3 = new THREE.Vector3()
for (let j = 0; j < refractorGeometry.attributes.position.count; j++) {
  v3.fromBufferAttribute(refractorGeometry.attributes.position, j).normalize()
  nPos.push(v3.clone())
}
refractorGeometry.userData.nPos = nPos

const refractorMaterial = new THREE.MeshPhysicalMaterial({
  roughness: 0,
  transmission: 1,
  thickness: 2,
  specularIntensity: 0, // turn off specular reflections
  clearcoat: 1,
  side: THREE.BackSide, // refract from inside rather than outside
})
const refractor = new THREE.Mesh(refractorGeometry, refractorMaterial)

// scene.add(refractor)

const updateRefractor = (t) => {
  refractor.geometry.userData.nPos.forEach((p, idx) => {
  	const ns = noise4(p.x, p.y, p.z, t) * 0.1
    v3.copy(p).multiplyScalar(10).addScaledVector(p, ns * 10)
    refractor.geometry.attributes.position.setXYZ(idx, v3.x, v3.y, v3.z)
  })
  refractor.geometry.computeVertexNormals()
  refractor.geometry.attributes.position.needsUpdate = true
}

export { refractor, updateRefractor }
