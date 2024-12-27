import {CtrRect, attachSvg} from './Utils.js';


export class ControlPoint extends CtrRect {
	constructor(id, cx, cy, master=null) {
		super('control_points', cx, cy, {width: 8, height: 8, class: 'control-point', id: id});
		this.id = id;
		this.master = master;
	}

	static counter = 0;

	static getNewId() {
		return 'cp' + this.counter++;
	}
}


export class Line {
	constructor(id, x0, y0, x1, y1) {
		this.id = id;
		this.xy = [(x0 + x1) / 2, (y0 + y1) / 2];
		this.pt0 = [x0, y0];
		this.pt1 = [x1, y1];
		
		this.cp0 = new ControlPoint(ControlPoint.getNewId(), x0, y0, this);
		this.cp1 = new ControlPoint(ControlPoint.getNewId(), x1, y1, this);

		this.style = {};
		Object.assign(this.style, this.constructor.default_style);

		// if (this.constructor.delSel.has(this.id)) {
		// 	this.select();
		// 	this.constructor.delSel.delete(this.id);
		// }
	}

	static counter = 0;

	static default_style = {
		stroke: 'black',
		'stroke-width': 2
	}

	static getNewId() {
		return 'l' + this.counter++;
	}

	render() {
		try { this.line.remove(); } catch(e) {}
		// this.line.remove();
		let parent = document.getElementById('shapes');
		// this.line = attachSvg(parent, 'line', {id: this.id, x1: this.pt0[0], y1: this.pt0[1], x2: this.pt1[0], y2: this.pt1[1], ...this.style});
		this.line = attachSvg(parent, 'line', {id: this.id, x1: this.cp0.xy[0], y1: this.cp0.xy[1], x2: this.cp1.xy[0], y2: this.cp1.xy[1], ...this.style});
		this.line.objref = this;
	}

	delete() {
		this.cp0.delete();
		this.cp1.delete();
		this.line.remove();
	}
}
