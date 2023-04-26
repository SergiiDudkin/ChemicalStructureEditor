var canvas = document.getElementById('canvas');
var mainframe = document.getElementById('mainframe');
var canvbckgrnd = document.getElementById('canvbckgrnd');
var bondsall = document.getElementById('bondsall');
var atomsall = document.getElementById('atomsall');
var fancybtns = document.getElementsByClassName('fancybtn');
var ahl = document.getElementById('atomhighlights');
var pt, matrixrf, wmax; // Variables
var hmaxtab = {'H': 1, 'C': 4, 'N': 3, 'O': 2, 'S': 2, '': 0, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'Mg': 2};


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

	var htmltemplate = `
	<svg width='36' height='36' display='block'>
		<mask class='elmsk' id='mask_${txt}'>
			<rect x='0' y='0' width='30' height='30' fill='white' />
			${svgsnippet}
		</mask>
		<g filter='url(#shadow)'>
			<rect class='${classes}' id='btn_${txt}' x='0' y='0' width='32' height='32' mask='url(#mask_${txt})' />
		</g>
	</svg>`;
	domelem.insertAdjacentHTML('afterend', htmltemplate);
}

var filters = document.getElementById('filters');
insertFancyBtn(filters, 'move', 'fancybtn but brick');
insertFancyBtn(filters, 'erase', 'fancybtn but brick');
insertFancyBtn(filters, 'bond', 'fancybtn but brick');
var elbtnseq = ['Mg', 'I', 'Br', 'Cl', 'F', 'S', 'N', 'O', 'C', 'H'];
for (const txt of elbtnseq) insertFancyBtn(filters, txt, 'elbut fancybtn but brick');
var elbut = document.getElementsByClassName('elbut');
var bondbtn = document.getElementById('btn_bond');
var delbtn = document.getElementById('btn_erase');
var movebtn = document.getElementById('btn_move');

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
	matrixrf.e = Math.round(matrixrf.e);
	matrixrf.f = Math.round(matrixrf.f);
}
window.addEventListener('resize', svgWidth);
svgWidth();
window.addEventListener('scroll', function() {
	matrixrf = canvas.getScreenCTM().inverse();
	matrixrf.e = Math.round(matrixrf.e);
	matrixrf.f = Math.round(matrixrf.f);
})

var standard_bondlength = 40;
var bondspace = 2;
var angtab = [0, 15, 30, 45, 60, 75, 90]; // Target bond angles
var dxtab = []; // Vectors of resulting bond (X)
var dytab = []; // Vectors of resulting bond (Y)
var radtab = []; // The same as angtab, but in radians
var tantab = []; // Table of tan thresholds
for (const angle of angtab) { // Generate tables
	var angrad = angle * (Math.PI / 180); // Convert degrees to radians
	radtab.push(angrad);
	dxtab.push(Math.round(standard_bondlength * Math.cos(angrad)));
	dytab.push(Math.round(standard_bondlength * Math.sin(angrad)));
}

for (var i = 0; i < radtab.length-1; i++) tantab.push(Math.tan((radtab[i] + radtab[i+1]) / 2)); // Find thresholds

function getSvgPoint(event) {
	pt.x = event.clientX;
	pt.y = event.clientY;
	var svgP0 = pt.matrixTransform(matrixrf);
	return [svgP0.x, svgP0.y];
}

function clampX(x) {return Math.min(Math.max(x, 0), wmax);}

function clampY(y) {return Math.min(Math.max(y, 0), 564);}

function moveCursor(event, elem, atr0, atr1) { // Move second end of the drawn bond
	var focobj;
	var focnode = event.target.parentNode; // Get focused element
	if (atomsall.contains(focnode)) { // If the cursor is over some chemical element,
		elem.setAttribute(atr0, focnode.firstChild.getAttribute("cx")); // set x
		elem.setAttribute(atr1, focnode.firstChild.getAttribute("cy")); // and y coordinates of the drawn bond second end
		focobj = focnode.objref;
	}
	else {
		var x, y;
		[x, y] = getSvgPoint(event);
		focobj = null;

		if (atr0 == 'x2') { // Case of the bond end
			var difx, dify, singdx, singdy, tan, x1int, y1int, bondlength;
			x1int = parseInt(elem.getAttribute("x1"));
			y1int = parseInt(elem.getAttribute("y1"));
			difx = x - x1int;
			dify = y - y1int;
			difx = difx == 0 ? 0.001 : difx; // Prevent division by zero
			tan = Math.abs(dify) / Math.abs(difx);
			bondlength = Math.sqrt(difx * difx + dify * dify);
			
			if (bondlength >= 16) {
				for (var j = 0; j < tantab.length; j++) if (tan < tantab[j]) break;

				// Find target of the bond end
				pt.x = x1int + dxtab[j] * (difx < 0 ? -1 : 1); // Add x length with original sigh
				pt.y = y1int + dytab[j] * (dify < 0 ? -1 : 1); // Add y length with original sigh
				var svgP2 = pt.matrixTransform(matrixrf.inverse());
				var poi_elem = document.elementFromPoint(svgP2.x, svgP2.y);

				if (poi_elem != null && atomsall.contains(poi_elem.parentNode)) { // If end of the bond points an atom
					focnode = poi_elem.parentNode;
					elem.setAttribute(atr0, focnode.firstChild.getAttribute("cx"));
					elem.setAttribute(atr1, focnode.firstChild.getAttribute("cy"));
					focobj = focnode.objref;
				}
				else {
					elem.setAttribute(atr0, pt.x);
					elem.setAttribute(atr1, pt.y);
				}
			}
			else { // If the length is too small,
				elem.setAttribute(atr0, x1int); // contract the line to 0
				elem.setAttribute(atr1, y1int);
			}
		}
		else { // Case of chem node text of bond start
			elem.setAttribute(atr0, clampX(x));
			elem.setAttribute(atr1, clampY(y));
		}
	}
	return focobj;
}

function corrAtomPos(atom, x){
	var bbox = atom.getBBox();
	var bboxxctr = bbox.x + bbox.width / 2;
	error = (x - bboxxctr).toFixed(1);
	var widthcorr = -error * 1.5;
	if (error != 0) {
		atom.setAttribute('dx', -(atom.getBBox().width + widthcorr) / 2); // Adjust (center) position of text
	}
	return widthcorr
}

function argSort(arr) {
	var indices = [...Array(arr.length).keys()];
	// indices.sort((a, b) => arr[a].localeCompare(arr[b])); // For strings
	indices.sort((a, b) => arr[a] - arr[b]); // For numbers
	return indices;
}

// var ta = ['b', 'e', 'c', 'f', 'd', 'a'];
// var tb = [2, 1, 5, 7, 6, 0, 4, 3];

// var ind_a = argSort(ta);
// console.log('ind_a', ind_a);
// console.log(ind_a.map(idx => ta[idx]));
// console.log(argSort(ta).map(i => ta[i]));
// console.log(argSort(tb).map(i => tb[i]));



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

function sqVecLen(x, y) { // Find squired length of vector
	return x * x + y * y;
}

function vecLen(x, y) { // Find length of vector
	return Math.sqrt(sqVecLen(x, y));
}

function findDist(x0, y0, x1, y1) { // Find distance between two points
	return vecLen(...vecDif(x0, y0, x1, y1));
}

function unitVec(x, y) { // Find unit vector
	return vecDiv(x, y, vecLen(x, y))
}

function vecSum([x0, y0], [x1, y1]) { // Find sum of vector
	return [x0 + x1, y0 + y1];
}

function vecDif(x0, y0, x1, y1) { // Find sum of vector
	return [x1 - x0, y1 - y0];
}

function vecMul(x, y, factor) { // Multiply vector by scalar value
	return [x * factor, y * factor];
}

function vecDiv(x, y, divisor) { // Multiply vector by scalar value
	return [x / divisor, y / divisor];
}

function vecDotProd(x0, y0, x1, y1) { // Find dot product
	return x0 * x1 + y0 * y1;
}

function vecCrossProd(x0, y0, x1, y1) { // Find dot product
	return x0 * y1 - x1 * y0;
}

function clampSinCos(val) {
	return Math.min(Math.max(val, -1), 1); // Clamp sin or cos against calculation noise
}

function cosVec(x0, y0, x1, y1) { // Find cos between two vectors
	return clampSinCos(vecDotProd(x0, y0, x1, y1) / (vecLen(x0, y0) * vecLen(x1, y1)));
}

function sinVec(x0, y0, x1, y1) { // Find sin between two vectors
	return clampSinCos(vecCrossProd(x0, y0, x1, y1) / (vecLen(x0, y0) * vecLen(x1, y1)));
}

function angleVec(x0, y0, x1, y1) { // Calculate angle (in rad*pi) between two vectors
	var angle = Math.atan2(vecCrossProd(x0, y0, x1, y1), vecDotProd(x0, y0, x1, y1));
	return (angle / Math.PI + 2) % 2;
}

function rotateVec(x, y, angle) { // Rotate vector
	var cosa = Math.cos(angle);
	var sina = Math.sin(angle);
	var newx = x * cosa - y * sina;
	var newy = x * sina + y * cosa;
	return [newx, newy];
}

function rot90(x, y) {
	return [-y, x];
}

function angleBisector(x0, y0, x1, y1) { // Not normalized, no direction control
	if (vecDotProd(x0, y0, x1, y1) < 0) { // If obtuse angle, rotate vectors 90 deg towards each other for better precision
		[x0, y0] = [-y0, x0];
		[x1, y1] = [y1, -x1];
	}
	return vecSum(unitVec(x0, y0), unitVec(x1, y1));
}

/*
function testAngleBisector() { // For testing
	var x, y, difx, dify
	var bond0 = document.getElementById('b0').objref;
	var bond1 = document.getElementById('b1').objref;
	[x, y] = bond0.getNodeCenters(0);
	[difx, dify] = angleBisector(bond0.difx, bond0.dify, bond1.difx, bond1.dify);

	var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	line.setAttribute('style', "fill:none;stroke:#FF0000;stroke-width:1.0;");
	line.setAttribute('x1', x);
	line.setAttribute('y1', y);
	line.setAttribute('x2', x + difx * 20);
	line.setAttribute('y2', y + dify * 20);
	canvas.appendChild(line);
}
*/



function Dispatcher() { // Dispatcher provides undo-redo mechanism
	this.commands = [];
	this.ptr = 0;
}

Dispatcher.prototype.do = function(cmd_pair) {
	this.commands = this.commands.slice(0, this.ptr); // Delete extra commands
	this.commands.push(cmd_pair); // Add new command to the history
	this.redo(); // Move forvard along the history
};

Dispatcher.prototype.redo = function(command) {
	if (this.ptr >= this.commands.length) return;
	command = this.commands[this.ptr++][0]; // Fetch command
	command[0](...command.slice(1)); // Execute the given function with args
};

Dispatcher.prototype.undo = function() {
	if (this.ptr <= 0) return;
	command = this.commands[--this.ptr][1]; // Fetch command
	command[0](...command.slice(1)); // Execute the given function with args
};

Dispatcher.prototype.createSingleR = function(this_id, x, y, cursortext) {
	new ChemNode(x, y, cursortext, this_id).renderAtom();
};

Dispatcher.prototype.createSingleU = function(this_id, text) {
	document.getElementById(this_id).objref.g.remove();
};

Dispatcher.prototype.setAtomUR = function(this_id, text) {
	document.getElementById(this_id).objref.changeAtom(text);
};

Dispatcher.prototype.rotateMultUR = function(this_id, multiplicity) {
	bond = document.getElementById(this_id).objref;
	bond.multiplicity = multiplicity;
	bond.renderBond();
};

Dispatcher.prototype.deleteChemNodeR = function(this_id) {
	document.getElementById(this_id).objref.deleteWithBonds(); // Delete the atom [this] with bonds
};

Dispatcher.prototype.deleteChemNodeU = function(this_data, adjbonds_data, nextadjbonds_id, adjnodes_id) {
	node = new ChemNode(...this_data);  // Create atom [this]
	for (const data of adjbonds_data) { // Create bonds [...adjbonds]
		node0 = document.getElementById(data[0]).objref;
		node1 = document.getElementById(data[1]).objref;
		new ChemBond(node0, node1, data[2], data[3]);
	}
	node.restoreWithBonds();
};

Dispatcher.prototype.deleteChemBondR = function(this_id) {
	document.getElementById(this_id).objref.deleteBond(); // Delete bond
};

Dispatcher.prototype.deleteChemBondU = function(this_data) {
	var bond = new ChemBond(...this_data); // Create bond
	bond.renderBond();
	bond.restoreBond();
};


var dispatcher = new Dispatcher();

function keydownHandler(event) {
	if (event.ctrlKey && !event.repeat) {
		func = keydownHandler.keyfuncs[event.key];
		if (func !== undefined) dispatcher[func]();
	}
}

keydownHandler.keyfuncs = {
	'z': 'undo',
	'y': 'redo'
};

document.addEventListener('keydown', keydownHandler);


function chemNodeHandler(elbtns) {
	var focobj, cursoratom; // Atom symbol at the cursor
	for (const elbtn of elbtns) elbtn.addEventListener('click', crElem);

	function crElem(event) { // Create new atom. Called when a chemical element button is clicked
		cursoratom = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		cursoratom.setAttribute('class', 'chemtxt sympoi');
		cursoratom.setAttribute('style', "font-family:'Arial';font-size:12px;");
		cursoratom.appendChild(document.createTextNode(event.target.id.slice(4))); // Display atom as text
		cursoratom.setAttribute('dy', 4.5);
		canvas.appendChild(cursoratom);
		cursoratom.setAttribute('dx', -cursoratom.getBBox().width / 2);

		moveCursor(event, cursoratom, 'x', 'y');
		corrAtomPos(cursoratom, 0);
		window.addEventListener('mousemove', movElem);
		window.addEventListener('mousedown', setElem);

		// id = ChemNode.prototype.getNewId();
		// text = event.target.id.slice(4);
		// var [x, y] = getSvgPoint(event);
		// editStructure(new_atoms_data=[[id, clampX(x), clampY(y), text]]);
	}

	function movElem(event) {
		moveCursor(event, cursoratom, 'x', 'y');
	}

	function setElem(event) {
		if (canvas.contains(event.target)) { // Click inside the canvas
			focobj = moveCursor(event, cursoratom, 'x', 'y');
			var cursortext = cursoratom.textContent;
			if (focobj) { // If some atom was clicked
				// ToDo: ! Integrate with dispatcher.
				kwargs = {atoms_text: [[focobj, focobj.text == cursortext ? '' : cursortext]]};
				editStructure(kwargs);
			}
			else { // If blanc space was clicked
				// ToDo: ! Integrate with dispatcher.
				kwargs = {new_atoms_data: [[ChemNode.prototype.getNewId(), parseFloat(cursoratom.getAttribute('x')), parseFloat(cursoratom.getAttribute('y')), cursortext]]};
				editStructure(kwargs);
			}
		}
		else { // Click outside the canvas
			window.removeEventListener('mousemove', movElem);
			window.removeEventListener('mousedown', setElem);
			cursoratom.remove();
		}
	}
}

function chemBondHandler(bondbtn) {
	var focobj, focobjst;
	var cursorbond = document.createElementNS('http://www.w3.org/2000/svg', 'line');
	cursorbond.setAttribute('class', 'sympoi');
	cursorbond.setAttribute('style', "fill:none;stroke:#000000;stroke-width:1.1;");
	bondbtn.addEventListener('click', crBond);

	function crBond(event) { // Create bond. Called when the bond button is cklicked.
		window.addEventListener('mousedown', stBond);
	}

	function stBond(event) { // Start drawing bond. Called when mouse button 1 is down.
		if (canvas.contains(event.target)) { // Bond starts within the canvas. Continue drawing.
			if (bondsall.contains(event.target)) { // If an existing bond was clicked, change its multiplicity
				focobj = event.target.parentNode.objref;
				// ToDo: ! Integrate with dispatcher.
				kwargs = {
					bonds_type: [[focobj, focobj.getNextType()]],
				};
				editStructure(kwargs);
			}
			else { // If blank space or a chem node was clicked, start drawing a new bond
				focobjst = moveCursor(event, cursorbond, 'x1', 'y1');

				cursorbond.setAttribute('x2', cursorbond.getAttribute('x1'));
				cursorbond.setAttribute('y2', cursorbond.getAttribute('y1'));
				canvas.appendChild(cursorbond);

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
		moveCursor(event, cursorbond, "x2", "y2");
	}

	function enBond(event) { // Finish drawing bond
		focobj = moveCursor(event, cursorbond, "x2", "y2");
		var [stx, sty, enx, eny] = ['x1', 'y1', 'x2', 'y2'].map(item => parseFloat(cursorbond.getAttribute(item)))
		if (findDist(stx, sty, enx, eny) >= 16) { // If the new bond is long enough
			var new_atoms_data = [];
			var node0 = focobjst === null ? ChemNode.prototype.getNewId() : focobjst; // Use the existing start node or create a new one if there is none
			var node1 = focobj === null ? ChemNode.prototype.getNewId() : focobj; // Use the existing end node or create a new one if there is none
			if (focobjst === null) new_atoms_data.push([node0, stx, sty, '']);
			if (focobj === null) new_atoms_data.push([node1, enx, eny, '']);
			// ToDo: ! Integrate with dispatcher.
			kwargs = {
				new_atoms_data: new_atoms_data,
				new_bonds_data: [[ChemBond.prototype.getNewId(), node0, node1, 1]]
			};
			editStructure(kwargs);
		}
		cursorbond.remove(); // Erase the temporary bond
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
			dispatcher.do(focobj.eraseData());
		}
	}

	function delStop() {
		canvas.removeEventListener('mousemove', erase);
		window.removeEventListener('mouseup', delStop);
	}
}

function moveHandler(movebtn) {
	var selectrect = document.createElement('div');
	selectrect.id = 'selectrect';
	var is_selected = false;
	var x_st = 0, y_st = 0, x_en = 0, y_en = 0;

	var atoms_slctd = new Set(); // Selected atoms
	var m_slctd = new Set(); // Bonds with one node selected
	var d_slctd = new Set(); // Bonds with both nodes selected
	var surbonds = new Set(); // Adjacent double bonds that require appearance update 
	var mo_x_st, mo_y_st; // Cursor coordinates when dragging was started

	movebtn.addEventListener('click', moveInit);

	function moveInit(event) { // Delete atom or bond. Called when del button is pressed
		window.addEventListener('mousedown', moveAct);
	}

	function moveAct(event) { // When mouse button is down
		var parnode = event.target.parentNode;
		var is_atom = atomsall.contains(event.target.parentNode);
		var is_bond = bondsall.contains(event.target.parentNode);
		if (is_atom || is_bond) { // If atom or bond was clicked
			poiobj = event.target.parentNode.objref;
			if (!atoms_slctd.has(poiobj) && !d_slctd.has(poiobj)) { // Clicked element was not previously selected
				atoms_slctd.forEach(atom => atom.dehighlight());
				clearSlct();
				if (is_atom) {
					atoms_slctd.add(poiobj);
					findSlctBonds();
				}
				else if (is_bond) {
					for (const node of poiobj.nodes) atoms_slctd.add(node);
					findSlctBonds();
				}
			}
			[mo_x_st, mo_y_st] = getSvgPoint(event);
			window.addEventListener('mousemove', moveSlct);
			window.addEventListener('mouseup', moveSlctStop);
		}
		else {
			atoms_slctd.forEach(atom => atom.dehighlight());
			clearSlct();
			if (canvas.contains(event.target)) { // If clicked on of canvas, start selection.
				canvas.after(selectrect);
				x_st = event.clientX;
				y_st = event.clientY;
				recalc(event);
				window.addEventListener('mousemove', recalc);
				window.addEventListener('mouseup', selectStop);
			}
			else window.removeEventListener('mousedown', moveAct); // If clicked out of canvas, exit moving routine.
		}
	}

	function moveSlct(event) { // Active moving
		var x, y;
		[x, y] = getSvgPoint(event);
		var dx = x - mo_x_st;
		var dy = y - mo_y_st;

		atoms_slctd.forEach(atom => atom.translate(dx, dy));
		d_slctd.forEach(bond => bond.moveTerminal());
		m_slctd.forEach(bond => bond.moveTerminal());
		surbonds.forEach(bond => bond.renderBond());
		mo_x_st = x;
		mo_y_st = y;
	}

	function moveSlctStop() {
		if (!is_selected) clearSlct();
		window.removeEventListener('mousemove', moveSlct);
		window.removeEventListener('mouseup', moveSlctStop);
	}

	function clearSlct() {
		atoms_slctd.clear();
		m_slctd.clear();
		d_slctd.clear();
		surbonds.clear();
		is_selected = false;
	}

	function recalc(event) {
		x_en = event.clientX;
		y_en = event.clientY;
		var x_left = Math.min(x_st, x_en);
		var y_top = Math.min(y_st, y_en);
		var x_right = Math.max(x_st, x_en);
		var y_bottom = Math.max(y_st, y_en);
		selectrect.style.left = x_left + 'px';
		selectrect.style.top = y_top + 'px';
		selectrect.style.width = x_right - x_left + 'px';
		selectrect.style.height = y_bottom - y_top + 'px';
	}

	function selectStop() {
		window.removeEventListener('mousemove', recalc);
		window.removeEventListener('mouseup', selectStop);
		selectrect.remove();

		pt.x = x_st;
		pt.y = y_st;
		var svgP0 = pt.matrixTransform(matrixrf);

		pt.x = x_en;
		pt.y = y_en;
		var svgP1 = pt.matrixTransform(matrixrf);

		var x_min = Math.min(svgP0.x, svgP1.x);
		var x_max = Math.max(svgP0.x, svgP1.x);
		var y_min = Math.min(svgP0.y, svgP1.y);
		var y_max = Math.max(svgP0.y, svgP1.y);

		// Find selected atoms
		for (const atom of atomsall.children) {
			var x = atom.firstChild.getAttribute('cx');
			var y = atom.firstChild.getAttribute('cy');
			if (x_min < x && x < x_max && y_min < y && y < y_max) {
				atoms_slctd.add(atom.objref);
				atom.objref.highlight();
			}
		}

		findSlctBonds();

		is_selected = atoms_slctd.size == 0 && m_slctd.size == 0 && d_slctd.size == 0 ? false : true;
	}

	function findSlctBonds() { // Find selected bonds
		var processed_bonds = new Set();
		for (var it = atoms_slctd.values(), atom; atom = it.next().value;) {
			for (const connection of atom.connections) {
				var bond = connection.bond;
				if (!processed_bonds.has(bond)) {
					processed_bonds.add(bond);
					var othernode = bond.nodes[0] == atom ? 1 : 0;
					if (atoms_slctd.has(bond.nodes[othernode])) d_slctd.add(bond);
					else {
						m_slctd.add(bond);
						for (const connection of bond.nodes[othernode].connections) if (connection.bond.multiplicity == 2) surbonds.add(connection.bond);
					}
				}
			}
		}
		for (const surbond of surbonds) if (m_slctd.has(surbond)) surbonds.delete(surbond);
		surbonds.forEach(bond => {if (m_slctd.has(bond)) surbonds.delete(bond)});
	}
}

fancyBtnAnimation(fancybtns);
chemNodeHandler(elbut);
chemBondHandler(bondbtn);
deleteHandler(delbtn);
moveHandler(movebtn);
