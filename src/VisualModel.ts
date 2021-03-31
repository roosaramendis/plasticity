import * as THREE from "three";
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import c3d from '../build/Release/c3d.node';
import { Disposable, DisposableLike, CompositeDisposable } from 'event-kit';

// This class hierarchy mirrors the c3d hierarchy into the THREE.js
// Object3D hierarchy. In addition to the various utility functions
// The purpose of this is to push as much sanity-checking into the type
// system as possible

export type VisualModel = THREE.Object3D & DisposableLike;

class DisposableGroup extends THREE.Group implements DisposableLike {
    disposable = new CompositeDisposable();

    dispose() {
        this.disposable.dispose();
    }
}

export interface ItemBuilder {
    addEdges(edges: EdgeGroup): void;
    addFaces(faces: FaceGroup): void;
    build(): Item;
}
export class Item extends DisposableGroup implements ItemBuilder {
    private constructor() {
        super();
    }


    static builder(): ItemBuilder {
        return new Item();
    }

    build() { return this }

    addEdges(edges: EdgeGroup) {
        super.add(edges);
        this.disposable.add(new Disposable(() => edges.dispose()));
    }

    addFaces(faces: FaceGroup) {
        super.add(faces);
        this.disposable.add(new Disposable(() => faces.dispose()));
    }

    add(...object: THREE.Object3D[]): this {
        throw 'Do not call this method, call addFaces or addEdges instead';
    }
}

interface EdgeGroupBuilder {
    addEdge(edge: Edge): void;
    build(): EdgeGroup;
}

export class EdgeGroup extends DisposableGroup implements EdgeGroupBuilder {
    private constructor() {
        super();
    }

    static builder(): EdgeGroupBuilder {
        return new EdgeGroup();
    }

    build() { return this }

    addEdge(edge: Edge) {
        super.add(edge);
        this.disposable.add(new Disposable(() => edge.dispose()));
    }

    add(...object: THREE.Object3D[]): this {
        throw 'Do not call this method, call addEdge instead';
    }
}

interface FaceGroupBuilder {
    addFace(face: Face): void;
    build(): FaceGroup;
}

export class FaceGroup extends DisposableGroup implements FaceGroupBuilder {
    private constructor() {
        super();
    }

    static builder(): FaceGroupBuilder {
        return new FaceGroup();
    }

    build() { return this }
    
    addFace(face: Face) {
        super.add(face);
        this.disposable.add(new Disposable(() => face.dispose()));
    }

    add(...object: THREE.Object3D[]): this {
        throw 'Do not call this method, call addFace instead';
    }
}

export class Face extends THREE.Mesh implements DisposableLike {
    constructor(name: c3d.Name, simpleName: number, geometry?: THREE.BufferGeometry, material?: THREE.Material) {
        super(geometry, material);
        this.userData.name = name;
        this.userData.simpleName = name;
    }

    dispose() {
        this.geometry.dispose();
    }
}

export class Edge extends Line2 implements DisposableLike {
    constructor(name: c3d.Name, simpleName: number, geometry?: LineGeometry, material?: LineMaterial) {
        super(geometry, material);
        this.userData.name = name;
        this.userData.simpleName = simpleName;
    }

    dispose() {
        this.geometry.dispose();
    }
}

export class CurveEdge extends Edge {
    get parentObject(): Item {
        return this.parent.parent as Item;
    }
}

export class Curve3D extends EdgeGroup {

}
