import {attachSvg} from './Utils.js';
import {transform_funcs, vecLen, unitVec, vecDif, vecSum, vecMul, vecCtr, lineIntersec, vecDotProd} from './Geometry.js';
import {SENSOR, IdHolder} from './BaseClasses.js';


export class ControlPoint extends IdHolder {
	constructor(id, cx, cy, master) {
		super(id);
		this.setCtr([cx, cy]);
		this.master = typeof master === "string" ? document.getElementById(master).objref : master;

		this.shape = attachSvg(this.constructor.parents[SENSOR], this.constructor.tag, 
			{width: 10, height: 10, class: 'var-opaq', id: id});
		this.shape.objref = this;
		this.shape.is_shape = true;
		this.shape.is_cp = true;

		// Placeholders
		this.followers = [];
		this.to_recalc_dir = [];
		this.to_recalc_ratio = [];
	}

	static parents = {[SENSOR]: document.getElementById('control_points')};
	static tag = 'rect';
	static id_prefix = 'cp';

	// Public info
	static alias = 'control_points';
	static movable = true;
	static citizen = false;
	static shape = true;

	setCtr(xy) {
		this.xy = [...xy];
	}

	transform(type, params) {
		this.setCtr(transform_funcs[type](this.xy, params));
		return [];
	}

	render() {
		this.shape.setAttribute('x', this.xy[0] - this.shape.getAttribute('width') / 2);
		this.shape.setAttribute('y', this.xy[1] - this.shape.getAttribute('height') / 2);
	}

	eventsOn() {
		this.shape.classList.remove('sympoi');
	};

	eventsOff() {
		this.shape.classList.add('sympoi');
	};

	delete() {
		super.delete();
		this.shape.remove();
		Object.keys(this).forEach(key => delete this[key]);
	}
}

ControlPoint.register();


class ControlPointInner extends ControlPoint {
	constructor(id, cx, cy, master, prev_cp_id, next_cp_id) {
		super(id, cx, cy, master);
		this.adj_cp_ids = [prev_cp_id, next_cp_id]
	}

	idsToObjs() {
		this.prev = document.getElementById(this.adj_cp_ids[0]).objref;
		this.next = document.getElementById(this.adj_cp_ids[1]).objref;
	}
}


export class ControlPointEdge extends ControlPointInner {
	postInit() {
		this.followers = [this.prev, this.next];
		let a = this.followers.map(cp => [cp.prev, cp.next]).flat().filter(cp => cp instanceof ControlPointEdge);
		if (a.length == 2) {
			1 + 1;
		}
		this.to_recalc_ratio = [...new Set(this.followers.map(cp => [cp.prev, cp.next]).flat().filter(cp => cp instanceof ControlPointEdge))];
	}

	recalcDir() {
		this.dir = unitVec(vecDif(this.prev.xy, this.next.xy));
	}

	recalcRatio() {
		const vec_tot = vecDif(this.prev.xy, this.next.xy);
		const vec_part = vecDif(this.prev.xy, this.xy);
		this.ratio = Math.sign(vecDotProd(vec_part, vec_tot)) * (vecLen(vec_part) / vecLen(vec_tot));
	}

	follow() {
		this.setCtr(vecSum(this.prev.xy, vecMul(vecDif(this.prev.xy, this.next.xy), this.ratio)));
	}
}


export class ControlPointCorner extends ControlPointInner {
	postInit() {
		this.followers = [this.prev, this.next].filter(cp => !(cp instanceof ControlPointTerminal));
		this.to_recalc_dir = [this.prev, this.next];
	}

	follow() {
		this.setCtr(lineIntersec(this.prev.xy, vecSum(this.prev.xy, this.prev.dir), 
			this.next.xy, vecSum(this.next.xy, this.next.dir)));
	}
}


export class ControlPointTerminal extends ControlPoint {
	constructor(id, cx, cy, master, adj_cp_id) {
		super(id, cx, cy, master);
		this.adj_cp_ids = [adj_cp_id];
	}

	idsToObjs() {
		this.adj = document.getElementById(this.adj_cp_ids[0]).objref;
	}

	postInit() {
		this.to_recalc_dir = [this];
	}

	recalcDir() {
		this.dir = unitVec(vecDif(this.xy, this.adj.xy));
	}
}
