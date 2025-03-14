import {attachSvg, setAttrsSvg} from './Utils.js';
import {MOVE, ROTATE, STRETCH, vecLen, vecDif, vecSum, vecCtr, rotateAroundCtr, stretchAlongDir} from './Geometry.js';
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

	calcCoordinates() {
		this.coords = [{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]}];
	}

	createElements(layer_idx, attrs) {
		return [attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0]})];
	}
}


export class Circle extends ShapeBase {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_i')
	}

	static alias = 'circles';

	static id_prefix = 'i';

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

	static insertMidCp(cps, id) {
		return cps;
	}

	static reserveId() {
		this.new_id = this.getNewId();
	}

	static reserveCpIds() {
		this.new_cp_id = ControlPoint.getNewId();
	}
}


export class Polyline extends MultipointShape {
	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_p')
	}

	static alias = 'polylines';

	static id_prefix = 'p';

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

	static min_pt_cnt = 3;

	static reserveCpIds() {
		super.reserveCpIds();
		this.aug_cp_id = ControlPoint.getNewId();
	}

	static insertMidCp(cps) {
		const len = cps.length;
		if (len > 3) cps.splice(len - 2, 0, [this.constructor.aug_cp_id, ...vecCtr(cps[len - 3].slice(1), cps[len - 2].slice(1))]);
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

	static min_pt_cnt = 6;

	static insertMidCp(cps) {
		const len = cps.length;
		if (len >= 3) cps[len - 2] = [cps[len - 2][0], ...vecCtr(cps[len - 3].slice(1), cps[len - 1].slice(1))];
		cps.push([this.constructor.aug_cp_id, ...vecCtr(cps[len - 1].slice(1), cps[0].slice(1))]);
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


[Line, Circle, Rectangle, Polyline, Polygon, Curve, SmoothShape].forEach(cls => cls.register());
