import * as THREE from "three"

export const faceAdjacency = (geometry) => {
  
    // put the vertices of each face into an array
    const faceVertices = []
    const vertices = geometry.attributes.position
    for (let j = 0; j < vertices.array.length / 3; j++) {
      faceVertices.push([])
      for (let k=0; k < 3; k++) {
        faceVertices[j].push(new THREE.Vector3().fromBufferAttribute(vertices, 3 * j + k))
      }
    }
  
    // doubly-iterate over the faces and count shared vertices
    const minSharedVertices = 2
    const adjacentIndexes = []
    for (let j = 0; j < faceVertices.length; j++) {
      adjacentIndexes.push([])
      const vjs = faceVertices[j]
      for (let k = 0; k < faceVertices.length; k++) {
        let sharedVertices = 0
        if (j !== k) {
          const vks = faceVertices[k]
          for (let vj of vjs) {
            for (let vk of vks) {
              // warning: check below risks failing due to floating point accuracy
              if (vj.equals(vk)) {
                sharedVertices += 1
              }
            }
          }
        }
        if (sharedVertices >= minSharedVertices) {
          adjacentIndexes[j].push(k)
        }
      }
    }
    
    return adjacentIndexes
  }