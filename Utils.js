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



class CtrShape {
	// Abstract shape class that supports method cascading
	constructor(parent_id, cx, cy, svg_attrs) {
		this.shape = attachSvg(document.getElementById(parent_id), this.constructor.tag, svg_attrs);
		for (var i = 0; i < 2; i++) {
			this.shape.transform.baseVal.appendItem(this.shape.ownerSVGElement.createSVGTransform());
		}
		this.shape.objref = this;
		this.abs_rot_ang = 0;
		this.setCtr([cx, cy]);
	}

	static tag; // Abstract attribute

	render() {
		this.shape.transform.baseVal[0].setRotate(this.abs_rot_ang * 180 / Math.PI, ...this.xy);
		this.shape.transform.baseVal[1].setTranslate(...this.xy);
		return this;
	}

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

	delete() {
		this.shape.remove();
		this.shape = null;
	}
}


class CtrRect extends CtrShape {
	static tag = 'rect';

	render() {
		this.shape.setAttribute('x', -this.shape.getAttribute('width') / 2);
		this.shape.setAttribute('y', -this.shape.getAttribute('height') / 2);
		return super.render();
	}
}


class CtrCircle extends CtrShape {
	static tag = 'circle';
}


class CtrPolygon extends CtrShape {
	static tag = 'polygon';
}
