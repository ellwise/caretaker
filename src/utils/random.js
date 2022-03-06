import * as openSimplexNoise from "open-simplex-noise"


const epoch = new Date(Date.now()) // milliseconds
const seed = new Date(epoch.getFullYear(), epoch.getMonth(), epoch.getDate())

const noise3 = openSimplexNoise.makeNoise3D(seed)
const noise4 = openSimplexNoise.makeNoise4D(seed)

export { noise3, noise4 }