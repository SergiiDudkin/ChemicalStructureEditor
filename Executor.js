function editStructure({
	new_atoms_data={}, new_bonds_data={}, del_atoms=new Set([]), del_bonds=new Set([]), 
	atoms_text={}, bonds_type={}, moving_atoms=new Set(), moving_vec=[0, 0]
}) {
	var atoms_change_symb = new Set(), 
		atoms_recalc_hydr = new Set(), 
		atoms_reloc_hydr = new Set(), 
		atoms_auto_d_bond = new Set(), 
		atoms_refresh_tips = new Set(), 
		atoms_text_me = {},
		tips_update = new Set(), 
		bonds_d_adjust = new Set(), 
		bonds_to_render = new Set(), 
		bonds_transl = new Set(), 
		bonds_update_recht = new Set(), 
		bonds_scewed = new Set();

	// Delete bonds
	for (const bond_id of del_bonds) {
		var bond = document.getElementById(bond_id).objref;
		var bond_nodes = bond.nodes;
		bond.delete();
		for (const node of bond_nodes) {
			if (!del_atoms.has(node.g.id)) {
				atoms_recalc_hydr.add(node);
				if (node.isMethane()) atoms_text_me[node.g.id] = node.text;
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
		atoms_change_symb.add(new ChemNode(id, ...data)) // data: [x, y, text]	
	}

	// Create bonds
	for (const [id, data] of Object.entries(new_bonds_data)) {
		bond = new ChemBond(id, ...data); // data: [node0, node1, type]
		bonds_update_recht.add(bond);
		for (const node of bond.nodes) {
			atoms_recalc_hydr.add(node);
			var no_text = atoms_text[node.g.id] == '' || !(atoms_text[node.g.id] || node.text);
			if (no_text && node.connections.length == 1) atoms_text_me[node.g.id] = node.text;
			atoms_auto_d_bond.add(node);
			if (no_text) atoms_refresh_tips.add(node);
			else tips_update.add(`${node.g.id}&${bond.g.id}`);
		}
	}

	// Edit atoms
	Object.assign(atoms_text_me, atoms_text);
	for (const [node_id, text] of Object.entries(atoms_text_me)) {
		var node = document.getElementById(node_id).objref;
		node.text = text;
		atoms_change_symb.add(node);
		if (node.text == '') atoms_refresh_tips.add(node);
		for (const bond of node.connections) {
			bonds_update_recht.add(bond);
			if (node.text != '') tips_update.add(`${node.g.id}&${bond.g.id}`);
		}
	}

	// Edit bonds
	for (const [bond_id, type] of Object.entries(bonds_type)) {
		var bond = document.getElementById(bond_id).objref;
		bond.setType(type);
		bonds_d_adjust.add(bond);
		for (const node of bond.nodes) {
			atoms_recalc_hydr.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add(`${node.g.id}&${bond.g.id}`);
		}
	}

	// Find translated and scewed bonds and move atoms
	for (const atom_id of moving_atoms) {
		var atom = document.getElementById(atom_id).objref;
		atom.translate(...vecSum(atom.xy, moving_vec));
		atoms_reloc_hydr.add(atom);
		for (const bond of atom.connections) {
			if (bonds_scewed.has(bond)) {
				bonds_scewed.delete(bond);
				bonds_transl.add(bond);
			}
			else {
				bonds_scewed.add(bond);
			}
		}
	}

	// Recalculate dimensions of skewed bonds and find affected elements
	for (const bond of bonds_scewed) {
		bond.recalcDims();
		bonds_update_recht.add(bond);
		for (const node of bond.nodes) {
			atoms_auto_d_bond.add(node);
			atoms_reloc_hydr.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add(`${node.g.id}&${bond.g.id}`);
		}
	}

	// Render atom symbol
	for (const atom of atoms_change_symb) {
		atom.renderSymb();
		atoms_recalc_hydr.add(atom);
	}

	// Recalc the num of H
	for (const atom of atoms_recalc_hydr) {
		atom.calcHydr();
		atoms_reloc_hydr.add(atom);
	}

	// Render H
	for (const atom of atoms_reloc_hydr) {
		atom.removeHydr();
		atom.renderHydr();
	}

	// Move bonds
	for (const bond of bonds_transl) {
		bond.translate(moving_vec);
		bonds_to_render.add(bond);
		bonds_update_recht.add(bond);
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
				else tips_update.add(`${node.g.id}&${bond.g.id}`);
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
		var [node, bond] = node_bond.split('&').map(id => document.getElementById(id).objref);
		bond.updateTip(node);
		bonds_to_render.add(bond);
	}

	// Render bond lines
	for (const bond of bonds_to_render) {
		bond.renderLines();
	}

	// Update back rechtangle
	for (const bond of bonds_update_recht) {
		bond.updateRect();
	}
}
