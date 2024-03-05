function setAttrsSvg(el, attrs={}) {
	Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
}

function makeSvg(tag, attrs={}) {
	el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	setAttrsSvg(el, attrs);
	return el;
}

function attachSvg(parent, tag, attrs={}) {
	el = makeSvg(tag, attrs);
	parent.appendChild(el);
	return el;
}


class CtrRect {
	constructor(parent_id, cx, cy, svg_attrs) {
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', svg_attrs);
		this.rect.transform.baseVal.appendItem(this.rect.ownerSVGElement.createSVGTransform());
		this.rect.objref = this;
		this.abs_rot_ang_deg = 0;
		this.setCtr([cx, cy]);
	}

	translate(moving_vec) {
		this.setCtr(vecSum(this.xy, moving_vec));
	}

	setCtr(xy) {
		this.xy = [...xy];
		this.rect.setAttribute('x', this.xy[0] - this.rect.getAttribute('width') / 2);
		this.rect.setAttribute('y', this.xy[1] - this.rect.getAttribute('height') / 2);
		this.rotate(0);
	}

	rotate(rot_angle) {
		this.abs_rot_ang_deg += rot_angle * 180 / Math.PI;
		this.rect.transform.baseVal[0].setRotate(this.abs_rot_ang_deg, ...this.xy);
	}

	delete() {
		this.rect.remove();
		this.rect = null;
	}
}


class CtrPolygon {
	constructor(parent_id, cx, cy, points, svg_attrs) {
		this.polygon = attachSvg(document.getElementById(parent_id), 'polygon', svg_attrs);
		this.points = structuredClone(points);
		this.setCtr([cx, cy]);
	}

	translate(moving_vec) {
		this.setCtr(vecSum(this.xy, moving_vec));
	}

	setCtr(xy) {
		this.xy = [...xy];
		this.polygon.setAttribute('points', this.points.map(pt => vecSum(pt, this.xy).join()).join(' '));
	}

	delete() {
		this.polygon.remove();
		this.polygon = null;
	}
}


class CtrCircle {
	constructor(parent_id, cx, cy, svg_attrs) {
		this.circle = attachSvg(document.getElementById(parent_id), 'circle', svg_attrs);
		this.setCtr([cx, cy]);
	}

	translate(moving_vec) {
		this.setCtr(vecSum(this.xy, moving_vec));
	}

	setCtr(xy) {
		this.xy = [...xy];
		setAttrsSvg(this.circle, {cx: this.xy[0], cy: this.xy[1]});
	}

	rotate(rot_angle) {} // For the unity of interface

	delete() {
		this.circle.remove();
		this.circle = null;
	}
}
