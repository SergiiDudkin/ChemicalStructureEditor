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

var svgsnippets = {
	'bond': '<text class="but" x="9" y="22" fill="black">&#9585;</text>',
	'erase': `<path style="fill:none;stroke:black;stroke-width:2;" d="M2.5,19.6c-0.7-0.7-0.7-0.7,0-1.4L18.1,2.6c0.7-0.7,0.7-0.7,1.4,0l7.8,7.8c0.7,0.7,0.7,0.7,0,1.4L15.6,23.5c-3.2,3.2-6,3.2-9.2,0L2.5,19.6z"/>
			<rect x="12.7" y="4.8" transform="matrix(0.7072 0.7071 -0.7071 0.7072 13.2169 -10.3978)" width="13" height="12"/>`,
	'move': `<line style="fill:none;stroke:black;stroke-width:2;" x1="15" y1="7" x2="15" y2="23"/>
			<line style="fill:none;stroke:black;stroke-width:2;" x1="7" y1="15" x2="23" y2="15"/>
			<polygon points="3,15 7.5,10.5 7.5,19.5 "/>
			<polygon points="27,15 22.5,19.5 22.5,10.5 "/>
			<polygon points="15,27 10.5,22.5 19.5,22.5 "/>
			<polygon points="15,3 19.5,7.5 10.5,7.5 "/>`
}

function insertFancyBtn(domelem, txt, classes, snippets=svgsnippets) {
	var svgsnippet;
	if (txt in snippets) svgsnippet = snippets[txt];
	else svgsnippet = `<text class='but' x='15' y='17' fill='black' dominant-baseline='middle' text-anchor='middle'>${txt}</text>`;

	var id = `btn_${txt}`;
	var htmltemplate = `
	<svg width='36' height='36' display='block'>
		<mask class='elmsk' id='mask_${txt}'>
			<rect x='0' y='0' width='30' height='30' fill='white' />
			${svgsnippet}
		</mask>
		<g filter='url(#shadow)'>
			<rect class='${classes}' id='${id}' x='0' y='0' width='32' height='32' mask='url(#mask_${txt})' />
		</g>
	</svg>`;
	domelem.insertAdjacentHTML('afterend', htmltemplate);
	return document.getElementById(id);
}

var filters = document.getElementById('filters');
var textbtn = insertFancyBtn(filters, 'T', 'fancybtn but brick');
var movebtn = insertFancyBtn(filters, 'move', 'fancybtn but brick');
var delbtn = insertFancyBtn(filters, 'erase', 'fancybtn but brick');
var bondbtn = insertFancyBtn(filters, 'bond', 'fancybtn but brick');
var upperbtn = insertFancyBtn(filters, 'up', 'fancybtn but brick');
var dbondbtn = insertFancyBtn(filters, 'db', 'fancybtn but brick');
var elbtnseq = ['Mg', 'I', 'Br', 'Cl', 'F', 'S', 'N', 'O', 'C', 'H'];
var elbtns = elbtnseq.map(el => insertFancyBtn(filters, el, 'elbut fancybtn but brick'));


function fancyBtnAnimation(btns) { // Button click animation

	var curbtnid;
	for (const btn of btns) btn.addEventListener('mousedown', btnDown);

	function btnDown(event) { // Change appearance of fancy buttons. Called when a chemical element button is clicked
		var target = event.target;
		var btng = target.parentNode;
		btng.setAttribute('filter', 'url(#okshadow)'); // Filter for pressed button
		btng.setAttribute('transform', 'translate(16 16) scale(0.94) translate(-16 -16)');
		curbtnid = target.id
		window.addEventListener('mouseup', btnUp);
	}

	function btnUp() {
		var target = document.getElementById(curbtnid);
		var btng = target.parentNode;
		btng.setAttribute('filter', 'url(#shadow)');
		btng.setAttribute('transform', 'translate(16 16) scale(1) translate(-16 -16)');
		window.removeEventListener('mouseup', btnUp);
	}
}

// Resize the canvas
pt = canvas.createSVGPoint();       
function svgWidth(event) {
	canvas.setAttribute("width", 0);
	wmax = mainframe.offsetWidth - 40;
	canvbckgrnd.setAttribute("width", wmax);
	canvas.setAttribute("width", wmax + 4);
	matrixrf = canvas.getScreenCTM().inverse();
}
window.addEventListener('resize', svgWidth);
svgWidth();
window.addEventListener('scroll', function() {
	matrixrf = canvas.getScreenCTM().inverse();
})


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
};

Dispatcher.prototype.undo = function() {
	if (this.ptr <= 0) return;
	var command = this.commands[--this.ptr][1]; // Fetch command
	command.func(command.args); // Execute the given function with args
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

function discreteAngle(pt0, [x, y]) {
	// Returns pt1 with discrete angle and fixed length
	tan = Math.abs(y / x);
	for (var j = 0; j < tantab.length; j++) if (tan < tantab[j]) break; // Find angle index j
	return [x, y].map((dim, i) => pt0[i] + Math.sign(dim) * dxytab[j][i] * standard_bondlength);
}

function pickNodePoint(event) {
	var node = atomsall.contains(event.target) ? event.target.parentNode.objref : null;
	var pt = node ? node.xy : getSvgPoint(event);
	return [pt, node];
}

function getBondEnd(event, pt0) {
	var [pt1, node1] = pickNodePoint(event);
	var difxy = vecDif(pt0, pt1);
	if (vecLen(difxy) < 16) return [null, null];
	if (!node1) {
		[pt.x, pt.y] = discreteAngle(pt0, difxy);
		var svgP2 = pt.matrixTransform(matrixrf.inverse());
		var pt_elem = document.elementFromPoint(svgP2.x, svgP2.y);
		if (pt_elem != null && atomsall.contains(pt_elem)) node1 = pt_elem.parentNode.objref;
		pt1 = node1 ? node1.xy : [pt.x, pt.y];
	}
	return [pt1, node1];
}


function chemNodeHandler(elbtns) {
	var node0, pt0, cursoratom, atomtext, old_atomtext, new_atomtext, new_node0id, new_node1id, new_bond_id, node0_is_new, node0_id;
	for (const elbtn of elbtns) elbtn.addEventListener('click', crElem);

	function crElem(event) { // Turn on creating of a new atom. Called when a chemical element button is clicked.
		atomtext = event.target.id.slice(4);
		cursoratom = getCursorAtom(event, atomtext);
		window.addEventListener('mousemove', movElem);
		window.addEventListener('mousedown', setElem);
	}

	function movElem(event) { // Move cursor atom
		// console.log(clampToCnv(getSvgPoint(event)), cursoratom.xy, vecDif(clampToCnv(getSvgPoint(event)), cursoratom.xy));
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
		if (document.getElementById(new_bond_id) === null && node0_is_new) dispatcher.undo();
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		window.removeEventListener('mouseup', finNode);
		window.removeEventListener('mousemove', movBoundNode);
		window.addEventListener('mousemove', movElem);
	}
}


function chemBondHandler(btn, init_type, rotation_schema) {
	var node0, pt0, new_node0id, new_node1id, new_bond_id, node0id;
	btn.addEventListener('click', crBond);

	function crBond(event) { // Create bond. Called when the bond button is cklicked.
		window.addEventListener('mousedown', stBond);
	}

	function stBond(event) { // Start drawing bond. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Bond starts within the canvas. Continue drawing.
			if (bondsall.contains(event.target)) { // If an existing bond was clicked, change its multiplicity
				var focobj = event.target.parentNode.objref;
				var kwargs = {bonds_type: {[focobj.g.id]: focobj.getNextType(rotation_schema)}};
				dispatcher.do(editStructure, kwargs);
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
		document.styleSheets[0].cssRules[0].selectorText = '#stub0';
		document.styleSheets[0].cssRules[1].selectorText = '#stub1';
		window.removeEventListener('mouseup', enBond);
		window.removeEventListener('mousemove', movBond);
	}
}


function deleteHandler(delbtn) {
	delbtn.addEventListener('click', delNodeOrBond);

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
	movebtn.addEventListener('click', moveInit);

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
		var atoms_slctd_clone = new Set(atoms_slctd);
		var kwargs = {moving_atoms: atoms_slctd_clone, moving_vec: accum_vec}
		var kwargs_rev = {moving_atoms: atoms_slctd_clone, moving_vec: vecMul(accum_vec, -1)};
		dispatcher.addCmd(editStructure, kwargs, editStructure, kwargs_rev);
		if (!is_selected) clearSlct();
		window.removeEventListener('mousemove', moving);
		window.removeEventListener('mouseup', finishMoving);
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
	textbtn.addEventListener('click', crText);

	function crText(event) {
		window.addEventListener('mousedown', addInput);
		document.addEventListener('keydown', event => {if (event.key == 'Enter') addInput(event)});
	}

	function addInput(event) {
		// console.log(event.target);
		var old_input = document.getElementById('txt-input');
		if (old_input) {
			var kwargs = {atoms_text: {[node.g.id]: (old_input.value ? '@' : '') + old_input.value}};
			dispatcher.do(editStructure, kwargs);
			old_input.remove();
		};
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
			if (event.target.id != 'txt-input') window.removeEventListener('mousedown', addInput);
		}
	}
}


fancyBtnAnimation(fancybtns);
chemNodeHandler(elbtns);
deleteHandler(delbtn);
moveHandler(movebtn);
chemBondHandler(bondbtn, 1, 0); // Normal bond
chemBondHandler(upperbtn, 2, 1); // Upper bond
chemBondHandler(dbondbtn, 8, 2); // Upper bond
textHandler(textbtn);
