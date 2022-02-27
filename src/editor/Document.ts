import * as fs from 'fs';
import * as THREE from "three";
import { CameraMemento, ConstructionPlaneMemento, EditorOriginator, MaterialMemento, ViewportMemento } from "./History";

export class PlasticityDocument {
    constructor(private readonly originator: EditorOriginator) { }

    static async load(filename: string, into: EditorOriginator): Promise<PlasticityDocument> {
        const data = await fs.promises.readFile(filename);
        const json = JSON.parse(data.toString()) as PlasticityJSON;
        for (const [i, viewport] of json.viewports.entries()) {
            into.viewports[i].restoreFromMemento(new ViewportMemento(
                new CameraMemento(
                    viewport.camera.type,
                    new THREE.Vector3().fromArray(viewport.camera.translation),
                    new THREE.Quaternion().fromArray(viewport.camera.rotation),
                    viewport.camera.zoom),
                new THREE.Vector3().fromArray(viewport.target),
                viewport.isXRay,
                new ConstructionPlaneMemento(
                    new THREE.Vector3().fromArray(viewport.constructionPlane.normal),
                    new THREE.Vector3().fromArray(viewport.constructionPlane.translation),
                )
            ));
        };
        const materials = new Map<number, { name: string, material: THREE.MeshPhysicalMaterial }>();
        for (const [i, mat] of json.materials.entries()) {
            const name = mat.name;
            const base = mat.pbrMetallicRoughness.baseColorFactor
            const material = new THREE.MeshPhysicalMaterial({
                color: new THREE.Color().fromArray(base),
                opacity: base[3],
                metalness: mat.pbrMetallicRoughness.metallicFactor,
                roughness: mat.pbrMetallicRoughness.roughnessFactor,
                clearcoat: mat.clearcoatFactor,
                clearcoatRoughness: mat.clearcoatRoughnessFactor,
                ior: mat.ior,
                sheenColor: mat.sheenColorFactor ? new THREE.Color().fromArray(mat.sheenColorFactor) : undefined,
                sheenRoughness: mat.sheenRoughnessFactor,
                specularIntensity: mat.specularFactor,
                specularColor: mat.specularColorFactor ? new THREE.Color().fromArray(mat.specularColorFactor) : undefined,
                transmission: mat.transmissionFactor,
                emissive: mat.emissiveFactor,
            });
            materials.set(i, { name, material });
        }
        into.materials.restoreFromMemento(new MaterialMemento(materials));
        const c3d = await fs.promises.readFile(json.db.uri);
        console.info(filename);
        console.time("load backup");
        await into.db.deserialize(c3d);
        console.timeEnd("load backup");
        return new PlasticityDocument(into);
    }

    async save(filename: string) {
        const memento = this.originator.saveToMemento();
        const { db } = memento;
        const c3d = await db.serialize();
        const c3dFilename = `${filename}.c3d`
        await fs.promises.writeFile(c3dFilename, c3d);

        const viewports = this.originator.viewports.map(v => v.saveToMemento());

        let i = 0;
        const materialId2position = new Map<number, number>();
        for (const id of memento.materials.materials.keys()) {
            materialId2position.set(id, i++);
        }

        const json = {
            asset: {
                version: 1.0
            },
            db: {
                uri: c3dFilename,
            },
            viewports: viewports.map(viewport => (
                {
                    camera: {
                        type: viewport.camera.mode,
                        // fov: viewport.camera.fov,
                        translation: viewport.camera.position.toArray(),
                        rotation: viewport.camera.quaternion.toArray(),
                        zoom: viewport.camera.zoom,
                    } as ViewportCameraJSON,
                    target: viewport.target.toArray(),
                    constructionPlane: {
                        normal: viewport.constructionPlane.n.toArray(),
                        translation: viewport.constructionPlane.o.toArray()
                    },
                    isXRay: viewport.isXRay,
                } as ViewportJSON
            )),
            // nodes: [
            //     {
            //         name: "",
            //         item: 1
            //     },
            //     {
            //         name: "",
            //         group: 1,
            //         children: [],
            //     }
            // ],
            items: [...db.geometryModel.values()].map(({ view }) => {
                const materialId = db.name2material.get(db.version2name.get(view.simpleName)!);
                const material = materialId !== undefined ? materialId2position.get(materialId)! : undefined;
                return { material }
            }),
            // groups: [
            //     {
            //          name: "",
            //     }
            // ],
            materials: [...memento.materials.materials.values()].map(mat => {
                const { name, material } = mat;
                return {
                    name: name,
                    pbrMetallicRoughness: {
                        baseColorFactor: [...material.color.toArray(), material.opacity] as [number, number, number, number],
                        metallicFactor: material.metalness,
                        roughnessFactor: material.roughness,
                    },
                    emmissiveFactor: material.emissive,
                    clearcoatFactor: material.clearcoat,
                    clearcoatRoughnessFactor: material.clearcoatRoughness,
                    ior: material.ior,
                    sheenColorFactor: material.sheenColor.toArray() as [number, number, number],
                    sheenRoughnessFactor: material.sheenRoughness,
                    specularFactor: material.specularIntensity,
                    specularColorFactor: material.specularColor.toArray() as [number, number, number],
                    transmissionFactor: material.transmission,
                } as MaterialJSON
            }),
        } as PlasticityJSON;
        const string = JSON.stringify(json);
        return fs.promises.writeFile(filename, string);
    }
}

type TranslationJSON = [number, number, number];

type RotationJSON = [number, number, number, number];

interface ViewportCameraJSON {
    type: 'perspective' | 'orthographic';
    translation: TranslationJSON;
    rotation: RotationJSON;
    zoom: number;
}

interface ConstructionPlaneJSON {
    normal: TranslationJSON;
    translation: TranslationJSON;
}

interface ViewportJSON {
    camera: ViewportCameraJSON;
    target: TranslationJSON;
    constructionPlane: ConstructionPlaneJSON;
    isXRay: boolean;
}

interface GeometryDatabaseJSON {
    uri: string;
}

interface MaterialJSON {
    name: string,
    pbrMetallicRoughness: {
        baseColorFactor: [number, number, number, number];
        metallicFactor: number;
        roughnessFactor: number;
    };
    clearcoatFactor?: number;
    clearcoatRoughnessFactor?: number;
    ior?: number;
    sheenColorFactor?: [number, number, number];
    sheenRoughnessFactor?: number;
    specularFactor?: number;
    specularColorFactor?: [number, number, number];
    transmissionFactor?: number;
    emissiveFactor?: number;
}

interface PlasticityJSON {
    db: GeometryDatabaseJSON;
    viewports: ViewportJSON[];
    materials: MaterialJSON[];
}