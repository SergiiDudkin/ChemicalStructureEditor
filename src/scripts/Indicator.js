import {cnv} from './Canvas.js';
import {DeletableAbortable, attachSvg, setAttrsSvg} from './Utils.js';
import {styleToString} from './ChemParser.js';


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
