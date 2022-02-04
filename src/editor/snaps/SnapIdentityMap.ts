import c3d from '../../build/Release/c3d.node';
import { inst2curve } from "../../util/Conversion";
import * as intersectable from "../../visual_model/Intersectable";
import * as visual from '../../visual_model/VisualModel';
import { DatabaseLike } from "../DatabaseLike";
import * as snap from "./Snap";

export class SnapIdentityMap {
    private readonly identityMap = new WeakMap<intersectable.Intersectable, snap.Snap>();

    constructor(private readonly db: DatabaseLike) { }

    readonly FaceSnap = (view: visual.Face, model: c3d.Face) => {
        const { identityMap } = this;
        if (identityMap.has(view)) return identityMap.get(view)! as snap.FaceSnap;
        const result = new snap.FaceSnap(view, model);
        identityMap.set(view, result);
        return result;
    }

    readonly CurveEdgeSnap = (view: visual.CurveEdge, model: c3d.CurveEdge) => {
        const { identityMap } = this;
        if (identityMap.has(view)) return identityMap.get(view)! as snap.CurveEdgeSnap;
        const result = new snap.CurveEdgeSnap(view, model);
        identityMap.set(view, result);
        return result;
    }

    readonly CurveSnap = (view: visual.SpaceInstance<visual.Curve3D>, model: c3d.Curve3D) => {
        const { identityMap } = this;
        const underlying = view.underlying;
        if (identityMap.has(underlying)) return identityMap.get(underlying)! as snap.CurveSnap;
        const result = new snap.CurveSnap(view, model);
        identityMap.set(underlying, result);
        return result;
    }

    lookup(intersectable: intersectable.Intersectable): snap.Snap {
        const { db } = this;

        if (intersectable instanceof visual.Face) {
            const model = db.lookupTopologyItem(intersectable);
            return this.FaceSnap(intersectable, model);
        } else if (intersectable instanceof visual.CurveEdge) {
            const model = db.lookupTopologyItem(intersectable);
            return this.CurveEdgeSnap(intersectable, model);
        } else if (intersectable instanceof visual.Curve3D) {
            const model = db.lookup(intersectable.parentItem);
            return this.CurveSnap(intersectable.parentItem, inst2curve(model)!);
        } else {
            throw new Error("invalid snap target: " + intersectable.constructor.name);
        }
    }
}
