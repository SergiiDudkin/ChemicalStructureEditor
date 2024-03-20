var canvas = document.getElementById('canvas');
var canvas_container = document.getElementById('canvas-container');
var mainframe = document.getElementById('mainframe');
var canvbckgrnd = document.getElementById('canvbckgrnd');
var sensors_b = document.getElementById('sensors_b');
var sensors_a = document.getElementById('sensors_a');
var highlights = document.getElementById('selecthighlight');
var pt, matrixrf, wmax; // Variables


function download() { // Download .svg
	var element = document.createElement('a');
	svg_content = document.getElementById('canvas').outerHTML;
	svg_content = svg_content.replaceAll(/<defs>.*?defs>/gms, '');
	svg_content = svg_content.replaceAll(/<rect class="brect".*?rect>/gm, '');
	svg_content = svg_content.replaceAll(/<circle class="anode".*?circle>/gm, '');
	svg_content = svg_content.replaceAll(/class=".*?"/gm, '');

	subst =
`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_svg "http://www.w3.org/2000/svg">
	<!ENTITY ns_xlink "http://www.w3.org/1999/xlink">
]>
<svg`;
	svg_content = svg_content.replaceAll('<svg', subst);

	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg_content));
	element.setAttribute('download', 'molecule.svg');
	element.click();
}

document.getElementById('download-svg').addEventListener('click', download);


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

	animateBtnDown(event) { // Change appearance of fancy buttons
		this.filter_g.setAttribute('filter', 'url(#okshadow)');
		this.filter_g.setAttribute('transform', 'translate(16 16) scale(0.94) translate(-16 -16)');
		window.addEventListener('mouseup', this.animateBtnUp);
	}

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

	expand(event) {
		clipCnv(`M 0 ${this.cut_top} H ${Math.min(this.cut_right, wmax - 2)} V ${this.cut_bottom} H 0 Z`);
		this.collapsed = false;
		if (this.active) this.deselect();
	}

	collapse(event) {
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
	return `<text class='but' x='15' y='17' fill='black' dominant-baseline='middle' text-anchor='middle'>${text}</text>`;
}

var flex_container = document.getElementsByClassName('flex-container')[0];

var elbtnseq = ['C', 'H', 'O', 'N', 'S'];

var movebtn = new RegularButton(flex_container, `
	<line style="fill:none;stroke:black;stroke-width:2;" x1="15" y1="7" x2="15" y2="23"/>
	<line style="fill:none;stroke:black;stroke-width:2;" x1="7" y1="15" x2="23" y2="15"/>
	<polygon points="3,15 7.5,10.5 7.5,19.5 "/>
	<polygon points="27,15 22.5,19.5 22.5,10.5 "/>
	<polygon points="15,27 10.5,22.5 19.5,22.5 "/>
	<polygon points="15,3 19.5,7.5 10.5,7.5 "/>
`);
var dropelbtn = new DropButton(flex_container, `
	<line x1="15.0" y1="28.0" x2="15.0" y2="19.0" stroke="black" stroke-width="2" />
	<line x1="2.0" y1="5.5" x2="9.8" y2="10.0" stroke="black" stroke-width="2" />
	<line x1="28.0" y1="5.5" x2="20.2" y2="10.0" stroke="black" stroke-width="2" />
	<text x="15" y="15" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16px">A</text>
`);
var elbtns = elbtnseq.map(atom => new SubButton(dropelbtn, toBtnText(atom)));
dropelbtn.focusSubbtn(elbtns[0]);
var dropbondbtn = new DropButton(flex_container, `
	<line x1="11.0" y1="19.0" x2="19.4" y2="10.6" stroke="black" stroke-width="2" />
	<text x="6.5" y="24.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12px">C</text>
	<text x="23.5" y="7.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="12px">C</text>
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
		<pattern id="low_btn_pattern" x="25.6" y="4.4" width="4" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(135)">
			<rect x="0" y="0" width="2" height="1" fill="black" />
		</pattern>
	</defs>
	<polygon points="4.7,26.0 27.7,6.5 23.5,2.3 4.0,25.3" fill="url(#low_btn_pattern)" />
`);
var delbtn = new RegularButton(flex_container, `
	<path style="fill:none;stroke:black;stroke-width:2;" d="M2.5,19.6c-0.7-0.7-0.7-0.7,0-1.4L18.1,2.6c0.7-0.7,0.7-0.7,1.4,0l7.8,7.8c0.7,0.7,0.7,0.7,0,1.4L15.6,23.5c-3.2,3.2-6,3.2-9.2,0L2.5,19.6z"/>
	<rect x="12.7" y="4.8" transform="matrix(0.7072 0.7071 -0.7071 0.7072 13.2169 -10.3978)" width="13" height="12"/>
`);
var textbtn = new RegularButton(flex_container, `
	<path d=" M 22 6.8 V 23.2 M 18 5 H 20 A 2 2 0 0 1 22 7 A 2 2 0 0 1 24 5 H 26 M 18 25 H 20 A 2 2 0 0 0 22 23 A 2 2 0 0 0 24 25 H 26" stroke="black" stroke-width="1.5" />
	<text x="12" y="17.5" fill="black" dominant-baseline="middle" text-anchor="middle" font-family="Serif" font-size="20px">T</text>
`);
var dropcycbtn = new DropButton(flex_container, `
	<polygon points="28.8,15.0 23.6,25.8 11.9,28.5 2.5,21.0 2.5,9.0 11.9,1.5 23.6,4.2" fill="black" />
	<polygon points="15.0,25.2 5.3,18.2 9.0,6.7 21.0,6.7 24.7,18.2" fill="white" />
`);
var benzenebtn = new SubButton(dropcycbtn, `
	<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" fill="none" />
	<line x1="15.0" y1="22.0" x2="8.9" y2="18.5" stroke="black" stroke-width="2" />
	<line x1="8.9" y1="11.5" x2="15.0" y2="8.0" stroke="black" stroke-width="2" />
	<line x1="21.1" y1="11.5" x2="21.1" y2="18.5" stroke="black" stroke-width="2" />
`);
dropcycbtn.focusSubbtn(benzenebtn);
var pentagonbtn = new SubButton(dropcycbtn, 
	'<polygon points="15.0,24.4 6.1,17.9 9.5,7.4 20.5,7.4 23.9,17.9" stroke="black" stroke-width="2" fill="none" />'
);
var hexagonbtn = new SubButton(dropcycbtn, 
	'<polygon points="15.0,26.0 5.5,20.5 5.5,9.5 15.0,4.0 24.5,9.5 24.5,20.5" stroke="black" stroke-width="2" fill="none" />'
);
var heptagonbtn = new SubButton(dropcycbtn,
	'<polygon points="15.0,27.7 5.1,22.9 2.6,12.2 9.5,3.6 20.5,3.6 27.4,12.2 24.9,22.9" stroke="black" stroke-width="2" fill="none" />'
);
var transformbtn = new RegularButton(flex_container, toBtnText('tr'));



var cnvclippath = document.getElementById('cnvclippath');
function clipCnv(extra='') {
	cnvclippath.setAttribute('d', `M 0 0 H ${wmax - 2} V 564 H 0 Z ${extra}`);
}

// Resize the canvas
pt = canvas.createSVGPoint();       
function svgWidth(event) {
	wmax = mainframe.offsetWidth - 36;
	canvbckgrnd.setAttribute("width", wmax);
	canvas.setAttribute("width", wmax + 4);
	clipCnv();
	matrixrf = canvas.getScreenCTM().inverse();
}
svgWidth();
window.addEventListener('resize', svgWidth);
window.addEventListener('scroll', () => matrixrf = canvas.getScreenCTM().inverse())


function invertCmd(kwargs_dir) {
	var kwargs_rev = {}; //{new_atoms_data: {}, new_bonds_data: {}};
	if (kwargs_dir.del_atoms) {
		kwargs_rev.new_atoms_data = {};
		kwargs_dir.del_atoms.forEach(id => {
			var node = document.getElementById(id).objref;
			kwargs_rev.new_atoms_data[id] = [...node.xy, node.text];
		});
	}
	if (kwargs_dir.del_bonds) {
		kwargs_rev.new_bonds_data = {};
		kwargs_dir.del_bonds.forEach(id => {
			var bond = document.getElementById(id).objref;
			kwargs_rev.new_bonds_data[id] = [...bond.nodes.map(node => node.id), bond.type];
		});
	}
	if (kwargs_dir.new_atoms_data) kwargs_rev.del_atoms = new Set(Object.keys(kwargs_dir.new_atoms_data));
	if (kwargs_dir.new_bonds_data) kwargs_rev.del_bonds = new Set(Object.keys(kwargs_dir.new_bonds_data));
	if (kwargs_dir.atoms_text) kwargs_rev.atoms_text = Object.fromEntries(Object.keys(kwargs_dir.atoms_text).map(
		id => [id, document.getElementById(id).objref.text]
	));
	if (kwargs_dir.bonds_type) kwargs_rev.bonds_type = Object.fromEntries(Object.keys(kwargs_dir.bonds_type).map(
		id => [id, document.getElementById(id).objref.type]
	));
	if (kwargs_dir.moving_atoms) kwargs_rev.moving_atoms = new Set(kwargs_dir.moving_atoms); 
	if (kwargs_dir.moving_vec) kwargs_rev.moving_vec = vecMul(kwargs_dir.moving_vec, -1);

	if (kwargs_dir.rotating_atoms) kwargs_rev.rotating_atoms = new Set(kwargs_dir.rotating_atoms); 
	if (kwargs_dir.rot_angle) kwargs_rev.rot_angle = -kwargs_dir.rot_angle;
	if (kwargs_dir.rot_ctr) kwargs_rev.rot_ctr = kwargs_dir.rot_ctr.slice();

	if (kwargs_dir.scaling_atoms) kwargs_rev.scaling_atoms = new Set(kwargs_dir.scaling_atoms); 
	if (kwargs_dir.scale_factor) kwargs_rev.scale_factor = 1 / kwargs_dir.scale_factor;
	if (kwargs_dir.scale_ctr) kwargs_rev.scale_ctr = kwargs_dir.scale_ctr.slice();

	if (kwargs_dir.stretching_atoms) kwargs_rev.stretching_atoms = new Set(kwargs_dir.stretching_atoms); 
	if (kwargs_dir.stretch_factor) kwargs_rev.stretch_factor = 1 / kwargs_dir.stretch_factor;
	if (kwargs_dir.dir_angle) kwargs_rev.dir_angle = kwargs_dir.dir_angle + Math.PI;
	if (kwargs_dir.stretch_ctr) kwargs_rev.stretch_ctr = kwargs_dir.stretch_ctr.slice();

	return kwargs_rev;
}


function Dispatcher() { // Dispatcher provides undo-redo mechanism
	this.commands = [];
	this.ptr = 0;
}

Dispatcher.prototype.addCmd = function(func_dir, args_dir, func_rev, args_rev) {
	this.commands = this.commands.slice(0, this.ptr); // Delete extra commands
	this.commands.push([{func: func_dir, args: args_dir}, {func: func_rev, args: args_rev}]); // Add new command to the history
	this.ptr++;
}

Dispatcher.prototype.do = function(func_dir, kwargs_dir) {
	kwargs_rev = invertCmd(kwargs_dir);
	func_dir(kwargs_dir);
	this.addCmd(func_dir, kwargs_dir, func_dir, kwargs_rev);
}

Dispatcher.prototype.redo = function() {
	if (this.ptr >= this.commands.length) return;
	var command = this.commands[this.ptr++][0]; // Fetch command
	command.func(command.args); // Execute the given function with args
	overlap.refresh();
	// selection.redo(command.args);
	selection.undoRedo(command.args, false);
};

Dispatcher.prototype.undo = function() {
	if (this.ptr <= 0) return;
	var command = this.commands[--this.ptr][1]; // Fetch command
	command.func(command.args); // Execute the given function with args
	overlap.refresh();
	// selection.undo(command.args);
	selection.undoRedo(command.args, true);
};

Dispatcher.prototype.keyHandler = function(event) {
	if ((event.ctrlKey || event.metaKey) && !event.repeat) {
		if (event.key == 'y' || event.key == 'Z' || (event.key == 'z' && event.shiftKey == true)) this.redo();
		else if (event.key == 'z') this.undo();
	}
}

var dispatcher = new Dispatcher();

document.addEventListener('keydown', event => dispatcher.keyHandler(event));


function getSvgPoint(event) {
	pt.x = event.clientX;
	pt.y = event.clientY;
	var svgP0 = pt.matrixTransform(matrixrf);
	return [svgP0.x, svgP0.y];
}

function getScreenPoint([svg_x, svg_y]) {
	[pt.x, pt.y] = [svg_x, svg_y];
	var {x, y} = pt.matrixTransform(matrixrf.inverse());
	return [x, y];
}

function clampToCnv([x, y]) {
	return [Math.min(Math.max(x, 0), wmax), Math.min(Math.max(y, 0), 564)];
}

function getCursorAtom(event, atomtext) {
	var cursoratom = new ChemNode('cursoratom', ...clampToCnv(getSvgPoint(event)), '@' + atomtext);
	cursoratom.parse();
	cursoratom.renderText();
	cursoratom.backcircle.setAttribute('class', 'cursor-circ');
	return cursoratom;
}

var standard_bondlength = 40;
var angtab = [0, 15, 30, 45, 60, 75, 90]; // Target bond angles
var radtab = angtab.map(angdeg => angdeg * (Math.PI / 180));
var dxytab = radtab.map(angrad => [Math.cos(angrad), Math.sin(angrad)]);
var tantab = Array.from({length: radtab.length - 1}, (_, i) => Math.tan((radtab[i] + radtab[i+1]) / 2));

function discreteAngle(pt0, [x, y], length=standard_bondlength) {
	// Returns pt1 with discrete angle and fixed length
	tan = Math.abs(y / x);
	for (var j = 0; j < tantab.length; j++) if (tan < tantab[j]) break; // Find angle index j
	return [x, y].map((dim, i) => pt0[i] + Math.sign(dim) * dxytab[j][i] * length);
}

function pickNodePoint(event) {
	var node = event.target.is_atom ? event.target.objref : null;
	var pt = node ? node.xy : getSvgPoint(event);
	return [pt, node];
}

function pickNode([x, y]) {
	[pt.x, pt.y] = [x, y];
	var svgP2 = pt.matrixTransform(matrixrf.inverse());
	var pt_elem = document.elementFromPoint(svgP2.x, svgP2.y);
	return (pt_elem != null && pt_elem.is_atom) ? pt_elem.objref : null;
}

function getBondEnd(event, pt0) {
	var [pt1, node1] = pickNodePoint(event);
	var difxy = vecDif(pt0, pt1);
	if (vecLen(difxy) < 16) return [null, null];
	if (!node1) {
		pt1 = discreteAngle(pt0, difxy);
		node1 = pickNode(pt1);
		pt1 = node1 ? node1.xy : pt1;
	}
	return [pt1, node1];
}


class Overlap {
	constructor() {
		this.old_masks = [];
	}

	detectIntersec(bond_group) {
		this.new_masks = [];
		bond_group.sort((a, b) => a.min_x < b.min_x ? -1 : 1);
		for (const [i, bond0] of Object.entries(bond_group)) {
			var j = parseInt(i);
			var bond1 = bond_group[++j];
			while (j < bond_group.length && bond1.min_x < bond0.max_x) {
				if (bond1.min_y < bond0.max_y && bond0.min_y < bond1.max_y && 
					checkIntersec(...[...bond0.nodes, ...bond1.nodes].map(node => node.xy))
				) this.new_masks.push([bond0.id, bond1.id].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).join('&'));
				bond1 = bond_group[++j];
			}
		}
	}

	refresh(exclude=[]) {
		var bond_group = Array.from(sensors_b.children).map(el => el.objref).filter(bond => !exclude.includes(bond.id));
		this.detectIntersec(bond_group);

		// Add masks
		var set_old = new Set(this.old_masks);
		var masks_to_add = this.new_masks.filter(new_mask => !set_old.has(new_mask));
		for (const mask of masks_to_add) {
			var [lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
			lower_bond.createSubmask(upper_bond);
		}

		// Remove masks
		var set_new = new Set(this.new_masks);
		var masks_to_remove = this.old_masks.filter(old_mask => !set_new.has(old_mask));
		for (const mask of masks_to_remove) {
			try {
				var [lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
			}
			catch (error) { // Case of deleted bond
				if (error instanceof TypeError) continue;
				else throw error;
			}
			lower_bond.deleteSubmask(upper_bond);
		}

		this.old_masks = this.new_masks;
	}
}

var overlap = new Overlap();



function chemNodeHandler(elbtn) {
	var node0, pt0, cursoratom, atomtext, old_atomtext, new_atomtext, new_node0id, new_node1id, new_bond_id, node0_is_new, node0_id;
	elbtn.mask_g.addEventListener('click', crElem);

	function crElem(event) { // Turn on creating of a new atom. Called when a chemical element button is clicked.
		elbtn.selectCond();
		atomtext = event.currentTarget.objref.img.firstChild.textContent;
		cursoratom = getCursorAtom(event, atomtext);
		window.addEventListener('mousemove', movElem);
		window.addEventListener('mousedown', setElem);
	}

	function movElem(event) { // Move cursor atom
		cursoratom.translate(vecDif(cursoratom.xy, clampToCnv(getSvgPoint(event))));
	}

	function setElem(event) { // Create a new atom
		new_node0id = ChemNode.prototype.getNewId();
		new_node1id = ChemNode.prototype.getNewId();
		new_bond_id = ChemBond.prototype.getNewId();
		if (canvas.contains(event.target)) { // Click inside the canvas
			[pt0, node0] = pickNodePoint(event);
			if (node0) { // If some atom was clicked
				if (node0.connections.length == 0 && (node0.text == atomtext || (node0.text == '' && atomtext == 'C'))) {
					var kwargs = {del_atoms: new Set([node0.id])};
					dispatcher.do(editStructure, kwargs);
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
				var kwargs = {new_atoms_data: {[new_node0id]: [...pt0, new_atomtext]}};
				dispatcher.do(editStructure, kwargs);
			}
			dispatcher.do(editStructure, {});
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
			kwargs.new_atoms_data = {[new_node1id]: [...discreteAngle(pt0, difxy), atomtext]};
			kwargs.new_bonds_data = {[new_bond_id]: [node0_id, new_node1id, 1]};
			if (!node0_is_new) kwargs.atoms_text = {[node0_id]: old_atomtext};
		}
		else kwargs.atoms_text = {[node0_id]: new_atomtext};
		dispatcher.do(editStructure, kwargs)
	}

	function finNode(event) { // Finish to set node
		window.removeEventListener('mouseup', finNode);
		window.removeEventListener('mousemove', movBoundNode);
		if (document.getElementById(new_bond_id) === null && node0_is_new) dispatcher.undo();
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		overlap.refresh();
		window.addEventListener('mousemove', movElem);
	}
}


function chemBondHandler(btn, init_type, rotation_schema) {
	var node0, pt0, new_node0id, new_node1id, new_bond_id, node0id;
	btn.mask_g.addEventListener('click', crBond);

	function crBond(event) { // Create bond. Called when the bond button is cklicked.
		btn.selectCond();
		window.addEventListener('mousedown', stBond);
	}

	function stBond(event) { // Start drawing bond. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Bond starts within the canvas. Continue drawing.
			if (event.target.is_bond) { // If an existing bond was clicked, change its multiplicity
				var focobj = event.target.objref;
				var kwargs = {bonds_type: {[focobj.id]: focobj.getNextType(rotation_schema)}};
				dispatcher.do(editStructure, kwargs);
				overlap.refresh();
			}
			else { // If blank space or a chem node was clicked, start drawing a new bond
				[pt0, node0] = pickNodePoint(event);
				new_node0id = ChemNode.prototype.getNewId();
				new_node1id = ChemNode.prototype.getNewId();
				new_bond_id = ChemBond.prototype.getNewId();
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
			dispatcher.do(editStructure, kwargs)
		}
	}

	function enBond(event) { // Finish drawing bond
		window.removeEventListener('mouseup', enBond);
		window.removeEventListener('mousemove', movBond);
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		overlap.refresh();
	}
}


function deleteHandler(delbtn) {
	delbtn.mask_g.addEventListener('click', delNodeOrBond);

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
		if (event.target.is_atom || event.target.is_bond) {
			var focobj = event.target.objref;
			if (focobj.constructor == ChemNode) var kwargs = {
				del_atoms: new Set([focobj.id]), 
				del_bonds: new Set(focobj.connections.map(bond => bond.id))
			};
			else if (focobj.constructor == ChemBond) var kwargs = {del_bonds: new Set([focobj.id])};
			dispatcher.do(editStructure, kwargs);
			overlap.refresh();
		}
	}

	function delStop() {
		canvas.removeEventListener('mousemove', erase);
		window.removeEventListener('mouseup', delStop);
	}
}


function moveHandler(movebtn) {
	var svgP0, svgP1;
	var rect_x, rect_y, rect_w, rect_h;
	var atoms_slctd = new Set(); // Selected atoms
	var bonds_slctd = new Set(); // Selected atoms
	var is_selected = false;
	var mo_st = new Array(2); // Cursor coordinates when dragging was started
	var accum_vec;
	var utils = document.getElementById('utils');
	
	var selectrect = makeSvg('rect', {'class': 'sympoi', fill: 'none', stroke: 'blue', 'stroke-dasharray': 2, 'stroke-width': 1});
	movebtn.mask_g.addEventListener('click', moveInit);

	function moveInit(event) {
		movebtn.selectCond();
		window.addEventListener('mousedown', moveAct);
	}

	function moveAct(event) { // When mouse button is down
		if (event.target.is_atom || event.target.is_bond) { // Clicked element was not previously selected
			deselectAll();
			var poiobj = event.target.objref;
			if (event.target.is_atom) atoms_slctd.add(poiobj.id); // Atom case
			else poiobj.nodes.forEach(node => atoms_slctd.add(node.id)); // Bond case
		}
		if (event.target.is_atom || event.target.is_bond || highlights.contains(event.target)) { // If atom or bond was clicked
			mo_st = getSvgPoint(event);
			accum_vec = [0, 0];
			window.addEventListener('mousemove', moving);
			window.addEventListener('mouseup', finishMoving);
		}
		else {
			deselectAll();
			if (canvas.contains(event.target)) { // If clicked on of canvas, start selection.
				pt.x = event.clientX;
				pt.y = event.clientY;
				svgP0 = pt.matrixTransform(matrixrf);
				recalc(event);
				utils.appendChild(selectrect);
				window.addEventListener('mousemove', recalc);
				window.addEventListener('mouseup', selectStop);
			}
			else {
				window.removeEventListener('mousedown', moveAct); // If clicked out of canvas, exit moving routine.
				movebtn.deselectCond(event);
			}
		}
	}

	function moving(event) { // Active moving
		var pt = getSvgPoint(event);
		var moving_vec = vecDif(mo_st, pt);
		accum_vec = vecSum(accum_vec, moving_vec);
		mo_st = pt;

		var kwargs = {moving_atoms: atoms_slctd, moving_vec: moving_vec}
		editStructure(kwargs);
	}

	function finishMoving() {
		window.removeEventListener('mousemove', moving);
		window.removeEventListener('mouseup', finishMoving);
		var atoms_slctd_clone = new Set(atoms_slctd);
		var kwargs = {moving_atoms: atoms_slctd_clone, moving_vec: accum_vec}
		var kwargs_rev = {moving_atoms: atoms_slctd_clone, moving_vec: vecMul(accum_vec, -1)};
		dispatcher.addCmd(editStructure, kwargs, editStructure, kwargs_rev);
		if (!is_selected) clearSlct();
		overlap.refresh();
	}

	function clearSlct() {
		atoms_slctd.clear();
		bonds_slctd.clear();
		is_selected = false;
	}

	function deselectAll() {
		atoms_slctd.forEach(atom_id => document.getElementById(atom_id).objref.deselect());
		bonds_slctd.forEach(bond_id => document.getElementById(bond_id).objref.deselect());
		clearSlct();
	}

	function recalc(event) {
		pt.x = event.clientX;
		pt.y = event.clientY;
		svgP1 = pt.matrixTransform(matrixrf);

		rect_x = Math.min(svgP0.x, svgP1.x);
		rect_y = Math.min(svgP0.y, svgP1.y);
		rect_w = Math.abs(svgP1.x - svgP0.x);
		rect_h = Math.abs(svgP1.y - svgP0.y);

		setAttrsSvg(selectrect, {x: rect_x, y: rect_y, width: rect_w, height: rect_h});
	}

	function selectStop() {
		window.removeEventListener('mousemove', recalc);
		window.removeEventListener('mouseup', selectStop);
		selectrect.remove();

		var rect_x1 = rect_x + rect_w;
		var rect_y1 = rect_y + rect_h;
		for (const el of [...sensors_a.children, ...sensors_b.children]) {
			obj = el.objref;
			var [x, y] = obj.xy;
			if (rect_x < x && x < rect_x1 && rect_y < y && y < rect_y1) {
				if (obj instanceof ChemNode) atoms_slctd.add(obj.id);
				else bonds_slctd.add(obj.id);
				obj.select();
			}
		}
		is_selected = Boolean(atoms_slctd.size + bonds_slctd.size);
	}
}


function textHandler(textbtn) {
	var pt, node;
	textbtn.mask_g.addEventListener('click', crText);

	function pressEnter(event) {
		if (event.key == 'Enter') setNodeText(event);
	}

	function crText(event) {
		textbtn.selectCond();
		window.addEventListener('mousedown', addInput);
		document.addEventListener('keydown', pressEnter);
	}

	function setNodeText() {
		var old_input = document.getElementById('txt-input');
		if (old_input) {
			var kwargs = {atoms_text: {[node.id]: (old_input.value ? '@' : '') + old_input.value}};
			dispatcher.do(editStructure, kwargs);
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
				canvas_container.appendChild(input);
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
		var node_ids = Array.from({length: num}, () => ChemNode.prototype.getNewId());
		var bond_ids = Array.from({length: num}, () => ChemBond.prototype.getNewId());
		return [node_ids, bond_ids]
	}

	var [cur_node_ids, cur_bond_ids] = generateIds();
	var node, mo_st, node_ids, bond_ids, common_bond, common_node, new_node_ids, new_bond_ids;
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
		editStructure({moving_atoms: cur_node_ids, moving_vec: moving_vec});
	}

	function setPolygon(event) { // Move cursor atom
		[new_node_ids, new_bond_ids] = generateIds();
		if (canvas.contains(event.target)) { // Click inside the canvas
			var [pt, node] = pickNodePoint(event);
			if (node) {
				stopCursor()
				common_node = node;
				dispatcher.do(editStructure, {});
				rotatePolygon(event);
				window.addEventListener('mousemove', rotatePolygon);
				window.addEventListener('mouseup', appendPolygon);
			}
			else if (event.target.is_bond) { // Some bond was clicked
				stopCursor()
				common_bond = event.target.objref;
				dispatcher.do(editStructure, {});
				flipPolygon(event);
				window.addEventListener('mousemove', flipPolygon);
				window.addEventListener('mouseup', appendPolygon);
			}
			else { // Neither node nor bond was clicked
				vec0 = vecDif(pt, document.getElementById(cur_node_ids[0]).objref.xy);
				var [new_atoms_data, new_bonds_data] = generatePolygon(pt, vec0, new_node_ids, new_bond_ids);
				var kwargs = {new_atoms_data: new_atoms_data, new_bonds_data: new_bonds_data};
				dispatcher.do(editStructure, kwargs);
				overlap.refresh(exclude=cur_bond_ids);
			}
		}
		else { // Click outside the canvas
			stopCursor();
			polygonbtn.deselectCond(event);
		}
	}

	function flipPolygon(event) {
		dispatcher.undo();

		var ortho_proj = vecDotProd(common_bond.ouva, vecDif(common_bond.xy, getSvgPoint(event)))
		var dir = Math.sign(ortho_proj);
		dir = dir ? dir : 1;

		var ctr = vecSum(common_bond.xy, vecMul(common_bond.ouva, pecd * dir));
		var vec0 = rotateVec(vecMul(common_bond.ouva, -pvcd * dir), -rot_angle / 2);
		var [new_atoms_data, new_bonds_data] = generatePolygon(ctr, vec0, new_node_ids, new_bond_ids);

		delete new_atoms_data[new_node_ids[0]];
		delete new_atoms_data[new_node_ids[1]];

		var [node0_id, node1_id] = (dir == 1 ? [0, 1] : [1, 0]).map(i => common_bond.nodes[i].id)
		new_bonds_data[new_bond_ids[1]][0] = node1_id;
		new_bonds_data[new_bond_ids[num-1]][1] = node0_id;
		new_bonds_data[new_bond_ids[0]][0] = node0_id;
		new_bonds_data[new_bond_ids[0]][1] = node1_id;

		[new_atoms_data, new_bonds_data, bonds_type] = excludeRedundant(new_atoms_data, new_bonds_data, {});

		var kwargs = {new_atoms_data: new_atoms_data, new_bonds_data: new_bonds_data, bonds_type: bonds_type};
		dispatcher.do(editStructure, kwargs);
		// ToDo: Instead of dispatcher.do, memorize dir (or its absence), and then conditionally undo. It will also supress the cursor blinking when over new node.
	}

	function rotatePolygon(event) {
		dispatcher.undo();

		var difxy = vecDif(common_node.xy, getSvgPoint(event));

		var ctr = discreteAngle(common_node.xy, difxy, length=pvcd);
		var vec0 = vecDif(ctr, common_node.xy);
		var [new_atoms_data, new_bonds_data] = generatePolygon(ctr, vec0, new_node_ids, new_bond_ids);

		delete new_atoms_data[new_node_ids[0]];
		new_bonds_data[new_bond_ids[0]][0] = common_node.id;
		new_bonds_data[new_bond_ids[num-1]][1] = common_node.id;
		[new_atoms_data, new_bonds_data, bonds_type] = excludeRedundant(new_atoms_data, new_bonds_data, {});

		var kwargs = {new_atoms_data: new_atoms_data, new_bonds_data: new_bonds_data, bonds_type: bonds_type};
		dispatcher.do(editStructure, kwargs);
	}

	function appendPolygon(event) {
		window.removeEventListener('mousemove', flipPolygon);
		window.removeEventListener('mousemove', rotatePolygon);
		window.removeEventListener('mouseup', appendPolygon);
		overlap.refresh();
		crPolygon(event);
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

	function excludeRedundant(new_atoms_data, new_bonds_data, bonds_type) {
		// ToDo: Place it in the global scope.
		node_pairs = {};
		for (const [id, data] of Object.entries(new_atoms_data)) {
			node = pickNode(data.slice(0, 2));
			if (node) { // ToDo: Consider extra condition in case of new heteroatom.
				node_pairs[id] = node.id;
				delete new_atoms_data[id];
			}
		}
		for (const [id, data] of Object.entries(new_bonds_data)) {
			for (var i = 0; i < 2; i++) {
				if (data[i] in node_pairs) data[i] = node_pairs[data[i]]; // Replace new node id with the existing one
			}
			node0_el = document.getElementById(data[0]);
			node1_el = document.getElementById(data[1]);
			if (node0_el !== null && node1_el !== null) {
				var bonds0 = node0_el.objref.connections;
				var bonds1 = node1_el.objref.connections;
				var old_bonds = bonds0.filter(bond => bonds1.includes(bond)); // Find common bonds
				if (old_bonds.length > 0) {
					delete new_bonds_data[id];
					var old_bond = old_bonds[0];
					var is_sp3 = !(bonds0.concat(bonds1).some(bond => bond.multiplicity >= 2))
					var new_type_casted = data[0] != old_bond.nodes[0].id ? ChemBond.rev_type[data[2]] : data[2];
					if (ChemBond.mult[data[2]] > 1 && old_bond.type != new_type_casted && is_sp3) {
						bonds_type[old_bond.id] = new_type_casted;
					}
				}
			}
		}
		return [new_atoms_data, new_bonds_data, bonds_type];
	}
}


function transformHandler(transformbtn) {
	var sensors_a = document.getElementById('sensors_a');
	var sensors_b = document.getElementById('sensors_b');
	transformbtn.mask_g.addEventListener('click', selectInit);

	function selectInit(event) {
		transformbtn.selectCond();
		canvas.addEventListener('mousedown', selectAct);
		sensors_a.addEventListener('mousedown', pickAtom);
		sensors_b.addEventListener('mousedown', pickBond);
		window.addEventListener('mousedown', exit);
	}

	function selectAct(event) { // Click on canvas
		event.stopPropagation();
		selection.deactivate();
		new SelectRect('utils');
	}

	function pickAtom(event) {
		pick(event, [event.target.objref.id]);
	}

	function pickBond(event) {
		pick(event, event.target.objref.nodes.map(node => node.id));
	}

	function pick(event, node_ids) {
		event.stopPropagation();
		selection.deactivate();
		selection.setSelectedAtoms(node_ids);
		selection.startMoving(event);
	}

	function exit(event) {
		canvas.removeEventListener('mousedown', selectAct);
		sensors_a.removeEventListener('mousedown', pickAtom);
		sensors_b.removeEventListener('mousedown', pickBond);
		window.removeEventListener('mousedown', exit);
		selection.deactivate();
		transformbtn.deselectCond(event);
	}
}


class SelectRect extends DeletableAbortable {
	constructor(parent_id) {
		super();
		this.rect = attachSvg(document.getElementById(parent_id), 'rect', {
			class: 'sympoi', 'fill-opacity': 0, stroke: 'blue', 'stroke-dasharray': 2, 'stroke-width': 1
		});

		this.recalc = this.recalc.bind(this);
		this.selectStop = this.selectStop.bind(this);

		pt.x = event.clientX;
		pt.y = event.clientY;
		this.svg_pt0 = pt.matrixTransform(matrixrf);
		this.recalc(event);
		
		window.addEventListener('mousemove', this.recalc, this.signal_opt);
		window.addEventListener('mouseup', this.selectStop, this.signal_opt)
	}

	recalc(event) {
		pt.x = event.clientX;
		pt.y = event.clientY;
		var svg_pt1 = pt.matrixTransform(matrixrf);

		this.rect_x = Math.min(this.svg_pt0.x, svg_pt1.x);
		this.rect_y = Math.min(this.svg_pt0.y, svg_pt1.y);
		this.rect_w = Math.abs(svg_pt1.x - this.svg_pt0.x);
		this.rect_h = Math.abs(svg_pt1.y - this.svg_pt0.y);

		setAttrsSvg(this.rect, {x: this.rect_x, y: this.rect_y, width: this.rect_w, height: this.rect_h});
	}

	selectStop() {
		window.removeEventListener('mousemove', this.recalc);
		window.removeEventListener('mouseup', this.selectStop);
		this.rect.removeAttribute('class');
		selection.activate(this.rect);
		this.delete();
	}

	delete() {
		this.rect.remove();
		super.delete();
	}
}


class Selection {
	constructor() {
		this.atoms = new Set(); // Selected atoms
		this.bonds = new Set(); // Selected bonds
		this.highlights = document.getElementById('selecthighlight');
		this.transform_tool = null;
		this.bottom_ptr = Infinity;
		['startMoving', 'moving', 'finishMoving'].forEach(method => this[method] = this[method].bind(this));
	}

	static parent_map = {
		'atoms': 'sensors_a',
		'bonds': 'sensors_b'
	}

	static objsUnderShape(parent_id, covering_shape) {
		return [...document.getElementById(parent_id).children].map(el => el.objref)
			.filter(el => {
				var pt = new DOMPoint(...el.xy).matrixTransform(matrixrf.inverse());
				return document.elementFromPoint(pt.x, pt.y) == covering_shape;
			});
	}

	activate(covering_shape) {
		this.selectFromShape(covering_shape);
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

	setSelectedAtoms(atom_ids) {
		this.atoms = new Set(atom_ids);
	}

	selectFromShape(covering_shape) {
		for (const [attr, parent_id] of Object.entries(this.constructor.parent_map)) {
			this[attr] = new Set(this.constructor.objsUnderShape(parent_id, covering_shape).map(item => item.id));
		}
	}

	highlight() {
		[...this.atoms, ...this.bonds].forEach(item_id => document.getElementById(item_id).objref.select());
	}

	deselect() {
		this.atoms.clear();
		this.bonds.clear();
	}

	dehighlight() {
		excludeNonExisting([...this.atoms, ...this.bonds]).forEach(item_id => document.getElementById(item_id).objref.deselect());
	}

	startMoving(event) { // Click on selection
		event.stopPropagation();
		this.indicator = new Indicator('utils');
		this.mo_st = getSvgPoint(event);
		this.accum_vec = [0, 0];
		window.addEventListener('mousemove', this.moving);
		window.addEventListener('mouseup', this.finishMoving);
	}

	moving(event) { // Active moving
		var pt = getSvgPoint(event);
		var moving_vec = vecDif(this.mo_st, pt);
		this.accum_vec = vecSum(this.accum_vec, moving_vec);
		this.indicator.setText(`\u0394x: ${this.accum_vec[0].toFixed(0)}\n\u0394y: ${this.accum_vec[1].toFixed(0)}`, event);
		this.mo_st = pt;
		this.relocatingAtoms('moving', {moving_vec: moving_vec});
		if (this.transform_tool) this.transform_tool.translate(moving_vec);
	}

	finishMoving() {
		window.removeEventListener('mousemove', this.moving);
		window.removeEventListener('mouseup', this.finishMoving);
		this.finishRelocatingAtoms('moving', {moving_vec: this.accum_vec});
	}

	relocatingAtoms(action_type, kwargs) {
		kwargs[action_type + '_atoms'] = new Set(excludeNonExisting(this.atoms));
		editStructure(kwargs);
	}

	finishRelocatingAtoms(action_type, kwargs) {
		this.bottom_ptr = Math.min(this.bottom_ptr, dispatcher.ptr);
		kwargs[action_type + '_atoms'] = new Set(excludeNonExisting(this.atoms));
		dispatcher.addCmd(editStructure, kwargs, editStructure, invertCmd(kwargs));
		overlap.refresh();
		if (!this.highlights.hasChildNodes()) this.deselect(); // Picked atom or bond
	}

	undoRedo(cmd, is_undo) {
		if (this.highlights.hasChildNodes()) {
			if (dispatcher.ptr + is_undo <= this.bottom_ptr) {
				this.removeTransformTool();
				this.addTransformTool();
			}
			else if (this.transform_tool) {
				if (cmd.moving_atoms) this.transform_tool.translate(cmd.moving_vec);
				if (cmd.rotating_atoms) this.transform_tool.rotate(cmd.rot_angle, cmd.rot_ctr);
				if (cmd.scaling_atoms) this.transform_tool.scale(cmd.scale_factor, cmd.scale_ctr);
				if (cmd.stretching_atoms) this.transform_tool.stretch(cmd.stretch_factor, cmd.dir_angle, cmd.stretch_ctr);
			}
			else {
				this.addTransformTool();
			}
		}
		else {
			this.removeTransformTool();
		}
	}

	deactivate() {
		this.highlights.removeEventListener('mousedown', this.startMoving);
		this.removeTransformTool();
		this.bottom_ptr = Infinity;
		this.dehighlight();
		this.deselect();
		ChemNode.delSel.clear();
		ChemBond.delSel.clear();
	}
}

var selection = new Selection();


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
		var rot_en = Math.atan2(...vecDif(this.pivot.xy, getSvgPoint(event)).toReversed());
		var rot_angle = rot_en - this.rot_st;
		this.accum_rot_angle += rot_angle;
		this.indicator.setText(`${((this.accum_rot_angle * 180 / Math.PI - 540) % 360 + 180).toFixed(1)} \u00B0`, event);
		this.rot_st = rot_en;
		this.rotate(rot_angle, this.pivot.xy);
		selection.relocatingAtoms('rotating', {rot_angle: rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	finishRotating() {
		window.removeEventListener('mousemove', this.rotating);
		window.removeEventListener('mouseup', this.finishRotating);
		selection.finishRelocatingAtoms('rotating', {rot_angle: this.accum_rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	rotate(rot_angle, rot_ctr) {
		this.pivot.setCtr(rot_ctr).render();
		this.xy = rotateAroundCtr(this.xy, rot_angle, rot_ctr)
		this.jigs.slice(1).forEach(jig => {
			jig.setCtr(rotateAroundCtr(jig.xy, rot_angle, rot_ctr)).rotate(rot_angle).render();
		});
	}

	// Scaling
	startScaling(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_scale_factor = 1;
		this.curr_jig = event.target.objref;
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, getSvgPoint(event));
		window.addEventListener('mousemove', this.scaling, this.signal_opt);
		window.addEventListener('mouseup', this.finishScaling, this.signal_opt);
	}

	scaling(event) {
		var factor = this.getFactor();
		this.accum_scale_factor *= factor;
		this.indicator.setText(`${(this.accum_scale_factor * 100).toFixed(1)}%`, event);
		this.scale(factor, this.pivot.xy);
		selection.relocatingAtoms('scaling', {scale_factor: factor, scale_ctr: [...this.pivot.xy]});
	}

	finishScaling() {
		window.removeEventListener('mousemove', this.scaling);
		window.removeEventListener('mouseup', this.finishScaling);
		selection.finishRelocatingAtoms('scaling', {scale_factor: this.accum_scale_factor, scale_ctr: [...this.pivot.xy]});
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
		this.accum_stretch_factor = 1;
		this.curr_jig = event.target.objref;
		this.dir_angle = Math.atan2(...vecDif(this.xy, this.curr_jig.xy).toReversed());
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, getSvgPoint(event));
		window.addEventListener('mousemove', this.stretching, this.signal_opt);
		window.addEventListener('mouseup', this.finishStretching, this.signal_opt);
	}

	stretching(event) {
		var factor = this.getFactor();
		this.accum_stretch_factor *= factor;
		this.indicator.setText(`${(this.accum_stretch_factor * 100).toFixed(1)}%`, event);
		this.stretch(factor, this.dir_angle, this.pivot.xy);
		selection.relocatingAtoms('stretching', {stretch_factor: factor, dir_angle: this.dir_angle, stretch_ctr: [...this.pivot.xy]});
	}

	finishStretching() {
		window.removeEventListener('mousemove', this.stretching);
		window.removeEventListener('mouseup', this.finishStretching);
		selection.finishRelocatingAtoms('stretching', {stretch_factor: this.accum_stretch_factor, dir_angle: this.dir_angle, stretch_ctr: [...this.pivot.xy]});
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
		this.pivot_mo_st = getSvgPoint(event); // Cursor coordinates when dragging of pivot was started
		window.addEventListener('mousemove', this.movingPivot, this.signal_opt);
		window.addEventListener('mouseup', this.finishMovingPivot, this.signal_opt);
	}
		
	movingPivot(event) {
		var pt = getSvgPoint(event);
		var moving_vec = vecDif(this.pivot_mo_st, pt);
		this.indicator.setText(`x: ${pt[0].toFixed(0)}\n\y: ${pt[1].toFixed(0)}`, event);
		this.pivot_mo_st = pt;
		this.pivot.translate(moving_vec).render();
	}

	finishMovingPivot() {
		window.removeEventListener('mousemove', this.movingPivot);
		window.removeEventListener('mouseup', this.finishMovingPivot);
	}

	// Utils
	getFactor() {
		var corrected_point = vecDif(this.init_ctr_pt_error, getSvgPoint(event));
		var transform_vec = vecDif(this.pivot.xy, corrected_point);
		var ref_vec = vecDif(this.pivot.xy, this.curr_jig.xy);
		var dir_vec = vecDif(this.xy, this.curr_jig.xy);
		var factor = vecDotProd(dir_vec, transform_vec) / vecDotProd(dir_vec, ref_vec);
		return Math.abs(factor) > 0.01 ? factor : 1;
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
		this.text = attachSvg(document.getElementById(parent_id), 'text', {style: styleToString(this.constructor.textstyle), id: 'indicator'});
		this.delete = this.delete.bind(this);
		window.addEventListener('mouseup', this.delete, this.signal_opt);
	}

	static textstyle = {
		fill: 'white',
		'font-family': 'Arial',
		'font-size': '12px',
		'font-weight': 'bold'
	}

	setText(text, event) {
		while (this.text.childElementCount) this.text.lastChild.remove();
		var pt = getSvgPoint(event);
		setAttrsSvg(this.text, {x: pt[0], y: pt[1]});
		text.split('\n').toReversed().forEach((line, idx) => attachSvg(this.text, 'tspan', {x: pt[0], dy: `${-1.2}em`}).appendChild(document.createTextNode(line)));
		var bbox = this.text.getBBox();
		[...this.text.children].forEach(tspan => setAttrsSvg(tspan, {x: pt[0] * 2 + 4 - bbox.x - bbox.width / 2}));
		bbox = this.text.getBBox();
		setAttrsSvg(this.rect, {x: bbox.x - 2, y: bbox.y, width: bbox.width + 4, height: bbox.height + 2});
	}

	delete() {
		this.rect.remove();
		this.text.remove();
		super.delete();
	}
}


for (const elbtn of elbtns) chemNodeHandler(elbtn);
chemBondHandler(bondbtn, 1, 0); // Normal bond
chemBondHandler(dbondbtn, 8, 2); // Upper bond
chemBondHandler(upperbtn, 2, 1); // Upper bond
chemBondHandler(lowerbtn, 5, 3); // Upper bond
deleteHandler(delbtn);
moveHandler(movebtn);
textHandler(textbtn);
polygonHandler(pentagonbtn, 5);
polygonHandler(hexagonbtn, 6);
polygonHandler(heptagonbtn, 7);
polygonHandler(benzenebtn, 6, true);
transformHandler(transformbtn);
