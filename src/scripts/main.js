import {ChemNode} from './ChemNode.js';
import {ChemBond} from './ChemBond.js';
import {editStructure} from './Executor.js';
import {styledict} from './ChemParser.js';
import {gatherData} from './Utils.js';
import {
	vecLen, vecSum, vecDif, vecMul, vecDotProd, rotateVec, polygonAngle, polygonEdgeCtrDist, polygonVertexCtrDist,
	MOVE, discreteAngle
} from './Geometry.js';
import {ControlPoint} from './ControlPoints.js';
import {Line, Circle, Rectangle, Polyline, Polygon, Curve, SmoothShape} from './Shapes.js';
import {Arrow, DoubleArrow, ResonanceArrow, RetroArrow} from './Arrows.js';
import {registry} from './BaseClasses.js';
import {cnv} from './Canvas.js';
import {
	selrebtn, sellabtn, selmobtn, elbtns, bondbtn, dbondbtn, upperbtn, lowerbtn, delbtn, textbtn, benzenebtn,
	pentagonbtn, hexagonbtn, heptagonbtn, arrowbtn, doublearrowbtn, resonancearrowbtn, retroarrowbtn, linebtn,
	circlebtn, rectbtn, polylinebtn, polygbtn, curvbtn, smoothbtn
} from './Buttons.js';
import {dispatcher, invertCmd} from './Dispatcher.js';
import {refreshBondCutouts} from './BondCutouts.js';
import {SelectionChem, pickNode} from './Selection.js';
import {SelectRect, SelectLasso, pickMol} from './SelectionTools.js';


function downloadSvg() { // Download .svg
	var element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(cnv.getSvgContent()));
	element.setAttribute('download', 'molecule.svg');
	element.click();
}
document.getElementById('download-svg').addEventListener('click', downloadSvg);

function downloadJson() { // Download .svg
	const kwargs = {create: {}};
	registry.citizens.forEach(cls => kwargs.create[cls.alias] = gatherData(cls.getAllInstanceIDs()));
	const json_content = JSON.stringify(kwargs, null, '\t');
	const element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(json_content));
	element.setAttribute('download', 'molecule.json');
	element.click();
}
document.getElementById('download-json').addEventListener('click', downloadJson);

function blankCanvasCmd() {
	const kwargs = {del: {}};
	registry.citizens.forEach(cls => kwargs.del[cls.alias] = new Set(cls.getAllInstanceIDs()));
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
		registry.classes_vals.forEach(cls => cls.setMaxIdCounter());
		registry.classes_vals.forEach(cls => {if (cls.reserveCpIds) cls.reserveCpIds();});
		registry.classes_vals.forEach(cls => {if (cls.reserveId) cls.reserveId();});
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


function showControlPoints() {
	document.styleSheets[0].cssRules[2].style.opacity = 0.4;
}

function hideControlPoints() {
	document.styleSheets[0].cssRules[2].style.opacity = 0;
}


function getCursorAtom(event, atomtext) {
	var cursoratom = new ChemNode('cursoratom', ...cnv.clampEventToCnv(event), '@' + atomtext);
	cursoratom.parse();
	cursoratom.renderText();
	cursoratom.eventsOff();
	return cursoratom;
}

var standard_bondlength = 40;

function getDiscreteBondEnd(pt0, [x, y], len=standard_bondlength) {
	var angle = discreteAngle(Math.atan2(y, x), 15);
	return vecSum(pt0, vecMul([Math.cos(angle), Math.sin(angle)], len));
}

function pickNodePoint(event) {
	var node = event.target.is_atom ? event.target.objref : null;
	var pt = node ? node.xy : cnv.getSvgPoint(event);
	return [pt, node];
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
		cursoratom.setCtr(cnv.clampEventToCnv(event));
	}

	function setElem(event) { // Create a new atom
		var kwargs;
		new_node0id = ChemNode.getNewId();
		new_node1id = ChemNode.getNewId();
		new_bond_id = ChemBond.getNewId();
		if (cnv.isClicked(event)) { // Click inside the canvas
			[pt0, node0] = pickNodePoint(event);
			if (node0) { // If some atom was clicked
				if (node0.connections.length == 0 && (node0.text == atomtext ||
					(node0.text == '' && atomtext == 'C'))) {
					kwargs = {del: {atoms: new Set([node0.id])}};
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
				kwargs = {create: {atoms: {[new_node0id]: [...pt0, new_atomtext]}}};
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
		var difxy = vecDif(pt0, cnv.getSvgPoint(event));
		if (vecLen(difxy) >= 16) {
			kwargs.create = {
				atoms: {[new_node1id]: [...getDiscreteBondEnd(pt0, difxy), atomtext]},
				bonds: {[new_bond_id]: [node0_id, new_node1id, 1]}
			};
			if (!node0_is_new) kwargs.alter = {atoms: {[node0_id]: {text: old_atomtext}}};
		}
		else kwargs.alter = {atoms: {[node0_id]: {text: new_atomtext}}};
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
		if (cnv.isClicked(event)) { // Bond starts within the canvas. Continue drawing.
			if (event.target.is_bond) { // If an existing bond was clicked, change its multiplicity
				var focobj = event.target.objref;
				var kwargs = {alter: {bonds: {[focobj.id]: {type: focobj.getNextType(rotation_schema)}}}};
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
			var kwargs = {create: {
				atoms: new_atoms_data,
				bonds: {[new_bond_id]: [node0id, node1id, init_type]}
			}};
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
		if (cnv.isClicked(event)) {
			erase(event);
			cnv.svg.addEventListener('mousemove', erase);
			window.addEventListener('mouseup', delStop);
		}
		else { // If click out of canvas,
			window.removeEventListener('mousedown', delAct); // exit deleting routine.
			delbtn.deselectCond(event);
		}
	}

	function erase(event) { // Active eraser
		// var kwargs;
		if (event.target.is_atom || event.target.is_bond || (event.target.is_shape && !event.target.is_cp)) {
			const focobj = event.target.objref;
			const focobj_cls = focobj.constructor;
			const kwargs = {del: {[focobj_cls.alias]: new Set([focobj.id])}};
			if (focobj_cls == ChemNode) kwargs.del.bonds = new Set(focobj.connections.map(bond => bond.id));
			dispatcher.do(kwargs);
			refreshBondCutouts();
		}
	}

	function delStop() {
		cnv.svg.removeEventListener('mousemove', erase);
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
			var kwargs = {alter: {atoms: {[node.id]: {text: (old_input.value ? '@' : '') + old_input.value}}}};
			dispatcher.do(kwargs);
			old_input.remove();
		}
	}

	function addInput(event) {
		setNodeText();
		if (cnv.isClicked(event)) { // Click inside the canvas
			[pt, node] = pickNodePoint(event);
			if (node) { // If some atom was clicked
				var [left, top] = cnv.getScreenPoint(pt);
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
		mo_st = cnv.getSvgPoint(event);
		var [cur_atoms_data, cur_bonds_data] = generatePolygon(mo_st, [0, pvcd], cur_node_ids, cur_bond_ids);
		editStructure({create: {atoms: cur_atoms_data, bonds: cur_bonds_data}});
		window.addEventListener('mousemove', movPolygon);
		window.addEventListener('mousedown', setPolygon);
	}

	function movPolygon(event) { // Move cursor polygon
		var pt = cnv.getSvgPoint(event);
		var moving_vec = vecDif(mo_st, pt);
		mo_st = pt;
		editStructure({transforms: [[MOVE, {atoms: new Set(cur_node_ids)}, {moving_vec: moving_vec}]]});
	}

	function setPolygon(event) { // Move cursor polygon
		[new_node_ids, new_bond_ids] = generateIds();
		if (cnv.isClicked(event)) { // Click inside the canvas
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
				var kwargs = {create: {atoms: new_atoms_data, bonds: new_bonds_data}};
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
		var ortho_proj = vecDotProd(common_bond.ouva, vecDif(common_bond.xy, cnv.getSvgPoint(event)));
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
		var difxy = vecDif(common_node.xy, cnv.getSvgPoint(event));
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
		editStructure({del: {atoms: new Set(cur_node_ids), bonds: new Set(cur_bond_ids)}});
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
		// eslint-disable-next-line no-unused-vars
		for (const [id, data] of Object.entries(new_bonds_data)) {
			if (ChemBond.mult[data[2]] >= 2) {
				non_sp3_ring.add(data[0]);
				non_sp3_ring.add(data[1]);
			}
		}

		var bonds_type = {};
		var casted_types = {};
		for (const [id, data] of Object.entries(new_bonds_data)) {
			let is_pseudo_double = non_sp3_ring.has(data[0]) && non_sp3_ring.has(data[1]);
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
					) bonds_type[old_bond.id] = {type: new_type_casted};
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
					bonds_type[old_bond_id] = {type: new_type};
				}
			}
			if (bond_id in new_bonds_data) {
				new_bonds_data[bond_id][2] = is_double ? 10 : 1;
			}
		}

		var kwargs = {create: {atoms: new_atoms_data, bonds: new_bonds_data}, alter: {bonds: bonds_type}};
		dispatcher.do(kwargs);
	}
}


function twoPointHandler(btn, ShapeCls) {
	var pt0, new_line_id, new_cp0_id, new_cp1_id;
	btn.mask_g.addEventListener('click', createShape);

	// eslint-disable-next-line no-unused-vars
	function createShape(event) { // Create line. Called when the line button is cklicked.
		btn.selectCond();
		window.addEventListener('mousedown', startShape);
	}

	function startShape(event) { // Start drawing line. Called when mouse button 1 is down.
		if (cnv.isClicked(event)) { // Line starts within the canvas. Continue drawing.
			pt0 = cnv.getSvgPoint(event);
			if (event.shiftKey) pt0 = pt0.map(val => Math.round(val / 10) * 10);
			new_line_id = ShapeCls.getNewId();
			new_cp0_id = ControlPoint.getNewId();
			new_cp1_id = ControlPoint.getNewId();
			moveShape(event);
			window.addEventListener('mousemove', moveShape);
			window.addEventListener('mouseup', finishShape);
		}
		else { // Line starts outside of canvas. Exit drawing.
			window.removeEventListener('mousemove', moveShape);
			window.removeEventListener('mousedown', startShape);
			btn.deselectCond(event);
		}
	}

	function moveShape(event) { // Move second end of the drawn bond
		if (document.getElementById(new_line_id) !== null) dispatcher.undo();
		let pt1 = cnv.getSvgPoint(event);
		if (event.shiftKey) pt1 = pt1.map(val => Math.round(val / 10) * 10);
		let kwargs = {create: {[ShapeCls.alias]: {[new_line_id]: [[[new_cp0_id, ...pt0], [new_cp1_id, ...pt1]]]}}};
		dispatcher.do(kwargs);
		document.getElementById(new_line_id).objref.eventsOff();
	}

	// eslint-disable-next-line no-unused-vars
	function finishShape(event) { // Finish drawing line
		window.removeEventListener('mouseup', finishShape);
		window.removeEventListener('mousemove', moveShape);
		document.getElementById(new_line_id).objref.eventsOn();
	}
}


function multipointHandler(btn, ShapeCls) {
	let cmd, cps;
	ShapeCls.reserveCpIds();
	resetDrawing();
	btn.mask_g.addEventListener('click', createShape);

	// eslint-disable-next-line no-unused-vars
	function createShape(event) { // Create shape. Invoked when the corresponding button is cklicked.
		btn.selectCond();
		window.addEventListener('mousedown', setPoint);
		window.addEventListener('mousemove', moveShape);
		document.addEventListener('keydown', keyHandler);
	}

	function setPoint(event) {
		if (cnv.isClicked(event)) {
			cps = getUpdatedCps(event);
			ShapeCls.reserveCpIds();
			updateShape(cps);
		}
		else { // SHape starts outside of canvas. Exit drawing.
			window.removeEventListener('mousemove', moveShape);
			window.removeEventListener('mousedown', setPoint);
			document.removeEventListener('keydown', keyHandler);
			finishCurrShape();
			btn.deselectCond(event);
		}
	}

	function resetDrawing() {
		cmd = null;
		cps = [];
		ShapeCls.reserveId();
	}

	function finishCurrShape() {
		if (cmd) editStructure(cmd[1]); // Undo
		if (cps.length >= ShapeCls.min_pt_cnt) dispatcher.do(getKwargs(cps)); // Do by dispatcher
		if (cmd) resetDrawing();
	}

	function keyHandler(event) {
		event.preventDefault();
		if (event.keyCode === 9) finishCurrShape(); // Tab is pressed
	}

	function getUpdatedCps(event) {
		let pt = cnv.getSvgPoint(event);
		pt = event.shiftKey ? pt.map(val => Math.round(val / 10) * 10) : pt;
		return ShapeCls.insertMidCp([...cps, [ShapeCls.new_cp_id, ...pt]]);
	}

	function moveShape(event) { // Move second end of the drawn bond
		const ps = getUpdatedCps(event);
		updateShape(ps);
	}

	function updateShape(points) {
		if (cmd) editStructure(cmd[1]); // Undo
		if (points.length >= ShapeCls.min_pt_cnt) {
			const kwargs = getKwargs(points);
			cmd = [kwargs, invertCmd(kwargs)];
			editStructure(cmd[0]); // Do
			document.getElementById(ShapeCls.new_id).objref.eventsOff();
		}
	}

	function getKwargs(points) {
		return {create: {[ShapeCls.alias]: {[ShapeCls.new_id]: [points]}}};
	}
}


const selection = new SelectionChem(dispatcher);


function transformHandler(btn, SelectTool=null) {
	var sensors_all = document.getElementById('sensors');
	btn.mask_g.addEventListener('click', selectInit);

	function selectInit(event) { // eslint-disable-line no-unused-vars
		btn.selectCond();
		cnv.svg.addEventListener('mousedown', selectAct);
		sensors_all.addEventListener('mousedown', pick);
		window.addEventListener('mousedown', exit);
	}

	function selectAct(event) { // Click on canvas
		event.stopPropagation();
		selection.deactivate();
		if (SelectTool) new SelectTool('utils', selection);
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
		cnv.svg.removeEventListener('mousedown', selectAct);
		sensors_all.removeEventListener('mousedown', pick);
		window.removeEventListener('mousedown', exit);
		selection.deactivate();
		btn.deselectCond(event);
	}
}


// Set global variables
window.DEBUG = false;
window.showChessGrid = cnv.showChessGrid;
window.hideGrid = cnv.hideGrid;
window.showControlPoints = showControlPoints;
window.hideControlPoints = hideControlPoints;
window.selection = selection;
window.dispatcher = dispatcher;


// Initialize handlers
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
twoPointHandler(linebtn, Line);
twoPointHandler(arrowbtn, Arrow);
twoPointHandler(doublearrowbtn, DoubleArrow);
twoPointHandler(resonancearrowbtn, ResonanceArrow);
twoPointHandler(retroarrowbtn, RetroArrow);
twoPointHandler(circlebtn, Circle);
twoPointHandler(rectbtn, Rectangle);
multipointHandler(polylinebtn, Polyline);
multipointHandler(polygbtn, Polygon);
multipointHandler(curvbtn, Curve);
multipointHandler(smoothbtn, SmoothShape);
