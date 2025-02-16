import {CtrRect, attachSvg, setAttrsSvg} from './Utils.js';
import {unitVec, vecDif, vecSum, vecMul, rotateVec} from './Geometry.js';
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
	static shape = false;
	static control_point = true;

	static is_registered = this.register();

	setCtr(xy) {
		this.xy = [...xy];
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
		this.shape.remove();
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
		...this.prototype.constructor.parents, 
		[SHAPE]: document.getElementById('shapes')
	};

	static sensor_flags = {
		is_shape: true
	};

	// Public info
	static movable = false;
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
		throw new Error('Override the abstract method!');
	}

	recalcCtr() {
		throw new Error('Override the abstract method!');
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
		Object.keys(LAYER_SPEC).forEach(layer => this.deleteLayer(layer));
		this.cps.forEach(cp => cp.delete());
	}
}


export class Line extends ShapeBase {
	static parents = {
		...this.prototype.constructor.parents, 
		[SENSOR]: document.getElementById('sensors_l')
	}

	static sensor_flags = {
		...this.prototype.constructor.sensor_flags,
		is_line: true
	};

	// Public info
	static alias = 'lines';

	static id_prefix = 'l';

	static is_registered = this.register();

	calcCoordinates() {
		this.coords = [{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]}];
	}

	getData() {
		return [this.cps.map(cp => [cp.id, ...cp.xy])];
	}

	recalcCtr() {
		this.xy = [(this.cps[0].xy[0] + this.cps[1].xy[0]) / 2, (this.cps[0].xy[1] + this.cps[1].xy[1]) / 2];
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
		...this.prototype.constructor.parents, 
		[SENSOR]: document.getElementById('sensors_r')
	}

	// Public info
	static alias = 'arrows';

	static id_prefix = 'r';

	static triangle = [[-15, -5], [0, 0], [-15, 5]];

	static is_registered = this.register();

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


export class Polyline extends ShapeBase {
	static parents = {
		...this.prototype.constructor.parents, 
		[SENSOR]: document.getElementById('sensors_p')
	}

	static sensor_flags = {
		...this.prototype.constructor.sensor_flags,
		is_line: true
	};

	// Public info
	static alias = 'polylines';

	static id_prefix = 'p';

	static is_registered = this.register();

	calcCoordinates() {
		this.coords = [{points: this.cps.map(cp => cp.xy.join()).join(' ')}];
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

	createElements(layer_idx, attrs) {
		attrs.fill = 'none';
		return [attachSvg(this.layers[layer_idx], 'polyline', {...attrs, ...this.coords[0]})];
	}
}

