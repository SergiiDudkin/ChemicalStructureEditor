import {makeSvg, attachSvg} from './Utils.js';
import {cnv} from './Canvas.js';


class BaseButton {
	constructor(parent, thml_text) {
		this.parent = parent;
		this.thml_text = thml_text;
		this.active = false;

		this.createSvg();
		this.createHtml();
		this.setImage(thml_text);

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

	setImage(thml_text) {
		this.img.insertAdjacentHTML('beforeend', thml_text);
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
	constructor(parent, thml_text) {
		super(parent, thml_text);
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
		this.img.innerHTML = this.active_subbtn.thml_text;
		this.selrect.setAttribute('class', 'visible');
	}

	deselect() {
		this.img.innerHTML = this.thml_text;
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



const menu_bar = document.getElementById('menubar');

function toMenuText(text, width) {
	return `<text class='menumsk' x='${width / 2}' y='17' fill='black' dominant-baseline='middle' 
	text-anchor='middle'>${text}</text>`;
}

class MenuItem {
	constructor(parent, thml_text) {
		this.parent = parent;
		this.thml_text = thml_text;

		this.createSvg();
		this.createHtml();
		this.setImage(thml_text);
	}

	static btn_num = 0;

	static id_prefix = 'mi';

	static w = 100;

	static h = 30;

	static btn_corners = `0,0 ${this.w},0 ${this.w},${this.h} 0,${this.h}`;

	static getBtnNum() {
		return this.btn_num++;
	}

	createSvg() {
		const mask_id = this.constructor.id_prefix + this.constructor.getBtnNum() + 'mask';
		this.svg = makeSvg('svg', {width: this.constructor.w + 6, height: this.constructor.h + 6});
		const mask = attachSvg(this.svg, 'mask', {id: mask_id, class: 'elmsk'});
		attachSvg(mask, 'polygon', {points: this.constructor.btn_corners, fill: 'white'}); // White bg
		this.img = attachSvg(mask, 'g');
		this.filter_g = attachSvg(this.svg, 'g', {filter: 'url(#shadow)'});
		this.mask_g = attachSvg(this.filter_g, 'g', {class: 'but', mask: `url(#${mask_id})`});
		this.mask_g.objref = this;
		attachSvg(this.mask_g, 'rect', {class: 'but brick', x: 0, y: 0, width: this.constructor.w + 2, height: this.constructor.h + 2}); // Button tissue
		this.selrect = attachSvg(this.mask_g, 'polygon',
			{class: 'invisible', points: this.constructor.btn_corners, fill: 'none', stroke: 'blue', 'stroke-width': 2}
		);
	}

	createHtml() {
		this.svg.objref = this;
		this.parent.appendChild(this.svg);
	}

	setImage(thml_text) {
		this.img.insertAdjacentHTML('beforeend', thml_text);
	}
}


class MenuButton {
	constructor(parent, thml_text) {
		this.parent = parent;
		this.thml_text = thml_text;

		this.createSvg();
		this.createHtml();
		this.setImage(thml_text);

		this.animateBtnDown = this.animateBtnDown.bind(this);
		this.animateBtnUp = this.animateBtnUp.bind(this);
		this.mask_g.addEventListener('mousedown', this.animateBtnDown);
	}

	static btn_num = 0;

	static id_prefix = 'mb';

	static w = 100;

	static h = 30;

	static btn_corners = `0,0 ${this.w},0 ${this.w},${this.h} 0,${this.h}`;

	static getBtnNum() {
		return this.btn_num++;
	}

	createSvg() {
		const mask_id = this.constructor.id_prefix + this.constructor.getBtnNum() + 'mask';
		this.svg = makeSvg('svg', {width: this.constructor.w + 6, height: this.constructor.h + 16});
		const mask = attachSvg(this.svg, 'mask', {id: mask_id, class: 'elmsk'});
		attachSvg(mask, 'polygon', {points: this.constructor.btn_corners, fill: 'white'}); // White bg
		this.img = attachSvg(mask, 'g');
		this.filter_g = attachSvg(this.svg, 'g', {filter: 'url(#shadow)'});
		this.mask_g = attachSvg(this.filter_g, 'g', {class: 'but', mask: `url(#${mask_id})`});
		this.mask_g.objref = this;
		attachSvg(this.mask_g, 'rect', {class: 'but brick', x: 0, y: 0, width: this.constructor.w + 2, height: this.constructor.h + 2}); // Button tissue
		this.selrect = attachSvg(this.mask_g, 'polygon',
			{class: 'invisible', points: this.constructor.btn_corners, fill: 'none', stroke: 'blue', 'stroke-width': 2}
		);
	}

	createHtml() {
		this.svg.objref = this;
		this.parent.appendChild(this.svg);
	}

	setImage(thml_text) {
		this.img.insertAdjacentHTML('beforeend', thml_text);
	}

	// eslint-disable-next-line no-unused-vars
	animateBtnDown(event) { // Change appearance of fancy buttons
		this.filter_g.setAttribute('filter', 'url(#okshadow)');
		this.filter_g.setAttribute('transform', `translate(${this.constructor.w / 2} ${this.constructor.h / 2}) scale(0.94) translate(${-this.constructor.w / 2} ${-this.constructor.h / 2})`);
		window.addEventListener('mouseup', this.animateBtnUp);
	}

	// eslint-disable-next-line no-unused-vars
	animateBtnUp(event) { // Reset appearance of fancy buttons
		window.removeEventListener('mouseup', this.animateBtnUp);
		this.filter_g.setAttribute('filter', 'url(#shadow)');
		this.filter_g.setAttribute('transform', `translate(${this.constructor.w / 2} ${this.constructor.h / 2}) scale(1) translate(${-this.constructor.w / 2} ${-this.constructor.h / 2})`);
	}
}


class DropMenu extends MenuItem {
	constructor(parent, thml_text) {
		super(parent, thml_text);
		this.collapsed = true;
		this.clip_path_num = null;
		this.children_cnt = 0;

		const [cnv0x, cnv0y] = cnv.getScreenPoint([0, 0]);
		this.cut_left = this.drop_container.offsetLeft - this.constructor.margin - cnv0x; // ToDo: set value!
		this.cut_right = this.drop_container.offsetLeft + this.constructor.w + this.constructor.margin - cnv0x; // ToDo: set value!
		this.cut_top = 0;
		this.cut_bottom = 0;

		this.expand = this.expand.bind(this);
		this.collapse = this.collapse.bind(this);
		this.drop_container.addEventListener('pointerenter', this.expand);
		this.drop_container.addEventListener('pointerleave', this.collapse);
	}

	static id_prefix = 'dm';

	static margin = 2;

	static button_spacing = 0;

	static hflex_term = this.button_spacing - this.margin;

	createHtml() {
		this.drop_container = document.createElement('div');
		this.drop_container.classList.add('dropcontmenu');
		this.drop_container.appendChild(this.svg);
		this.parent.appendChild(this.drop_container);

		this.hflex = document.createElement('div');
		this.hflex.classList.add('dropflexmenu');
		this.hflex.style.left = this.drop_container.offsetLeft + 'px';
		this.hflex.style.top = '42px';
		this.drop_container.appendChild(this.hflex);
	}

	expand(event) { // eslint-disable-line no-unused-vars
		this.clip_path_num = cnv.clipRect(this.cut_left, this.cut_top, this.cut_right, this.cut_bottom);
		this.collapsed = false;
	}

	collapse(event) { // eslint-disable-line no-unused-vars
		cnv.unclip(this.clip_path_num);
		this.clip_path_num = null;
		this.collapsed = true;
	}

	appendChild(child) {
		if (this.children_cnt) this.hflex.lastChild.objref.svg.setAttribute('height', this.constructor.h + this.constructor.button_spacing);

		// if (child.tagName == 'svg') {
		// 	child.setAttribute('height', this.constructor.h + this.constructor.margin);
		// 	child.setAttribute('width', this.constructor.w + this.constructor.margin);
		// }
		// else {
		// 	child.getElementsByTagName('svg')
		// }

		// const childsvg = child.tagName == 'svg' ? child : child.getElementsByTagName('svg')[0];
		// childsvg.setAttribute('height', this.constructor.h + this.constructor.margin);
		// childsvg.setAttribute('width', this.constructor.w + this.constructor.margin);

		child.objref.svg.setAttribute('height', this.constructor.h + this.constructor.margin);
		child.objref.svg.setAttribute('width', this.constructor.w + this.constructor.margin);

		this.cut_bottom = ++this.children_cnt * this.constructor.h + (this.children_cnt - 1) * this.constructor.button_spacing + this.constructor.margin;
		this.hflex.style.height = this.children_cnt * this.constructor.h + (this.children_cnt - 1) * this.constructor.button_spacing + this.constructor.margin + 'px';
		this.hflex.appendChild(child);
	}
}

class SubDropMenu extends MenuItem {
	constructor(parent, thml_text) {
		super(parent, thml_text);
		this.collapsed = true;
		this.clip_path_num = null;
		this.children_cnt = 0;

		const [cnv0x, cnv0y] = cnv.getScreenPoint([0, 0]);

		this.cut_left = this.parent.cut_right - this.constructor.margin; // ToDo: set value!
		this.cut_right = this.parent.cut_right + this.constructor.w + this.constructor.margin; // ToDo: set value!
		// console.log(this.drop_container.offsetTop);
		// (this.parent.children_cnt - 1) * this.parent.constructor.h + this.parent.constructor.button_spacing;
		this.cut_top = (this.parent.children_cnt - 1) * this.parent.constructor.h + this.parent.constructor.button_spacing - this.constructor.margin;
		this.cut_bottom = (this.parent.children_cnt - 1) * this.parent.constructor.h + this.parent.constructor.button_spacing - this.constructor.margin;
		console.log(this.cut_top, this.cut_bottom);

		this.expand = this.expand.bind(this);
		this.collapse = this.collapse.bind(this);
		this.drop_container.addEventListener('pointerenter', this.expand);
		this.drop_container.addEventListener('pointerleave', this.collapse);
	}

	static id_prefix = 'sdm';

	static margin = 2;

	static button_spacing = 0;

	static hflex_term = this.button_spacing - this.margin;

	createHtml() {
		this.drop_container = document.createElement('div');
		this.drop_container.classList.add('dropcontsubmenu');
		this.drop_container.appendChild(this.svg);
		this.drop_container.style.height = this.parent.constructor.h + 'px';
		this.drop_container.objref = this;
		this.parent.appendChild(this.drop_container);

		this.hflex = document.createElement('div');
		this.hflex.classList.add('dropflexsubmenu');
		this.hflex.style.left = this.drop_container.offsetLeft + this.parent.constructor.w + this.constructor.margin + 'px';
		this.hflex.style.top = (this.parent.children_cnt - 1) * this.parent.constructor.h + this.parent.constructor.button_spacing + 'px';
		this.drop_container.appendChild(this.hflex);
	}

	expand(event) { // eslint-disable-line no-unused-vars
		console.log(this.cut_left, this.cut_top, this.cut_right, this.cut_bottom);
		this.clip_path_num = cnv.clipRect(this.cut_left, this.cut_top, this.cut_right, this.cut_bottom);
		this.collapsed = false;
	}

	collapse(event) { // eslint-disable-line no-unused-vars
		cnv.unclip(this.clip_path_num);
		this.clip_path_num = null;
		this.collapsed = true;
	}

	appendChild(child) {
		if (this.children_cnt) this.hflex.lastChild.setAttribute('height', this.constructor.h + this.constructor.button_spacing);
		child.setAttribute('height', this.constructor.h + this.constructor.margin);
		child.setAttribute('width', this.constructor.w + this.constructor.margin);
		this.children_cnt++;
		this.cut_bottom = this.cut_top + this.children_cnt * this.constructor.h + (this.children_cnt - 1) * this.constructor.button_spacing + this.constructor.margin * 2;

		// this.drop_container.offsetTop + this.children_cnt * this.constructor.h + (this.children_cnt - 1) * this.constructor.button_spacing + this.constructor.margin;

		this.hflex.style.height = this.children_cnt * this.constructor.h + (this.children_cnt - 1) * this.constructor.button_spacing + this.constructor.margin + 'px';
		this.hflex.appendChild(child);
	}
}


export const menu_drop = new DropMenu(menu_bar, toMenuText('Drop', DropMenu.w));
export const menu_item = new MenuItem(menu_bar, toMenuText('Menu Item', MenuItem.w));
export const menu_btn = new MenuButton(menu_bar, toMenuText('Help', MenuButton.w));
export const menu_item0 = new MenuItem(menu_bar, toMenuText('Menu Item', MenuItem.w));


export const mi0 = new MenuItem(menu_drop, toMenuText('mi0', MenuItem.w));
export const submenu_btn = new MenuButton(menu_drop, toMenuText('Help', MenuButton.w));
export const menu_subdrop = new SubDropMenu(menu_drop, toMenuText('Subdrop', SubDropMenu.w));
export const mi1 = new MenuItem(menu_drop, toMenuText('mi1', MenuItem.w));
export const mi2 = new MenuItem(menu_drop, toMenuText('mi2', MenuItem.w));

export const sdi1 = new MenuItem(menu_subdrop, toMenuText('sdi1', MenuItem.w));
export const sdi2 = new MenuItem(menu_subdrop, toMenuText('sdi2', MenuItem.w));

