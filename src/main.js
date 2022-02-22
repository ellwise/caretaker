import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js'
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
    
    floorSize : 60,
    sphereVelocity : 20,
    raycastForce : 350,
    gravity : 9.81,  // upwards
    replicationFactor: 0.4,
}
gui.add(params, 'raycastForce')


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
camera.position.set(-60, 30, 60)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.target = new Vector3(0, 5, 0)
controls.enableDamping = true
controls.enablePan = false

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setClearColor(0xc7fdf7)  // background color
let effect = new OutlineEffect( renderer )

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
world.broadphase = new CANNON.SAPBroadphase(world)  // GridBroadphase(world)  // 
world.broadphase.useBoundingBoxes = true
world.allowSleep = false  // to ensure we keep colliding when things stop moving
world.solver.iterations = 10 // default is 10

gui.add(params, 'gravity', 0, 2 * params.gravity, 0.01).onChange(v => world.gravity.set(0, params.gravity, 0))
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

/**
 * Spheres
 */
const sphereGeo = new THREE.SphereGeometry(1, 32, 32)

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

/*
const texture = new THREE.TextureLoader()
texture.load('textures/fourTone.jpg')
texture.minFilter = THREE.NearestFilter
texture.magFilter = THREE.NearestFilter
console.log(texture)
*/

const createSphere = (radius, position, rowNum) => {
    // Mesh
    const colour = new THREE.Color()
    rowNum == undefined ? colour.setHSL(0, 1, 0.6) : colour.setHSL(0.02 * rowNum % 360, 1, 0.6)
    const sphereMaterial = new THREE.MeshToonMaterial()
    sphereMaterial.color = colour
    //sphereMaterial.gradientMap = texture
    const sphereMesh = new THREE.Mesh(sphereGeo, sphereMaterial)
    sphereMesh.castShadow = true
    sphereMesh.scale.set(radius, radius, radius)
    if (position == undefined) {
        sphereMesh.position.set(0, 1, 0)
    } else {
        sphereMesh.position.set(position.x, position.y + 2*radius, position.z)
    }
    scene.add(sphereMesh)

    // Physics
    const sphereShape = new CANNON.Sphere(radius)
    const sphereBody = new CANNON.Body({
        mass: 1.333 * radius * radius * radius * Math.PI, /* * Math.random() + .5,*/
        shape: sphereShape,
        material : defaultMaterial,
        angularDamping: 0.8,
        linearDamping: 0.2,
    })
    sphereBody.position.copy(sphereMesh.position)
    world.addBody(sphereBody)
    linkBodyMesh(sphereBody, sphereMesh)

    return sphereBody
}

const linkSpheres = (s1, s2, radius) => {
    let pointConstraint = new CANNON.DistanceConstraint(
        s1, s2, 1.05 * 2 * radius,
    )
    world.addConstraint(pointConstraint)
}

const spheres = [[]]

const radius = 1
const s01 = createSphere(radius)
const s02 = createSphere(radius)
const s03 = createSphere(radius)
const s04 = createSphere(radius)
const s05 = createSphere(radius)
spheres[0].push(s01, s02, s03, s04, s05)

// link first row
linkSpheres(s01, s02, radius)
linkSpheres(s02, s03, radius)
linkSpheres(s03, s04, radius)
linkSpheres(s04, s05, radius)

const repelSpheres = (s1, s2) => {
    let spring = new CANNON.Spring(s1, s2, {
        localAnchorA: new CANNON.Vec3(0, 0, 0),
        localAnchorB: new CANNON.Vec3(0, 0, 0),
        restLength: 100,
        stiffness: 25,
        damping: 100,
    })
    
    // Compute the force after each step
    world.addEventListener('postStep', (event) => {
        spring.applyForce()
    })
}

gui.add(params, 'replicationFactor', 0, 1, 0.01).onChange(v => {params.replicationFactor = v})

params.growSheet = () => {

    // add a new row of spheres
    const newSpheres = []
    for (let j=0; j<spheres[spheres.length - 1].length; j++) {
        let num = Math.random() < params.replicationFactor ? 2 : 1
        for (let k=0; k<num; k++) {
            newSpheres.push(
                createSphere(
                    radius,
                    spheres[spheres.length - 1][j].position,
                    spheres.length
                )
            )
        }
        for (let k=1; k <= num; k++) {
            linkSpheres(
                spheres[spheres.length - 1][j],
                newSpheres[newSpheres.length - k],
                radius,
            )
        }
    }
    // join the spheres in the new row
    spheres.push(newSpheres)
    for (let j=0; j<spheres[spheres.length - 1].length - 1; j++) {
        linkSpheres(
            spheres[spheres.length - 1][j],
            spheres[spheres.length - 1][j + 1],
            radius,
        )
    }
    // repel spheres that are doubly-separated (to straighten edges)
    for (let j=0; j<spheres[spheres.length - 1].length - 2; j++) {
        repelSpheres(
            spheres[spheres.length - 1][j],
            spheres[spheres.length - 1][j + 2],
        )
    }
}
gui.add(params,'growSheet')



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


// rock
const rockRadius = 10
const detail = 0
const rockGeo = new THREE.IcosahedronGeometry(rockRadius, detail)
//const rockGeo = new THREE.SphereGeometry(rockRadius)
const rockMat = new THREE.MeshToonMaterial({ color: 0x808487 })
const rockMesh = new THREE.Mesh(rockGeo, rockMat)
rockMesh.castShadow = true
//rockMesh.scale.set(rockRadius, rockRadius, rockRadius)
rockMesh.receiveShadow = true
rockMesh.position.set(-10, 5, -10)
scene.add(rockMesh)


let position = rockMesh.geometry.attributes.position.array
const rockPoints = []
for (let i = 0; i < position.length; i += 3) {
    rockPoints.push(new CANNON.Vec3(position[i], position[i + 1], position[i + 2]))
}
const rockFaces = []
for (let i = 0; i < position.length / 3; i += 3) {
    rockFaces.push([i, i + 1, i + 2])
}
//rockMesh.scale.set(0.95, 0.95, 0.95) // make smaller after collision body creation to avoid clipping?
const rockShape = new CANNON.ConvexPolyhedron({
    vertices: rockPoints,
    faces: rockFaces,
})
//const rockShape = new CANNON.Sphere(rockRadius)
const rockBody = new CANNON.Body({
    mass: 0,  // so it's not affected by gravity! otherwise the body will move but the mesh will remain
    shape: rockShape,
})
rockBody.material = defaultMaterial  // adding this after creation sets collisionResponse to true?
rockBody.position.copy(rockMesh.position)
world.addBody(rockBody)


/**
 * Floor
 */
//mesh
const floorGeo = new THREE.PlaneGeometry(params.floorSize, params.floorSize)
const floorMat =  new THREE.MeshStandardMaterial({ color: 0xfff77a })

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

    return planeBody
}



const posVec = new Vector3()
const rotVec = new Vector3()
//floor
const floor = makePlane(posVec.set(0, 0, 0), rotVec.set(- Math.PI * 0.5, 0, 0))
const gc01 = new CANNON.PointToPointConstraint(
    s01, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(-4*1.05, 0, 0)
)
const gc03 = new CANNON.PointToPointConstraint(
    s03, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(0, 0, 0)
)
const gc05 = new CANNON.PointToPointConstraint(
    s05, new CANNON.Vec3(0, -1, 0), floor, new CANNON.Vec3(4*1.05, 0, 0)
)
world.addConstraint(gc01)
world.addConstraint(gc03)
world.addConstraint(gc05)

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


/**
 * Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9)

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
    effect.render(scene, camera)

    // Stats update
    stats.update()

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()