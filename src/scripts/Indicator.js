import {cnv} from './Canvas.js';
import {DeletableAbortable, attachSvg, setAttrsSvg} from './Utils.js';
import {styleToString} from './ChemParser.js';
import {vecSum, vecDif} from './Geometry.js';


export class BaseInfoText extends DeletableAbortable {
	constructor(parent_id) {
		super();
		this.xy = [0, 0];
		this.pt = [0, 0];
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', {fill: 'black', rx: 4});
		this.text = attachSvg(document.getElementById(parent_id), 'text', {
			style: styleToString(this.constructor.textstyle), 
			id: 'indicator', 
			'class': 'sympoi', 
			x: this.xy[0], 
			y: this.xy[1]
		});
	}

	static textstyle = {
		fill: 'white',
		'font-family': 'Arial',
		'font-size': '12px',
		'font-weight': 'bold'
	};

	setText(text) {
		while (this.text.childElementCount) this.text.lastChild.remove();
		text.split('\n').forEach((line) => attachSvg(this.text, 'tspan', {x: this.xy[0], dy: '1.2em'})
			.appendChild(document.createTextNode(line)));
		this.allignText();
	}

	locateText(pt) {
		this.pt = pt;
		this.allignText();
	}

	allignText() {
		let bbox = this.text.getBBox();
		this.xy = vecSum(this.xy, vecDif(this.getAnchor(this.text.getBBox()), this.pt));
		setAttrsSvg(this.text, {y: this.xy[1]});
		[...this.text.children].forEach(tspan => setAttrsSvg(tspan, {x: this.xy[0]}));
		this.locateBg();
	}

	getAnchor(bbox) {
		throw new Error('Override the abstract method!');
	}

	locateBg() {
		const bbox = this.text.getBBox();
		setAttrsSvg(this.rect, {x: bbox.x - 2, y: bbox.y, width: bbox.width + 4, height: bbox.height + 2});
	}

	delete() {
		this.rect.remove();
		this.text.remove();
		super.delete();
	}
}


export class MolInfoWin extends BaseInfoText {
	constructor(parent_id) {
		super(parent_id);

		this.rect.setAttribute('class', 'grab');

		['moving', 'finishMoving', 'startMoving'].forEach(method => this[method] = this[method].bind(this));
		this.rect.addEventListener('mousedown', this.startMoving, this.signal_opt);
	}

	getAnchor(bbox) {
		return [bbox.x, bbox.y]
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
}


export class Indicator extends BaseInfoText {
	constructor(parent_id) {
		super(parent_id);

		this.delete = this.delete.bind(this);
		window.addEventListener('mouseup', this.delete, this.signal_opt);
	}

	getAnchor(bbox) {
		return [bbox.x + bbox.width / 2 - 5, bbox.y + bbox.height + 10]
	}

	setAndLocateText(event, text) {
		this.setText(text);
		this.locateText(cnv.getSvgPoint(event));
	}

	showPt(event, [x, y]) {
		this.setAndLocateText(event, `x: ${x}\ny: ${y}`);
	}

	showDelta(event, [x, y]) {
		this.setAndLocateText(event, `\u0394x: ${x}\n\u0394y: ${y}`);
	}

	showPercent(event, percent) {
		this.setAndLocateText(event, `${percent}%`);
	}

	showDegree(event, degree) {
		this.setAndLocateText(event, `${degree} \u00B0`);
	}
}
