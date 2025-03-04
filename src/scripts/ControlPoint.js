import {CtrRect, attachSvg, setAttrsSvg} from './Utils.js';
import {MOVE, ROTATE, SCALE, STRETCH, transform_funcs, vecLen, unitVec, vecDif, vecSum, vecMul, rotateVec, vecCtr, lineIntersec} from './Geometry.js';
import {SENSOR, SHAPE, HIGHLIGHT, SELECTHOLE, CanvasCitizen, IdHolder} from './BaseClasses.js';


export class ControlPoint extends IdHolder {
	constructor(id, cx, cy, master) {
		super(id);
		this.setCtr([cx, cy]);
		this.master = typeof master === "string" ? document.getElementById(master).objref : master;

		this.shape = attachSvg(this.constructor.parents[SENSOR], this.constructor.tag, 
			{width: 10, height: 10, class: 'control-point', id: id});
		this.shape.objref = this;
		this.shape.is_shape = true;
		this.shape.is_cp = true;

		['focus', 'blur'].forEach(method => this[method] = this[method].bind(this));
		this.shape.addEventListener('mousedown', this.focus);
	}

	static parents = {[SENSOR]: document.getElementById('control_points')};
	static tag = 'rect';
	static id_prefix = 'cp';

	// Public info
	static alias = 'control_points';
	static movable = true;
	static citizen = false;
	static shape = true;

	static is_registered = this.register();

	setCtr(xy) {
		this.xy = [...xy];
	}

	transform(type, params) {
		this.setCtr(transform_funcs[type](this.xy, params));
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

	focus() {
		this.shape.classList.remove('control-point');
		this.shape.classList.add('control-point-opaque');
		window.addEventListener('mouseup', this.blur);
	}

	blur() {
		window.removeEventListener('mouseup', this.blur);
		this.shape.classList.remove('control-point-opaque');
		this.shape.classList.add('control-point');
	}

	delete() {
		super.delete();
		this.shape.remove();

		// cp_dependencies
		// cp_funcs
		// cp_args
		delete cp_dependencies[this.id];
		delete cp_funcs[this.id];
		delete cp_args[this.id];
		// cp_dependencies = Object.fromEntries(Object.entries(cp_dependencies).filter(ids => !ids.map(id => id == this.id).some()));

		for (const [key, val] of Object.entries(cp_dependencies)) {
			// const arr = val.map(id => id == this.id);
			// const flag = arr.some();
			// if (arr.some()) delete cp_dependencies[key];
			if (val.some(id => id == this.id)) delete cp_dependencies[key];
		}
		Object.keys(this).forEach(key => delete this[key]);
	}
}


const LAYER_SPEC = Object.freeze({
	[SENSOR]: {
		override: {'stroke-linecap': 'round', 'stroke-linejoin': 'round', stroke: 'blue', fill: 'blue'}, 
		vals: {extra_width: 6}
	},
	[SHAPE]: {
		override: {class: 'sympoi'},
		vals: {extra_width: 0}
	},
	[HIGHLIGHT]: {
		override: {'stroke-linecap': 'round', 'stroke-linejoin': 'round', stroke: 'blue', fill: 'blue'},
		vals: {extra_width: 6}
	},
	[SELECTHOLE]: {
		override: {'stroke-linecap': 'round', 'stroke-linejoin': 'round', stroke: null, fill: null},
		vals: {extra_width: 3}
	},
});


export class ShapeBase extends CanvasCitizen {
	constructor(id, cps_data) { // (id, [[id0, x0, y0], [id1, x1, y1]])
		super(id);
		this.style = {...this.constructor.default_style};
		this.layers = new Array(4).fill(null);
		this.setControlPoints(cps_data);
		this.recalcCtr();
	}

	setControlPoints(cps_data) {
		this.cps = cps_data.map(cp_data => new ControlPoint(...cp_data, this));
	}

	static parents = {
		...super.parents, 
		[SHAPE]: document.getElementById('shapes')
	};

	static sensor_flags = {
		is_shape: true
	};

	// Public info
	static movable = true;
	static shape = true;

	static default_style = {
		stroke: 'black',
		fill: 'black',
		'stroke-linejoin': 'arcs',
		'stroke-width': 2
	};

	select() {
		this.eventsOff();
		this.createLayer(HIGHLIGHT);
		this.createLayer(SELECTHOLE);
	};

	deselect() {
		this.deleteLayer(HIGHLIGHT);
		this.deleteLayer(SELECTHOLE);
		this.eventsOn();
	};

	eventsOn() {
		this.layers[SENSOR].classList.remove('sympoi');
		this.cps.forEach(cp => cp.eventsOn());
	};

	eventsOff() {
		this.layers[SENSOR].classList.add('sympoi');
		this.cps.forEach(cp => cp.eventsOff());
	};

	calcCoordinates() {
		throw new Error('Override the abstract method!');
	}

	getData() {
		return [this.cps.map(cp => [cp.id, ...cp.xy])];
	}

	recalcCtr() {
		this.xy = [0, 1].map(i => {
			let vals = this.cps.map(cp => cp.xy[i]);
			return (Math.min(...vals) + Math.max(...vals)) / 2;
		});
	}

	transform(type, params) {
		this.cps.forEach(cp => cp.transform(type, params));
	}

	render() {
		this.recalcCtr();
		this.calcCoordinates();

		// Follow coordinates
		for (const layer of this.layers) {
			if (layer) [...layer.children].forEach((el, i) => setAttrsSvg(el, this.coords[i]))
		}

		this.createLayer(SHAPE);
		this.createLayer(SENSOR);

		if (this.constructor.delSel.has(this.id)) {
			this.select();
			this.constructor.delSel.delete(this.id);
		}
	}

	createLayer(layer_idx) {
		if (!this.layers[layer_idx]) {
			const {override, vals: {extra_width}} = LAYER_SPEC[layer_idx];
			const attrs = {...this.style};
			Object.assign(attrs, override);
			attrs['stroke-width'] = attrs['stroke-width'] ? attrs['stroke-width'] + extra_width : extra_width;
			this.layers[layer_idx] = attachSvg(this.constructor.parents[layer_idx], 'g');
			const elements = this.createElements(layer_idx, attrs);
			if (layer_idx == SENSOR) this.markSensor(elements);
		}
	}

	createElements(layer_idx, attrs) {
		throw new Error('Override the abstract method!');
	}

	markSensor(elements) {
		this.layers[SENSOR].setAttribute('class', 'sensor-line');
		this.layers[SENSOR].id = this.id;
		this.layers[SENSOR].objref = this;
		elements.forEach(el => {
			for (const [key, val] of Object.entries(this.constructor.sensor_flags)) el[key] = val;
			el.objref = this;
		});
	}

	deleteLayer(layer_idx) {
		if (this.layers[layer_idx]) {
			this.layers[layer_idx].remove();
			this.layers[layer_idx] = null;
		}
	}

	delete() {
		super.delete();
		Object.keys(LAYER_SPEC).forEach(layer => this.deleteLayer(layer));
		this.cps.forEach(cp => cp.delete());
	}
}


export class Line extends ShapeBase {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_l')
	}

	static sensor_flags = {
		...super.sensor_flags,
		is_line: true
	};

	// Public info
	static alias = 'lines';

	static id_prefix = 'l';

	static is_registered = this.register();

	calcCoordinates() {
		this.coords = [{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]}];
	}

	createElements(layer_idx, attrs) {
		return [attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0]})];
	}
}


export class Arrow extends Line {
	static sensor_flags = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).sensor_flags,
		is_arrow: true
	};

	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_r')
	}

	static alias = 'arrows';

	static id_prefix = 'r';

	static is_registered = this.register();

	static triangle = [[-15, -5], [0, 0], [-15, 5]];

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const rot_ang = Math.atan2(vec[1], vec[0]);
		const triangle = this.constructor.triangle.map(
			pt => vecSum(rotateVec(pt, rot_ang), this.cps[1].xy).join()
		).join(' ');
		const line_end = vecSum(this.cps[1].xy, vecMul(unitVec(vec), -10));
		this.coords = [
			{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: line_end[0], y2: line_end[1]},
			{points: triangle}
		];
	}

	createElements(layer_idx, attrs) {
		const line = attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0]});
		let stroke_width = attrs['stroke-width'] - this.style['stroke-width'];
		const triangle = attachSvg(this.layers[layer_idx], 'polygon', {...attrs, ...this.coords[1], 'stroke-width': stroke_width});
		return [line, triangle];
	}
}


export class Circle extends ShapeBase {
	static sensor_flags = {
		...super.sensor_flags,
		is_circle: true
	};

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_i')
	}

	static alias = 'circles';

	static id_prefix = 'i';

	static is_registered = this.register();

	calcCoordinates() {
		this.coords = [{cx: this.cps[0].xy[0], cy: this.cps[0].xy[1], r: vecLen(vecDif(...(this.cps.map(cp => cp.xy))))}];
	}

	recalcCtr() {
		this.xy = [...this.cps[0].xy];
	}

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'circle', {...attrs, ...this.coords[0]})];
	}
}


export class Rectangle extends ShapeBase {
	static sensor_flags = {
		...super.sensor_flags,
		is_rectangle: true
	};

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_e')
	}

	static alias = 'rectangles';

	static id_prefix = 'e';

	static is_registered = this.register();

	calcCoordinates() {
		const x1 = this.cps[0].xy[0], y1 = this.cps[0].xy[1], x2 = this.cps[1].xy[0], y2 = this.cps[1].xy[1];
		this.coords = [{x: Math.min(x1, x2), y: Math.min(y1, y2), 
			width: Math.abs(x2 - x1), height: Math.abs(y2 - y1)}];
	}

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'rect', {...attrs, ...this.coords[0]})];
	}
}


export class MultipointShape extends ShapeBase {
	static min_pt_cnt = 2; // Minimum number of control points to build the shape

	static getNewAugCpId() {
		return null;
	}

	static insertMidCp(cps, id) {
		return cps;
	}
}


export class Polyline extends MultipointShape {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_p')
	}

	static sensor_flags = {
		...super.sensor_flags,
		is_polyline: true
	};

	static alias = 'polylines';

	static id_prefix = 'p';

	static is_registered = this.register();

	calcCoordinates() {
		this.coords = [{points: this.cps.map(cp => cp.xy.join()).join(' ')}];
	}

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'polyline', {...attrs, ...this.coords[0]})];
	}
}


export class Polygon extends Polyline {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_y')
	}

	static sensor_flags = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).sensor_flags,
		is_polygon: true
	};

	static alias = 'polygons';

	static id_prefix = 'y';

	static is_registered = this.register();

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'polygon', {...attrs, ...this.coords[0]})];
	}
}


const START = 1;
const END = 2;
const CORNER = 3;
const EDGE = 4;


export const cp_dependencies = {}; // cp: [followers]
export const cp_funcs = {}; // cp: func
export const cp_args = {}; // cp: [args]


function updateEdge(this_cp_id, cp0id, cp1id) {
	const this_cp = document.getElementById(this_cp_id).objref;
	const cp0xy = document.getElementById(cp0id).objref.xy;
	const cp1xy = document.getElementById(cp1id).objref.xy;
	this_cp.setCtr(vecSum(cp0xy, vecMul(vecDif(cp0xy, cp1xy), this_cp.ratio)));
}


function updateCorner(this_cp_id, cp0id, cp1id) {
	const this_cp = document.getElementById(this_cp_id).objref;
	const cp0 = document.getElementById(cp0id).objref;
	const cp1 = document.getElementById(cp1id).objref;
	this_cp.setCtr(lineIntersec(cp0.xy, vecSum(cp0.xy, cp0.dir), cp1.xy, vecSum(cp1.xy, cp1.dir)));
}


export class Curve extends MultipointShape {
	constructor(id, cps_data) { // (id, [[id0, x0, y0], [id1, x1, y1]])
		super(id, cps_data);
		this.setCpFlags();
	}

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_u')
	}

	static sensor_flags = {
		...super.sensor_flags,
		is_curve: true
	};

	static alias = 'curve';

	static id_prefix = 'u';

	static is_registered = this.register();

	static min_pt_cnt = 3;

	static getNewAugCpId() {
		return ControlPoint.getNewId();
	}

	static insertMidCp(cps, id) {
		const len = cps.length;
		if (len > 3) cps.splice(len - 2, 0, [id, ...vecCtr(cps[len - 3].slice(1), cps[len - 2].slice(1))]);
		return cps;
	}

	calcCoordinates() {
		const res = [['M', ...this.cps[0].xy]];
		for (var i = 1; i < this.cps.length - 1; i++) res.push(['Q', ...this.cps[i].xy, ...this.cps[++i].xy]);
		this.coords = [{d: res.flat().join(' ')}];
	}

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'path', {...attrs, ...this.coords[0]})];
	}

	setCpFlags() {
		this.cp_flags = new Array(this.cps.length).fill(CORNER);
		for (let i = 0; i < this.cps.length; i = i + 2) this.cp_flags[i] = EDGE;
		this.cp_flags[0] = START;
		this.cp_flags[this.cps.length - 1] = END;

		// cp_dependencies
		// cp_funcs
		// cp_args

		for (let i = 0; i < this.cps.length; i++) {
			let curr_cp_flag = this.cp_flags[i];
			let curr_cp = this.cps[i];
			let curr_cp_id = curr_cp.id;
			let prev_cp, next_cp, prev_cp_id, next_cp_id, prev_cp_flag, next_cp_flag;

			if (i >= 1) {
				prev_cp = this.cps[i-1];
				prev_cp_id = prev_cp.id;
				prev_cp_flag = this.cp_flags[i-1];
			}
			if (i <= this.cps.length - 2) {
				next_cp = this.cps[i+1];
				next_cp_id = next_cp.id;
				next_cp_flag = this.cp_flags[i+1];
			}
			if (curr_cp_flag == CORNER) {
				let followers = [];
				if (prev_cp_flag == EDGE) followers.push(prev_cp_id);
				if (next_cp_flag == EDGE) followers.push(next_cp_id);
				if (followers.length) cp_dependencies[curr_cp_id] = followers;


				cp_funcs[curr_cp_id] = updateCorner;
				cp_args[curr_cp_id] = [prev_cp_id, next_cp_id];

			}
			if (curr_cp_flag == EDGE) {
				cp_funcs[curr_cp_id] = updateEdge;
				cp_args[curr_cp_id] = [prev_cp_id, next_cp_id];
				curr_cp.ratio = vecLen(vecDif(prev_cp.xy, curr_cp.xy)) / vecLen(vecDif(prev_cp.xy, next_cp.xy));


				// let followers = [];
				// if (prev_cp_flag == CORNER) followers.push(prev_cp_id);
				// if (next_cp_flag == CORNER) followers.push(next_cp_id);
				curr_cp.dir = unitVec(vecDif(prev_cp.xy, next_cp.xy));
				cp_dependencies[curr_cp_id] = [prev_cp_id, next_cp_id];
			}
			if (curr_cp_flag == START) {
				curr_cp.dir = unitVec(vecDif(curr_cp.xy, next_cp.xy));
			}
			if (curr_cp_flag == END) {
				curr_cp.dir = unitVec(vecDif(prev_cp.xy, curr_cp.xy));
			}
		}
	}

	// updateEdgeDirs() {
	// 	this.cp_flags.forEach((flag, i) => {
	// 		if 
	// 	});
	// }

	adjustAdjacentCps() {

	}
}


export class SmoothShape extends Curve {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_m')
	}

	static sensor_flags = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).sensor_flags,
		is_smooth: true
	};

	static alias = 'smooth';

	static id_prefix = 'm';

	static is_registered = this.register();

	static min_pt_cnt = 6;

	static insertMidCp(cps, id) {
		const len = cps.length;
		if (len >= 3) cps[len - 2] = [cps[len - 2][0], ...vecCtr(cps[len - 3].slice(1), cps[len - 1].slice(1))];
		cps.push([id, ...vecCtr(cps[len - 1].slice(1), cps[0].slice(1))]);
		return cps;
	}

	calcCoordinates() {
		const len1m = this.cps.length - 1;
		const res = [['M', ...this.cps[len1m].xy]];
		for (var i = 0; i < len1m; i++) res.push(['Q', ...this.cps[i].xy, ...this.cps[++i].xy]);
		this.coords = [{d: res.flat().join(' ')}];
	}
}
