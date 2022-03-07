export class MeshBody {
    constructor(mesh, body) {
        this.mesh = mesh
        this.body = body
    }
    addTo(scene, world) {
        scene.add(this.mesh)
        world.addBody(this.body)
    }
    synchronise() {
        this.mesh.position.copy(this.body.position)
        this.mesh.quaternion.copy(this.body.quaternion)
    }
}