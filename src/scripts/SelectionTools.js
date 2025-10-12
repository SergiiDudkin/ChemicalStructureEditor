import {DeletableAbortable, attachSvg, setAttrsSvg} from './Utils.js';
import {cnv} from './Canvas.js';
import {findDist} from './Geometry.js';


export class SelectShape extends DeletableAbortable {
	// Abstract class
	constructor(parent_id, selection) {
		super();
		this.selection = selection;
		this.shape = attachSvg(document.getElementById(parent_id), this.constructor.tag, {
			class: 'sympoi', 'fill-opacity': 0, stroke: 'blue', 'stroke-dasharray': 2, 'stroke-width': 1
		});

		this.recalc = this.recalc.bind(this);
		this.selectStop = this.selectStop.bind(this);
		window.addEventListener('mousemove', this.recalc, this.signal_opt);
		window.addEventListener('mouseup', this.selectStop, this.signal_opt);
	}

	static tag; // Abstract attribute

	// eslint-disable-next-line no-unused-vars
	recalc(event) {} // Abstract method

	selectStop() {
		window.removeEventListener('mousemove', this.recalc);
		window.removeEventListener('mouseup', this.selectStop);
		this.shape.removeAttribute('class');
		this.selection.activateFromShape(this.shape);
		this.delete();
	}

	delete() {
		this.shape.remove();
		super.delete();
	}
}


export class SelectRect extends SelectShape {
	constructor(parent_id, selection) {
		super(parent_id, selection);
		this.svg_pt0 = cnv.getSvgPoint(event);
		this.recalc(event);
	}

	static tag = 'rect';

	recalc(event) {
		var svg_pt1 = cnv.getSvgPoint(event);
		var rect_x = Math.min(this.svg_pt0[0], svg_pt1[0]);
		var rect_y = Math.min(this.svg_pt0[1], svg_pt1[1]);
		var rect_w = Math.abs(svg_pt1[0] - this.svg_pt0[0]);
		var rect_h = Math.abs(svg_pt1[1] - this.svg_pt0[1]);
		setAttrsSvg(this.shape, {x: rect_x, y: rect_y, width: rect_w, height: rect_h});
	}
}


export class SelectLasso extends SelectShape {
	constructor(parent_id, selection) {
		super(parent_id, selection);
		this.shape.setAttribute('fill-rule', 'evenodd');
		this.pts = [cnv.getSvgPoint(event)];
		this.recalc(event);
	}

	static tag = 'polygon';

	recalc(event) {
		var pt = cnv.getSvgPoint(event);
		if (findDist(this.pts[this.pts.length - 1], pt) > 4) {
			this.pts.push(pt);
			this.shape.setAttribute('points', this.pts.map(pt => pt.join()).join(' '));
		}
	}
}
