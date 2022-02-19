import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import * as CANNON from 'cannon-es'
import { Vector2, Vector3 } from 'three'
import Stats from 'three/examples/jsm/libs/stats.module.js';

/**
 * Aux Functions
 */
const normRandom = () =>{
    return (Math.random() - .5) * 2
}

// Stats
const stats = new Stats();
document.body.appendChild(stats.dom);


/**
 * Debug
 */
const gui = new dat.GUI()


const params = {
    
    floorSize : 30,
    sphereCount : 3,
    sphereVelocity : 5,
    raycastForce : 150,
    gravity : -9.81,
    sphereRatio : 0.5,
    metalness : 0.0,
    roughness: 1.0,
    chamaleonForce: 10
}
gui.add(params, 'raycastForce')
gui.add(params, 'chamaleonForce', 1, 100, 0.01)


/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

// Axes
const axes = new THREE.AxesHelper()
scene.add(axes)


// Sizes
 const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

// Base camera
const camera = new THREE.PerspectiveCamera(27, sizes.width / sizes.height, 0.1, 500)
camera.position.set(- 30, 30, 30)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new Vector3(0, 5, 0)
controls.enableDamping = true

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0x07E09A)
// Mouse
const mouse = new THREE.Vector2()
window.addEventListener('mousemove', event => {
    mouse.x = (event.clientX / sizes.width) * 2 - 1
    mouse.y = (-event.clientY / sizes.height) * 2 + 1
})



/**
 * Physics World
 */
const world = new CANNON.World()
world.gravity.set(0, params.gravity, 0) // si earth gravity
world.broadphase = new CANNON.SAPBroadphase(world)
world.allowSleep = false  // to ensure we keep colliding when things stop moving

gui.add(params, 'gravity', -50, 0, 0.01).onChange(v => world.gravity.set(0, params.gravity, 0))
/**
 * Textures
 */
//const textureLoader = new THREE.TextureLoader()
//const cubeTextureLoader = new THREE.CubeTextureLoader()

/*
const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])
const objectTexture = textureLoader.load('/textures/1.png')
*/

/**
 * Physics Materials
 */
//const concreteMaterial = new CANNON.Material('concrete')
//const plasticMaterial = new CANNON.Material('plastic')
const defaultMaterial = new CANNON.Material('default')
// const concretePlasticContact = new CANNON.ContactMaterial(
//     concreteMaterial,
//     plasticMaterial,
//     {
//         friction : 0.1,
//         restitution : 0.7
//     }
// )

// const plasticPlasticContact = new CANNON.ContactMaterial(
//     plasticMaterial,
//     plasticMaterial,
//     {
//         friction : 0.2,
//         restitution : 0.9
//     }
// )

// world.addContactMaterial(concretePlasticContact)
// world.addContactMaterial(plasticPlasticContact)

const defaultContactMaterial = new CANNON.ContactMaterial(
    defaultMaterial,
    defaultMaterial,
    {
        friction : 0.05,
        restitution : .8
    }
)

world.addContactMaterial(defaultContactMaterial)
world.defaultContactMaterial = defaultContactMaterial
/**
 * Update List
 */
// Holds object references to mesh and physics objects
// each element has a mesh and a body properties
const updateList = []

const materials = Array.from(Array(25), (v, i) => {
    return new THREE.MeshStandardMaterial({
        color: `hsl(${(137 * i) % 360}, 100%, 60%)`,
        metalness: params.metalness,
        roughness: params.roughness,
        /*envMap: environmentMapTexture,
        envMapIntensity: 0.5,
        map : objectTexture*/
    })
})

gui.add(params, 'metalness', 0, 1, 0.01)
.name('shape metalness')
.onChange(v => {
    for(const mat of materials){
        mat.metalness = v
    }
})
gui.add(params, 'roughness', 0, 1, 0.01)
.name('shape roughness')
.onChange(v => {
    for(const mat of materials){
        mat.roughness = v
    }
})

/**
 * Spheres
 */
//const SPHERES = 10

const sphereGeo = new THREE.SphereGeometry(1, 32, 32)
//const boxGeo = new THREE.BoxGeometry(1, 1, 1)

const linkBodyMesh = (body, mesh) =>{
    /**
     *  Link Objects
     */
    // raycast reference
    mesh.bodyID = updateList.length
    body.meshID = updateList.length
    //update list
    updateList.push({mesh: mesh, body:body})
    //body.linearFactor = new CANNON.Vec3(0,0,0)
}

const createSpheres = (radius) => {
    for (let j=-1; j<2; j++) {
      // Mesh
      const sphereMesh = new THREE.Mesh(
          sphereGeo,
          materials[Math.floor(Math.random()*materials.length)]
      )
      sphereMesh.castShadow = true
      sphereMesh.scale.set(radius, radius, radius)
      sphereMesh.position.set(0.25 * j * params.floorSize, 3, 0.25 * j * params.floorSize)
      scene.add(sphereMesh)

      // Physics
      const sphereShape = new CANNON.Sphere(radius)
      const sphereBody = new CANNON.Body({
          mass: 1.333 * radius * radius * radius * Math.PI /* * Math.random() + .5,*/,
          shape: sphereShape,
          material : defaultMaterial,
          angularDamping: 0.8,
      })
      sphereBody.position.copy(sphereMesh.position)
      world.addBody(sphereBody)
      linkBodyMesh(sphereBody, sphereMesh)
    }
}


createSpheres(1)


let spherebody0 = updateList[0].body
let spherebody1 = updateList[1].body
let spring = new CANNON.Spring(spherebody0, spherebody1, {
  localAnchorA: new CANNON.Vec3(0, 0, 0),
  localAnchorB: new CANNON.Vec3(0, 0, 0),
  restLength: 1,
  stiffness: 10,
  damping: 1,
})

// Compute the force after each step
world.addEventListener('postStep', (event) => {
  spring.applyForce()
})



let spherebody2 = updateList[2].body
const pointConstraint = new CANNON.PointToPointConstraint(
  spherebody1,
  new CANNON.Vec3(0, 1, 0),
  spherebody2,
  new CANNON.Vec3(0, -1, 0)
)
world.addConstraint(pointConstraint)



params.jiggleBalls = () =>{
    for(const pair of updateList){
        pair.body.velocity.set(
            normRandom() * params.sphereVelocity ,
            normRandom() * 5,
            normRandom() * params.sphereVelocity,
        )
    }

}
gui.add(params,'jiggleBalls')
params.jiggleBalls()


params.growBalls = () =>{
  params.jiggleBalls()
  for(const pair of updateList){
    let shape = pair.body.shapes[0]
    pair.body.removeShape(shape)
    shape.radius *= 1.05
    pair.body.addShape(shape)
    pair.mesh.scale.x *= 1.05
    pair.mesh.scale.y *= 1.05
    pair.mesh.scale.z *= 1.05
  }

}
gui.add(params,'growBalls')
params.growBalls()


/**
 * Floor
 */
//mesh
const floorGeo = new THREE.PlaneGeometry(params.floorSize, params.floorSize)
const floorMat =  new THREE.MeshStandardMaterial({
    color: '#ffffff',
    metalness: 0.3,
    roughness: 1.0,
    /*envMap: environmentMapTexture,
    envMapIntensity: 0.9*/
})

gui.add(floorMat, 'roughness', 0, 1, 0.01).name('floor roughness')
gui.add(floorMat, 'metalness', 0, 1, 0.01).name('floor metalness')

//physics
const planeShape = new CANNON.Plane()

// generator function
const makePlane = (position, rotation) => {
    const planeMesh = new THREE.Mesh(floorGeo, floorMat)
    planeMesh.receiveShadow = true
    planeMesh.rotation.set(...rotation)
    planeMesh.position.set(...position)

    const planeBody = new CANNON.Body({
        mass : 0
    })
    planeBody.position.copy(planeMesh.position)
    planeBody.quaternion.copy(planeMesh.quaternion)
    //planeBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    planeBody.addShape(planeShape)
    planeBody.material = defaultMaterial

    world.addBody(planeBody)
    scene.add(planeMesh)

}



const posVec = new Vector3()
const rotVec = new Vector3()
//floor
makePlane(posVec.set(0, 0, 0), rotVec.set(- Math.PI * 0.5, 0, 0))
//roof
makePlane(posVec.set(0, params.floorSize, 0), rotVec.set(Math.PI * 0.5, 0, 0))

//wals
const wallOffset = params.floorSize / 2
makePlane(posVec.set(0, wallOffset, -wallOffset), rotVec.set(0, 0, 0))
makePlane(posVec.set(wallOffset, wallOffset, 0), rotVec.set(0, -Math.PI * 0.5, 0))
makePlane(posVec.set(0, wallOffset, wallOffset), rotVec.set(0, Math.PI * 1.0, 0))
makePlane(posVec.set(-wallOffset, wallOffset, 0), rotVec.set(0, -Math.PI * 1.5, 0))



/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)

directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 50
directionalLight.shadow.camera.left = -params.floorSize *0.6
directionalLight.shadow.camera.top = params.floorSize *0.6
directionalLight.shadow.camera.right = params.floorSize *0.6
directionalLight.shadow.camera.bottom = - params.floorSize *0.6
directionalLight.position.set(5, 5, 5)

scene.add(directionalLight.target)
scene.add(directionalLight)
directionalLight.position.set(params.floorSize/2, params.floorSize/2, params.floorSize/2)
directionalLight.target.position.set(directionalLight.target.position.x, directionalLight.target.position.y, directionalLight.target.position.z)

/**
 * Chamaleon Event Trigger
 */

 for(const obj of updateList){
    obj.body.addEventListener('collide', (details) => {
        if(details.contact.getImpactVelocityAlongNormal() > params.chamaleonForce){
            updateList[details.target.meshID].mesh.material = materials[Math.floor(Math.random()*materials.length)]
        }
    })
}


/**
 * Force Applying
 */
//test camera.getWorldDirection(target)
const forceVec = new CANNON.Vec3()
const pointVec = new CANNON.Vec3()
const bodyPos = new CANNON.Vec3()
const tjsforceVec = new THREE.Vector3()

const applyForce = (body, point, direction, force) => {
    bodyPos.copy(body.position)
    tjsforceVec.copy(direction).multiplyScalar(force)
    pointVec.copy(point)

    pointVec.vsub(bodyPos,pointVec)
    
    body.vectorToLocalFrame(tjsforceVec, forceVec)
    // console.log(forceVec)
    // console.log(pointVec, body.position)
    body.applyLocalImpulse(forceVec, pointVec) //forceVec.copy(direction.multiplyScalar(force)))
}


//Raycaster
let intersects
let body
const raycaster = new THREE.Raycaster()
const cameraDirection = new THREE.Vector3()
window.addEventListener('click', event => {
    raycaster.setFromCamera(mouse, camera)
    intersects = raycaster.intersectObjects(updateList.map(item => {return item.mesh} ))

    if(intersects.length > 0){
        body = updateList[intersects[0].object.bodyID].body
        camera.getWorldDirection(cameraDirection)
        applyForce(body, intersects[0].point, raycaster.ray.direction, params.raycastForce)
        //applyForce(body, intersects[0].point, cameraDirection, params.raycastForce)
        body.wakeUp()
    }
})



/**
 * Animate
 */
const clock = new THREE.Clock()
const tick = () =>
{
    const delta = clock.getDelta()
    const elapsedTime = clock.getElapsedTime()



    //Physics Update
    world.step(1/75, delta, 5)


    // Update Meshes
    for(const pair of updateList){
        pair.mesh.position.copy(pair.body.position)
        pair.mesh.quaternion.copy(pair.body.quaternion)
    }

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Stats update
    stats.update()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()