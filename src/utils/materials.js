import * as CANNON from "cannon-es"

const concreteMaterial = new CANNON.Material("concrete")
const plasticMaterial = new CANNON.Material("plastic")
const defaultMaterial = new CANNON.Material("default")
const concretePlasticContact = new CANNON.ContactMaterial(
  concreteMaterial,
  plasticMaterial,
  {
    friction: 0.1,
    restitution: 0.7,
  },
)

const plasticPlasticContact = new CANNON.ContactMaterial(
  plasticMaterial,
  plasticMaterial,
  {
    friction: 0.2,
    restitution: 0.9,
  },
)

const defaultDefaultContact = new CANNON.ContactMaterial(
  defaultMaterial,
  defaultMaterial,
  {
    friction: 0.05,
    restitution: 0.8,
  },
)

export { concreteMaterial, defaultMaterial, plasticMaterial, concretePlasticContact, defaultDefaultContact, plasticPlasticContact }
