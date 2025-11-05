import {makeSvg, attachSvg, setAttrsSvg} from './Utils.js';
import {cnv} from './Canvas.js';


class BaseButton {
	constructor(parent, html_text) {
		this.parent = parent;
		this.html_text = html_text;
		this.active = false;

		this.createSvg();
		this.createHtml();
		this.setImage(html_text);

		this.animateBtnDown = this.animateBtnDown.bind(this);
		this.animateBtnUp = this.animateBtnUp.bind(this);
		this.mask_g.addEventListener('mousedown', this.animateBtnDown);
	}

	static btn_num = 0;

	static id_prefix = 'fb';

	static btn_corners = '0,0 30,0 30,30 0,30';

	static getBtnNum() {
		return this.btn_num++;
	}

	createSvg() {
		const mask_id = this.constructor.id_prefix + this.constructor.getBtnNum() + 'mask';
		this.svg = makeSvg('svg', {width: 36, height: 36});
		const mask = attachSvg(this.svg, 'mask', {id: mask_id, class: 'elmsk'});
		attachSvg(mask, 'polygon', {points: this.constructor.btn_corners, fill: 'white'}); // White bg
		this.img = attachSvg(mask, 'g');
		this.filter_g = attachSvg(this.svg, 'g', {filter: 'url(#shadow)'});
		this.mask_g = attachSvg(this.filter_g, 'g', {class: 'but', mask: `url(#${mask_id})`});
		this.mask_g.objref = this;
		attachSvg(this.mask_g, 'rect', {class: 'but brick', x: 0, y: 0, width: 32, height: 32}); // Button tissue
		this.selrect = attachSvg(this.mask_g, 'polygon',
			{class: 'invisible', points: this.constructor.btn_corners, fill: 'none', stroke: 'blue', 'stroke-width': 2}
		);
	}

	createHtml() {
		this.parent.appendChild(this.svg);
	}

	setImage(html_text) {
		this.img.insertAdjacentHTML('beforeend', html_text);
	}

	// eslint-disable-next-line no-unused-vars
	animateBtnDown(event) { // Change appearance of fancy buttons
		this.filter_g.setAttribute('filter', 'url(#okshadow)');
		this.filter_g.setAttribute('transform', 'translate(16 16) scale(0.94) translate(-16 -16)');
		window.addEventListener('mouseup', this.animateBtnUp);
	}

	// eslint-disable-next-line no-unused-vars
	animateBtnUp(event) { // Reset appearance of fancy buttons
		window.removeEventListener('mouseup', this.animateBtnUp);
		this.filter_g.setAttribute('filter', 'url(#shadow)');
		this.filter_g.setAttribute('transform', 'translate(16 16) scale(1) translate(-16 -16)');
	}

	selectCond() {
		if (!this.active) this.select();
	}

	deselectCond(event) {
		if (event.target.objref !== this && this.active) this.deselect();
	}

	select() {
		this.active = true;
		this.selrect.setAttribute('class', 'visible-anim');
	}

	deselect() {
		this.active = false;
		this.selrect.setAttribute('class', 'invisible');
	}
}


class RegularButton extends BaseButton {
	animateBtnUp(event) {
		super.animateBtnUp(event);
		this.deselectCond(event);
	}
}


class SubButton extends RegularButton {
	static id_prefix = 'sb';

	select() {
		super.select();
		this.parent.selectCond(this);
	}

	deselect() {
		super.deselect();
		this.parent.deselectCond(this);
	}

	deselectCond(event) {
		if (event.target.objref !== this.parent) super.deselectCond(event);
	}

	createSvg() {
		super.createSvg();
		this.focline = attachSvg(this.mask_g, 'line',
			{class: 'invisible', x1: 2, y1: 30, x2: 28, y2: 30, stroke: 'blue', 'stroke-width': 2}
		);
	}
}


class DropButton extends BaseButton {
	constructor(parent, html_text) {
		super(parent, html_text);
		this.collapsed = true;
		this.clip_path_num = null;
		this.children_cnt = 0;
		this.cut_right = 0;
		this.cut_top = this.drop_container.offsetTop - 48 + this.constructor.hflex_term;
		this.cut_bottom = this.drop_container.offsetTop - 6 - this.constructor.hflex_term;

		this.expand = this.expand.bind(this);
		this.collapse = this.collapse.bind(this);
		this.pressSubButton = this.pressSubButton.bind(this);
		this.drop_container.addEventListener('pointerenter', this.expand);
		this.drop_container.addEventListener('pointerleave', this.collapse);
		this.mask_g.addEventListener('click', this.pressSubButton);
	}

	static id_prefix = 'db';

	static margin = 2;

	static hflex_term = 6 - this.margin;

	static btn_corners = '0,0 30,0 30,25 25,30 0,30';

	createHtml() {
		this.drop_container = document.createElement('div');
		this.drop_container.classList.add('dropcont');
		this.drop_container.appendChild(this.svg);
		this.parent.appendChild(this.drop_container);

		this.hflex = document.createElement('div');
		this.hflex.classList.add('dropflex');
		this.hflex.style.top = this.drop_container.offsetTop + 'px';
		this.drop_container.appendChild(this.hflex);
	}

	expand(event) { // eslint-disable-line no-unused-vars
		this.clip_path_num = cnv.clipRect(0, this.cut_top, this.cut_right, this.cut_bottom);
		this.collapsed = false;
		if (this.active) this.deselect();
	}

	collapse(event) { // eslint-disable-line no-unused-vars
		cnv.unclip(this.clip_path_num);
		this.clip_path_num = null;
		this.collapsed = true;
		if (this.active) this.select();
	}

	pressSubButton(event) {
		const new_event = new Event('click');
		new_event.clientX = event.clientX;
		new_event.clientY = event.clientY;
		this.focused_subbtn.mask_g.dispatchEvent(new_event);
	}

	appendChild(child) {
		child.setAttribute('height', 36 - this.constructor.hflex_term);
		child.setAttribute('width', 36 - this.constructor.hflex_term);
		if (this.children_cnt) this.hflex.lastChild.setAttribute('width', 36);
		this.cut_right = ++this.children_cnt * 36 - this.constructor.hflex_term;
		this.hflex.style.width = this.children_cnt * 36 + 'px';
		this.hflex.appendChild(child);
	}

	selectCond(subbtn) {
		this.active = true;
		this.focused_subbtn.focline.setAttribute('class', 'invisible');
		this.focused_subbtn = subbtn;
		this.active_subbtn = subbtn;
		if (this.collapsed) this.select();
	}

	deselectCond(subbtn) {
		this.active = false;
		this.focusSubbtn(subbtn);
		if (this.collapsed) this.deselect();
	}

	focusSubbtn(subbtn) {
		this.focused_subbtn = subbtn;
		this.focused_subbtn.focline.setAttribute('class', 'visible');
	}

	select() {
		this.img.innerHTML = this.active_subbtn.html_text;
		this.selrect.setAttribute('class', 'visible');
	}

	deselect() {
		this.img.innerHTML = this.html_text;
		this.selrect.setAttribute('class', 'invisible');
	}
}


function toBtnText(text) {
	return `<text class='but' x='15' y='17' fill='black' dominant-baseline='middle' 
	text-anchor='middle'>${text}</text>`;
}

const toolbar = document.getElementById('toolbar');

const elbtnseq = ['C', 'H', 'O', 'N', 'S'];

const selectbtn = new DropButton(toolbar, `
	<polygon stroke="none" fill="black" points="9.1,4 9.2,24.2 13.5,21.5 15.6,27.2 19.4,25.8 17.3,20.1 22.3,19.3">
	</polygon>
`);
export const selrebtn = new SubButton(selectbtn, `
	<rect stroke="black" fill="none" stroke-width="2" x="3" y="7" width="24" height="16" stroke-dasharray="4"
	stroke-dashoffset="2"></rect>
`);
export const sellabtn = new SubButton(selectbtn, `
	<path stroke="black" fill="none" stroke-width="2" d="M 15 3 Q 3 3 3 15 Q 3 27 10.5 27 Q 18 27 18 22 Q 18 17 22 17.3
	Q 26 17.6 26.5 10.3 Q 27 3 15 3" stroke-dasharray="3.9"></path>
`);
export const selmobtn = new SubButton(selectbtn, `
	<line stroke="black" stroke-width="2" x1="5" y1="19" x2="15" y2="11"></line>
	<line stroke="black" stroke-width="2" x1="25" y1="19" x2="15" y2="11"></line>
	<circle stroke="none" cx="15" cy="11" r="6"></circle>
	<circle stroke="none" cx="5" cy="19" r="3"></circle>
	<circle stroke="none" cx="25" cy="19" r="3"></circle>
`);
selectbtn.focusSubbtn(selrebtn);

const dropelbtn = new DropButton(toolbar, `
	<line x1="15.0" y1="28.0" x2="15.0" y2="19.0" stroke="black" stroke-width="2" />
	<line x1="2.0" y1="5.5" x2="9.8" y2="10.0" stroke="black" stroke-width="2" />
	<line x1="28.0" y1="5.5" x2="20.2" y2="10.0" stroke="black" stroke-width="2" />
	<text x="15" y="15" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="16px">A</text>
`);
export const elbtns = elbtnseq.map(atom => new SubButton(dropelbtn, toBtnText(atom)));
dropelbtn.focusSubbtn(elbtns[0]);

const dropbondbtn = new DropButton(toolbar, `
	<line x1="11.0" y1="19.0" x2="19.4" y2="10.6" stroke="black" stroke-width="2" />
	<text x="6.5" y="24.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="12px">C</text>
	<text x="23.5" y="7.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="12px">C</text>
`);
export const bondbtn = new SubButton(dropbondbtn,
	'<line x1="4.4" y1="25.6" x2="25.6" y2="4.4" stroke="black" stroke-width="2" />'
);
export const dbondbtn = new SubButton(dropbondbtn, `
	<line x1="5.8" y1="27.0" x2="27.0" y2="5.8" stroke="black" stroke-width="2" />
	<line x1="3.0" y1="24.2" x2="24.2" y2="3.0" stroke="black" stroke-width="2" />
`);
export const upperbtn = new SubButton(dropbondbtn,
	'<polygon points="4.7,26.0 27.7,6.5 23.5,2.3 4.0,25.3" fill="black" />'
);
export const lowerbtn = new SubButton(dropbondbtn, `
	<defs>
		<pattern id="low_btn_pattern" x="25.6" y="4.4" width="4" height="1" patternUnits="userSpaceOnUse" 
		patternTransform="rotate(135)">
			<rect x="0" y="0" width="2" height="1" fill="black" />
		</pattern>
	</defs>
	<polygon points="4.7,26.0 27.7,6.5 23.5,2.3 4.0,25.3" fill="url(#low_btn_pattern)" />
`);
dropbondbtn.focusSubbtn(bondbtn);

export const delbtn = new RegularButton(toolbar, `
	<path style="fill:none;stroke:black;stroke-width:2;" d="M2.5,19.6c-0.7-0.7-0.7-0.7,0-1.4L18.1,2.6c0.7-0.7,0.7-0.7,
	1.4,0l7.8,7.8c0.7,0.7,0.7,0.7,0,1.4L15.6,23.5c-3.2,3.2-6,3.2-9.2,0L2.5,19.6z"/>
	<rect x="12.7" y="4.8" transform="matrix(0.7072 0.7071 -0.7071 0.7072 13.2169 -10.3978)" width="13" height="12"/>
`);

export const textbtn = new RegularButton(toolbar, `
	<path d=" M 22 6.8 V 23.2 M 18 5 H 20 A 2 2 0 0 1 22 7 A 2 2 0 0 1 24 5 H 26 M 18 25 H 20 A 2 2 0 0 0 22 23 A 2 2 
	0 0 0 24 25 H 26" stroke="black" stroke-width="1.5" />
	<text x="12" y="17.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Serif" 
	font-size="20px">T</text>
`);

const dropcycbtn = new DropButton(toolbar, `
	<polygon points="28.8,15.0 23.6,25.8 11.9,28.5 2.5,21.0 2.5,9.0 11.9,1.5 23.6,4.2" fill="black" />
	<polygon points="15.0,25.2 5.3,18.2 9.0,6.7 21.0,6.7 24.7,18.2" fill="white" />
`);
export const benzenebtn = new SubButton(dropcycbtn, `
	<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" 
	fill="none" />
	<line x1="15.0" y1="22.0" x2="8.9" y2="18.5" stroke="black" stroke-width="2" />
	<line x1="8.9" y1="11.5" x2="15.0" y2="8.0" stroke="black" stroke-width="2" />
	<line x1="21.1" y1="11.5" x2="21.1" y2="18.5" stroke="black" stroke-width="2" />
`);
export const pentagonbtn = new SubButton(dropcycbtn,
	'<polygon points="15.0,24.4 6.1,17.9 9.5,7.4 20.5,7.4 23.9,17.9" stroke="black" stroke-width="2" fill="none" />'
);
export const hexagonbtn = new SubButton(dropcycbtn,
	`<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" 
	fill="none" />`
);
export const heptagonbtn = new SubButton(dropcycbtn,
	`<polygon points="15.0,27.7 5.1,22.9 2.6,12.2 9.5,3.6 20.5,3.6 27.4,12.2 24.9,22.9" stroke="black" stroke-width="2"
	fill="none" />`
);
dropcycbtn.focusSubbtn(benzenebtn);

const droparrowsbtn = new DropButton(toolbar, `
	<line stroke="black" stroke-width="2" x1="5" y1="15" x2="19" y2="15"></line>
	<polygon stroke="none" points="18,11 18,19 28,15"></polygon>
	<polygon stroke="none" points="3,11 5,15 3,19 10,19 12,15 10,11"></polygon>
`);
export const arrowbtn = new SubButton(droparrowsbtn, `
	<line stroke="black" fill="black" stroke-width="2" x1="2" y1="15" x2="19" y2="15"></line>
	<polygon stroke="none" fill="black" points="18,11 18,19 28,15"></polygon>
`);
export const doublearrowbtn = new SubButton(droparrowsbtn, `
	<line stroke="black" stroke-width="2" x1="2" y1="11" x2="19" y2="11"></line>
	<line stroke="black" stroke-width="2" x1="27" y1="19" x2="11" y2="19"></line>
	<polygon stroke="none" fill="black" points="18,7 18,15 28,11"></polygon>
	<polygon stroke="none" fill="black" points="12,15 12,23 2,19"></polygon>
`);
export const resonancearrowbtn = new SubButton(droparrowsbtn, `
	<line stroke="black" stroke-width="2" x1="3" y1="15" x2="27" y2="15"></line>
	<polyline stroke="black" fill="none" stroke-width="2" points="8,10 3,15 8,20"></polyline>
	<polyline stroke="black" fill="none" stroke-width="2" points="22,10 27,15 22,20"></polyline>
`);
export const retroarrowbtn = new SubButton(droparrowsbtn, `
	<line stroke="black" stroke-width="2" x1="3" y1="19" x2="25" y2="19"></line>
	<line stroke="black" stroke-width="2" x1="3" y1="11" x2="25" y2="11"></line>
	<polyline stroke="black" fill="none" stroke-width="2" points="23,7 27,15 23,23"></polyline>
`);
droparrowsbtn.focusSubbtn(arrowbtn);

const dropshapesbtn = new DropButton(toolbar, `
	<circle cx="20" cy="17" r="8"></circle>
	<rect stroke="white" stroke-width="1" x="2" y="14" width="15" height="13"></rect>
	<polygon stroke="white" stroke-width="1" points="14,2 22,19 6,19"></polygon>
`);
export const linebtn = new SubButton(dropshapesbtn, `
	<line stroke="black" stroke-width="2" x1="2" y1="15" x2="28" y2="15"></line>
`);
export const circlebtn = new SubButton(dropshapesbtn, `
	<circle stroke="black" fill="none" stroke-width="2" cx="15" cy="15" r="11"></circle>
`);
export const rectbtn = new SubButton(dropshapesbtn, `
	<rect stroke="black" fill="none" stroke-width="2" x="3" y="7" width="24" height="16"></rect>
`);
export const polylinebtn = new SubButton(dropshapesbtn, `
	<polyline stroke="black" fill="none" stroke-width="2" points="3,27 8,5 18,21 27,15"></polyline>
`);
export const polygbtn = new SubButton(dropshapesbtn, `
<polygon stroke="black" fill="none" stroke-width="2"  points="3,6 10,3 16,10 27,7 27,19 19,27 7,27 9,19"></polygon>
`);
export const curvbtn = new SubButton(dropshapesbtn, `
	<path stroke="black" fill="none" stroke-width="2" d="M 3 27 Q 5 3 9 3 Q 12 3 15.5 16 Q 19 29 20.5 20 Q 22 11 27 14">
	</path>
`);
export const smoothbtn = new SubButton(dropshapesbtn, `
	<path stroke="black" fill="none" stroke-width="2"  d="M 12 8 Q 3 0 3 14 Q 3 27 10.2 25.58 Q 17 24 20.4 25.9 Q 26 29
	26.4 16.9 Q 27 2 23 10 Q 20.3 15.3 12 8"></path>
`);
dropshapesbtn.focusSubbtn(linebtn);



export const menu_bar = document.getElementById('menubar');


class MenuItem {
	constructor(parent, html_text) {
		this.parent = parent;
		this.text_width = Math.round(getTextWidth(html_text));
		this.width = this.constructor.w;
		this.height = this.constructor.h;
		this.margin_hor = this.constructor.margin;
		this.margin_ver = this.constructor.margin;

		this.createSvg();
		this.createHtml();
		this.setImage(html_text);
		this.centerText();
	}

	static btn_num = 0;

	static id_prefix = 'mi';

	static w = 102;

	static h = 24;

	static margin = 6;

	static padding = 4;

	static getBtnNum() {
		return this.btn_num++;
	}

	getBtnCorners() {
		return `0,0 ${this.width},0 ${this.width},${this.height} 0,${this.height}`;
	}

	createSvg() {
		this.svg = makeSvg('svg', {width: this.width + this.margin_hor, height: this.height + this.margin_ver});
		const mask_id = this.constructor.id_prefix + this.constructor.getBtnNum() + 'mask';
		const mask = attachSvg(this.svg, 'mask', {id: mask_id});
		this.clip_poligon = attachSvg(mask, 'polygon', {points: this.getBtnCorners(), fill: 'white'}); // White bg
		this.img = attachSvg(mask, 'g');
		this.filter_g = attachSvg(this.svg, 'g', {filter: 'url(#shadow)'});
		this.mask_g = attachSvg(this.filter_g, 'g', {class: 'but', mask: `url(#${mask_id})`});
		this.mask_g.objref = this;
		this.bg = attachSvg(this.mask_g, 'rect', {class: 'but brick', x: 0, y: 0, width: this.width + 2, height: this.height + 2}); // Button tissue
	}

	createHtml() {
		this.svg.objref = this;
		this.parent.appendChild(this.svg);
	}

	setImage(html_text) {
		this.img.insertAdjacentHTML('beforeend', html_text);
		this.text = this.img.lastChild;
	}

	setWidth(width) {
		this.width = width;
		setAttrsSvg(this.text, {'text-anchor': 'start', x: this.constructor.padding});
		this.svg.setAttribute('width', width + this.margin_hor);
		this.clip_poligon.setAttribute('points', this.getBtnCorners());
		this.bg.setAttribute('width', this.width + 2);
	}

	setHeight(height) {
		this.height = height;
		this.implementHeightInner();
		this.implementHeightOuter();
	}

	setMarginVer(margin_ver) {
		this.margin_ver = margin_ver;
		this.implementHeightOuter();
	}

	setMarginHor(margin_hor) {
		this.margin_hor = margin_hor;
		this.implementWidthOuter();
	}

	implementWidthOuter() {
		this.svg.setAttribute('width', this.width + this.margin_hor);
	}

	implementHeightInner() {
		this.clip_poligon.setAttribute('points', this.getBtnCorners());
		this.centerText();
		this.bg.setAttribute('height', this.height + 2);
	}

	implementHeightOuter() {
		this.svg.setAttribute('height', this.height + this.margin_ver);
	}

	centerText() {
		const font_size = this.text.getAttribute('font-size');
		const y = this.height / 2 + parseInt(font_size) / 8;
		this.text.setAttribute('y', y);
	}
}


class MenuFlag extends MenuItem {
	constructor(parent, html_text) {
		super(parent, html_text);
		this.box_size = 12;
		this.active = false;
		this.text_width += this.box_size + this.constructor.padding;
		this.locateFlag();
		this.callback = (is_active) => {};

		this.toggle = this.toggle.bind(this);
		this.mask_g.addEventListener('click', this.toggle);
	}

	static id_prefix = 'mfb';

	getFlagDims() {
		const half_size = this.box_size / 2;
		const ctr_x = this.width - this.constructor.padding - half_size;
		const ctr_y = this.height / 2;
		return [ctr_x, ctr_y, half_size];
	}

	setWidth(width) {
		super.setWidth(width);
		this.locateFlag();
	}

	select() {
		this.flag.setAttribute('class', 'visible');
		this.flag_bg.setAttribute('class', 'visible');
		this.active = true;
	}

	deselect() {
		this.flag.setAttribute('class', 'invisible');
		this.flag_bg.setAttribute('class', 'invisible');
		this.active = false;
	}

	toggle() {
		this.callback(this.active);
	}

	setCallback(callback) {
		this.callback = callback;
	}
}


class MenuCheckBox extends MenuFlag {
	static id_prefix = 'mcb';

	locateFlag() {
		const [ctr_x, ctr_y, half_size] = this.getFlagDims();
		setAttrsSvg(this.flag, {points: `${ctr_x - 4},${ctr_y - 2} ${ctr_x + 1},${ctr_y + 2} ${ctr_x + 6},${ctr_y - 7}`});
		setAttrsSvg(this.flag_bg, {points: `${ctr_x - 4},${ctr_y - 2} ${ctr_x + 1},${ctr_y + 2} ${ctr_x + 6},${ctr_y - 7}`});
		setAttrsSvg(this.checkbox, {x: ctr_x - half_size, y: ctr_y - half_size, width: this.box_size, height: this.box_size});
	}

	createSvg() {
		super.createSvg();
		this.checkbox = attachSvg(this.img, 'rect');
		this.flag_bg = attachSvg(this.img, 'polyline', {class: 'invisible', stroke: 'white', fill: 'none', 'stroke-width': 3, 'stroke-linecap': 'square'});
		this.flag = attachSvg(this.mask_g, 'polyline', {class: 'invisible', stroke: 'blue', fill: 'none', 'stroke-width': 2, 'stroke-linecap': 'square'});
	}

	toggle() {
		this.active ? this.deselect() : this.select();
		super.toggle();
	}
}


class MenuRadioButton extends MenuFlag {
	constructor(parent, html_text) {
		super(parent, html_text);
		this.mutex_partners = [];
	}

	static id_prefix = 'mrb';

	static setMutEx(...items) {
		for (const item of items) {
			const items_set = new Set(items);
			items_set.delete(item);
			item.mutex_partners = [...items_set]
		}
		items[0].toggle();
	}

	locateFlag() {
		const [ctr_x, ctr_y, half_size] = this.getFlagDims();
		setAttrsSvg(this.flag, {cx: ctr_x, cy: ctr_y});
		setAttrsSvg(this.flag_bg, {cx: ctr_x, cy: ctr_y});
		setAttrsSvg(this.flag_box, {cx: ctr_x, cy: ctr_y, r: half_size});
	}

	createSvg() {
		super.createSvg();
		this.flag_box = attachSvg(this.img, 'circle');
		this.flag_bg = attachSvg(this.img, 'circle', {class: 'invisible', stroke: 'none', fill: 'white', r: 3.5});
		this.flag = attachSvg(this.mask_g, 'circle', {class: 'invisible', stroke: 'none', fill: 'blue', r: 3});
	}

	toggle() {
		this.select();
		this.mutex_partners.forEach(partner => partner.deselect());
		super.toggle();
	}
}


class MenuButton extends MenuItem {
	constructor(parent, html_text) {
		super(parent, html_text);

		this.animateBtnDown = this.animateBtnDown.bind(this);
		this.animateBtnUp = this.animateBtnUp.bind(this);
		this.mask_g.addEventListener('mousedown', this.animateBtnDown);
	}

	static id_prefix = 'mb';

	// eslint-disable-next-line no-unused-vars
	animateBtnDown(event) { // Change appearance of fancy buttons
		this.filter_g.setAttribute('filter', 'url(#okshadow)');
		this.filter_g.setAttribute('transform', `translate(${this.width / 2} ${this.height / 2}) scale(0.94) translate(${-this.width / 2} ${-this.height / 2})`);
		window.addEventListener('mouseup', this.animateBtnUp);
	}

	// eslint-disable-next-line no-unused-vars
	animateBtnUp(event) { // Reset appearance of fancy buttons
		window.removeEventListener('mouseup', this.animateBtnUp);
		this.filter_g.setAttribute('filter', 'url(#shadow)');
		this.filter_g.setAttribute('transform', `translate(${this.width / 2} ${this.height / 2}) scale(1) translate(${-this.width / 2} ${-this.height / 2})`);
	}
}


class DropMenu extends MenuItem {
	constructor(parent, html_text) {
		super(parent, html_text);
		this.clip_path_nums = [];
		this.children = [];
		this.drop_container_width = this.constructor.w;

		this.initCutDims();

		this.expand = this.expand.bind(this);
		this.collapse = this.collapse.bind(this);
		this.drop_container.addEventListener('pointerenter', this.expand);
		this.drop_container.addEventListener('pointerleave', this.collapse);
	}

	static id_prefix = 'dm';

	static child_margin = 2;

	static button_spacing = 0;

	getBtnCorners() {
		return `0,0 ${this.width},0 ${this.width},${this.height - 5} ${this.width - 5},${this.height} 0,${this.height}`;
	}

	createHtml() {
		this.drop_container = document.createElement('div');
		this.drop_container.classList.add('dropcontmenu');
		this.drop_container.appendChild(this.svg);
		this.drop_container.objref = this;
		this.parent.appendChild(this.drop_container);

		this.hflex = document.createElement('div');
		this.hflex.classList.add('dropflexmenu');
		this.drop_container.appendChild(this.hflex);

		this.allignHtml();
	}

	allignHtml() {
		this.hflex.style.left = this.origin.x + 'px';
		this.hflex.style.top = this.origin.y + 'px';
	}

	initCutDims() {
		this.calcCutLeft();
		this.calcCutRight();
		this.calcCutTop();
		this.calcCutBottom();
	}

	calcCutLeft() {
		this.cut_left = this.origin.x - this.constructor.child_margin - cnv.x;
	}

	calcCutRight() {
		this.cut_right = this.cut_left + this.drop_container_width + this.constructor.child_margin * 2;
	}

	calcCutTop() {
		this.cut_top = 0;
	}

	calcCutBottom() {
		this.cut_bottom = 0;
		this.children.forEach(child => this.cut_bottom += child.height + child.margin_ver);
	}

	expand(event) { // eslint-disable-line no-unused-vars
		this.clip_path_nums.push(cnv.clipRect(this.cut_left, this.cut_top, this.cut_right, this.cut_bottom));
	}

	collapse(event) { // eslint-disable-line no-unused-vars
		this.clip_path_nums.forEach(item => cnv.unclip(item));
		this.clip_path_nums = [];
	}

	appendChild(child) {
		const ch_cnt = this.children.length;
		if (ch_cnt) {
			this.children[ch_cnt - 1].setMarginVer(this.constructor.button_spacing);
		}
		child.objref.setMarginHor(this.constructor.child_margin);
		child.objref.setMarginVer(this.constructor.child_margin);
		this.hflex.appendChild(child);
		this.children.push(child.objref);
		this.calcCutBottom();
	}

	getMaxChildrenTextWidth() {
		return Math.max(...this.children.map(child => child.text_width));
	}

	setChildrenTextWidth(width) {
		this.drop_container_width = width;
		this.calcCutRight()
		for (const child of this.children) {
			child.setWidth(this.drop_container_width);
			if (child instanceof SubDropMenu) {
				child.allignHtml();
				child.calcCutLeft();
				child.calcCutRight();
				child.compressDropContainerWidth();
			}
		}
	}

	compressDropContainerWidth() {
		this.setChildrenTextWidth(this.getMaxChildrenTextWidth() + this.constructor.padding * 2);
	}

	get origin() {
		const {x, y} = new DOMPoint(0, 0).matrixTransform(this.svg.getScreenCTM());
		return {x: x, y: cnv.y};
	}
}


class SubDropMenu extends DropMenu {
	static id_prefix = 'sdm';

	allignHtml() {
		this.hflex.style.left = this.parent.drop_container_width + this.constructor.child_margin + 'px';
		this.hflex.style.top = this.origin.y - this.parent.origin.y + 'px';
	}

	calcCutLeft() {
		this.cut_left = this.parent.cut_right - this.constructor.child_margin;
	}

	calcCutTop() {
		this.cut_top = Math.max(this.origin.y - cnv.y - this.constructor.child_margin, 0);
	}

	calcCutBottom() {
		super.calcCutBottom();
		this.cut_bottom += this.origin.y - cnv.y;
	}

	expand(event) { // eslint-disable-line no-unused-vars
		super.expand(event);
		this.clip_path_nums.push(cnv.clipRect(this.cut_left, this.cut_top, 
			this.parent.cut_right, Math.min(this.cut_bottom, this.parent.cut_bottom)));
	}

	implementHeightOuter() {
		super.implementHeightOuter();
		this.drop_container.style.height = this.height + this.margin_ver + 'px';
	}

	get origin() {
		let {x, y} = this.parent.origin;
		for (const sibling of this.parent.children) {
			if (sibling == this) break;
			y += sibling.height + sibling.margin_ver;
		}
		return {x: x + this.parent.drop_container_width + this.constructor.child_margin, y: y};
	}
}


function getTextWidth(html_text) {
	const test_svg_cnv = document.getElementById('filters');
	test_svg_cnv.insertAdjacentHTML('beforeend', html_text);
	const text_el = test_svg_cnv.lastChild;
	const width = text_el.getBBox().width;
	text_el.remove();
	return width;
}

// {'text-anchor': 'start', x: this.constructor.padding}
const text_attrs = {
	'font-family': 'Arial',
	'font-size': '16px',
	'font-weight': 'normal',
	// x: MenuItem.w / 2,
	x: MenuItem.padding,
	y: '15',
	fill: 'black',
	'dominant-baseline': 'middle',
	// 'text-anchor': 'middle',
	'text-anchor': 'start'
};

const text_dropdown_extra_attrs = {
	'font-size': '14px',
};

const text_dropdown_attrs = {...text_attrs, ...text_dropdown_extra_attrs};

const text_menu_extra_attrs = {
	x: MenuItem.w / 2,
	'text-anchor': 'middle'
}

const text_menu_attrs = {...text_attrs, ...text_menu_extra_attrs};


function toMenuText(text, attrs) {
	const svg_text = makeSvg('text', attrs=attrs);
	svg_text.textContent = text;
	return svg_text.outerHTML;
}


export const menu_file = new DropMenu(menu_bar, toMenuText('File', text_menu_attrs));
menu_file.setHeight(30);

export const file_new = new MenuButton(menu_file, toMenuText('new', text_dropdown_attrs));

export const save_as = new SubDropMenu(menu_file, toMenuText('save as', text_dropdown_attrs));
export const save_as_svg = new MenuButton(save_as, toMenuText('.svg', text_dropdown_attrs));
export const save_as_json = new MenuButton(save_as, toMenuText('.json', text_dropdown_attrs));
export const save_as_mol = new MenuButton(save_as, toMenuText('.mol', text_dropdown_attrs));
save_as.compressDropContainerWidth();

export const open_json = new MenuButton(menu_file, toMenuText('open .json', text_dropdown_attrs));


export const menu_view = new DropMenu(menu_bar, toMenuText('View', text_menu_attrs));
menu_view.setHeight(30);

export const show = new SubDropMenu(menu_view, toMenuText('show', text_dropdown_attrs));
export const show_grid = new MenuCheckBox(show, toMenuText('grid', text_dropdown_attrs));
export const show_control_points = new MenuCheckBox(show, toMenuText('control points', text_dropdown_attrs));
export const show_mol_info = new MenuCheckBox(show, toMenuText('mol info window', text_dropdown_attrs));
show.compressDropContainerWidth();



export const zoom = new SubDropMenu(menu_view, toMenuText('zoom', text_dropdown_attrs));
export const zoom500 = new MenuRadioButton(zoom, toMenuText('500%', text_dropdown_attrs));
export const zoom200 = new MenuRadioButton(zoom, toMenuText('200%', text_dropdown_attrs));
export const zoom100 = new MenuRadioButton(zoom, toMenuText('100%', text_dropdown_attrs));
export const zoom50 = new MenuRadioButton(zoom, toMenuText('50%', text_dropdown_attrs));
export const zoom25 = new MenuRadioButton(zoom, toMenuText('25%', text_dropdown_attrs));
zoom.compressDropContainerWidth();
MenuRadioButton.setMutEx(zoom100, zoom500, zoom200, zoom50, zoom25);





// export const menu_drop = new DropMenu(menu_bar, toMenuText('Drop', text_menu_attrs));
// // export const menu_item = new MenuItem(menu_bar, toMenuText('Menu Item', text_attrs));
// // export const menu_btn = new MenuButton(menu_bar, toMenuText('Help', text_attrs));
// // export const menu_item0 = new MenuItem(menu_bar, toMenuText('Menu Item', text_attrs));


// export const mi0 = new MenuItem(menu_drop, toMenuText('mi0', text_dropdown_attrs));
// export const submenu_btn = new MenuButton(menu_drop, toMenuText('Help', text_dropdown_attrs));
// export const menu_subdrop = new SubDropMenu(menu_drop, toMenuText('Subdrop', text_dropdown_attrs));
// export const mi1 = new MenuItem(menu_drop, toMenuText('mi1', text_dropdown_attrs));
// export const mi2 = new MenuItem(menu_drop, toMenuText('mi2', text_dropdown_attrs));

// export const sdi1 = new MenuItem(menu_subdrop, toMenuText('sdi1', text_dropdown_attrs));
// export const sdi2 = new MenuItem(menu_subdrop, toMenuText('sdi2', text_dropdown_attrs));
// export const sdibtn = new MenuButton(menu_subdrop, toMenuText('sdibtn', text_dropdown_attrs));
// export const sdi3 = new MenuItem(menu_subdrop, toMenuText('sdi3', text_dropdown_attrs));
// export const menu_subsubdrop = new SubDropMenu(menu_subdrop, toMenuText('SubSub', text_dropdown_attrs));

// export const ssdi1 = new MenuItem(menu_subsubdrop, toMenuText('ssdi1', text_dropdown_attrs));
// export const ssdi2 = new MenuItem(menu_subsubdrop, toMenuText('ssdi2', text_dropdown_attrs));
// export const cb = new MenuCheckBox(menu_subsubdrop, toMenuText('checkbox', text_dropdown_attrs));
// export const rb0 = new MenuRadioButton(menu_subsubdrop, toMenuText('radiobutton0', text_dropdown_attrs));
// export const rb1 = new MenuRadioButton(menu_subsubdrop, toMenuText('radiobutton1', text_dropdown_attrs));
// export const rb2 = new MenuRadioButton(menu_subsubdrop, toMenuText('radiobutton2', text_dropdown_attrs));

// MenuRadioButton.setMutEx(rb0, rb1, rb2);
// menu_drop.setHeight(30);
// menu_subdrop.compressDropContainerWidth();



// menu_drop.setWidth(menu_drop.text_width + 8);

// menu_drop.compressDropContainerWidth();

// menu_subsubdrop.compressDropContainerWidth();
// menu_drop.setMarginVer(6);

// console.log(menu_drop.getOrig());
// console.log(menu_subdrop.getOrig());
// console.log(menu_drop.getContainerOrig());



