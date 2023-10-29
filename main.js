var canvas = document.getElementById('canvas');
var canvas_container = document.getElementById('canvas-container');
var mainframe = document.getElementById('mainframe');
var canvbckgrnd = document.getElementById('canvbckgrnd');
var bondsall = document.getElementById('bondsall');
var atomsall = document.getElementById('atomsall');
var fancybtns = document.getElementsByClassName('fancybtn');
var ahl = document.getElementById('atomhighlights');
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


class FancyButton {
	constructor(parent, thml_text) {
		this.createSvg();
		this.setImage(thml_text);
		this.animateBtnDown = this.animateBtnDown.bind(this);
		this.animateBtnUp = this.animateBtnUp.bind(this);
		this.rect.addEventListener('mousedown', this.animateBtnDown);
		this.appendToParent(parent)
	}

	static btn_num = 0;
	static id_prefix = 'fb';

	static getBtnNum() {
		return this.btn_num++;
	}

	createSvg() {
		var btn_num = this.constructor.getBtnNum()

		this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svg.setAttribute('width', '36');
		this.svg.setAttribute('height', '36');

		this.mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
		this.mask.setAttribute('id', this.constructor.id_prefix + btn_num + 'mask');
		this.mask.setAttribute('class', 'elmsk');
		this.svg.appendChild(this.mask);

		this.white_bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		this.white_bg.setAttribute('x', '0');
		this.white_bg.setAttribute('y', '0');
		this.white_bg.setAttribute('width', '30');
		this.white_bg.setAttribute('height', '30');
		this.white_bg.setAttribute('fill', 'white');
		this.mask.appendChild(this.white_bg);

		this.img = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.mask.appendChild(this.img);

		this.filter_g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.filter_g.setAttribute('filter', 'url(#shadow)')
		this.svg.appendChild(this.filter_g);

		this.rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
		this.rect.setAttribute('class', 'fancybtn but brick');
		this.rect.setAttribute('x', '0');
		this.rect.setAttribute('y', '0');
		this.rect.setAttribute('width', '32');
		this.rect.setAttribute('height', '32');
		this.rect.setAttribute('mask', `url(#${this.constructor.id_prefix}${btn_num}mask)`);
		this.rect.objref = this;
		this.filter_g.appendChild(this.rect);
	}

	appendToParent(parent) {
		parent.appendChild(this.svg);
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
		this.filter_g.setAttribute('filter', 'url(#shadow)');
		this.filter_g.setAttribute('transform', 'translate(16 16) scale(1) translate(-16 -16)');
		window.removeEventListener('mouseup', this.animateBtnUp);
	}
}


class DropButton extends FancyButton {
	static id_prefix = 'db';
	static hflex_term = 0;

	static setHflexMargin(margin) {
		this.hflex_term = 6 - margin;
	}

	appendToParent(parent) {
		// ToDo: Consider detouching "this." from drop_container (use var instead)
		this.drop_container = document.createElement('div');
		this.drop_container.classList.add('dropcont');
		this.drop_container.appendChild(this.svg);
		parent.appendChild(this.drop_container);

		this.hflex = document.createElement('div');
		this.hflex.classList.add('dropflex');
		this.hflex.style.top = this.drop_container.offsetTop + 'px';
		this.drop_container.appendChild(this.hflex);

		this.drop_container.addEventListener('pointerenter', event => {
			var term = this.constructor.hflex_term;
			var top = this.drop_container.offsetTop - 48;
			var right = Math.min(event.target.lastChild.childElementCount * 36, wmax - 2 + term);
			clipCnv(`M 0 ${top + term} H ${right - term} V ${top + 42 - term} H 0 Z`);
		});
		this.drop_container.addEventListener('pointerleave', event => clipCnv());
	}

	appendChild(child) {
		child.setAttribute('height', 36 - this.constructor.hflex_term);
		child.setAttribute('width', 36 - this.constructor.hflex_term);
		if (this.hflex.hasChildNodes()) this.hflex.lastChild.setAttribute('width', 36);
		this.hflex.appendChild(child);
		this.hflex.style.width = (parseInt(this.hflex.style.width) + 36) + 'px';
	}
}

DropButton.setHflexMargin(2);



function toBtnText(text) {
	return `<text class='but' x='15' y='17' fill='black' dominant-baseline='middle' text-anchor='middle'>${text}</text>`;
}

var flex_container = document.getElementsByClassName('flex-container')[0];

var elbtnseq = ['H', 'C', 'O', 'N', 'S', 'F', 'Cl', 'Br', 'I', 'Mg'];

var movebtn = new FancyButton(flex_container, `
	<line style="fill:none;stroke:black;stroke-width:2;" x1="15" y1="7" x2="15" y2="23"/>
	<line style="fill:none;stroke:black;stroke-width:2;" x1="7" y1="15" x2="23" y2="15"/>
	<polygon points="3,15 7.5,10.5 7.5,19.5 "/>
	<polygon points="27,15 22.5,19.5 22.5,10.5 "/>
	<polygon points="15,27 10.5,22.5 19.5,22.5 "/>
	<polygon points="15,3 19.5,7.5 10.5,7.5 "/>
`);
var dropelbtn = new DropButton(flex_container, toBtnText('A'))
var elbtns = elbtnseq.map(atom => new FancyButton(dropelbtn, toBtnText(atom)));
var dropbondbtn = new DropButton(flex_container, toBtnText('B'))
var bondbtn = new FancyButton(dropbondbtn, '<text class="but" x="9" y="22" fill="black">&#9585;</text>');
var dbondbtn = new FancyButton(dropbondbtn, toBtnText('db'));
var upperbtn = new FancyButton(dropbondbtn, toBtnText('up'));
var lowerbtn = new FancyButton(dropbondbtn, toBtnText('dw'));
var delbtn = new FancyButton(flex_container, `
	<path style="fill:none;stroke:black;stroke-width:2;" d="M2.5,19.6c-0.7-0.7-0.7-0.7,0-1.4L18.1,2.6c0.7-0.7,0.7-0.7,1.4,0l7.8,7.8c0.7,0.7,0.7,0.7,0,1.4L15.6,23.5c-3.2,3.2-6,3.2-9.2,0L2.5,19.6z"/>
	<rect x="12.7" y="4.8" transform="matrix(0.7072 0.7071 -0.7071 0.7072 13.2169 -10.3978)" width="13" height="12"/>
`);
var textbtn = new FancyButton(flex_container, toBtnText('T'));
var dropcycbtn = new DropButton(flex_container, toBtnText('Cy'))
var pentagonbtn = new FancyButton(dropcycbtn, toBtnText('5'));
var hexagonbtn = new FancyButton(dropcycbtn, toBtnText('6'));
var heptagonbtn = new FancyButton(dropcycbtn, toBtnText('7'));
var benzenebtn = new FancyButton(dropcycbtn, toBtnText('Ph'));


var cnvclip = document.getElementById('cnvclip')
function clipCnv(extra='') {
	cnvclip.firstElementChild.setAttribute('d', `M 0 0 H ${wmax - 2} V 564 H 0 Z ${extra}`);
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


// Geometry utilities
function lineIntersec([x1, y1], [x2, y2], [x3, y3], [x4, y4]) { // Find intersection point of two lines
	var a = x1 * y2 - y1 * x2;
	var b = x3 - x4;
	var c = x1 - x2;
	var d = x3 * y4 - y3 * x4;
	var e = y3 - y4;
	var f = y1 - y2;
	var g = c * e - f * b;
	if (g == 0) {
		throw new Error('Non-intersecting lines!')
	};
	var ipoi_y = (a * e - f * d) / g; // Intersection point, x value
	var ipoi_x = (a * b - c * d) / g; // Intersection point, y value
	return [ipoi_x, ipoi_y];
}

function sqVecLen([x, y]) { // Find squired length of vector
	return x * x + y * y;
}

function vecLen(xy) { // Find length of vector
	return Math.sqrt(sqVecLen(xy));
}

function findDist(xy0, xy1) { // Find distance between two points
	return vecLen(vecDif(xy0, xy1));
}

function unitVec(xy) { // Find unit vector
	return vecDiv(xy, vecLen(xy))
}

function vecSum([x0, y0], [x1, y1]) { // Add vectors
	return [x0 + x1, y0 + y1];
}

function vecDif([x0, y0], [x1, y1]) { // Subtract vectors
	return [x1 - x0, y1 - y0];
}

function vecMul([x, y], factor) { // Multiply vector by scalar value
	return [x * factor, y * factor];
}

function vecDiv([x, y], divisor) { // Divide vector by scalar value
	return [x / divisor, y / divisor];
}

function vecDotProd([x0, y0], [x1, y1]) { // Find dot product
	return x0 * x1 + y0 * y1;
}

function vecCrossProd([x0, y0], [x1, y1]) { // Find dot product
	return x0 * y1 - x1 * y0;
}

function clampSinCos(val) {
	return Math.min(Math.max(val, -1), 1); // Clamp sin or cos against calculation noise
}

function cosVec(xy0, xy1) { // Find cos between two vectors
	return clampSinCos(vecDotProd(xy0, xy1) / (vecLen(xy0) * vecLen(xy1)));
}

function sinVec(xy0, xy1) { // Find sin between two vectors
	return clampSinCos(vecCrossProd(xy0, xy1) / (vecLen(xy0) * vecLen(xy1)));
}

function angleVec(xy0, xy1) { // Calculate angle (in rad*pi) between two vectors
	var angle = Math.atan2(vecCrossProd(xy0, xy1), vecDotProd(xy0, xy1));
	return (angle / Math.PI + 2) % 2;
}

function rotateVec([x, y], angle) { // Rotate vector
	var cosa = Math.cos(angle);
	var sina = Math.sin(angle);
	var newx = x * cosa - y * sina;
	var newy = x * sina + y * cosa;
	return [newx, newy];
}

function rot90cw([x, y]) {
	return [-y, x];
}

function rot90acw([x, y]) {
	return [y, -x];
}

function angleBisector(xy0, xy1) { // Not normalized, no direction control
	if (vecDotProd(xy0, xy1) < 0) { // If obtuse angle, rotate vectors 90 deg towards each other for better precision
		xy0 = rot90cw(xy0);
		xy1 = rot90acw(xy1);
	}
	return vecSum(unitVec(xy0), unitVec(xy1));
}

function polygonAngle(num) {
	return Math.PI * (1 - 2 / num);
}

function polygonEdgeCtrDist(angle, side_len) {
	return side_len * Math.tan(angle / 2) / 2;
}

function polygonVertexCtrDist(angle, side_len) {
	return side_len / Math.cos(angle / 2) / 2;
}

function getAngleSigns(a_xy0, a_xy1, b_xy0, b_xy1) {
	var vec_a = vecDif(a_xy0, a_xy1);
	var vec_b = vecDif(b_xy0, b_xy1);
	var sign_a1_a0_b0 = Math.sign(sinVec(vec_a, vecDif(a_xy0, b_xy0)));
	var sign_a1_a0_b1 = Math.sign(sinVec(vec_a, vecDif(a_xy0, b_xy1)));
	var sign_b1_b0_a0 = Math.sign(sinVec(vec_b, vecDif(b_xy0, a_xy0)));
	var sign_b1_b0_a1 = Math.sign(sinVec(vec_b, vecDif(b_xy0, a_xy1)));
	return [sign_a1_a0_b0, sign_a1_a0_b1, sign_b1_b0_a0, sign_b1_b0_a1];
}

function checkIntersec(a_xy0, a_xy1, b_xy0, b_xy1) {
	var angle_signs = getAngleSigns(a_xy0, a_xy1, b_xy0, b_xy1);
	var no_zero_angle = !angle_signs.some(sign => sign == 0);
	var no_common_terminals = !angle_signs.some(sign => Number.isNaN(sign));
	var [sign_a1_a0_b0, sign_a1_a0_b1, sign_b1_b0_a0, sign_b1_b0_a1] = angle_signs;
	var has_common_point = (sign_a1_a0_b0 != sign_a1_a0_b1) && (sign_b1_b0_a0 != sign_b1_b0_a1);
	return has_common_point && no_zero_angle && no_common_terminals;
}


function invertCmd(kwargs_dir) {
	var kwargs_rev = {new_atoms_data: {}, new_bonds_data: {}};
	if (kwargs_dir.del_atoms) kwargs_dir.del_atoms.forEach(id => {
		var node = document.getElementById(id).objref;
		kwargs_rev.new_atoms_data[id] = [...node.xy, node.text];
	});
	if (kwargs_dir.del_bonds) kwargs_dir.del_bonds.forEach(id => {
		var bond = document.getElementById(id).objref;
		kwargs_rev.new_bonds_data[id] = [...bond.nodes.map(node => node.g.id), bond.type];
	});
	if (kwargs_dir.new_atoms_data) kwargs_rev.del_atoms = new Set(Object.keys(kwargs_dir.new_atoms_data));
	if (kwargs_dir.new_bonds_data) kwargs_rev.del_bonds = new Set(Object.keys(kwargs_dir.new_bonds_data));
	if (kwargs_dir.atoms_text) kwargs_rev.atoms_text = Object.fromEntries(Object.keys(kwargs_dir.atoms_text).map(
		id => [id, document.getElementById(id).objref.text]
	));
	if (kwargs_dir.bonds_type) kwargs_rev.bonds_type = Object.fromEntries(Object.keys(kwargs_dir.bonds_type).map(
		id => [id, document.getElementById(id).objref.type]
	));
	if (kwargs_dir.moving_atoms) kwargs_rev.moving_atoms = kwargs_dir.moving_atoms.slice(); 
	if (kwargs_dir.moving_vec) kwargs_rev.moving_vec = vecMul(kwargs_dir.moving_vec, -1);
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
};

Dispatcher.prototype.undo = function() {
	if (this.ptr <= 0) return;
	var command = this.commands[--this.ptr][1]; // Fetch command
	command.func(command.args); // Execute the given function with args
	overlap.refresh();
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
	cursoratom.g.firstChild.setAttribute('class', 'cursor-circ');
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
	var node = atomsall.contains(event.target) ? event.target.parentNode.objref : null;
	var pt = node ? node.xy : getSvgPoint(event);
	return [pt, node];
}

function pickNode([x, y]) {
	[pt.x, pt.y] = [x, y];
	var svgP2 = pt.matrixTransform(matrixrf.inverse());
	var pt_elem = document.elementFromPoint(svgP2.x, svgP2.y);
	return (pt_elem != null && atomsall.contains(pt_elem)) ? pt_elem.parentNode.objref : null;
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
				) this.new_masks.push([bond0.g.id, bond1.g.id].sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1))).join('&'));
				bond1 = bond_group[++j];
			}
		}
	}

	refresh(exclude=[]) {
		var bond_group = Array.from(bondsall.children).map(el => el.objref).filter(bond => !exclude.includes(bond.g.id));
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
	elbtn.rect.addEventListener('click', crElem);

	function crElem(event) { // Turn on creating of a new atom. Called when a chemical element button is clicked.
		atomtext = event.target.objref.img.firstChild.textContent;
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
					var kwargs = {del_atoms: new Set([node0.g.id])};
					dispatcher.do(editStructure, kwargs);
					return;
				}
				old_atomtext = node0.text;
				new_atomtext = old_atomtext == atomtext ? '' : atomtext;
				node0_is_new = false;
				node0_id = node0.g.id;
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
			document.styleSheets[0].cssRules[0].selectorText = `${'#' + new_node1id}:hover .anode`;
			document.styleSheets[0].cssRules[1].selectorText = `${'#' + new_bond_id}:hover .brect`;
			window.addEventListener('mousemove', movBoundNode);
			window.addEventListener('mouseup', finNode);
		}
		else { // Click outside the canvas
			window.removeEventListener('mousedown', setElem);
			window.removeEventListener('mousemove', movElem);
			cursoratom.delete();
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
	btn.rect.addEventListener('click', crBond);

	function crBond(event) { // Create bond. Called when the bond button is cklicked.
		window.addEventListener('mousedown', stBond);
	}

	function stBond(event) { // Start drawing bond. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Bond starts within the canvas. Continue drawing.
			if (bondsall.contains(event.target)) { // If an existing bond was clicked, change its multiplicity
				var focobj = event.target.parentNode.objref;
				var kwargs = {bonds_type: {[focobj.g.id]: focobj.getNextType(rotation_schema)}};
				dispatcher.do(editStructure, kwargs);
				overlap.refresh();
			}
			else { // If blank space or a chem node was clicked, start drawing a new bond
				[pt0, node0] = pickNodePoint(event);
				new_node0id = ChemNode.prototype.getNewId();
				new_node1id = ChemNode.prototype.getNewId();
				new_bond_id = ChemBond.prototype.getNewId();
				node0id = node0 ? node0.g.id : new_node0id;
				var node_selectors = [new_node0id, new_node1id].map(id => '#' + id).join();
				document.styleSheets[0].cssRules[0].selectorText = `:is(${node_selectors}):hover .anode`;
				document.styleSheets[0].cssRules[1].selectorText = `${'#' + new_bond_id}:hover .brect`;
				window.addEventListener('mousemove', movBond);
				window.addEventListener('mouseup', enBond);
			}
		}
		else { // Bond starts outside of canvas. Exit drawing.
			window.removeEventListener('mousemove', movBond);
			window.removeEventListener('mousedown', stBond);
		}
	}

	function movBond(event) { // Move second end of the drawn bond
		if (document.getElementById(new_bond_id) !== null) dispatcher.undo();
		var [pt1, node1] = getBondEnd(event, pt0);
		var node1id = node1 ? node1.g.id : new_node1id;
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
	delbtn.rect.addEventListener('click', delNodeOrBond);

	function delNodeOrBond(event) { // Delete atom or bond. Called when del button is pressed.
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
		}
	}

	function erase(event) { // Active eraser
		if (atomsall.contains(event.target) || bondsall.contains(event.target)) {
			var focobj = event.target.parentNode.objref;
			if (focobj.constructor == ChemNode) var kwargs = {
				del_atoms: new Set([focobj.g.id]), 
				del_bonds: new Set(focobj.connections.map(bond => bond.g.id))
			};
			else if (focobj.constructor == ChemBond) var kwargs = {del_bonds: new Set([focobj.g.id])};
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
	
	var selectrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	selectrect.setAttribute('fill', 'none');
	selectrect.setAttribute('stroke', 'blue');
	selectrect.setAttribute('stroke-dasharray', 2);
	selectrect.setAttribute('stroke-width', 1);
	movebtn.rect.addEventListener('click', moveInit);

	function moveInit(event) {
		window.addEventListener('mousedown', moveAct);
	}

	function moveAct(event) { // When mouse button is down
		var parnode = event.target.parentNode;
		var is_atom = atomsall.contains(event.target.parentNode);
		var is_bond = bondsall.contains(event.target.parentNode);
		if (is_atom || is_bond) { // If atom or bond was clicked
			var poiobj = event.target.parentNode.objref;
			if (!atoms_slctd.has(poiobj.g.id) && !bonds_slctd.has(poiobj.g.id)) { // Clicked element was not previously selected
				deselectAll();
				if (is_atom) atoms_slctd.add(poiobj.g.id);
				else if (is_bond) poiobj.nodes.forEach(node => atoms_slctd.add(node.g.id));
			}
			mo_st = getSvgPoint(event);
			accum_vec = [0, 0];
			window.addEventListener('mousemove', moving);
			window.addEventListener('mouseup', finishMoving);
		}
		else {
			deselectAll()
			if (canvas.contains(event.target)) { // If clicked on of canvas, start selection.
				pt.x = event.clientX;
				pt.y = event.clientY;
				svgP0 = pt.matrixTransform(matrixrf);
				recalc(event);
				utils.appendChild(selectrect);
				window.addEventListener('mousemove', recalc);
				window.addEventListener('mouseup', selectStop);
			}
			else window.removeEventListener('mousedown', moveAct); // If clicked out of canvas, exit moving routine.
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

		selectrect.setAttribute('x', rect_x);
		selectrect.setAttribute('y', rect_y);
		selectrect.setAttribute('width', rect_w);
		selectrect.setAttribute('height', rect_h);
	}

	function selectStop() {
		window.removeEventListener('mousemove', recalc);
		window.removeEventListener('mouseup', selectStop);
		selectrect.remove();

		var rect_x1 = rect_x + rect_w;
		var rect_y1 = rect_y + rect_h;
		for (const el of [...atomsall.children, ...bondsall.children]) {
			obj = el.objref;
			var [x, y] = obj.xy;
			if (rect_x < x && x < rect_x1 && rect_y < y && y < rect_y1) {
				if (obj instanceof ChemNode) atoms_slctd.add(el.id);
				else bonds_slctd.add(el.id);
				obj.select();
			}
		}
		is_selected = Boolean(atoms_slctd.size); // ToDo: ? Consider bonds_slctd
	}
}


function textHandler(textbtn) {
	var pt, node;
	textbtn.rect.addEventListener('click', crText);

	function pressEnter(event) {
		if (event.key == 'Enter') setNodeText(event);
	}

	function crText(event) {
		window.addEventListener('mousedown', addInput);
		document.addEventListener('keydown', pressEnter);
	}

	function setNodeText() {
		var old_input = document.getElementById('txt-input');
		if (old_input) {
			var kwargs = {atoms_text: {[node.g.id]: (old_input.value ? '@' : '') + old_input.value}};
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
				input.style.setProperty('top', `${top}px`);
				input.style.setProperty('left', `${left}px`);
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

	polygonbtn.rect.addEventListener('click', crPolygon);

	function crPolygon(event) {
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
			else if (bondsall.contains(event.target)) { // Some bond was clicked
				stopCursor()
				common_bond = event.target.parentNode.objref;
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
			stopCursor()
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

		var [node0_id, node1_id] = (dir == 1 ? [0, 1] : [1, 0]).map(i => common_bond.nodes[i].g.id)
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
		new_bonds_data[new_bond_ids[0]][0] = common_node.g.id;
		new_bonds_data[new_bond_ids[num-1]][1] = common_node.g.id;
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
				node_pairs[id] = node.g.id;
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
					var new_type_casted = data[0] != old_bond.nodes[0].g.id ? ChemBond.rev_type[data[2]] : data[2];
					if (ChemBond.mult[data[2]] > 1 && old_bond.type != new_type_casted && is_sp3) {
						bonds_type[old_bond.g.id] = new_type_casted;
					}
				}
			}
		}
		return [new_atoms_data, new_bonds_data, bonds_type];
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
