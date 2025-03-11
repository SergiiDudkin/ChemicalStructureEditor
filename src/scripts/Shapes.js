import {attachSvg, setAttrsSvg} from './Utils.js';
import {MOVE, ROTATE, STRETCH, vecLen, unitVec, vecDif, vecSum, vecMul, rotateVec, vecCtr, rotateAroundCtr, stretchAlongDir, rot90cw} from './Geometry.js';
import {SENSOR, SHAPE, HIGHLIGHT, SELECTHOLE, CanvasCitizen} from './BaseClasses.js';
import {ControlPoint, ControlPointEdge, ControlPointCorner, ControlPointTerminal} from './ControlPoints.js'


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
		this.followCoords();
		this.createLayer(SHAPE);
		this.createLayer(SENSOR);
		if (this.constructor.delSel.has(this.id)) {
			this.select();
			this.constructor.delSel.delete(this.id);
		}
	}

	followCoords() {
		for (const layer of this.layers) {
			if (layer) [...layer.children].forEach((el, i) => setAttrsSvg(el, this.coords[i]))
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
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_r')
	}

	static alias = 'arrows';

	static id_prefix = 'r';

	static is_registered = this.register();

	getMarkerId(layer_idx) {
		return `m${layer_idx}-${this.id}`
	}

	createMarker(layer_idx, attrs) {
		this.marker = attachSvg(attachSvg(this.layers[layer_idx], 'defs'), 'marker', {
			id: this.getMarkerId(layer_idx),
			viewBox: '-17 -10 30 20', refX: 0, refY: 0,
			markerWidth: 30, markerHeight: 20,
			orient: 'auto', markerUnits: 'userSpaceOnUse'
		});

		const stroke_width = attrs['stroke-width'] - this.style['stroke-width'];
		attachSvg(this.marker, 'polygon', {...attrs, points: '-12,-5 3,0 -12,5', 'stroke-width': stroke_width});
	}

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const line_end = vecSum(this.cps[1].xy, vecMul(unitVec(vec), -3));
		this.coords = [
			{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: line_end[0], y2: line_end[1]},
		];
	}

	createElements(layer_idx, attrs) {
		const line = attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0], 'marker-end': `url(#${this.getMarkerId(layer_idx)})`});
		this.createMarker(layer_idx, attrs);
		return [line];
	}
}


export class DoubleArrow extends Arrow {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).parents, 
		[SENSOR]: document.getElementById('sensors_da')
	}

	static alias = 'arrows2x';

	static id_prefix = 'da';

	static is_registered = this.register();

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const uv = unitVec(vec);
		const ouva = rot90cw(uv);
		const st0 = vecSum(this.cps[0].xy, vecMul(ouva, -5));
		const en0 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, -5)), vecMul(uv, -3));
		const st1 = vecSum(this.cps[1].xy, vecMul(ouva, 5));
		const en1 = vecSum(vecSum(this.cps[0].xy, vecMul(ouva, 5)), vecMul(uv, 3));
		this.coords = [
			{x1: st0[0], y1: st0[1], x2: en0[0], y2: en0[1]},
			{x1: st1[0], y1: st1[1], x2: en1[0], y2: en1[1]}
		];
	}

	createElements(layer_idx, attrs) {
		const lines = [0, 1].map(i => attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[i], 'marker-end': `url(#${this.getMarkerId(layer_idx)})`}));
		this.createMarker(layer_idx, attrs);
		return lines;
	}
}


export class ResonanceArrow extends Arrow {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).parents, 
		[SENSOR]: document.getElementById('sensors_re')
	}

	static alias = 'arrowsre';

	static id_prefix = 're';

	static is_registered = this.register();

	createMarker(layer_idx, attrs) {
		this.marker = attachSvg(attachSvg(this.layers[layer_idx], 'defs'), 'marker', {
			id: this.getMarkerId(layer_idx),
			viewBox: '-15 -15 20 30', refX: 0, refY: 0,
			markerWidth: 20, markerHeight: 30,
			orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse'
		});

		// const stroke_width = attrs['stroke-width'] - this.style['stroke-width'];
		attachSvg(this.marker, 'polyline', {...attrs, points: '-10,-10 0,0 -10,10', fill: 'none'});
	}

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		this.coords = [
			{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]},
		];
	}

	createElements(layer_idx, attrs) {
		const marker_ref = `url(#${this.getMarkerId(layer_idx)})`;
		const line = attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0], 
			'marker-start': marker_ref, 'marker-end': marker_ref});
		this.createMarker(layer_idx, attrs);
		return [line];
	}
}


export class RetroArrow extends Line {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_rt')
	}

	static alias = 'arrowsrt';

	static id_prefix = 'rt';

	static is_registered = this.register();

	static triangle = [[-10, -20], [0, 0], [-10, 20]];

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const uv = unitVec(vec);
		const ouva = rot90cw(uv);
		const st0 = vecSum(this.cps[0].xy, vecMul(ouva, -10));
		const en0 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, -10)), vecMul(uv, -5));
		const st1 = vecSum(this.cps[0].xy, vecMul(ouva, 10));
		const en1 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, 10)), vecMul(uv, -5));
		const rot_ang = Math.atan2(vec[1], vec[0]);
		const triangle = this.constructor.triangle.map(
			pt => vecSum(rotateVec(pt, rot_ang), this.cps[1].xy).join()
		).join(' ');
		this.coords = [
			{x1: st0[0], y1: st0[1], x2: en0[0], y2: en0[1]},
			{x1: st1[0], y1: st1[1], x2: en1[0], y2: en1[1]},
			{points: triangle}
		];
	}

	createElements(layer_idx, attrs) {
		const elements = [0, 1].map(i => attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[i]}));
		elements.push(attachSvg(this.layers[layer_idx], 'polyline', {...attrs, ...this.coords[2], fill: 'none'}));
		return elements;
	}
}


export class Circle extends ShapeBase {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_i')
	}

	static alias = 'circles';

	static id_prefix = 'i';

	static is_registered = this.register();

	transform(type, params) {
		if (type == STRETCH) {
			const cp_dif = vecDif(this.cps[0].xy, this.cps[1].xy);
			this.cps[0].transform(type, params);
			this.cps[1].setCtr(vecSum(this.cps[0].xy, cp_dif));
		}
		else {
			super.transform(type, params);
		}
	}

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
	constructor(id, cps_data, abs_rot_ang=0) {
		super(id, cps_data);
		this.abs_rot_ang = abs_rot_ang;
	}

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_e')
	}

	static alias = 'rectangles';

	static id_prefix = 'e';

	static is_registered = this.register();

	transform(type, params) {
		if (type == STRETCH) {
			const remainder = Math.abs((params.dir_angle - this.abs_rot_ang) % (Math.PI * 0.5));
			if (Math.min(remainder, Math.PI * 0.5 - remainder) < 10e-8) {
				super.transform(type, params);
			}
			else {
				const new_ctr = stretchAlongDir(this.xy, params.stretch_factor, params.dir_angle, params.stretch_ctr);
				super.transform(MOVE, {moving_vec: vecDif(this.xy, new_ctr)});
			}
		}
		else {
			if (type == ROTATE) this.abs_rot_ang += params.rot_angle;
			super.transform(type, params);
		}
	}

	calcCoordinates() {
		const orig_cps = this.cps.map(cp => rotateAroundCtr(cp.xy, -this.abs_rot_ang, this.xy));
		const x1 = orig_cps[0][0], y1 = orig_cps[0][1], x2 = orig_cps[1][0], y2 = orig_cps[1][1];
		this.coords = [{x: Math.min(x1, x2), y: Math.min(y1, y2), 
			width: Math.abs(x2 - x1), height: Math.abs(y2 - y1)}];
	}

	followCoords() {
		super.followCoords();
		for (const layer of this.layers) {
			if (layer) layer.firstChild.transform.baseVal[0].setRotate(this.abs_rot_ang * 180 / Math.PI, ...this.xy);
		}
	}

	getData() {
		return [...super.getData(), this.abs_rot_ang];
	}

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		const rect = attachSvg(this.layers[layer_idx], 'rect', {...attrs, ...this.coords[0]});
		rect.transform.baseVal.appendItem(rect.ownerSVGElement.createSVGTransform());
		rect.transform.baseVal[0].setRotate(this.abs_rot_ang * 180 / Math.PI, ...this.xy);
		return [rect];
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

	static alias = 'polygons';

	static id_prefix = 'y';

	static is_registered = this.register();

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'polygon', {...attrs, ...this.coords[0]})];
	}
}


export class Curve extends MultipointShape {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_u')
	}

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

	transform(type, params) {
		super.transform(type, params);
		if (type == ROTATE || type == STRETCH) this.invokeControlPointMethods(['recalcDir']);
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

	setControlPoints(cps_data) {
		this.cps = [new ControlPointTerminal(...cps_data[0], this, cps_data[1][0])];
		for (let i = 1; i < cps_data.length - 1; i++) {
			this.cps.push(new (i % 2 ? ControlPointCorner : ControlPointEdge)(
				...cps_data[i], this, cps_data[i - 1][0], cps_data[i + 1][0])
			);
		}
		this.cps.push(new ControlPointTerminal(...cps_data[cps_data.length - 1], this, cps_data[cps_data.length - 2][0]));
		this.invokeControlPointMethods(['idsToObjs', 'postInit', 'recalcDir', 'recalcRatio']);
	}

	invokeControlPointMethods(methods) {
		for (const method of methods) {
			this.cps.forEach(cp => {if (cp[method]) cp[method]()});
		}
	}
}


export class SmoothShape extends Curve {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_m')
	}

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

	setControlPoints(cps_data) {
		this.cps = [];
		const len = cps_data.length;
		for (let i = 0; i < cps_data.length; i++) {
			this.cps.push(new (i % 2 ? ControlPointEdge : ControlPointCorner)(
				...cps_data[i], this, cps_data[(len + i - 1) % len][0], cps_data[(len + i + 1) % len][0])
			);
		}
		this.invokeControlPointMethods(['idsToObjs', 'postInit', 'recalcDir', 'recalcRatio']);
	}
}
