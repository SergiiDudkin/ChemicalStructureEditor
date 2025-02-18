import {ChemBond} from './ChemBond.js';
import {ChemNode} from './ChemNode.js';
import {Line, Arrow, Polyline} from './ControlPoint.js';
import {vecSum, rotateAroundCtr, scaleAroundCtr, stretchAlongDir} from './Geometry.js';
import {registry} from './BaseClasses.js';


export const MOVE = 1;
export const ROTATE = 2;
export const SCALE = 3;
export const STRETCH = 4;

const transform_funcs = Object.freeze({
	[MOVE]: (pt, {moving_vec}) => vecSum(pt, moving_vec),
	[ROTATE]: (pt, {rot_angle, rot_ctr}) => rotateAroundCtr(pt, rot_angle, rot_ctr),
	[SCALE]: (pt, {scale_factor, scale_ctr}) => scaleAroundCtr(pt, scale_factor, scale_ctr),
	[STRETCH]: (pt, {stretch_factor, dir_angle, stretch_ctr}) => stretchAlongDir(pt, stretch_factor, dir_angle, stretch_ctr)
});


export function editStructure({create={}, del={}, alter={}, transforms=new Array()}) {
	const chem_kwargs = {create: {}, del: {}, alter: {}, transforms: []};
	const shape_kwargs = {create: {}, del: {}, alter: {}, transforms: []};

	for (const [subcmd_name, subcmd_val] of Object.entries(arguments[0])) {
		if (subcmd_name == 'transforms') {
			for (const [type, ids, params] of transforms) {
				const chem_ids = new Set();
				const shape_ids = new Set();
				const id_sorter = {a: chem_ids, c: shape_ids};
				ids.forEach(id => id_sorter[id[0]].add(id));

				// Puch if not redundant
				if (chem_ids.size) chem_kwargs.transforms.push([type, chem_ids, params]);
				if (shape_ids.size) shape_kwargs.transforms.push([type, shape_ids, params]);
			}
		}
		else {
			for (const [cls_alias, content] of Object.entries(subcmd_val)) {
				const cls = registry.classes[cls_alias];
				const is_shape = cls.shape;
				(is_shape ? shape_kwargs : chem_kwargs)[subcmd_name][cls_alias] = content;
			}
		}
	}

	editChem(chem_kwargs);
	editShapes(shape_kwargs);
}


export function editChem({create={}, del={}, alter={}, transforms=new Array()}) {
	var atoms_parse = new Set(),
		atoms_render = new Set(),
		atoms_auto_d_bond = new Set(),
		atoms_refresh_tips = new Set(),
		atoms_text_me = {},
		tips_update = new Set(),
		bonds_d_adjust = new Set(),
		bonds_to_render = new Set(),
		bonds_update_rect = new Set(),
		bonds_scewed = new Set();

	// Set empty collections by default
	create = Object.assign({atoms: {}, bonds: {}}, create);
	alter = Object.assign({atoms: {}, bonds: {}}, alter);
	del = Object.assign({atoms: new Set(), bonds: new Set()}, del);

	// Delete bonds
	for (const bond_id of del.bonds) {
		let bond = document.getElementById(bond_id).objref;
		let bond_nodes = bond.nodes;
		bond.delete();
		for (const node of bond_nodes) {
			if (!del.atoms.has(node.id)) {
				atoms_parse.add(node);
				if (node.isMethane()) atoms_text_me[node.id] = node.text;
				atoms_auto_d_bond.add(node);
				if (node.text == '') atoms_refresh_tips.add(node);
			}
		}
	}

	// Delete atoms
	for (const atom_id of del.atoms) {
		document.getElementById(atom_id).objref.delete();
	}

	// Create atoms
	for (const [id, data] of Object.entries(create.atoms)) {
		atoms_parse.add(new ChemNode(id, ...data)); // data: [x, y, text]
	}

	// Create bonds
	for (const [id, data] of Object.entries(create.bonds)) {
		let bond = new ChemBond(id, ...data); // data: [node0, node1, type]
		bonds_update_rect.add(bond);
		for (const node of bond.nodes) {
			atoms_parse.add(node);
			const new_text = alter.atoms[node.id] && alter.atoms[node.id].text;
			const no_text = new_text == '' || !(new_text || node.text);
			if (no_text && node.connections.length == 1) atoms_text_me[node.id] = node.text;
			atoms_auto_d_bond.add(node);
			if (no_text) atoms_refresh_tips.add(node);
			else tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// Edit atoms
	Object.entries(alter.atoms).forEach(([id, attrs]) => atoms_text_me[id] = attrs.text);
	// Object.assign(atoms_text_me, alter.atoms);
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
	for (const [bond_id, attrs] of Object.entries(alter.bonds)) {
		let bond = document.getElementById(bond_id).objref;
		bond.setType(attrs.type);
		bonds_d_adjust.add(bond);
		for (const node of bond.nodes) {
			atoms_parse.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add(`${node.id}&${bond.id}`);
		}
	}

	// Transforms
	for (const [type, ids, params] of transforms) {
		let mirrored_bonds = new Set();
		for (const atom_id of ids) {
			const atom = document.getElementById(atom_id).objref;
			atom.setCtr(transform_funcs[type](atom.xy, params));
			atoms_render.add(atom);

			for (const bond of atom.connections) bonds_scewed.add(bond);
			if (type === STRETCH) {
				for (const bond of atom.connections) {
					if (params.stretch_factor < 0 && [8, 10].includes(bond.type) && !mirrored_bonds.has(bond.id)) {
						bond.setType(ChemBond.db_mirror[bond.type]);
						mirrored_bonds.add(bond.id);
					}
				}
			}
		}
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


export function editShapes({create={}, del={}, alter={}, transforms=new Array()}) {
	var ctr_pts_render = new Set(),
		shapes_render = new Set();

	for (const ids of Object.values(del)) {
		for (const id of ids) {
			document.getElementById(id).objref.delete();
		}
	}

	for (const [cls_alias, content] of Object.entries(create)) {
		for (const [id, data] of Object.entries(content)) {
			let new_shape = new (registry.classes[cls_alias])(id, ...data);
			shapes_render.add(new_shape);
			new_shape.cps.forEach(cp => ctr_pts_render.add(cp));
		}
	}

	// Transforms
	for (const [type, ids, params] of transforms) {
		for (const ctr_pt_id of ids) {
			let ctr_pt = document.getElementById(ctr_pt_id).objref;
			ctr_pt.setCtr(transform_funcs[type](ctr_pt.xy, params));
			ctr_pts_render.add(ctr_pt);
			shapes_render.add(ctr_pt.master);
		}
	}

	for (const shape of shapes_render) {
		shape.render();
	}

	for (const ctr_pt of ctr_pts_render) {
		ctr_pt.render();
	}
}
