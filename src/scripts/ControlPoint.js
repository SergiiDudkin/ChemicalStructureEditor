import {CtrRect, attachSvg, setAttrsSvg} from './Utils.js';


export class ControlPoint extends CtrRect {
	constructor(id, cx, cy, master) {
		super('control_points', cx, cy, {width: 10, height: 10, class: 'control-point', id: id});
		this.id = id;
		this.master = typeof master === "string" ? document.getElementById(master).objref : master;
		this.shape.is_shape = true;

		['focus', 'blur'].forEach(method => this[method] = this[method].bind(this));
		this.shape.addEventListener('mousedown', this.focus);
	}

	static counter = 0;

	static getNewId() {
		return 'cp' + this.counter++;
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
}


export class Line {
	constructor(id, cps_data) { // (id, [[id0, x0, y0], [id1, x1, y1]])
		this.id = id;
		this.cps = cps_data.map(cp_data => new ControlPoint(...cp_data, this));

		this.recalcCtr();

		this.style = {};
		Object.assign(this.style, this.constructor.default_style);

		this.backline = attachSvg(
			this.constructor.sensors, 'line', 
			{
				id: this.id, class: 'bline', ...this.getCoordinates(), 
				'stroke-linecap': 'round', 'stroke-width': this.style['stroke-width'] + 8
			}
		);
		this.backline.is_line = true;
		this.backline.is_shape = true;
		this.backline.objref = this;
	}

	static highlights = document.getElementById('selecthighlight');

	static selectholes = document.getElementById('selectholes');

	static sensors = document.getElementById('sensors_s');

	static shapes = document.getElementById('shapes');

	static counter = 0;

	static default_style = {
		stroke: 'black',
		'stroke-width': 2
	}

	static delSel = new Set(); // Nodes deleted while selected

	static getNewId() {
		return 'l' + this.counter++;
	}

	select() {
		this.eventsOff();
		this.select_line = attachSvg(
			this.constructor.highlights, 'line', 
			{...this.getCoordinates(), 'stroke-linecap': 'round', stroke: 'blue', 'stroke-width': this.style['stroke-width'] + 8}
		);
		this.masksel_line = attachSvg(
			this.constructor.selectholes, 'line', 
			{...this.getCoordinates(), 'stroke-linecap': 'round', 'stroke-width': this.style['stroke-width'] + 5}
		);
	};

	deselect() {
		this.select_line.remove();
		this.select_line = null;
		this.masksel_line.remove();
		this.masksel_line = null;
		this.eventsOn();
	};

	eventsOn() {
		this.backline.classList.remove('sympoi');
		this.cps.forEach(cp => cp.eventsOn());
	};

	eventsOff() {
		this.backline.classList.add('sympoi');
		this.cps.forEach(cp => cp.eventsOff());
	};

	getCoordinates() {
		return {x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]};
	}

	getData() {
		return [this.cps.map(cp => [cp.id, ...cp.xy])];
	}

	recalcCtr() {
		this.xy = [(this.cps[0].xy[0] + this.cps[1].xy[0]) / 2, (this.cps[0].xy[1] + this.cps[1].xy[1]) / 2];
	}

	render() {
		this.recalcCtr();
		let coordinates = this.getCoordinates();

		if (this.line) {
			setAttrsSvg(this.line, coordinates);
		}
		else {
			this.line = attachSvg(this.constructor.shapes, 'line', {class: 'sympoi', ...coordinates, ...this.style});
		}
		setAttrsSvg(this.backline, coordinates);
		if (this.select_line != null) {
			setAttrsSvg(this.select_line, coordinates);
			setAttrsSvg(this.masksel_line, coordinates);
		}
	}

	delete() {
		if (this.select_line != null) {
			this.constructor.delSel.add(this.id);
			this.deselect();
		}
		this.cps.forEach(cp => cp.delete());
		this.line.remove();
		this.backline.remove();
	}
}
