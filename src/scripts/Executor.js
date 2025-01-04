import {ChemBond} from './ChemBond.js';
import {ChemNode} from './ChemNode.js';
import {Line} from './ControlPoint.js';
import {vecDif, vecSum, rotateAroundCtr, scaleAroundCtr, stretchAlongDir} from './Geometry.js';


// export function editStructure({
// 	new_atoms_data={}, new_bonds_data={},
// 	del_atoms=new Set(), del_bonds=new Set(),
// 	atoms_text={}, bonds_type={},
// 	moving_atoms=new Set(), moving_vec=[0, 0],
// 	rotating_atoms=new Set(), rot_angle=0, rot_ctr=[0, 0],
// 	scaling_atoms=new Set(), scale_factor=0, scale_ctr=[0, 0],
// 	stretching_atoms=new Set(), stretch_factor=0, dir_angle=0, stretch_ctr=[0, 0],
// 	new_lines_data={},
// 	del_lines=new Set(),
// 	moving_ctr_pts=new Set(), moving_vec_ctr_pts=[0, 0],
// 	rotating_ctr_pts=new Set(), rot_angle_ctr_pts=0, rot_ctr_ctr_pts=[0, 0],
// 	scaling_ctr_pts=new Set(), scale_factor_ctr_pts=0, scale_ctr_ctr_pts=[0, 0],
// 	stretching_ctr_pts=new Set(), stretch_factor_ctr_pts=0, dir_angle_ctr_pts=0, stretch_ctr_ctr_pts=[0, 0],
// }) {
// 	var atoms_parse = new Set(),
// 		atoms_render = new Set(),
// 		atoms_auto_d_bond = new Set(),
// 		atoms_refresh_tips = new Set(),
// 		atoms_text_me = {},
// 		tips_update = new Set(),
// 		bonds_d_adjust = new Set(),
// 		bonds_to_render = new Set(),
// 		bonds_transl = new Set(),
// 		bonds_update_rect = new Set(),
// 		bonds_scewed = new Set();

// 	// Delete bonds
// 	for (const bond_id of del_bonds) {
// 		let bond = document.getElementById(bond_id).objref;
// 		let bond_nodes = bond.nodes;
// 		bond.delete();
// 		for (const node of bond_nodes) {
// 			if (!del_atoms.has(node.id)) {
// 				atoms_parse.add(node);
// 				if (node.isMethane()) atoms_text_me[node.id] = node.text;
// 				atoms_auto_d_bond.add(node);
// 				if (node.text == '') atoms_refresh_tips.add(node);
// 			}
// 		}
// 	}

// 	// Delete atoms
// 	for (const atom_id of del_atoms) {
// 		document.getElementById(atom_id).objref.delete();
// 	}

// 	// Create atoms
// 	for (const [id, data] of Object.entries(new_atoms_data)) {
// 		atoms_parse.add(new ChemNode(id, ...data)); // data: [x, y, text]
// 	}

// 	// Create bonds
// 	for (const [id, data] of Object.entries(new_bonds_data)) {
// 		let bond = new ChemBond(id, ...data); // data: [node0, node1, type]
// 		bonds_update_rect.add(bond);
// 		for (const node of bond.nodes) {
// 			atoms_parse.add(node);
// 			let no_text = atoms_text[node.id] == '' || !(atoms_text[node.id] || node.text);
// 			if (no_text && node.connections.length == 1) atoms_text_me[node.id] = node.text;
// 			atoms_auto_d_bond.add(node);
// 			if (no_text) atoms_refresh_tips.add(node);
// 			else tips_update.add(`${node.id}&${bond.id}`);
// 		}
// 	}

// 	// Edit atoms
// 	Object.assign(atoms_text_me, atoms_text);
// 	for (const [node_id, text] of Object.entries(atoms_text_me)) {
// 		let node = document.getElementById(node_id).objref;
// 		node.text = text;
// 		atoms_parse.add(node);
// 		if (node.text == '') atoms_refresh_tips.add(node);
// 		for (const bond of node.connections) {
// 			bonds_update_rect.add(bond);
// 			if (node.text != '') tips_update.add(`${node.id}&${bond.id}`);
// 		}
// 	}

// 	// Edit bonds
// 	for (const [bond_id, type] of Object.entries(bonds_type)) {
// 		let bond = document.getElementById(bond_id).objref;
// 		bond.setType(type);
// 		bonds_d_adjust.add(bond);
// 		for (const node of bond.nodes) {
// 			atoms_parse.add(node);
// 			if (node.text == '') atoms_refresh_tips.add(node);
// 			else tips_update.add(`${node.id}&${bond.id}`);
// 		}
// 	}

// 	// Find translated and scewed bonds and move atoms
// 	for (const atom_id of moving_atoms) {
// 		let atom = document.getElementById(atom_id).objref;
// 		atom.translate(moving_vec);
// 		atoms_render.add(atom);
// 		for (const bond of atom.connections) {
// 			if (bonds_scewed.has(bond)) {
// 				bonds_scewed.delete(bond);
// 				bonds_transl.add(bond);
// 			}
// 			else {
// 				bonds_scewed.add(bond);
// 			}
// 		}
// 	}

// 	// Rotate
// 	for (const atom_id of rotating_atoms) {
// 		let atom = document.getElementById(atom_id).objref;
// 		atom.translate(vecDif(atom.xy, rotateAroundCtr(atom.xy, rot_angle, rot_ctr)));
// 		atoms_render.add(atom);
// 		for (const bond of atom.connections) bonds_scewed.add(bond);
// 	}

// 	// Scale
// 	for (const atom_id of scaling_atoms) {
// 		let atom = document.getElementById(atom_id).objref;
// 		atom.translate(vecDif(atom.xy, scaleAroundCtr(atom.xy, scale_factor, scale_ctr)));
// 		atoms_render.add(atom);
// 		for (const bond of atom.connections) bonds_scewed.add(bond);
// 	}

// 	// Stretch
// 	var mirrored = new Set();
// 	for (const atom_id of stretching_atoms) {
// 		let atom = document.getElementById(atom_id).objref;
// 		atom.translate(vecDif(atom.xy, stretchAlongDir(atom.xy, stretch_factor, dir_angle, stretch_ctr)));
// 		atoms_render.add(atom);
// 		for (const bond of atom.connections) {
// 			if (stretch_factor < 0 && [8, 10].includes(bond.type) && !mirrored.has(bond.id)) {
// 				bond.setType(ChemBond.db_mirror[bond.type]);
// 				mirrored.add(bond.id);
// 			};
// 			bonds_scewed.add(bond);
// 		}
// 	}

// 	// Recalculate dimensions of skewed bonds and find affected elements
// 	for (const bond of bonds_scewed) {
// 		bond.recalcDims();
// 		bonds_update_rect.add(bond);
// 		for (const node of bond.nodes) {
// 			atoms_auto_d_bond.add(node);
// 			atoms_render.add(node);
// 			if (node.text == '') atoms_refresh_tips.add(node);
// 			else tips_update.add(`${node.id}&${bond.id}`);
// 		}
// 	}

// 	// Parse text
// 	for (const atom of atoms_parse) {
// 		atom.parse();
// 		atoms_render.add(atom);
// 	}

// 	// Render text
// 	for (const atom of atoms_render) {
// 		atom.renderText();
// 	}

// 	// Move bonds
// 	for (const bond of bonds_transl) {
// 		bond.translate(moving_vec);
// 		bonds_to_render.add(bond);
// 		bonds_update_rect.add(bond);
// 	}

// 	// Fetch auto double bonds
// 	for (const atom of atoms_auto_d_bond) {
// 		for (const bond of atom.connections) {
// 			bonds_d_adjust.add(bond);
// 		}
// 	}

// 	// Find shifts of auto double bonds
// 	for (const bond of bonds_d_adjust) {
// 		if (ChemBond.auto_d_bonds.includes(bond.type)) {
// 			bond.posDouble();
// 			for (const node of bond.nodes) {
// 				if (node.text == '') atoms_refresh_tips.add(node);
// 				else tips_update.add(`${node.id}&${bond.id}`);
// 			}
// 		}
// 	}

// 	// Reshape converging line tips (no symbol; implicit C)
// 	for (const atom of atoms_refresh_tips) {
// 		atom.calcLineTips();
// 		for (const bond of atom.connections) {
// 			bonds_to_render.add(bond);
// 		}
// 	}

// 	// Reshape floating tips (some symbol is present)
// 	for (const node_bond of tips_update) {
// 		let [node, bond] = node_bond.split('&').map(id => document.getElementById(id).objref);
// 		bond.updateTip(node);
// 		bonds_to_render.add(bond);
// 	}

// 	// Render bond lines
// 	for (const bond of bonds_to_render) {
// 		bond.renderBond();
// 	}

// 	// Update back rectangle
// 	for (const bond of bonds_update_rect) {
// 		bond.updateAllRects();
// 	}


// //////////////////////////////////

// 	var ctr_pts_render = new Set(),
// 		shapes_render = new Set();

// 	// Delete lines
// 	for (const line_id of del_lines) {
// 		document.getElementById(line_id).objref.delete();
// 	}

// 	// Create lines
// 	for (const [id, data] of Object.entries(new_lines_data)) {
// 		let new_line = new Line(id, ...data); // data: [x, y, text]
// 		shapes_render.add(new_line);
// 		// ctr_pts_render.add(new_line.cp0);
// 		// ctr_pts_render.add(new_line.cp1);
// 		new_line.cps.forEach(cp => ctr_pts_render.add(cp));
// 	}

// 	// Move
// 	for (const ctr_pt_id of moving_ctr_pts) {
// 		let ctr_pt = document.getElementById(ctr_pt_id).objref;
// 		ctr_pt.translate(moving_vec_ctr_pts);
// 		ctr_pts_render.add(ctr_pt);
// 		shapes_render.add(ctr_pt.master);
// 	}

// 	// Rotate
// 	for (const ctr_pt_id of rotating_ctr_pts) {
// 		let ctr_pt = document.getElementById(ctr_pt_id).objref;
// 		ctr_pt.translate(vecDif(ctr_pt.xy, rotateAroundCtr(ctr_pt.xy, rot_angle_ctr_pts, rot_ctr_ctr_pts)));
// 		ctr_pts_render.add(ctr_pt);
// 		shapes_render.add(ctr_pt.master);
// 	}

// 	// Scale
// 	for (const ctr_pt_id of scaling_ctr_pts) {
// 		let ctr_pt = document.getElementById(ctr_pt_id).objref;
// 		ctr_pt.translate(vecDif(ctr_pt.xy, scaleAroundCtr(ctr_pt.xy, scale_factor_ctr_pts, scale_ctr_ctr_pts)));
// 		ctr_pts_render.add(ctr_pt);
// 		shapes_render.add(ctr_pt.master);
// 	}

// 	// Stretch
// 	for (const ctr_pt_id of stretching_ctr_pts) {
// 		let ctr_pt = document.getElementById(ctr_pt_id).objref;
// 		ctr_pt.translate(vecDif(ctr_pt.xy, stretchAlongDir(ctr_pt.xy, stretch_factor_ctr_pts, dir_angle_ctr_pts, stretch_ctr_ctr_pts)));
// 		ctr_pts_render.add(ctr_pt);
// 		shapes_render.add(ctr_pt.master);
// 	}

// 	for (const shape of shapes_render) {
// 		shape.render();
// 	}

// 	for (const ctr_pt of ctr_pts_render) {
// 		ctr_pt.render();
// 	}
// }

export const MOVE = 1;
export const ROTATE = 2;
export const SCALE = 3;
export const STRETCH = 4;

// Object.freeze(obj);
var transform_funcs = {
	[MOVE]: (pt, {moving_vec}) => vecSum(pt, moving_vec),
	[ROTATE]: (pt, {rot_angle, rot_ctr}) => rotateAroundCtr(pt, rot_angle, rot_ctr),
	[SCALE]: (pt, {scale_factor, scale_ctr}) => scaleAroundCtr(pt, params.scale_factor, scale_ctr),
	[STRETCH]: (pt, {stretch_factor, dir_angle, stretch_ctr}) => stretchAlongDir(pt, stretch_factor, dir_angle, stretch_ctr)
}


export function editStructure({
	new_atoms_data={}, new_bonds_data={},
	del_atoms=new Set(), del_bonds=new Set(),
	atoms_text={}, bonds_type={},
	// moving_atoms=new Set(), moving_vec=[0, 0],
	// rotating_atoms=new Set(), rot_angle=0, rot_ctr=[0, 0],
	// scaling_atoms=new Set(), scale_factor=0, scale_ctr=[0, 0],
	// stretching_atoms=new Set(), stretch_factor=0, dir_angle=0, stretch_ctr=[0, 0],
	new_lines_data={},
	del_lines=new Set(),
	// moving_ctr_pts=new Set(), moving_vec_ctr_pts=[0, 0],
	// rotating_ctr_pts=new Set(), rot_angle_ctr_pts=0, rot_ctr_ctr_pts=[0, 0],
	// scaling_ctr_pts=new Set(), scale_factor_ctr_pts=0, scale_ctr_ctr_pts=[0, 0],
	// stretching_ctr_pts=new Set(), stretch_factor_ctr_pts=0, dir_angle_ctr_pts=0, stretch_ctr_ctr_pts=[0, 0],
	transforms=new Array() // [[type, {ids}, {params}], ...]
}) {
	// Split kwargs
	let chem_kwargs = {
		new_atoms_data: new_atoms_data , new_bonds_data: new_bonds_data,
		del_atoms: del_atoms, del_bonds: del_bonds,
		atoms_text: atoms_text, bonds_type: bonds_type,
		transforms: new Array()
	}

	let shape_kwargs = {
		new_lines_data: new_lines_data, del_lines: del_lines, transforms: new Array()
	}

	// Split transforms

	for (const [type, ids, params] of transforms) {
		let chem_ids = new Set();
		let shape_ids = new Set();
		let id_sorter = {a: chem_ids, c: shape_ids};
		// for (const id of ids) {
		// 	if (['a', 'b'].includes(id[0])) {
		// 		chem_ids.push(id)
		// 	}
		// 	else if (['l'].includes(id[0])) {
		// 		shape_ids.push(id)
		// 	}
		// }
		ids.forEach(id => id_sorter[id[0]].add(id));

		// Puch if not redundant
		if (chem_ids.size) chem_kwargs.transforms.push([type, chem_ids, params]);
		if (shape_ids.size) shape_kwargs.transforms.push([type, shape_ids, params]);
	}

	editChem(chem_kwargs);
	editShapes(shape_kwargs);
}


export function editChem({
	new_atoms_data={}, new_bonds_data={},
	del_atoms=new Set(), del_bonds=new Set(),
	atoms_text={}, bonds_type={},
	transforms=new Array() // [[type, {ids}, {params}], ...]
	// moving_atoms=new Set(), moving_vec=[0, 0],
	// rotating_atoms=new Set(), rot_angle=0, rot_ctr=[0, 0],
	// scaling_atoms=new Set(), scale_factor=0, scale_ctr=[0, 0],
	// stretching_atoms=new Set(), stretch_factor=0, dir_angle=0, stretch_ctr=[0, 0],
}) {
	var atoms_parse = new Set(),
		atoms_render = new Set(),
		atoms_auto_d_bond = new Set(),
		atoms_refresh_tips = new Set(),
		atoms_text_me = {},
		tips_update = new Set(),
		bonds_d_adjust = new Set(),
		bonds_to_render = new Set(),
		bonds_transl = new Set(),
		bonds_update_rect = new Set(),
		bonds_scewed = new Set();

	// Delete bonds
	for (const bond_id of del_bonds) {
		let bond = document.getElementById(bond_id).objref;
		let bond_nodes = bond.nodes;
		bond.delete();
		for (const node of bond_nodes) {
			if (!del_atoms.has(node.id)) {
				atoms_parse.add(node);
				if (node.isMethane()) atoms_text_me[node.id] = node.text;
				atoms_auto_d_bond.add(node);
				if (node.text == '') atoms_refresh_tips.add(node);
			}
		}
	}

	// Delete atoms
	for (const atom_id of del_atoms) {
		document.getElementById(atom_id).objref.delete();
	}

	// Create atoms
	for (const [id, data] of Object.entries(new_atoms_data)) {
		atoms_parse.add(new ChemNode(id, ...data)); // data: [x, y, text]
	}

	// Create bonds
	for (const [id, data] of Object.entries(new_bonds_data)) {
		let bond = new ChemBond(id, ...data); // data: [node0, node1, type]
		bonds_update_rect.add(bond);
		for (const node of bond.nodes) {
			atoms_parse.add(node);
			let no_text = atoms_text[node.id] == '' || !(atoms_text[node.id] || node.text);
			if (no_text && node.connections.length == 1) atoms_text_me[node.id] = node.text;
			atoms_auto_d_bond.add(node);
			if (no_text) atoms_refresh_tips.add(node);
			else tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// Edit atoms
	Object.assign(atoms_text_me, atoms_text);
	for (const [node_id, text] of Object.entries(atoms_text_me)) {
		let node = document.getElementById(node_id).objref;
		node.text = text;
		atoms_parse.add(node);
		if (node.text == '') atoms_refresh_tips.add(node);
		for (const bond of node.connections) {
			bonds_update_rect.add(bond);
			if (node.text != '') tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// Edit bonds
	for (const [bond_id, type] of Object.entries(bonds_type)) {
		let bond = document.getElementById(bond_id).objref;
		bond.setType(type);
		bonds_d_adjust.add(bond);
		for (const node of bond.nodes) {
			atoms_parse.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// // Find translated and scewed bonds and move atoms
	// for (const atom_id of moving_atoms) {
	// 	let atom = document.getElementById(atom_id).objref;
	// 	atom.translate(moving_vec);
	// 	atoms_render.add(atom);
	// 	for (const bond of atom.connections) {
	// 		if (bonds_scewed.has(bond)) {
	// 			bonds_scewed.delete(bond);
	// 			bonds_transl.add(bond);
	// 		}
	// 		else {
	// 			bonds_scewed.add(bond);
	// 		}
	// 	}
	// }

	// // Rotate
	// for (const atom_id of rotating_atoms) {
	// 	let atom = document.getElementById(atom_id).objref;
	// 	atom.translate(vecDif(atom.xy, rotateAroundCtr(atom.xy, rot_angle, rot_ctr)));
	// 	atoms_render.add(atom);
	// 	for (const bond of atom.connections) bonds_scewed.add(bond);
	// }

	// // Scale
	// for (const atom_id of scaling_atoms) {
	// 	let atom = document.getElementById(atom_id).objref;
	// 	atom.translate(vecDif(atom.xy, scaleAroundCtr(atom.xy, scale_factor, scale_ctr)));
	// 	atoms_render.add(atom);
	// 	for (const bond of atom.connections) bonds_scewed.add(bond);
	// }

	// // Stretch
	// var mirrored = new Set();
	// for (const atom_id of stretching_atoms) {
	// 	let atom = document.getElementById(atom_id).objref;
	// 	atom.translate(vecDif(atom.xy, stretchAlongDir(atom.xy, stretch_factor, dir_angle, stretch_ctr)));
	// 	atoms_render.add(atom);
	// 	for (const bond of atom.connections) {
	// 		if (stretch_factor < 0 && [8, 10].includes(bond.type) && !mirrored.has(bond.id)) {
	// 			bond.setType(ChemBond.db_mirror[bond.type]);
	// 			mirrored.add(bond.id);
	// 		};
	// 		bonds_scewed.add(bond);
	// 	}
	// }


	// Transforms
	for (const [type, ids, params] of transforms) {
		// let bonds_scewed_temp = new Set();
		for (const atom_id of ids) {
			const atom = document.getElementById(atom_id).objref;
			if (type === MOVE) { // Translate {moving_vec}
				// let bonds_scewed_temp = new Set();
				// for (const atom_id of moving_atoms) {
					// let atom = document.getElementById(atom_id).objref;
				atom.translate(params.moving_vec);
				// atoms_render.add(atom);


				// for (const bond of atom.connections) {
				// 	if (bonds_scewed_temp.has(bond)) {
				// 		bonds_scewed_temp.delete(bond);
				// 		bonds_transl.add(bond);
				// 	}
				// 	else {
				// 		bonds_scewed_temp.add(bond);
				// 	}
				// }


				for (const bond of atom.connections) bonds_scewed.add(bond);
				// }
				// bonds_scewed_temp.forEach(bond => bonds_scewed.add(bond));
			}
			else if (type === ROTATE) { // Rotate {rot_angle, rot_ctr}
				// for (const atom_id of rotating_atoms) {
					// let atom = document.getElementById(atom_id).objref;
				atom.translate(vecDif(atom.xy, rotateAroundCtr(atom.xy, params.rot_angle, params.rot_ctr)));
				// atoms_render.add(atom);
				for (const bond of atom.connections) bonds_scewed.add(bond);
				// }
			}
			else if (type === SCALE) { // Scale {scale_factor, scale_ctr}
				// for (const atom_id of scaling_atoms) {
					// let atom = document.getElementById(atom_id).objref;
				atom.translate(vecDif(atom.xy, scaleAroundCtr(atom.xy, params.scale_factor, params.scale_ctr)));
				// atoms_render.add(atom);
				for (const bond of atom.connections) bonds_scewed.add(bond);
				// }
			}
			else if (type === STRETCH) { // Stretch {stretch_factor, dir_angle, stretch_ctr}
				var mirrored = new Set();
				// for (const atom_id of stretching_atoms) {
					// let atom = document.getElementById(atom_id).objref;
				atom.translate(vecDif(atom.xy, stretchAlongDir(atom.xy, params.stretch_factor, params.dir_angle, params.stretch_ctr)));
				// atoms_render.add(atom);
				for (const bond of atom.connections) {
					if (params.stretch_factor < 0 && [8, 10].includes(bond.type) && !mirrored.has(bond.id)) {
						bond.setType(ChemBond.db_mirror[bond.type]);
						mirrored.add(bond.id);
					};
					bonds_scewed.add(bond);
				}
				// }
			}
			atoms_render.add(atom);
		}
		// bonds_scewed_temp.forEach(bond => bonds_scewed.add(bond));
	}

	// Recalculate dimensions of skewed bonds and find affected elements
	for (const bond of bonds_scewed) {
		bond.recalcDims();
		bonds_update_rect.add(bond);
		for (const node of bond.nodes) {
			atoms_auto_d_bond.add(node);
			atoms_render.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// Parse text
	for (const atom of atoms_parse) {
		atom.parse();
		atoms_render.add(atom);
	}

	// Render text
	for (const atom of atoms_render) {
		atom.renderText();
	}

	// Move bonds
	// for (const bond of bonds_transl) {
	// 	bond.translate(moving_vec);
	// 	bonds_to_render.add(bond);
	// 	bonds_update_rect.add(bond);
	// }

	// Fetch auto double bonds
	for (const atom of atoms_auto_d_bond) {
		for (const bond of atom.connections) {
			bonds_d_adjust.add(bond);
		}
	}

	// Find shifts of auto double bonds
	for (const bond of bonds_d_adjust) {
		if (ChemBond.auto_d_bonds.includes(bond.type)) {
			bond.posDouble();
			for (const node of bond.nodes) {
				if (node.text == '') atoms_refresh_tips.add(node);
				else tips_update.add(`${node.id}&${bond.id}`);
			}
		}
	}

	// Reshape converging line tips (no symbol; implicit C)
	for (const atom of atoms_refresh_tips) {
		atom.calcLineTips();
		for (const bond of atom.connections) {
			bonds_to_render.add(bond);
		}
	}

	// Reshape floating tips (some symbol is present)
	for (const node_bond of tips_update) {
		let [node, bond] = node_bond.split('&').map(id => document.getElementById(id).objref);
		bond.updateTip(node);
		bonds_to_render.add(bond);
	}

	// Render bond lines
	for (const bond of bonds_to_render) {
		bond.renderBond();
	}

	// Update back rectangle
	for (const bond of bonds_update_rect) {
		bond.updateAllRects();
	}
}


export function editShapes({
	new_lines_data={},
	del_lines=new Set(),
	transforms=new Array() // [[type, {ids}, {params}], ...]
	// moving_ctr_pts=new Set(), moving_vec_ctr_pts=[0, 0],
	// rotating_ctr_pts=new Set(), rot_angle_ctr_pts=0, rot_ctr_ctr_pts=[0, 0],
	// scaling_ctr_pts=new Set(), scale_factor_ctr_pts=0, scale_ctr_ctr_pts=[0, 0],
	// stretching_ctr_pts=new Set(), stretch_factor_ctr_pts=0, dir_angle_ctr_pts=0, stretch_ctr_ctr_pts=[0, 0],
}) {
	var ctr_pts_render = new Set(),
		shapes_render = new Set();

	// Delete lines
	for (const line_id of del_lines) {
		document.getElementById(line_id).objref.delete();
	}

	// Create lines
	for (const [id, data] of Object.entries(new_lines_data)) {
		let new_line = new Line(id, ...data); // data: [x, y, text]
		shapes_render.add(new_line);
		new_line.cps.forEach(cp => ctr_pts_render.add(cp));
	}


	// Transforms
	for (const [type, ids, params] of transforms) {
		for (const ctr_pt_id of ids) {
			let ctr_pt = document.getElementById(ctr_pt_id).objref;
			// let new_xy;
			// if (type === MOVE) { // {moving_vec}
			// 	// moving_vec = params.moving_vec;
			// 	new_xy = vecSum(ctr_pt.xy, moving_vec);
			// }
			// else if (type === ROTATE) { // {rot_angle, rot_ctr}
			// 	// moving_vec = vecDif(ctr_pt.xy, rotateAroundCtr(ctr_pt.xy, params.rot_angle, params.rot_ctr));
			// 	new_xy = rotateAroundCtr(ctr_pt.xy, params.rot_angle, params.rot_ctr);
			// }
			// else if (type === SCALE) { // {scale_factor, scale_ctr}
			// 	// moving_vec = vecDif(ctr_pt.xy, scaleAroundCtr(ctr_pt.xy, params.scale_factor, params.scale_ctr));
			// 	new_xy = scaleAroundCtr(ctr_pt.xy, params.scale_factor, params.scale_ctr);
			// }
			// else if (type === STRETCH) { // {stretch_factor, dir_angle, stretch_ctr}
			// 	// moving_vec = vecDif(ctr_pt.xy, stretchAlongDir(ctr_pt.xy, params.stretch_factor, params.dir_angle, params.stretch_ctr));
			// 	new_xy = stretchAlongDir(ctr_pt.xy, params.stretch_factor, params.dir_angle, params.stretch_ctr);
			// }
			// ctr_pt.setCtr(moving_vec);

			ctr_pt.setCtr(transform_funcs[type](ctr_pt.xy, params));
			ctr_pts_render.add(ctr_pt);
			shapes_render.add(ctr_pt.master);
		}
	}

	// // Move
	// for (const ctr_pt_id of moving_ctr_pts) {
	// 	let ctr_pt = document.getElementById(ctr_pt_id).objref;
	// 	ctr_pt.translate(moving_vec_ctr_pts);
	// 	ctr_pts_render.add(ctr_pt);
	// 	shapes_render.add(ctr_pt.master);
	// }

	// // Rotate
	// for (const ctr_pt_id of rotating_ctr_pts) {
	// 	let ctr_pt = document.getElementById(ctr_pt_id).objref;
	// 	ctr_pt.translate(vecDif(ctr_pt.xy, rotateAroundCtr(ctr_pt.xy, rot_angle_ctr_pts, rot_ctr_ctr_pts)));
	// 	ctr_pts_render.add(ctr_pt);
	// 	shapes_render.add(ctr_pt.master);
	// }

	// // Scale
	// for (const ctr_pt_id of scaling_ctr_pts) {
	// 	let ctr_pt = document.getElementById(ctr_pt_id).objref;
	// 	ctr_pt.translate(vecDif(ctr_pt.xy, scaleAroundCtr(ctr_pt.xy, scale_factor_ctr_pts, scale_ctr_ctr_pts)));
	// 	ctr_pts_render.add(ctr_pt);
	// 	shapes_render.add(ctr_pt.master);
	// }

	// // Stretch
	// for (const ctr_pt_id of stretching_ctr_pts) {
	// 	let ctr_pt = document.getElementById(ctr_pt_id).objref;
	// 	ctr_pt.translate(vecDif(ctr_pt.xy, stretchAlongDir(ctr_pt.xy, stretch_factor_ctr_pts, dir_angle_ctr_pts, stretch_ctr_ctr_pts)));
	// 	ctr_pts_render.add(ctr_pt);
	// 	shapes_render.add(ctr_pt.master);
	// }

	for (const shape of shapes_render) {
		shape.render();
	}

	for (const ctr_pt of ctr_pts_render) {
		ctr_pt.render();
	}
}



