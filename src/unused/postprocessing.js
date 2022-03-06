import * as THREE from "three"
import * as POSTPROCESSING from "postprocessing"
import {camera, renderer, scene} from "../base.js"
import { midnightColour } from "./colours.js"
import { horizon } from "../parameters.js"


const sunGeom = new THREE.SphereGeometry(2)
let sunMaterial = new THREE.MeshBasicMaterial({color: 0xffffff})
let sun = new THREE.Mesh(sunGeom, sunMaterial)
scene.add(sun)

let godRaysEffect = new POSTPROCESSING.GodRaysEffect(
  camera,
  sun,
  {
    blurriness: 0,  // sharp lines
    clampMax: 1,
    color: midnightColour,  // cyan
    density: 1,  // extend far out (lots of rays?)
    decay: 0.99,  // distance rays travel
    exposure: 1,  // white centre
    samples: 200,  // pixellation level
    weight: 0.1,  // intensity
  }
)

const depthOfFieldEffect = new POSTPROCESSING.DepthOfFieldEffect(camera, {
  focusDistance: 0.0,
  focalLength: 1,
  bokehScale: 2.0,
  height: 480
});

const depthEffect = new POSTPROCESSING.DepthEffect({
  blendFunction: POSTPROCESSING.BlendFunction.SKIP
});

const vignetteEffect = new POSTPROCESSING.VignetteEffect({
  eskil: false,
  offset: 0.35,
  darkness: 0.5
});

const cocTextureEffect = new POSTPROCESSING.TextureEffect({
  blendFunction: POSTPROCESSING.BlendFunction.SKIP,
  texture: depthOfFieldEffect.renderTargetCoC.texture
});

let areaImage = new Image()
areaImage.src = POSTPROCESSING.SMAAEffect.areaImageDataURL
let searchImage = new Image()
searchImage.src = POSTPROCESSING.SMAAEffect.searchImageDataURL
const smaaEffect = new POSTPROCESSING.SMAAEffect(
  searchImage,
  areaImage,
  POSTPROCESSING.SMAAPreset.HIGH,
  POSTPROCESSING.EdgeDetectionMode.COLOR,
)

const effectPass = new POSTPROCESSING.EffectPass(
  camera,
  //depthOfFieldEffect,
  vignetteEffect,
  //cocTextureEffect,
  //depthEffect,
  smaaEffect,
  godRaysEffect,
);
smaaEffect.edgeDetectionMaterial.setEdgeDetectionThreshold(0.05);

const renderPass = new POSTPROCESSING.RenderPass(scene, camera)

let composer = new POSTPROCESSING.EffectComposer(renderer)
composer.addPass(renderPass)
composer.addPass(effectPass)
effectPass.renderToScreen = true

window.addEventListener("resize", (event) => {

  const width = window.innerWidth;
  const height = window.innerHeight;
  composer.setSize(width, height);

});

const updateSun = (elapsedTime) => {
    let t = 0.1 * elapsedTime
    sun.position.set(horizon * Math.sin(t), horizon * Math.cos(t), 0)
}

// composer.render(elapsedTime) // elapsedTime)

export {updateSun, composer}