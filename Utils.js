import {vecSum} from './Geometry.js';


export function setAttrsSvg(el, attrs={}) {
	Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
}

export function makeSvg(tag, attrs={}) {
	var el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	setAttrsSvg(el, attrs);
	return el;
}

export function attachSvg(parent, tag, attrs={}) {
	var el = makeSvg(tag, attrs);
	parent.appendChild(el);
	return el;
}


class Deletable {
	delete() {
		Object.keys(this).forEach(key => delete this[key]);
	}
}


export class DeletableAbortable extends Deletable {
	constructor() {
		super();
		this.controller = new AbortController();
		this.signal_opt = {signal: this.controller.signal};
	}

	delete() {
		this.controller.abort();
		super.delete();
	}
}


class CtrShape extends Deletable {
	// Abstract shape class that supports method cascading
	constructor(parent_id, cx, cy, svg_attrs) {
		super();
		this.shape = attachSvg(document.getElementById(parent_id), this.constructor.tag, svg_attrs);
		for (var i = 0; i < 2; i++) {
			this.shape.transform.baseVal.appendItem(this.shape.ownerSVGElement.createSVGTransform());
		}
		this.shape.objref = this;
		this.abs_rot_ang = 0;
		this.setCtr([cx, cy]);
	}

	static tag; // Abstract attribute

	translate(moving_vec) {
		return this.setCtr(vecSum(this.xy, moving_vec));
	}

	setCtr(xy) {
		this.xy = [...xy];
		return this;
	}

	rotate(rot_angle) {
		return this.setAbsRotAng(this.abs_rot_ang + rot_angle);
	}

	setAbsRotAng(abs_rot_ang) {
		this.abs_rot_ang = abs_rot_ang;
		return this;
	}

	render() {
		this.shape.transform.baseVal[0].setRotate(this.abs_rot_ang * 180 / Math.PI, ...this.xy);
		this.shape.transform.baseVal[1].setTranslate(...this.xy);
		return this;
	}

	addEventListener(...args) {
		this.shape.addEventListener(...args);
		return this;
	}

	delete() {
		this.shape.remove();
		super.delete();
	}
}


export class CtrRect extends CtrShape {
	static tag = 'rect';

	render() {
		this.shape.setAttribute('x', -this.shape.getAttribute('width') / 2);
		this.shape.setAttribute('y', -this.shape.getAttribute('height') / 2);
		return super.render();
	}
}


export class OffsetRect extends CtrShape {
	static tag = 'rect';

	setOffsets(offsets) {
		this.offsets = [...offsets];
		return this;
	}

	setWidth(width) {
		this.width = width;
		return this;
	}

	render() {
		this.shape.setAttribute('x', this.offsets[0] - this.width / 2);
		this.shape.setAttribute('y', -this.shape.getAttribute('height') / 2);
		this.shape.setAttribute('width', Math.max(this.width - this.offsets[0] - this.offsets[1], 0));
		return super.render();
	}
}


export class CtrCircle extends CtrShape {
	static tag = 'circle';
}


export class CtrPolygon extends CtrShape {
	static tag = 'polygon';
}


export function excludeNonExisting(el_ids) {
	return [...el_ids].filter(el_id => document.getElementById(el_id));
}
