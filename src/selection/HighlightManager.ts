import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import c3d from '../../build/Release/c3d.node';
import { GeometryDatabase } from "../editor/GeometryDatabase";
import * as visual from '../editor/VisualModel';

export class HighlightManager {
    constructor(
        private readonly db: GeometryDatabase
    ) { }

    highlightTopologyItems(collection: Iterable<string>, mat: (c: c3d.TopologyItem) => THREE.Material) {
        for (const id of collection) {
            const { views, model } = this.db.lookupTopologyItemById(id);
            const newMaterial = mat(model);
            for (const v of views) {
                v.traverse(o => {
                    if (o instanceof Line2 || o instanceof THREE.Mesh) {
                        o.userData.oldMaterial = o.material;
                        o.material = newMaterial;
                    }
                })
            }
        }
    }

    unhighlightTopologyItems(collection: Iterable<string>) {
        for (const id of collection) {
            const { views } = this.db.lookupTopologyItemById(id);
            for (const v of views) {
                v.traverse(o => {
                    if (o instanceof Line2 || o instanceof THREE.Mesh) {
                        o.material = o.userData.oldMaterial;
                        delete o.userData.oldMaterial;
                    }
                })
            }
        }
    }

    highlightItems(collection: Iterable<c3d.SimpleName>, mat: (c: c3d.Item) => THREE.Material) {
        for (const id of collection) {
            const { view, model } = this.db.lookupItemById(id);
            if (!(model instanceof c3d.PlaneInstance || model instanceof c3d.SpaceInstance)) throw new Error("invalid precondition");
            const newMaterial = mat(model);
            view.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    o.userData.oldMaterial = o.material;
                    o.material = newMaterial;
                }
            })
        }
    }

    unhighlightItems(collection: Iterable<c3d.SimpleName>) {
        for (const id of collection) {
            const { view, model } = this.db.lookupItemById(id);
            if (!(model instanceof c3d.PlaneInstance || model instanceof c3d.SpaceInstance)) {
                throw new Error("invalid precondition");
            }
            view.traverse(o => {
                if (o instanceof Line2 || o instanceof THREE.Mesh) {
                    o.material = o.userData.oldMaterial;
                    delete o.userData.oldMaterial;
                } else if (o instanceof THREE.Sprite) {
                    o.visible = false;
                }
            })
        }
    }

    highlightControlPoints(collection: Iterable<string>, mat: (c: number) => THREE.SpriteMaterial) {
        for (const id of collection) {
            const { index, views } = this.db.lookupControlPointById(id);
            for (const v of views) {
                const newMaterial = mat(index);
                v.traverse(o => {
                    if (o instanceof THREE.Sprite) {
                        o.userData.oldMaterial = o.material;
                        o.material = newMaterial;
                        o.visible = true;
                    }
                })
            }
        }
    }

    unhighlightControlPoints(collection: Iterable<string>) {
        for (const id of collection) {
            const { views } = this.db.lookupControlPointById(id);
            for (const v of views) {
                v.traverse(o => {
                    if (o instanceof THREE.Sprite) {
                        o.visible = false;
                        o.material = o.userData.oldMaterial;
                        delete o.userData.oldMaterial;
                    }
                })
            }
        }
    }

    showControlPoints(collection: Iterable<c3d.SimpleName>) {
        for (const id of collection) {
            const { view, model } = this.db.lookupItemById(id);
            view.traverse(o => {
                if (o instanceof visual.ControlPoint) {
                    o.visible = true;
                }
            })
        }
    }

    hideControlPoints(collection: Iterable<c3d.SimpleName>) {
        for (const id of collection) {
            const { view, model } = this.db.lookupItemById(id);
            view.traverse(o => {
                if (o instanceof visual.ControlPoint) {
                    o.visible = false;
                }
            })
        }
    }
}