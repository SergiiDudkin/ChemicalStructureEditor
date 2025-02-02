import {ChemBond} from './ChemBond.js';
import {ChemNode} from './ChemNode.js';
import {editStructure, MOVE, ROTATE, SCALE, STRETCH} from './Executor.js';
import {
	styledict, styleToString, separateUnrecognized, sumFormula, hillToStr, toHillSystem, formulaToFw,
	computeElementalComposition
} from './ChemParser.js';
import {
	setAttrsSvg, makeSvg, attachSvg, DeletableAbortable, CtrRect, CtrCircle, CtrPolygon, excludeNonExisting
} from './Utils.js';
import {
	vecLen, findDist, unitVec, vecSum, vecDif, vecMul, vecDotProd, rotateVec, rotateAroundCtr, scaleAroundCtr,
	stretchAlongDir, polygonAngle, polygonEdgeCtrDist, polygonVertexCtrDist, checkIntersec
} from './Geometry.js';
import {ControlPoint, Line, Arrow} from './ControlPoint.js';
import {SENSOR} from './BaseClasses.js';


window.DEBUG = false;

var canvas = document.getElementById('canvas');
var mainframe = document.getElementById('mainframe');
var canvbckgrnd = document.getElementById('canvbckgrnd');
var matrixrf, wmax; // Variables


function indentHtml(el) {
	if (el.childElementCount) {
		el.innerHTML = '\n' + [...el.children].map(child => indentHtml(child)).join('\n')
			.replaceAll(/^/gm, '\t') + '\n';
	}
	return el.outerHTML;
}

function downloadSvg() { // Download .svg
	var svg_el = document.getElementById('canvas').cloneNode();
	svg_el.appendChild(document.getElementById('bondsall').cloneNode(true));
	svg_el.appendChild(document.getElementById('atomsall').cloneNode(true));
	svg_el.appendChild(document.getElementById('bondcutouts').cloneNode(true));
	svg_el.appendChild(document.getElementById('bondpatterns').cloneNode(true));
	var header =
`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_svg "http://www.w3.org/2000/svg">
	<!ENTITY ns_xlink "http://www.w3.org/1999/xlink">
]>
`;
	var svg_content = header + indentHtml(svg_el).replaceAll(/class=".*?"/gm, '').replaceAll(/ mask="null"/gm, '')
		.replaceAll(/ >/gm, '>');
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg_content));
	element.setAttribute('download', 'molecule.svg');
	element.click();
}
document.getElementById('download-svg').addEventListener('click', downloadSvg);

function gatherData(ids=new Set()) {
	let data = {};
	ids.forEach(id => data[id] = document.getElementById(id).objref.getData());
	return data;
}

function downloadJson() { // Download .svg
	const kwargs = {};
	selection.citizens.forEach(cls => kwargs[cls.cr_cmd_name] = gatherData(cls.getAllInstanceIDs()));
	const json_content = JSON.stringify(kwargs, null, '\t');
	const element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json_content));
	element.setAttribute('download', 'molecule.json');
	element.click();
}
document.getElementById('download-json').addEventListener('click', downloadJson);

function blankCanvasCmd() {
	const kwargs = {};
	selection.citizens.forEach(cls => kwargs[cls.del_cmd_name] = cls.getAllInstanceIDs());
	return kwargs;
}

function openJsonFile(event) {
	var file = event.target.files[0];
	if (!file) return;
	var reader = new FileReader();
	reader.addEventListener('load', event => {
		var kwargs = JSON.parse(event.target.result);
		Object.assign(kwargs, blankCanvasCmd());
		dispatcher.do(kwargs);
		refreshBondCutouts();
		selection.constructor.classes.forEach(cls => cls.setMaxIdCounter());
		document.getElementById('file-input').value = null;
	});
	reader.readAsText(file);
}
document.getElementById('open-json').addEventListener('click', () => document.getElementById('file-input').click());
document.getElementById('file-input').addEventListener('change', openJsonFile);

function eraseAll() {
	dispatcher.do(blankCanvasCmd());
}
document.getElementById('new-file').addEventListener('click', eraseAll);


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
		var mask_id = this.constructor.id_prefix + this.constructor.getBtnNum() + 'mask';
		this.svg = makeSvg('svg', {width: 36, height: 36});
		var mask = attachSvg(this.svg, 'mask', {id: mask_id, class: 'elmsk'});
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
		clipCnv(`M 0 ${this.cut_top} H ${Math.min(this.cut_right, wmax - 2)} V ${this.cut_bottom} H 0 Z`);
		this.collapsed = false;
		if (this.active) this.deselect();
	}

	collapse(event) { // eslint-disable-line no-unused-vars
		clipCnv();
		this.collapsed = true;
		if (this.active) this.select();
	}

	pressSubButton(event) {
		var new_event = new Event('click');
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

var flex_container = document.getElementsByClassName('flex-container')[0];

var elbtnseq = ['C', 'H', 'O', 'N', 'S'];

var selectbtn = new DropButton(flex_container, `
	<line style="fill:none;stroke:black;stroke-width:2;" x1="15" y1="7" x2="15" y2="23"/>
	<line style="fill:none;stroke:black;stroke-width:2;" x1="7" y1="15" x2="23" y2="15"/>
	<polygon points="3,15 7.5,10.5 7.5,19.5 "/>
	<polygon points="27,15 22.5,19.5 22.5,10.5 "/>
	<polygon points="15,27 10.5,22.5 19.5,22.5 "/>
	<polygon points="15,3 19.5,7.5 10.5,7.5 "/>
`);
var selrebtn = new SubButton(selectbtn, toBtnText('re'));
selectbtn.focusSubbtn(selrebtn);
var sellabtn = new SubButton(selectbtn, toBtnText('la'));
var selmobtn = new SubButton(selectbtn, toBtnText('mo'));


var dropelbtn = new DropButton(flex_container, `
	<line x1="15.0" y1="28.0" x2="15.0" y2="19.0" stroke="black" stroke-width="2" />
	<line x1="2.0" y1="5.5" x2="9.8" y2="10.0" stroke="black" stroke-width="2" />
	<line x1="28.0" y1="5.5" x2="20.2" y2="10.0" stroke="black" stroke-width="2" />
	<text x="15" y="15" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="16px">A</text>
`);
var elbtns = elbtnseq.map(atom => new SubButton(dropelbtn, toBtnText(atom)));
dropelbtn.focusSubbtn(elbtns[0]);
var dropbondbtn = new DropButton(flex_container, `
	<line x1="11.0" y1="19.0" x2="19.4" y2="10.6" stroke="black" stroke-width="2" />
	<text x="6.5" y="24.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="12px">C</text>
	<text x="23.5" y="7.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" 
	font-size="12px">C</text>
`);
var bondbtn = new SubButton(dropbondbtn,
	'<line x1="4.4" y1="25.6" x2="25.6" y2="4.4" stroke="black" stroke-width="2" />'
);
dropbondbtn.focusSubbtn(bondbtn);
var dbondbtn = new SubButton(dropbondbtn, `
	<line x1="5.8" y1="27.0" x2="27.0" y2="5.8" stroke="black" stroke-width="2" />
	<line x1="3.0" y1="24.2" x2="24.2" y2="3.0" stroke="black" stroke-width="2" />
`);
var upperbtn = new SubButton(dropbondbtn,
	'<polygon points="4.7,26.0 27.7,6.5 23.5,2.3 4.0,25.3" fill="black" />'
);
var lowerbtn = new SubButton(dropbondbtn, `
	<defs>
		<pattern id="low_btn_pattern" x="25.6" y="4.4" width="4" height="1" patternUnits="userSpaceOnUse" 
		patternTransform="rotate(135)">
			<rect x="0" y="0" width="2" height="1" fill="black" />
		</pattern>
	</defs>
	<polygon points="4.7,26.0 27.7,6.5 23.5,2.3 4.0,25.3" fill="url(#low_btn_pattern)" />
`);
var delbtn = new RegularButton(flex_container, `
	<path style="fill:none;stroke:black;stroke-width:2;" d="M2.5,19.6c-0.7-0.7-0.7-0.7,0-1.4L18.1,2.6c0.7-0.7,0.7-0.7,
	1.4,0l7.8,7.8c0.7,0.7,0.7,0.7,0,1.4L15.6,23.5c-3.2,3.2-6,3.2-9.2,0L2.5,19.6z"/>
	<rect x="12.7" y="4.8" transform="matrix(0.7072 0.7071 -0.7071 0.7072 13.2169 -10.3978)" width="13" height="12"/>
`);
var textbtn = new RegularButton(flex_container, `
	<path d=" M 22 6.8 V 23.2 M 18 5 H 20 A 2 2 0 0 1 22 7 A 2 2 0 0 1 24 5 H 26 M 18 25 H 20 A 2 2 0 0 0 22 23 A 2 2 
	0 0 0 24 25 H 26" stroke="black" stroke-width="1.5" />
	<text x="12" y="17.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Serif" 
	font-size="20px">T</text>
`);
var dropcycbtn = new DropButton(flex_container, `
	<polygon points="28.8,15.0 23.6,25.8 11.9,28.5 2.5,21.0 2.5,9.0 11.9,1.5 23.6,4.2" fill="black" />
	<polygon points="15.0,25.2 5.3,18.2 9.0,6.7 21.0,6.7 24.7,18.2" fill="white" />
`);
var benzenebtn = new SubButton(dropcycbtn, `
	<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" 
	fill="none" />
	<line x1="15.0" y1="22.0" x2="8.9" y2="18.5" stroke="black" stroke-width="2" />
	<line x1="8.9" y1="11.5" x2="15.0" y2="8.0" stroke="black" stroke-width="2" />
	<line x1="21.1" y1="11.5" x2="21.1" y2="18.5" stroke="black" stroke-width="2" />
`);
dropcycbtn.focusSubbtn(benzenebtn);
var pentagonbtn = new SubButton(dropcycbtn,
	'<polygon points="15.0,24.4 6.1,17.9 9.5,7.4 20.5,7.4 23.9,17.9" stroke="black" stroke-width="2" fill="none" />'
);
var hexagonbtn = new SubButton(dropcycbtn,
	`<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" 
	fill="none" />`
);
var heptagonbtn = new SubButton(dropcycbtn,
	`<polygon points="15.0,27.7 5.1,22.9 2.6,12.2 9.5,3.6 20.5,3.6 27.4,12.2 24.9,22.9" stroke="black" stroke-width="2"
	fill="none" />`
);
var linebtn = new RegularButton(flex_container, toBtnText('li'));
var arrowbtn = new RegularButton(flex_container, toBtnText('ar'));


var cnvclippath = document.getElementById('cnvclippath');
function clipCnv(extra='') {
	cnvclippath.setAttribute('d', `M 0 0 H ${wmax - 2} V 564 H 0 Z ${extra}`);
}

// Resize the canvas
function svgWidth(event) { // eslint-disable-line no-unused-vars
	wmax = mainframe.offsetWidth - 36;
	canvbckgrnd.setAttribute("width", wmax);
	canvas.setAttribute("width", wmax + 4);
	clipCnv();
	matrixrf = canvas.getScreenCTM().inverse();
}
svgWidth();
window.addEventListener('resize', svgWidth);
window.addEventListener('scroll', () => matrixrf = canvas.getScreenCTM().inverse());


const transform_inverts = Object.freeze({
	[MOVE]: ({moving_vec}) => ({moving_vec: vecMul(moving_vec, -1)}),
	[ROTATE]: ({rot_angle, rot_ctr}) => ({rot_angle: -rot_angle, rot_ctr: rot_ctr.slice()}),
	[SCALE]: ({scale_factor, scale_ctr}) => ({scale_factor: 1 / scale_factor, scale_ctr: scale_ctr.slice()}),
	[STRETCH]: ({stretch_factor, dir_angle, stretch_ctr}) => ({stretch_factor: 1 / stretch_factor, dir_angle: dir_angle + Math.PI, stretch_ctr: stretch_ctr.slice()})
});

function invertCmd(kwargs_dir) {
	let kwargs_rev = {};

	// Chem inverts
	kwargs_rev.new_atoms_data = gatherData(kwargs_dir.del_atoms);
	kwargs_rev.new_bonds_data = gatherData(kwargs_dir.del_bonds);
	if (kwargs_dir.new_atoms_data) kwargs_rev.del_atoms = new Set(Object.keys(kwargs_dir.new_atoms_data));
	if (kwargs_dir.new_bonds_data) kwargs_rev.del_bonds = new Set(Object.keys(kwargs_dir.new_bonds_data));
	if (kwargs_dir.atoms_text) kwargs_rev.atoms_text = Object.fromEntries(Object.keys(kwargs_dir.atoms_text).map(
		id => [id, document.getElementById(id).objref.text]
	));
	if (kwargs_dir.bonds_type) kwargs_rev.bonds_type = Object.fromEntries(Object.keys(kwargs_dir.bonds_type).map(
		id => [id, document.getElementById(id).objref.type]
	));

	// Shape inverts
	kwargs_rev.new_lines_data = gatherData(kwargs_dir.del_lines);
	kwargs_rev.new_arrows_data = gatherData(kwargs_dir.del_arrows);
	if (kwargs_dir.new_lines_data) kwargs_rev.del_lines = new Set(Object.keys(kwargs_dir.new_lines_data));
	if (kwargs_dir.new_arrows_data) kwargs_rev.del_arrows = new Set(Object.keys(kwargs_dir.new_arrows_data));

	// Common transforms
	if (kwargs_dir.transforms) {
		kwargs_rev.transforms = kwargs_dir.transforms.toReversed().map(([type, ids, params]) => [type, new Set(ids), transform_inverts[type](params)]);
	}

	return kwargs_rev;
}


class Dispatcher {
	constructor(executor, inverter, postaction = () => void 0, callback = (cmd, is_undo) => void 0) {
		this.commands = [];
		this.ptr = 0;
		this.executor = executor;
		this.inverter = inverter;
		this.postaction = postaction;
		this.callback = callback;
		document.addEventListener('keydown', event => this.keyHandler(event));
	}

	addCmd(args_dir, args_rev) {
		this.commands = this.commands.slice(0, this.ptr); // Delete extra commands
		this.commands.push([args_dir, args_rev]); // Add new command to the history
		this.ptr++;
	}

	do(kwargs_dir) {
		const kwargs_rev = this.inverter(kwargs_dir);
		this.executor(kwargs_dir);
		this.addCmd(kwargs_dir, kwargs_rev);
	}

	redo() {
		if (this.ptr >= this.commands.length) return;
		let args_rev = this.commands[this.ptr++][0]; // Fetch command
		this.executor(args_rev); // Execute the given function with args
		selection.undoRedo(args_rev, false);
	}

	undo() {
		if (this.ptr <= 0) return;
		const args_dir = this.commands[--this.ptr][1]; // Fetch command
		this.executor(args_dir); // Execute the given function with args
		selection.undoRedo(args_dir, true);
	}

	keyHandler(event) {
		if ((event.ctrlKey || event.metaKey) && !event.repeat) {
			var to_redo = event.key == 'y' || event.key == 'Z' || (event.key == 'z' && event.shiftKey);
			var to_undo = event.key == 'z' && !event.shiftKey;
			if (to_redo) this.redo();
			if (to_undo) this.undo();
			if (to_undo || to_redo) this.postaction();
		}
	}
}

var dispatcher = new Dispatcher(editStructure, invertCmd, refreshBondCutouts);


function getSvgPoint(event) {
	var {x, y} = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrixrf);
	return [x, y];
}

function getScreenPoint([svg_x, svg_y]) {
	var {x, y} = new DOMPoint(svg_x, svg_y).matrixTransform(matrixrf.inverse());
	return [x, y];
}

function clampToCnv([x, y]) {
	return [Math.min(Math.max(x, 0), wmax), Math.min(Math.max(y, 0), 564)];
}

function getCursorAtom(event, atomtext) {
	var cursoratom = new ChemNode('cursoratom', ...clampToCnv(getSvgPoint(event)), '@' + atomtext);
	cursoratom.parse();
	cursoratom.renderText();
	cursoratom.eventsOff();
	return cursoratom;
}

var standard_bondlength = 40;

function discreteAngle(angle, discr_deg) {
	const discr_rad = discr_deg * Math.PI / 180;
	return Math.round(angle / discr_rad) * discr_rad;
}

function getDiscreteBondEnd(pt0, [x, y], len=standard_bondlength) {
	var angle = discreteAngle(Math.atan2(y, x), 15);
	return vecSum(pt0, vecMul([Math.cos(angle), Math.sin(angle)], len));
}

function pickNodePoint(event) {
	var node = event.target.is_atom ? event.target.objref : null;
	var pt = node ? node.xy : getSvgPoint(event);
	return [pt, node];
}

function pickNode(pt) {
	var pt_elem = document.elementFromPoint(...getScreenPoint(pt));
	return (pt_elem != null && pt_elem.is_atom) ? pt_elem.objref : null;
}

function getBondEnd(event, pt0) {
	var [pt1, node1] = pickNodePoint(event);
	var difxy = vecDif(pt0, pt1);
	if (vecLen(difxy) < 16) return [null, null];
	if (!node1) {
		pt1 = getDiscreteBondEnd(pt0, difxy);
		node1 = pickNode(pt1);
		pt1 = node1 ? node1.xy : pt1;
	}
	return [pt1, node1];
}

function pickMol(chemobj) {
	let [atoms, bonds] = iterMolDft(chemobj instanceof ChemNode ? chemobj : chemobj.nodes[0])
	return {atoms: atoms, bonds: bonds};
}

function iterMolDft(node, atoms=new Set(), bonds=new Set()) {
	atoms.add(node.id);
	for (const bond of node.connections) {
		var next_node = bond.nodes.filter(item => item != node)[0];
		bonds.add(bond.id);
		if (!atoms.has(next_node.id)) iterMolDft(next_node, atoms, bonds);
	}
	return [atoms, bonds];
}


function detectIntersec(exclude=[]) {
	var intersections = [];
	var bond_group = Array.from(document.getElementById('sensors_b').children).map(el => el.objref).filter(bond =>
		!exclude.includes(bond.id));
	bond_group.sort((a, b) => a.min_x < b.min_x ? -1 : 1);
	for (const [i, bond0] of Object.entries(bond_group)) {
		var j = parseInt(i);
		var bond1 = bond_group[++j];
		while (j < bond_group.length && bond1.min_x < bond0.max_x) {
			if (bond1.min_y < bond0.max_y && bond0.min_y < bond1.max_y &&
				checkIntersec(...[...bond0.nodes, ...bond1.nodes].map(node => node.xy))
			) intersections.push([bond0.id, bond1.id].sort((a, b) => parseInt(a.slice(1)) -
				parseInt(b.slice(1))).join('&'));
			bond1 = bond_group[++j];
		}
	}
	return intersections;
}

function getCutouts() {
	var old_masks = [];
	for (const mask of [...document.getElementById('bondcutouts').children]) {
		for (const polygon of [...mask.children]) {
			if (polygon.tagName != 'polygon') continue;
			old_masks.push(mask.id.slice(1) + '&' + polygon.classList[0].slice(1));
		}
	}
	return old_masks;
}

function refreshBondCutouts(exclude=[]) {
	var lower_bond, upper_bond;
	var set_new = new Set(detectIntersec(exclude));
	var set_old = new Set(getCutouts());

	// Add masks
	var masks_to_add = [...set_new].filter(new_mask => !set_old.has(new_mask));
	for (const mask of masks_to_add) {
		[lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
		lower_bond.createSubmask(upper_bond);
	}

	// Remove masks
	var masks_to_remove = [...set_old].filter(old_mask => !set_new.has(old_mask));
	for (const mask of masks_to_remove) {
		[lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
		lower_bond.deleteSubmask(upper_bond);
	}
}


function chemNodeHandler(elbtn) {
	var node0, pt0, cursoratom, atomtext, old_atomtext, new_atomtext, new_node0id, new_node1id, new_bond_id,
		node0_is_new, node0_id;
	elbtn.mask_g.addEventListener('click', crElem);

	function crElem(event) { // Turn on creating of a new atom. Called when a chemical element button is clicked.
		elbtn.selectCond();
		atomtext = event.currentTarget.objref.img.firstChild.textContent;
		cursoratom = getCursorAtom(event, atomtext);
		window.addEventListener('mousemove', movElem);
		window.addEventListener('mousedown', setElem);
	}

	function movElem(event) { // Move cursor atom
		cursoratom.setCtr(clampToCnv(getSvgPoint(event)));
	}

	function setElem(event) { // Create a new atom
		var kwargs;
		new_node0id = ChemNode.getNewId();
		new_node1id = ChemNode.getNewId();
		new_bond_id = ChemBond.getNewId();
		if (canvas.contains(event.target)) { // Click inside the canvas
			[pt0, node0] = pickNodePoint(event);
			if (node0) { // If some atom was clicked
				if (node0.connections.length == 0 && (node0.text == atomtext ||
					(node0.text == '' && atomtext == 'C'))) {
					kwargs = {del_atoms: new Set([node0.id])};
					dispatcher.do(kwargs);
					return;
				}
				old_atomtext = node0.text;
				new_atomtext = old_atomtext == atomtext ? '' : atomtext;
				node0_is_new = false;
				node0_id = node0.id;
			}
			else { // If blanc space was clicked
				old_atomtext = atomtext;
				new_atomtext = atomtext;
				node0_is_new = true;
				node0_id = new_node0id;
				kwargs = {new_atoms_data: {[new_node0id]: [...pt0, new_atomtext]}};
				dispatcher.do(kwargs);
			}
			dispatcher.do({});
			movBoundNode(event);
			document.styleSheets[0].cssRules[0].selectorText = `${'#' + new_node1id}:hover`;
			document.styleSheets[0].cssRules[1].selectorText = `${'#' + new_bond_id}:hover`;
			window.addEventListener('mousemove', movBoundNode);
			window.addEventListener('mouseup', finNode);
		}
		else { // Click outside the canvas
			window.removeEventListener('mousedown', setElem);
			window.removeEventListener('mousemove', movElem);
			cursoratom.delete();
			elbtn.deselectCond(event);
		}
	}

	function movBoundNode(event) { // Create extra bond and atom, if the cursor was moved far from the click point
		dispatcher.undo();
		var kwargs = {};
		var difxy = vecDif(pt0, getSvgPoint(event));
		if (vecLen(difxy) >= 16) {
			kwargs.new_atoms_data = {[new_node1id]: [...getDiscreteBondEnd(pt0, difxy), atomtext]};
			kwargs.new_bonds_data = {[new_bond_id]: [node0_id, new_node1id, 1]};
			if (!node0_is_new) kwargs.atoms_text = {[node0_id]: old_atomtext};
		}
		else kwargs.atoms_text = {[node0_id]: new_atomtext};
		dispatcher.do(kwargs);
	}

	// eslint-disable-next-line no-unused-vars
	function finNode(event) { // Finish to set node
		window.removeEventListener('mouseup', finNode);
		window.removeEventListener('mousemove', movBoundNode);
		if (document.getElementById(new_bond_id) === null && node0_is_new) dispatcher.undo();
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		refreshBondCutouts();
		window.addEventListener('mousemove', movElem);
	}
}


function chemBondHandler(btn, init_type, rotation_schema) {
	var node0, pt0, new_node0id, new_node1id, new_bond_id, node0id;
	btn.mask_g.addEventListener('click', crBond);

	// eslint-disable-next-line no-unused-vars
	function crBond(event) { // Create bond. Called when the bond button is cklicked.
		btn.selectCond();
		window.addEventListener('mousedown', stBond);
	}

	function stBond(event) { // Start drawing bond. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Bond starts within the canvas. Continue drawing.
			if (event.target.is_bond) { // If an existing bond was clicked, change its multiplicity
				var focobj = event.target.objref;
				var kwargs = {bonds_type: {[focobj.id]: focobj.getNextType(rotation_schema)}};
				dispatcher.do(kwargs);
				refreshBondCutouts();
			}
			else { // If blank space or a chem node was clicked, start drawing a new bond
				[pt0, node0] = pickNodePoint(event);
				new_node0id = ChemNode.getNewId();
				new_node1id = ChemNode.getNewId();
				new_bond_id = ChemBond.getNewId();
				node0id = node0 ? node0.id : new_node0id;
				var node_selectors = [new_node0id, new_node1id].map(id => '#' + id).join();
				document.styleSheets[0].cssRules[0].selectorText = `:is(${node_selectors}):hover`;
				document.styleSheets[0].cssRules[1].selectorText = `${'#' + new_bond_id}:hover`;
				window.addEventListener('mousemove', movBond);
				window.addEventListener('mouseup', enBond);
			}
		}
		else { // Bond starts outside of canvas. Exit drawing.
			window.removeEventListener('mousemove', movBond);
			window.removeEventListener('mousedown', stBond);
			btn.deselectCond(event);
		}
	}

	function movBond(event) { // Move second end of the drawn bond
		if (document.getElementById(new_bond_id) !== null) dispatcher.undo();
		var [pt1, node1] = getBondEnd(event, pt0);
		var node1id = node1 ? node1.id : new_node1id;
		if (pt1 !== null) {
			var new_atoms_data = {};
			if (node0id == new_node0id) new_atoms_data[node0id] = [...pt0, ''];
			if (node1id == new_node1id) new_atoms_data[node1id] = [...pt1, ''];
			var kwargs = {
				new_atoms_data: new_atoms_data,
				new_bonds_data: {[new_bond_id]: [node0id, node1id, init_type]}
			};
			dispatcher.do(kwargs);
		}
	}

	// eslint-disable-next-line no-unused-vars
	function enBond(event) { // Finish drawing bond
		window.removeEventListener('mouseup', enBond);
		window.removeEventListener('mousemove', movBond);
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		refreshBondCutouts();
	}
}


function deleteHandler(delbtn) {
	delbtn.mask_g.addEventListener('click', delNodeOrBond);

	// eslint-disable-next-line no-unused-vars
	function delNodeOrBond(event) { // Delete atom or bond. Called when del button is pressed.
		delbtn.selectCond();
		window.addEventListener('mousedown', delAct);
	}

	function delAct(event) { // When mouse button is down
		if (canvas.contains(event.target)) {
			erase(event);
			canvas.addEventListener('mousemove', erase);
			window.addEventListener('mouseup', delStop);
		}
		else { // If click out of canvas,
			window.removeEventListener('mousedown', delAct); // exit deleting routine.
			delbtn.deselectCond(event);
		}
	}

	function erase(event) { // Active eraser
		var kwargs;
		if (event.target.is_atom || event.target.is_bond || event.target.is_line) {
			var focobj = event.target.objref;
			let focobj_cls = focobj.constructor;
			if (focobj_cls == ChemNode) kwargs = {
				del_atoms: new Set([focobj.id]),
				del_bonds: new Set(focobj.connections.map(bond => bond.id))
			};
			else if (focobj_cls == ChemBond) kwargs = {del_bonds: new Set([focobj.id])};
			else if (focobj_cls == Line) kwargs = {del_lines: new Set([focobj.id])};
			dispatcher.do(kwargs);
			refreshBondCutouts();
		}
	}

	function delStop() {
		canvas.removeEventListener('mousemove', erase);
		window.removeEventListener('mouseup', delStop);
	}
}


function textHandler(textbtn) {
	var pt, node;
	textbtn.mask_g.addEventListener('click', crText);

	function pressEnter(event) {
		if (event.key == 'Enter') setNodeText(event);
	}

	function crText(event) { // eslint-disable-line no-unused-vars
		textbtn.selectCond();
		window.addEventListener('mousedown', addInput);
		document.addEventListener('keydown', pressEnter);
	}

	function setNodeText() {
		var old_input = document.getElementById('txt-input');
		if (old_input) {
			var kwargs = {atoms_text: {[node.id]: (old_input.value ? '@' : '') + old_input.value}};
			dispatcher.do(kwargs);
			old_input.remove();
		}
	}

	function addInput(event) {
		setNodeText();
		if (canvas.contains(event.target)) { // Click inside the canvas
			[pt, node] = pickNodePoint(event);
			if (node) { // If some atom was clicked
				var [left, top] = getScreenPoint(pt);
				var input = document.createElement('input');
				input.setAttribute('id', 'txt-input');
				input.setAttribute('type', 'text');
				input.setAttribute('size', '10');
				input.setAttribute('value', node.text.replace(/^@/, ''));
				input.style.setProperty('top', `${top + window.scrollY}px`);
				input.style.setProperty('left', `${left + window.scrollX}px`);
				input.style.setProperty('color', styledict.fill);
				input.style.setProperty('font-family', styledict['font-family']);
				input.style.setProperty('font-size', styledict['font-size']);
				document.getElementById('canvas-container').appendChild(input);
				window.setTimeout(() => input.focus(), 0);
			}
		}
		else { // Click outside the canvas
			if (event.target.id != 'txt-input') {
				window.removeEventListener('mousedown', addInput);
				document.removeEventListener('keydown', pressEnter);
				textbtn.deselectCond(event);
			}
		}
	}
}


function polygonHandler(polygonbtn, num, alternate=false) {
	function generateIds() {
		var node_ids = Array.from({length: num}, () => ChemNode.getNewId());
		var bond_ids = Array.from({length: num}, () => ChemBond.getNewId());
		return [node_ids, bond_ids];
	}

	var [cur_node_ids, cur_bond_ids] = generateIds();
	var node, mo_st, common_bond, common_node, new_node_ids, new_bond_ids;
	var prev_ctr = [,,];
	var vertex_angle = polygonAngle(num);
	var rot_angle = Math.PI * 2 / num;
	var pvcd = polygonVertexCtrDist(vertex_angle, standard_bondlength);
	var pecd = polygonEdgeCtrDist(vertex_angle, standard_bondlength);

	polygonbtn.mask_g.addEventListener('click', crPolygon);

	function crPolygon(event) {
		polygonbtn.selectCond();
		mo_st = getSvgPoint(event);
		var [cur_atoms_data, cur_bonds_data] = generatePolygon(mo_st, [0, pvcd], cur_node_ids, cur_bond_ids);
		editStructure({new_atoms_data: cur_atoms_data, new_bonds_data: cur_bonds_data});
		window.addEventListener('mousemove', movPolygon);
		window.addEventListener('mousedown', setPolygon);
	}

	function movPolygon(event) { // Move cursor polygon
		var pt = getSvgPoint(event);
		var moving_vec = vecDif(mo_st, pt);
		mo_st = pt;
		editStructure({transforms: [[MOVE, new Set(cur_node_ids), {moving_vec: moving_vec}]]});
	}

	function setPolygon(event) { // Move cursor polygon
		[new_node_ids, new_bond_ids] = generateIds();
		if (canvas.contains(event.target)) { // Click inside the canvas
			var [pt, node] = pickNodePoint(event);
			if (node) {
				stopCursor();
				common_node = node;
				dispatcher.do({});
				rotatePolygon(event);
				window.addEventListener('mousemove', rotatePolygon);
				window.addEventListener('mouseup', appendPolygon);
			}
			else if (event.target.is_bond) { // Some bond was clicked
				stopCursor();
				common_bond = event.target.objref;
				dispatcher.do({});
				flipPolygon(event);
				window.addEventListener('mousemove', flipPolygon);
				window.addEventListener('mouseup', appendPolygon);
			}
			else { // Neither node nor bond was clicked
				var vec0 = vecDif(pt, document.getElementById(cur_node_ids[0]).objref.xy);
				var [new_atoms_data, new_bonds_data] = generatePolygon(pt, vec0, new_node_ids, new_bond_ids);
				var kwargs = {new_atoms_data: new_atoms_data, new_bonds_data: new_bonds_data};
				dispatcher.do(kwargs);
				refreshBondCutouts(cur_bond_ids);
			}
		}
		else { // Click outside the canvas
			stopCursor();
			polygonbtn.deselectCond(event);
		}
	}

	function flipPolygon(event) {
		var ortho_proj = vecDotProd(common_bond.ouva, vecDif(common_bond.xy, getSvgPoint(event)));
		var dir = Math.sign(ortho_proj);
		dir = dir ? dir : 1;
		var ctr = vecSum(common_bond.xy, vecMul(common_bond.ouva, pecd * dir));

		if (ctr[0] == prev_ctr[0] && ctr[1] == prev_ctr[1]) return; // Compare old and current
		prev_ctr = ctr.slice();
		dispatcher.undo();

		var vec0 = rotateVec(vecMul(common_bond.ouva, -pvcd * dir), -rot_angle / 2);
		var [new_atoms_data, new_bonds_data] = generatePolygon(ctr, vec0, new_node_ids, new_bond_ids);

		var node_map = nodeMapInit(new_node_ids);
		var [node0_id, node1_id] = (dir == 1 ? [0, 1] : [1, 0]).map(i => common_bond.nodes[i].id);
		node_map[0].orig_id = node0_id;
		node_map[1].orig_id = node1_id;
		fuseRing(new_atoms_data, new_bonds_data, node_map);
	}

	function rotatePolygon(event) {
		var difxy = vecDif(common_node.xy, getSvgPoint(event));
		var ctr = getDiscreteBondEnd(common_node.xy, difxy, pvcd);

		if (ctr[0] == prev_ctr[0] && ctr[1] == prev_ctr[1]) return; // Compare old and current
		prev_ctr = ctr.slice();
		dispatcher.undo();

		var vec0 = vecDif(ctr, common_node.xy);
		var [new_atoms_data, new_bonds_data] = generatePolygon(ctr, vec0, new_node_ids, new_bond_ids);

		var node_map = nodeMapInit(new_node_ids);
		node_map[0].orig_id = common_node.id;
		fuseRing(new_atoms_data, new_bonds_data, node_map);
	}

	function appendPolygon(event) {
		window.removeEventListener('mousemove', flipPolygon);
		window.removeEventListener('mousemove', rotatePolygon);
		window.removeEventListener('mouseup', appendPolygon);
		refreshBondCutouts();
		crPolygon(event);
		prev_ctr = [,,];
	}

	function stopCursor() {
		window.removeEventListener('mousedown', setPolygon);
		window.removeEventListener('mousemove', movPolygon);
		editStructure({del_atoms: new Set(cur_node_ids), del_bonds: new Set(cur_bond_ids)});
	}

	function generatePolygon(ctr, vec0, node_ids, bond_ids) {
		var new_atoms_data = node_ids.reduce(
			(a, v, i) => ({...a, [v]: [...vecSum(ctr, rotateVec(vec0, rot_angle * i)), '']}), {}
		);
		var new_bonds_data = bond_ids.reduce(
			(a, v, i) => ({...a, [v]: [node_ids[i], node_ids[(i + 1) % num], 1 + 9 * alternate * (1 - i % 2)]}), {}
		);
		return [new_atoms_data, new_bonds_data];
	}

	// ToDo: Create check-up of empty (no effect) kwargs. Do not save it in the stack.

	function nodeMapInit(new_node_ids) {
		return new_node_ids.map(node_id => ({ring_id: node_id, orig_id: node_id, non_sp3: false}));
	}

	function fuseRing(new_atoms_data, new_bonds_data, node_map={}) {
		for (const pair of node_map) {
			const {ring_id, orig_id} = pair;
			if (ring_id == orig_id) {
				node = pickNode(new_atoms_data[ring_id].slice(0, 2));
				if (node) pair.orig_id = node.id; // ToDo: Consider extra condition in case of new heteroatom.
			}
		}

		var node_pairs = {};
		for (const {ring_id, orig_id} of node_map) {
			if (ring_id != orig_id) {
				node_pairs[ring_id] = orig_id;
				delete new_atoms_data[ring_id];
			}
		}

		var non_sp3_ring = new Set();
		for (const [id, data] of Object.entries(new_bonds_data)) {
			if (ChemBond.mult[data[2]] >= 2) {
				non_sp3_ring.add(data[0]);
				non_sp3_ring.add(data[1]);
			}
		}

		var bonds_type = {};
		var casted_types = {};
		for (const [id, data] of Object.entries(new_bonds_data)) {
			let is_pseudo_double = non_sp3_ring.has(data[0]) && non_sp3_ring.has(data[1])
			for (let i = 0; i < 2; i++) {
				if (data[i] in node_pairs) data[i] = node_pairs[data[i]]; // Replace new node id with the existing one
			}
			let node_els = data.slice(0, 2).map(node_id => document.getElementById(node_id));
			if (node_els.every(Boolean)) {
				var nodes = node_els.map(node_el => node_el.objref);
				var [node0, node1] = nodes;
				var old_bond = node0.getBondsBetween(node1)[0];
				if (old_bond) {
					delete new_bonds_data[id];
					var new_type_casted = old_bond.getNodeIdx(node0) ? 8 : 10;
					if (is_pseudo_double && 
						old_bond.type != new_type_casted && 
						ChemBond.auto_d_bonds.includes(old_bond.type)
					) bonds_type[old_bond.id] = new_type_casted;
					var both_sp3 = nodes.every(node => node.hasNoMultBonds());
					if (both_sp3) casted_types[id] = {old_bond_id: old_bond.id, new_type: new_type_casted};
				}
			}
		}

		for (const pair of node_map) {
			const {ring_id, orig_id} = pair;
			if (non_sp3_ring.has(ring_id) &&
				(ring_id == orig_id || document.getElementById(orig_id).objref.hasNoMultBonds())
			) pair.non_sp3 = true;
		}

		for (let i = 0; i < num; i++) { // Set starting position
			if (node_map[0].non_sp3 && !node_map[num-1].non_sp3) break;
			node_map.push(node_map.shift());
			new_bond_ids.push(new_bond_ids.shift());
		}

		for (var j = 0; j < num; j++) { // Consume free non_sp3 nodes for double bonds
			let j1p = (j + 1) % num;
			let is_double = node_map[j].non_sp3 && node_map[j1p].non_sp3;
			let bond_id = new_bond_ids[j];
			if (is_double) {
				node_map[j].non_sp3 = false;
				node_map[j1p].non_sp3 = false;
				if (bond_id in casted_types) {
					let {old_bond_id, new_type} = casted_types[bond_id];
					bonds_type[old_bond_id] = new_type;
				}
			}
			if (bond_id in new_bonds_data) {
				new_bonds_data[bond_id][2] = is_double ? 10 : 1;
			}
		}

		var kwargs = {new_atoms_data: new_atoms_data, new_bonds_data: new_bonds_data, bonds_type: bonds_type};
		dispatcher.do(kwargs);
	}
}


function lineHandler(btn, LineClass, attr_name) {
	var pt0, new_line_id, new_cp0_id, new_cp1_id;
	btn.mask_g.addEventListener('click', crLine);

	// eslint-disable-next-line no-unused-vars
	function crLine(event) { // Create line. Called when the line button is cklicked.
		btn.selectCond();
		window.addEventListener('mousedown', stLine);
	}

	function stLine(event) { // Start drawing line. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Line starts within the canvas. Continue drawing.
			pt0 = getSvgPoint(event);
			new_line_id = LineClass.getNewId();
			new_cp0_id = ControlPoint.getNewId();
			new_cp1_id = ControlPoint.getNewId();
			window.addEventListener('mousemove', movLine);
			window.addEventListener('mouseup', enLine);
		}
		else { // Line starts outside of canvas. Exit drawing.
			window.removeEventListener('mousemove', movLine);
			window.removeEventListener('mousedown', stLine);
			btn.deselectCond(event);
		}
	}

	function movLine(event) { // Move second end of the drawn bond
		if (document.getElementById(new_line_id) !== null) dispatcher.undo();
		let pt1 = getSvgPoint(event);
		let kwargs = {[attr_name]: {[new_line_id]: [[[new_cp0_id, ...pt0], [new_cp1_id, ...pt1]]]}};
		dispatcher.do(kwargs);
		document.getElementById(new_line_id).objref.eventsOff();
	}

	// eslint-disable-next-line no-unused-vars
	function enLine(event) { // Finish drawing bond
		window.removeEventListener('mouseup', enLine);
		window.removeEventListener('mousemove', movLine);
		document.getElementById(new_line_id).objref.eventsOn();
	}
}


function transformHandler(btn, SelectTool=null) {
	var sensors_a = document.getElementById('sensors_a');
	var sensors_b = document.getElementById('sensors_b');
	var sensors_l = document.getElementById('sensors_l');
	var sensors_r = document.getElementById('sensors_r');
	var control_points = document.getElementById('control_points');
	btn.mask_g.addEventListener('click', selectInit);

	function selectInit(event) { // eslint-disable-line no-unused-vars
		btn.selectCond();
		canvas.addEventListener('mousedown', selectAct);
		sensors_a.addEventListener('mousedown', pick);
		sensors_b.addEventListener('mousedown', pick);
		sensors_l.addEventListener('mousedown', pick);
		sensors_r.addEventListener('mousedown', pick);
		control_points.addEventListener('mousedown', pick);
		window.addEventListener('mousedown', exit);
	}

	function selectAct(event) { // Click on canvas
		event.stopPropagation();
		selection.deactivate();
		if (SelectTool) new SelectTool('utils');
	}

	function pick(event) {
		event.stopPropagation();
		selection.deactivate();
		let target = event.target;
		let picked_obj = target.objref;
		if (SelectTool || target.is_shape) {
			selection.setSelectedItem(picked_obj);
		}
		else if (target.is_chem) {
			selection.activateFromIds(pickMol(picked_obj));
		}
		selection.startMoving(event);
	}

	function exit(event) {
		canvas.removeEventListener('mousedown', selectAct);
		sensors_a.removeEventListener('mousedown', pick);
		sensors_b.removeEventListener('mousedown', pick);
		sensors_l.removeEventListener('mousedown', pick);
		sensors_r.removeEventListener('mousedown', pick);
		control_points.removeEventListener('mousedown', pick);
		window.removeEventListener('mousedown', exit);
		selection.deactivate();
		btn.deselectCond(event);
	}
}


class SelectShape extends DeletableAbortable {
	// Abstract class
	constructor(parent_id) {
		super();
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
		selection.activateFromShape(this.shape);
		this.delete();
	}

	delete() {
		this.shape.remove();
		super.delete();
	}
}


class SelectRect extends SelectShape {
	constructor(parent_id) {
		super(parent_id);
		this.svg_pt0 = getSvgPoint(event);
		this.recalc(event);
	}

	static tag = 'rect';

	recalc(event) {
		var svg_pt1 = getSvgPoint(event);
		var rect_x = Math.min(this.svg_pt0[0], svg_pt1[0]);
		var rect_y = Math.min(this.svg_pt0[1], svg_pt1[1]);
		var rect_w = Math.abs(svg_pt1[0] - this.svg_pt0[0]);
		var rect_h = Math.abs(svg_pt1[1] - this.svg_pt0[1]);
		setAttrsSvg(this.shape, {x: rect_x, y: rect_y, width: rect_w, height: rect_h});
	}
}


class SelectLasso extends SelectShape {
	constructor(parent_id) {
		super(parent_id);
		this.shape.setAttribute('fill-rule', 'evenodd');
		this.pts = [getSvgPoint(event)];
		this.recalc(event);
	}

	static tag = 'polygon';

	recalc(event) {
		var pt = getSvgPoint(event);
		if (findDist(this.pts[this.pts.length - 1], pt) > 4) {
			this.pts.push(pt);
			this.shape.setAttribute('points', this.pts.map(pt => pt.join()).join(' '));
		}
	}
}


class SelectionBase {
	constructor(dispatcher) {
		this.highlights = document.getElementById('selecthighlight');
		this.transform_tool = null;
		this.bottom_ptr = Infinity;
		this.clipboard = null;
		this.dispatcher = dispatcher;
		dispatcher.callback = this.undoRedo;

		this.citizens = this.constructor.classes.filter(cls => cls.citizen);
		this.attrs = this.constructor.classes.map(cls => cls.name);

		for (const attr of this.attrs) {
			this[`#${attr}`] = new Set();
			Object.defineProperty(this, attr, {
				get() {
					return excludeNonExisting(this[`#${attr}`]);
				},
				set(new_value) {
					this[`#${attr}`] = new Set(new_value);
				}
			});
		}

		for (const [key, val] of Object.entries(this.constructor.event_handlers)) {
			this[key] = this[key].bind(this);
			if (val) document.addEventListener(val, this[key]);
		}
	}

	static classes = [];

	static event_handlers = {
		keyDownHandler: 'keydown',
		copy: 'copy',
		cut: 'cut',
		paste: 'paste',
		startMoving: null,
		moving: null,
		finishMoving: null,
		deactivate: null
	}

	static objsUnderShape(parent, covering_shape) {
		return [...parent.children].map(el => el.objref)
			.filter(el => document.elementFromPoint(...getScreenPoint(el.xy)) == covering_shape);
	}

	get selected_collections() {
		return this.citizens.map(citizen => this[citizen.name]);
	}

	activateFromShape(covering_shape) {
		this.selectFromShape(covering_shape);
		this.activate();
	}

	subSelect() {} // Helper

	selectFromShape(covering_shape) {
		for (const {name, parents} of this.citizens) {
			this[name] = this.constructor.objsUnderShape(parents[SENSOR], covering_shape).map(item => item.id);
		}
		this.subSelect();
	}

	activateFromIds(grouped_ids) {
		Object.entries(grouped_ids).forEach(([group, ids]) => this[group] = ids);
		this.subSelect();
		this.activate();
	}

	activate() {
		this.highlight();
		this.addTransformTool();
		if (this.highlights.hasChildNodes()) this.highlights.addEventListener('mousedown', this.startMoving);
	}

	addTransformTool() {
		if (this.highlights.hasChildNodes()) {
			var margin = 6;
			var bbox = this.highlights.getBBox();
			var width = bbox.width + margin * 2;
			var height = bbox.height + margin * 2;
			var cx = bbox.x - margin + width / 2;
			var cy = bbox.y - margin + height / 2;
			this.transform_tool = new TransformTool('utils', cx, cy, width, height);
		}
	}

	removeTransformTool() {
		if (this.transform_tool) {
			this.transform_tool.delete();
			this.transform_tool = null;
		}
	}

	setSelectedItem(item) {
		this[item.constructor.name] = [item.id];
		this.highlight();
	}

	highlight() {
		this.selected_collections.flat().forEach(item_id => document.getElementById(item_id).objref.select());
	}

	dehighlight() {
		this.selected_collections.flat().forEach(item_id => document.getElementById(item_id).objref.deselect());
	}

	eventsOn() {}

	eventsOff() {}

	prepareGroup() {} // Helper

	initCtrPtErrSpecialCase() { // Helper
		return false;
	}

	startMoving(event) { // Click on selection
		event.stopPropagation();
		this.indicator = new Indicator('utils');
		this.accum_vec = [0, 0];
		this.pt = getSvgPoint(event);
		this.prepareGroup();
		if (!this.initCtrPtErrSpecialCase()) this.init_ctr_pt_error = [0, 0];
		this.mo_st = vecDif(this.init_ctr_pt_error, this.pt);

		window.addEventListener('mousemove', this.moving);
		window.addEventListener('mouseup', this.finishMoving);
	}

	corrPtSpecialCase(event) { // Helper
		return false;
	}

	moving(event) { // Active moving
		if (!this.corrPtSpecialCase(event)) this.corrected_point = vecDif(this.init_ctr_pt_error, getSvgPoint(event));
		var moving_vec = vecDif(this.mo_st, this.corrected_point);
		
		this.accum_vec = vecSum(this.accum_vec, moving_vec);
		this.mo_st = this.corrected_point;
		this.relocatingItems(MOVE, {moving_vec: moving_vec});

		if (this.transform_tool) this.transform_tool.translate(moving_vec);
		this.indicator.showDelta(event, this.accum_vec.map(val => val.toFixed(0)));
	}

	finishMoving(event) { // eslint-disable-line no-unused-vars
		window.removeEventListener('mousemove', this.moving);
		window.removeEventListener('mouseup', this.finishMoving);
		this.finishRelocatingItems(MOVE, {moving_vec: this.accum_vec});
	}

	paramsToTransform(action_type, params) {
		let ids = new Set(this.constructor.classes.filter(cls => cls.movable).map(cls => this[cls.name]).flat());
		return [action_type, ids, params];
	}

	relocatingItems(action_type, params) {
		let kwargs = {transforms: [this.paramsToTransform(action_type, params)]};
		editStructure(kwargs);
	}

	augmentCmd(kwargs_dir, kwargs_rev) {} // Helper

	finishRelocatingItems(action_type, params) {
		let kwargs_dir = {transforms: [this.paramsToTransform(action_type, params)]};
		let kwargs_rev = invertCmd(kwargs_dir);
		this.augmentCmd(kwargs_dir, kwargs_rev);
		this.finishAction(kwargs_dir, kwargs_rev);
	}

	finishAction(kwargs_dir, kwargs_rev) {
		this.bottom_ptr = Math.min(this.bottom_ptr, this.dispatcher.ptr);
		this.dispatcher.addCmd(kwargs_dir, kwargs_rev);
		if (!this.transform_tool) this.deactivate();
		this.postAction();
	}

	postAction() {} // Helper

	keyDownHandler(event) {
		if (['Delete', 'Backspace'].includes(event.key)) this.delItems();
	}

	getCopyKwargs() { // Helper
		return Object.fromEntries(this.citizens.map(cls => [cls.cr_cmd_name, gatherData(this[cls.name])]));
	}

	copy(event) {
		event.preventDefault();
		this.clipboard = null;
		let kwargs = this.getCopyKwargs();
		this.clipboard = Object.keys(kwargs).length ? {kwargs: kwargs, pt0: getSvgPoint(event), cnt: 0} : null;
	}

	cut(event) {
		this.copy(event);
		this.delItems();
	}

	setNewCopyIds() { // Helper
		const id_map = {};
		for (const cls of this.citizens) {
			const cr_subcmd = this.clipboard.kwargs[cls.cr_cmd_name];
			const sorted_ids = Object.keys(cr_subcmd).sort();
			for (const old_id of sorted_ids) {
				const new_id = cls.getNewId();
				cr_subcmd[new_id] = cr_subcmd[old_id];
				delete cr_subcmd[old_id];
				id_map[old_id] = new_id;
			}
		}
		return id_map;
	}

	activateFromPasteKwargs(kwargs) {
		let ids_to_activate = {};
		for (const {name, cr_cmd_name} of this.citizens) {
			if (cr_cmd_name in kwargs) ids_to_activate[name] = Object.keys(kwargs[cr_cmd_name]);
		}
		this.activateFromIds(ids_to_activate);
	}

	paste(event) {
		event.preventDefault();
		if (this.clipboard) {
			this.setNewCopyIds();
			editStructure(this.clipboard.kwargs);
			this.deactivate();
			this.activateFromPasteKwargs(this.clipboard.kwargs);
			const moving_vec = vecMul([15, 15], ++this.clipboard.cnt);
			this.relocatingItems(MOVE, {moving_vec: moving_vec});
			if (this.transform_tool) this.transform_tool.translate(moving_vec);
			const kwargs_dir = this.getCopyKwargs();
			this.dispatcher.addCmd(kwargs_dir, invertCmd(kwargs_dir));
			this.postAction();
			window.addEventListener('mousedown', this.deactivate);
		}
	}

	getDelKwargs() { // Helper
		let kwargs = {};
		for (const {name, del_cmd_name} of this.citizens) {
			kwargs[del_cmd_name] = new Set(this[name]);
		}
		return kwargs;
	}

	delItems() {
		this.dispatcher.do(this.getDelKwargs());
		this.deactivate();
		this.postAction();
	}

	undoRedo(cmd, is_undo) {
		if (this.highlights.hasChildNodes()) {
			if (this.dispatcher.ptr + is_undo <= this.bottom_ptr) {
				this.removeTransformTool();
				this.addTransformTool();
			}
			else if (this.transform_tool) {
				cmd.transforms.forEach(([type, ids, params]) => this.transform_tool.enum_funcs[type](params));
			}
			else {
				this.addTransformTool();
			}
		}
		else {
			this.removeTransformTool();
		}
	}

	deselect() {
		for (const attr of this.attrs) this[`#${attr}`] = [];
	}

	deactivate() {
		window.removeEventListener('mousedown', this.deactivate);
		this.highlights.removeEventListener('mousedown', this.startMoving);
		this.removeTransformTool();
		this.bottom_ptr = Infinity;
		this.dehighlight();
		this.deselect();
		this.citizens.forEach(cls => cls.delSel.clear());
	}
}


class SelectionShape extends SelectionBase {
	static classes = [...this.prototype.constructor.classes, ControlPoint, Line, Arrow];

	get shapes() {
		return [...this.lines, ...this.arrows];
	}

	subSelect() {
		super.subSelect();
		this.control_points = [...this.control_points, ...this.shapes.map(shape_id => document.getElementById(shape_id).objref.cps).flat().map(cp => cp.id)];
	}

	setSelectedItem(item) {
		super.setSelectedItem(item);
		this.subSelect();
	}

	setNewCopyIds() { // Helper
		const id_map = super.setNewCopyIds();

		// Get new IDs for control points.
		for (const cls of this.citizens.filter(cls => cls.shape)) {
			for (const [id, data] of Object.entries(this.clipboard.kwargs[cls.cr_cmd_name])) {
				data[0].forEach(cp_data => cp_data[0] = ControlPoint.getNewId())
			}
		}
		return id_map;
	}
}


class SelectionChem extends SelectionShape {
	static classes = [...this.prototype.constructor.classes, ChemNode, ChemBond];

	static event_handlers = {keyUpHandler: 'keyup', ...this.prototype.constructor.event_handlers};

	get atomsbonds() {
		return [...this.atoms, ...this.bonds];
	}

	setSelectedItem(item) {
		if (item instanceof ChemBond) this.atoms = item.nodes.map(node => node.id);
		super.setSelectedItem(item);
	}

	eventsOn() {
		this.highlights.classList.remove('sympoi');
		this.atomsbonds.forEach(item_id => document.getElementById(item_id).objref.eventsOff());
	};

	eventsOff() {
		this.highlights.classList.add('sympoi');
		this.atomsbonds.forEach(item_id => document.getElementById(item_id).objref.eventsOn());
	};

	prepareGroup() {
		this.eventsOff();
		this.pointed_atom = pickNode(this.pt); // Moved atom, pointed by the cursor
		this.join_cmd = null;
		this.eventsOn();
		if (event.shiftKey) this.focusElement();
	}

	initCtrPtErrSpecialCase() {
		let flag = super.initCtrPtErrSpecialCase();
		if (!flag && this.pointed_atom) {
			this.init_ctr_pt_error = vecDif(this.pointed_atom.xy, this.pt);
			flag = true;
		}
		return flag;
	}

	joinMols(event) {
		let kwargs = {};
		let target_node = event.target.objref; // Target atom (static)
		let bonds_data = gatherData(new Set(target_node.connections.map(bond => bond.id)));
		kwargs.del_atoms = new Set([target_node.id]); // Delete target atom
		kwargs.atoms_text = {[this.pointed_atom.id]: target_node.text}; // Apply target atom's text to the pointed atom
		kwargs.del_bonds = new Set(Object.keys(bonds_data)); // Delete bonds of the target atom
		kwargs.new_bonds_data = {};
		for (const [id, data] of Object.entries(bonds_data)) {
			if (data[0] == target_node.id) data[0] = this.pointed_atom.id;
			if (data[1] == target_node.id) data[1] = this.pointed_atom.id;
			if (data[0] == data[1]) continue;
			kwargs.new_bonds_data[id] = data;
		}
		this.join_cmd = {dir: kwargs, rev: invertCmd(kwargs)};
		editStructure(kwargs);
		this.pointed_atom.eventsOn();
	}

	disjoinMols() {
		editStructure(this.join_cmd.rev);
		this.join_cmd = null;
		this.pointed_atom.eventsOff();
	}

	corrPtSpecialCase(event) {
		let pt = getSvgPoint(event);
		let flag = super.corrPtSpecialCase(event);
		let to_join = event.shiftKey && event.target.is_atom && this.pointed_atom;
		let to_rejoin = this.join_cmd && to_join && event.target.objref.id != this.pointed_atom.id;
		let skip = to_rejoin && vecLen(vecDif(pt, event.target.objref.xy)) > vecLen(vecDif(pt, this.pointed_atom.xy));

		if (!skip) {
			if ((this.join_cmd && !to_join) || to_rejoin) this.disjoinMols();
			if ((!this.join_cmd && to_join) || to_rejoin) this.joinMols(event);
		}

		if (to_join) {
			this.corrected_point = skip ? this.pointed_atom.xy : event.target.objref.xy;
			flag = true;
		}
		return flag;
	}

	augmentCmd(kwargs_dir, kwargs_rev) {
		super.augmentCmd(kwargs_dir, kwargs_rev);
		if (this.join_cmd) {
			Object.assign(kwargs_dir, this.join_cmd.dir);
			Object.assign(kwargs_rev, this.join_cmd.rev);
			this.join_cmd = null;
		}
		this.blurElement();
		this.pointed_atom = null;
	}

	postAction() {
		refreshBondCutouts();
	}

	keyDownHandler(event) {
		super.keyDownHandler(event);
		if (event.shiftKey) this.focusElement();
	}

	keyUpHandler(event) {
		if (!event.shiftKey) this.blurElement();
	}

	focusElement() {
		if (this.pointed_atom) {
			this.pointed_atom.promoteMaskSel();
			ChemBond.eventsOffAll();
			this.highlights.classList.add('sympoi');
			document.getElementById('selectholes').setAttribute('visibility', 'hidden');
		}
	}

	blurElement() {
		if (this.pointed_atom) this.pointed_atom.demoteMaskSel();
		ChemBond.eventsOnAll();
		this.highlights.classList.remove('sympoi');
		document.getElementById('selectholes').setAttribute('visibility', 'visible');
	}

	computeFormula() {
		var atoms = this.atoms.size ? [...this.atoms] : [...document.getElementById('sensors_a').children]
			.map(el => el.objref.id);
		return atoms.reduce(
			(acc, atom_id) => sumFormula(acc, document.getElementById(atom_id).objref.formula), {}
		);
	}

	computeMolInfo() {
		var [formula, unrecognized] = separateUnrecognized(this.computeFormula());
		var hill_string = hillToStr(toHillSystem(formula));
		var hill_unrecognized = hillToStr(toHillSystem(unrecognized));
		var fw = formulaToFw(formula);
		var el_comp = computeElementalComposition(formula).map(([el, part]) => `${el}: ${(part * 100).toFixed(2)}%`)
			.join(', ');
		var str_output =
`	Brutto formula 
	${hill_string}

	Fw
	${fw}

	Elemental composition
	${el_comp}${hill_unrecognized.length ? '\n\t\n\tUnrecognized part\n\t' + hill_unrecognized : ''}`;
		return str_output;
	}

	getCopyKwargs() {
		const kwargs = super.getCopyKwargs();
		if (this.bonds.length && this.clipboard == null) {
			kwargs.new_bonds_data = Object.fromEntries(Object.entries(kwargs.new_bonds_data)
				.filter(([id, data]) => data[0] in kwargs.new_atoms_data && data[1] in kwargs.new_atoms_data)
			);
		}
		return kwargs;
	}

	setNewCopyIds() { // Helper
		const id_map = super.setNewCopyIds();

		// Replace IDs for atoms in bonds data
		for (const [id, data] of Object.entries(this.clipboard.kwargs.new_bonds_data)) {
			data[0] = id_map[data[0]];
			data[1] = id_map[data[1]];
		}
		return id_map;
	}

	getDelKwargs() {
		let kwargs = super.getDelKwargs();
		kwargs.del_atoms.forEach(atom_id => document.getElementById(atom_id).objref.connections
			.forEach(bond => kwargs.del_bonds.add(bond.id)));
		return kwargs;
	}
}


var selection = new SelectionChem(dispatcher);
window.selection = selection;
window.dispatcher = dispatcher;


class TransformTool extends DeletableAbortable {
	constructor(parent_id, cx, cy, width, height) {
		super();
		[
			'movingPivot', 'finishMovingPivot', 'startMovingPivot', 'startRotating', 'rotating', 'finishRotating',
			'startScaling', 'scaling', 'finishScaling', 'startStretching', 'stretching', 'finishStretching'
		].forEach(method => this[method] = this[method].bind(this));

		this.parent_id = parent_id;
		this.g = attachSvg(document.getElementById(parent_id), 'g', {id: 'transform-tool'});
		this.xy = [cx, cy];
		var hw = width / 2; // Transform tool half witdth
		var hh = height / 2; // Transform tool half height

		// Dimensions
		var cl = 8; // Corner rectangle length
		var sw = 6; // Side rectangle width
		var sh = 12; // Side rectangle height
		var aht = 2; // Pivot half thickness
		var ahl = 14; // Pivot half length
		var lever_r = 6; // Lever radius
		this.lever_len = 25; // Distanse from the circle to the nearest side rectangle

		var pivot_pts = [
			[aht, aht], [aht, ahl], [-aht, ahl], [-aht, -ahl], [aht, -ahl],
			[aht, aht], [-ahl, aht], [-ahl, -aht], [ahl, -aht], [ahl, aht]
		].map(pt => pt.join()).join(' ');

		var vals = [ // Jigs init data: [ShapeClass, cx, cy, svg_args, callback]
			[CtrPolygon, cx, cy, {points: pivot_pts, 'fill-rule': 'evenodd'}, this.startMovingPivot], // Pivot
			[CtrCircle, cx, cy - hh - this.lever_len, {r: lever_r}, this.startRotating], // Lever
			[CtrRect, cx + hw, cy + hh, {width: cl, height: cl}, this.startScaling], // Bottom-right square
			[CtrRect, cx - hw, cy + hh, {width: cl, height: cl}, this.startScaling], // Bottom-left square
			[CtrRect, cx - hw, cy - hh, {width: cl, height: cl}, this.startScaling], // Top-left square
			[CtrRect, cx + hw, cy - hh, {width: cl, height: cl}, this.startScaling], // Top-right square
			[CtrRect, cx + hw, cy, {width: sw, height: sh}, this.startStretching], // Right rectangle
			[CtrRect, cx - hw, cy, {width: sw, height: sh}, this.startStretching], // Left rectangle
			[CtrRect, cx, cy + hh, {width: sh, height: sw}, this.startStretching], // Bottom rectangle
			[CtrRect, cx, cy - hh, {width: sh, height: sw}, this.startStretching] // Top rectangle
		];
		vals.forEach(item => item[3].class = 'transformjig');
		this.jigs = vals.map(([ShapeClass, cx, cy, svg_args, callback]) =>
			new ShapeClass('transform-tool', cx, cy, svg_args).render()
				.addEventListener('mousedown', callback, this.signal_opt)
		);
		this.pivot = this.jigs[0];
		this.lever = this.jigs[1];

		this.enum_funcs = Object.freeze({
			[MOVE]: ({moving_vec}) => this.translate(moving_vec),
			[ROTATE]: ({rot_angle, rot_ctr}) => this.rotate(rot_angle, rot_ctr),
			[SCALE]: ({scale_factor, scale_ctr}) => this.scale(scale_factor, scale_ctr),
			[STRETCH]: ({stretch_factor, dir_angle, stretch_ctr}) => this.stretch(stretch_factor, dir_angle, stretch_ctr)
		});
	}

	// Moving all jigs
	translate(moving_vec) {
		this.xy = vecSum(this.xy, moving_vec);
		this.jigs.forEach(jig => jig.translate(moving_vec).render());
	}

	// Rotating
	startRotating(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_rot_angle = 0;
		this.rot_st = Math.atan2(...vecDif(this.pivot.xy, getSvgPoint(event)).toReversed());
		window.addEventListener('mousemove', this.rotating, this.signal_opt);
		window.addEventListener('mouseup', this.finishRotating, this.signal_opt);
	}

	rotating(event) {
		var rot_angle = Math.atan2(...vecDif(this.pivot.xy, getSvgPoint(event)).toReversed()) - this.rot_st;
		if (event.shiftKey) {
			var new_accum_rot_angle = discreteAngle(this.accum_rot_angle + rot_angle, 5);
			rot_angle = (new_accum_rot_angle != this.accum_rot_angle) ? new_accum_rot_angle - this.accum_rot_angle : 0;
		}
		this.accum_rot_angle += rot_angle;
		this.indicator.showDegree(event, ((this.accum_rot_angle * 180 / Math.PI - 540) % 360 + 180).toFixed(1));
		this.rot_st = this.rot_st + rot_angle;
		this.rotate(rot_angle, this.pivot.xy);
		selection.relocatingItems(ROTATE, {rot_angle: rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	finishRotating() {
		window.removeEventListener('mousemove', this.rotating);
		window.removeEventListener('mouseup', this.finishRotating);
		selection.finishRelocatingItems(ROTATE, {rot_angle: this.accum_rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	rotate(rot_angle, rot_ctr) {
		this.pivot.setCtr(rot_ctr).render();
		this.xy = rotateAroundCtr(this.xy, rot_angle, rot_ctr);
		this.jigs.slice(1).forEach(jig => {
			jig.setCtr(rotateAroundCtr(jig.xy, rot_angle, rot_ctr)).rotate(rot_angle).render();
		});
	}

	// Scaling
	startScaling(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_factor = 1;
		this.curr_jig = event.target.objref;
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, getSvgPoint(event));
		window.addEventListener('mousemove', this.scaling, this.signal_opt);
		window.addEventListener('mouseup', this.finishScaling, this.signal_opt);
	}

	scaling(event) {
		var factor = this.getFactor();
		this.indicator.showPercent(event, (this.accum_factor * 100).toFixed(1));
		this.scale(factor, this.pivot.xy);
		selection.relocatingItems(SCALE, {scale_factor: factor, scale_ctr: [...this.pivot.xy]});
	}

	finishScaling() {
		window.removeEventListener('mousemove', this.scaling);
		window.removeEventListener('mouseup', this.finishScaling);
		selection.finishRelocatingItems(SCALE, {scale_factor: this.accum_factor, scale_ctr: [...this.pivot.xy]});
	}

	scale(scale_factor, scale_ctr) {
		this.pivot.setCtr(scale_ctr).render();
		this.xy = scaleAroundCtr(this.xy, scale_factor, scale_ctr);
		this.jigs.slice(2).forEach(jig => {
			jig.setCtr(scaleAroundCtr(jig.xy, scale_factor, scale_ctr)).render();
		});
		this.locateLever();
	}

	// Stretching along x or y
	startStretching(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_factor = 1;
		this.curr_jig = event.target.objref;
		this.dir_angle = Math.atan2(...vecDif(this.xy, this.curr_jig.xy).toReversed());
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, getSvgPoint(event));
		window.addEventListener('mousemove', this.stretching, this.signal_opt);
		window.addEventListener('mouseup', this.finishStretching, this.signal_opt);
	}

	stretching(event) {
		var factor = this.getFactor();
		this.indicator.showPercent(event, (this.accum_factor * 100).toFixed(1));
		this.stretch(factor, this.dir_angle, this.pivot.xy);
		selection.relocatingItems(STRETCH, {stretch_factor: factor, dir_angle: this.dir_angle,
			stretch_ctr: [...this.pivot.xy]});
	}

	finishStretching() {
		window.removeEventListener('mousemove', this.stretching);
		window.removeEventListener('mouseup', this.finishStretching);
		selection.finishRelocatingItems(STRETCH, {stretch_factor: this.accum_factor, dir_angle: this.dir_angle,
			stretch_ctr: [...this.pivot.xy]});
	}

	stretch(stretch_factor, dir_angle, stretch_ctr) {
		this.pivot.setCtr(stretch_ctr).render();
		this.xy = stretchAlongDir(this.xy, stretch_factor, dir_angle, stretch_ctr);
		this.jigs.slice(2).forEach(jig => {
			jig.setCtr(stretchAlongDir(jig.xy, stretch_factor, dir_angle, stretch_ctr)).render();
		});
		this.locateLever();
	}

	// Moving pivot
	startMovingPivot(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.init_ctr_pt_error = vecDif(this.pivot.xy, getSvgPoint(event));
		this.jigs.slice(1).forEach(jig => jig.shape.classList.add('sympoi'));
		window.addEventListener('mousemove', this.movingPivot, this.signal_opt);
		window.addEventListener('mouseup', this.finishMovingPivot, this.signal_opt);
	}

	movingPivot(event) {
		var corrected_point = vecDif(this.init_ctr_pt_error, getSvgPoint(event));
		if (event.shiftKey) {
			this.pivot.shape.classList.add('sympoi', 'jigforcehover');
			selection.eventsOff();
			var el = event.target;
			if (el.is_atom || el.is_bond) corrected_point = el.objref.xy;
		}
		else {
			this.pivot.shape.classList.remove('sympoi', 'jigforcehover');
			selection.eventsOn();
		}
		this.indicator.showPt(event, corrected_point.map(val => val.toFixed(0)));
		this.pivot.setCtr(corrected_point).render();
	}

	finishMovingPivot() {
		window.removeEventListener('mousemove', this.movingPivot);
		window.removeEventListener('mouseup', this.finishMovingPivot);
		this.jigs.forEach(jig => jig.shape.classList.remove('sympoi'));
		this.pivot.shape.classList.remove('jigforcehover');
		selection.eventsOn();
	}

	// Utils
	getFactor() {
		var corrected_point = vecDif(this.init_ctr_pt_error, getSvgPoint(event));
		var transform_vec = vecDif(this.pivot.xy, corrected_point);
		var ref_vec = vecDif(this.pivot.xy, this.curr_jig.xy);
		var dir_vec = vecDif(this.xy, this.curr_jig.xy);
		var factor = vecDotProd(dir_vec, transform_vec) / vecDotProd(dir_vec, ref_vec);
		factor = Math.abs(this.accum_factor * factor) > 0.0250001 ? factor : 1;
		if (event.shiftKey) {
			var rounded_new_accum_factor = Math.round(this.accum_factor * factor / 0.05) * 0.05;
			factor = rounded_new_accum_factor != this.accum_factor ? rounded_new_accum_factor / this.accum_factor : 1;
		}
		this.accum_factor = this.accum_factor * factor;
		return factor;
	}

	locateLever() {
		var new_lever_ctr = vecSum(this.jigs[9].xy, vecMul(unitVec(vecDif(this.xy, this.jigs[9].xy)), this.lever_len));
		this.lever.setCtr(new_lever_ctr).render();
	}

	delete() {
		this.jigs.forEach(jig => jig.delete());
		this.g.remove();
		super.delete();
	}
}


class Indicator extends DeletableAbortable {
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
		var pt = getSvgPoint(event);
		setAttrsSvg(this.text, {x: pt[0], y: pt[1]});
		text.split('\n').toReversed().forEach((line) => attachSvg(this.text, 'tspan', {x: pt[0], dy: `${-1.2}em`})
			.appendChild(document.createTextNode(line)));
		var bbox = this.text.getBBox();
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


for (const elbtn of elbtns) chemNodeHandler(elbtn);
transformHandler(selrebtn, SelectRect);
transformHandler(sellabtn, SelectLasso);
transformHandler(selmobtn);
chemBondHandler(bondbtn, 1, 0); // Normal bond
chemBondHandler(dbondbtn, 14, 2); // Upper bond
chemBondHandler(upperbtn, 2, 1); // Upper bond
chemBondHandler(lowerbtn, 5, 3); // Upper bond
deleteHandler(delbtn);
textHandler(textbtn);
polygonHandler(pentagonbtn, 5);
polygonHandler(hexagonbtn, 6);
polygonHandler(heptagonbtn, 7);
polygonHandler(benzenebtn, 6, true);
lineHandler(linebtn, Line, 'new_lines_data');
lineHandler(arrowbtn, Arrow, 'new_arrows_data');
