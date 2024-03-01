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
		this.xy = [cx, cy];
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', svg_attrs);
		this.rect.transform.baseVal.appendItem(this.rect.ownerSVGElement.createSVGTransform());
		this.translate([0, 0]);
	}

	translate(moving_vec) {
		this.xy = vecSum(this.xy, moving_vec);
		this.rect.setAttribute('x', this.xy[0] - this.rect.getAttribute('width') / 2);
		this.rect.setAttribute('y', this.xy[1] - this.rect.getAttribute('height') / 2);
	}

	rotate(rot_angle) {
		this.rect.transform.baseVal[0].setRotate(rot_angle, ...this.xy);
	}

	delete() {
		this.rect.remove();
		this.rect = null;
	}
}


class CtrPolygon {
	constructor(parent_id, cx, cy, points, svg_attrs) {
		this.xy = [cx, cy];
		this.points = structuredClone(points);
		this.polygon = attachSvg(document.getElementById(parent_id), 'polygon', svg_attrs);
		this.translate([0, 0]);
	}

	translate(moving_vec) {
		this.xy = vecSum(this.xy, moving_vec);
		this.polygon.setAttribute('points', this.points.map(pt => vecSum(pt, this.xy).join()).join(' '));
	}

	rotate(rot_angle) {}

	delete() {
		this.polygon.remove();
		this.polygon = null;
	}
}

