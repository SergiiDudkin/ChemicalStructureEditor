import {cnv} from './Canvas.js';
import {DeletableAbortable, attachSvg, setAttrsSvg} from './Utils.js';
import {styleToString} from './ChemParser.js';
import {vecSum, vecDif} from './Geometry.js';


export class Indicator extends DeletableAbortable {
	constructor(parent_id) {
		super();
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', {fill: 'black', rx: 4});
		this.text = attachSvg(document.getElementById(parent_id), 'text',
			{style: styleToString(this.constructor.textstyle), id: 'indicator'});
		this.delete = this.delete.bind(this);
		window.addEventListener('mouseup', this.delete, this.signal_opt);
	}

	static textstyle = {
		fill: 'white',
		'font-family': 'Arial',
		'font-size': '12px',
		'font-weight': 'bold'
	};

	setText(event, text) {
		while (this.text.childElementCount) this.text.lastChild.remove();
		const pt = cnv.getSvgPoint(event);
		setAttrsSvg(this.text, {x: pt[0], y: pt[1]});
		text.split('\n').toReversed().forEach((line) => attachSvg(this.text, 'tspan', {x: pt[0], dy: `${-1.2}em`})
			.appendChild(document.createTextNode(line)));
		let bbox = this.text.getBBox();
		[...this.text.children].forEach(tspan => setAttrsSvg(tspan, {x: pt[0] * 2 + 4 - bbox.x - bbox.width / 2}));
		bbox = this.text.getBBox();
		setAttrsSvg(this.rect, {x: bbox.x - 2, y: bbox.y, width: bbox.width + 4, height: bbox.height + 2});
	}

	showPt(event, [x, y]) {
		this.setText(event, `x: ${x}\ny: ${y}`);
	}

	showDelta(event, [x, y]) {
		this.setText(event, `\u0394x: ${x}\n\u0394y: ${y}`);
	}

	showPercent(event, percent) {
		this.setText(event, `${percent}%`);
	}

	showDegree(event, degree) {
		this.setText(event, `${degree} \u00B0`);
	}

	delete() {
		this.rect.remove();
		this.text.remove();
		super.delete();
	}
}


export class InfoText extends DeletableAbortable {
	constructor(parent_id) {
		super();
		this.xy = [0, 0];
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', {fill: 'black', rx: 4});
		this.text = attachSvg(document.getElementById(parent_id), 'text',
			{style: styleToString(this.constructor.textstyle), id: 'indicator', x: this.xy[0], y: this.xy[1]});

		['moving', 'finishMoving', 'startMoving'].forEach(method => this[method] = this[method].bind(this));
		this.text.addEventListener('mousedown', this.startMoving, this.signal_opt);
	}

	static textstyle = {
		fill: 'white',
		'font-family': 'Arial',
		'font-size': '12px',
		'font-weight': 'bold'
	};

	setText(text, pt=[100, 100]) {
		while (this.text.childElementCount) this.text.lastChild.remove();
		text.split('\n').toReversed().forEach((line) => attachSvg(this.text, 'tspan', {x: this.xy[0], dy: '-1.2em'})
			.appendChild(document.createTextNode(line)));
	}

	locateText(pt) {
		this.pt = pt;
		let bbox = this.text.getBBox();
		this.xy = vecSum(this.xy, vecDif(this.getAnchor(this.text.getBBox()), pt));
		setAttrsSvg(this.text, {y: this.xy[1]});
		[...this.text.children].forEach(tspan => setAttrsSvg(tspan, {x: this.xy[0]}));
		this.locateBg();
	}

	getAnchor(bbox) {
		return [bbox.x + bbox.width / 2, bbox.y + bbox.height / 2]
	}

	locateBg() {
		const bbox = this.text.getBBox();
		setAttrsSvg(this.rect, {x: bbox.x - 2, y: bbox.y, width: bbox.width + 4, height: bbox.height + 2});
	}

	startMoving(event) {
		this.old_pt = cnv.getSvgPoint(event);
		window.addEventListener('mousemove', this.moving, this.signal_opt);
		window.addEventListener('mouseup', this.finishMoving, this.signal_opt);
	}

	moving(event) {
		const pt = cnv.getSvgPoint(event);
		this.locateText(vecSum(this.pt, vecDif(this.old_pt, pt)));
		this.old_pt = pt;
	}

	finishMoving() {
		window.removeEventListener('mousemove', this.moving);
		window.removeEventListener('mouseup', this.finishMoving);
	}

	delete() {
		this.rect.remove();
		this.text.remove();
		super.delete();
	}
}
