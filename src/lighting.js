import * as THREE from "three"

import { scene } from "./base.js"
import {sand0, water0, helperColour, middayColour, midnightColour, sunsetColour} from "./utils/colours.js"


/*
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
scene.add(ambientLight)
*/

const hemisphereLight = new THREE.HemisphereLight(water0, sand0, 1)
hemisphereLight.position.set(0, 30, 0)
const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 3, helperColour)
scene.add(hemisphereLight)
scene.add(hemisphereLightHelper)


const sunLight = new THREE.DirectionalLight()
sunLight.castShadow = true
sunLight.shadow.mapSize.set(1024, 1024)
sunLight.shadow.camera.far = 100 // needs to correspond to distance I want shadows to reach? i.e. floorSize?
sunLight.shadow.camera.left = -30
sunLight.shadow.camera.top = 30
sunLight.shadow.camera.right = 30
sunLight.shadow.camera.bottom = -30
sunLight.target.position.set(0, 0, 0)
const sunLightHelper = new THREE.DirectionalLightHelper(sunLight, 3, helperColour)
scene.add(sunLight)
scene.add(sunLightHelper)

const moonLight = new THREE.DirectionalLight()
moonLight.castShadow = true
moonLight.shadow.mapSize.set(1024, 1024)
moonLight.shadow.camera.far = 100 // needs to correspond to distance I want shadows to reach? i.e. floorSize?
moonLight.shadow.camera.left = -30
moonLight.shadow.camera.top = 30
moonLight.shadow.camera.right = 30
moonLight.shadow.camera.bottom = -30
moonLight.target.position.set(0, 0, 0)
const moonLightHelper = new THREE.DirectionalLightHelper(moonLight, 3, helperColour)
scene.add(moonLight)
scene.add(moonLightHelper)

// https://math.stackexchange.com/questions/100655/cosine-esque-function-with-flat-peaks-and-valleys
const flatTrig = (foo, t) => {
    const b = 3
    return Math.sqrt((1 + b * b) / (1 + b * b * foo(t) * foo(t))) * foo(t)
}

const updateLighting = (elapsedTime) => {
    let t = 0.1 * elapsedTime
    sunLight.color = new THREE.Color(middayColour)
    sunLight.color.lerpHSL(new THREE.Color(sunsetColour), 1 - Math.abs(flatTrig(Math.cos, t)))
    sunLight.position.set(25 * flatTrig(Math.sin, t), 25 * flatTrig(Math.cos, t), 0)
    sunLight.intensity = Math.max(0, 1.5 * flatTrig(Math.cos, t))
    sunLightHelper.update()
    
    // t *= 1.03472222222  // lunar day
    t += Math.PI
    moonLight.color = new THREE.Color(midnightColour)
    moonLight.position.set(25 * flatTrig(Math.sin, t), 25 * flatTrig(Math.cos, t), 0)
    moonLight.intensity = Math.max(0, 1.5 * flatTrig(Math.cos, t))
    moonLightHelper.update()
}

export { updateLighting }