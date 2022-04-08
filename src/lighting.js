import * as THREE from "three"

import { scene, sizes } from "./base.js"
import { sand0, water0, helperColour, middayColour, midnightColour, sunsetColour } from "./utils/colours.js"
import { horizon, showHelpers } from "./parameters.js"

const ambientIntensity = 0.1
const sunIntensity = 1.5
const moonIntensity = sunIntensity / 6

/*
const ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
scene.add(ambientLight)
*/

const hemisphereLight = new THREE.HemisphereLight(water0, sand0, ambientIntensity)
hemisphereLight.position.set(0, 30, 0)
const hemisphereLightHelper = new THREE.HemisphereLightHelper(hemisphereLight, 3, helperColour)
scene.add(hemisphereLight)
showHelpers ? scene.add(hemisphereLightHelper) : null

const nextPow2 = x => Math.pow(2, Math.floor(Math.log(sizes.width) / Math.log(2)))
const sunLight = new THREE.DirectionalLight()
sunLight.castShadow = true
sunLight.shadow.mapSize.set(nextPow2(sizes.width), nextPow2(sizes.height))
sunLight.shadow.camera.far = horizon // needs to correspond to distance I want shadows to reach? i.e. floorSize?
sunLight.shadow.camera.left = -60
sunLight.shadow.camera.top = 60
sunLight.shadow.camera.right = 60
sunLight.shadow.camera.bottom = -60
sunLight.target.position.set(0, 0, 0)
const sunLightHelper = new THREE.DirectionalLightHelper(sunLight, 3, helperColour)
scene.add(sunLight)
showHelpers ? scene.add(sunLightHelper) : null

const moonLight = new THREE.DirectionalLight()
moonLight.castShadow = true
moonLight.shadow.mapSize.set(nextPow2(sizes.width), nextPow2(sizes.height))
moonLight.shadow.camera.far = horizon // needs to correspond to distance I want shadows to reach? i.e. floorSize?
moonLight.shadow.camera.left = -60
moonLight.shadow.camera.top = 60
moonLight.shadow.camera.right = 60
moonLight.shadow.camera.bottom = -60
moonLight.target.position.set(0, 0, 0)
const moonLightHelper = new THREE.DirectionalLightHelper(moonLight, 3, helperColour)
scene.add(moonLight)
showHelpers ? scene.add(moonLightHelper) : null

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
  sunLight.intensity = Math.max(0, sunIntensity * flatTrig(Math.cos, t))
  sunLightHelper.update()

  // t *= 1.03472222222  // lunar day
  t += Math.PI
  moonLight.color = new THREE.Color(midnightColour)
  moonLight.position.set(25 * flatTrig(Math.sin, t), 25 * flatTrig(Math.cos, t), 0)
  moonLight.intensity = Math.max(0, moonIntensity * flatTrig(Math.cos, t))
  moonLightHelper.update()
}

export { updateLighting }
