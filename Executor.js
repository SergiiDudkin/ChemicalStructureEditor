class TipSet extends Set{
	constructor(...args) {
		super(...args);
		this.inner_set = new Set(); // Set of stringified elements
	}
	add(elem) {
		if (!this.has(elem)) {
			this.inner_set.add(elem.map(item => item.g.id).join()); // Add stringified element
			super.add(elem);
		}
	}
	has(elem) {
		return this.inner_set.has(elem.map(item => item.g.id).join()); // Check stringified element
	}
}


function editStructure({new_atoms_data=[], new_bonds_data=[], del_atoms=[], del_bonds=[], atoms_text=[], bonds_type=[], moving_data=[[], []]}) {
	var [moving_vec, moving_atoms] = moving_data,
		atoms_change_symb = new Set(), 
		atoms_recalc_hydr = new Set(), 
		atoms_reloc_hydr = new Set(), 
		atoms_auto_d_bond = new Set(), 
		atoms_refresh_tips = new Set(), 
		tips_update = new TipSet(),
		bonds_d_adjust = new Set(), 
		bonds_to_render = new Set(), 
		bonds_transl = new Set(), 
		bonds_update_recht = new Set(), 
		bonds_scewed = new Set();

	// Delete bonds
	for (const bond of del_bonds) {
		for (const node of bond.nodes) {
			if (!del_atoms.has(node)) {
				atoms_recalc_hydr.add(node);
				atoms_auto_d_bond.add(node);
				if (node.text == '') atoms_refresh_tips.add(node);
			}
		}
		bond.deleteBond();
	}

	// Delete atoms
	for (const atom of del_atoms) {
		atom.delete();
	}

	// Create atoms
	for (const data of new_atoms_data) {
		atoms_change_symb.add(new ChemNode(...data)) // data: [id, x, y, text]	
	}

	// Create bonds
	for (const data of new_bonds_data) {
		bond = new ChemBond(...data); // data: [id, node0, node1, type]
		bonds_update_recht.add(bond);
		for (const node of bond.nodes) {
			atoms_recalc_hydr.add(node);
			atoms_auto_d_bond.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add([node, bond]);
		}
	}

	// Edit atoms
	for (const [atom, text] of atoms_text) {
		atom.text = text;
		atoms_change_symb.add(atom);
		if (text == '') atoms_refresh_tips.add(atom);
		for (const {bond, adjnode} of atom.connections) {
			bonds_update_recht.add(bond);
			if (text != '') tips_update.add([atom, bond]);
		}
	}

	// Edit bonds
	for (const [bond, type] of bonds_type) {
		bond.setType(type);
		bonds_d_adjust.add(bond);
		for (const node of bond.nodes) {
			atoms_recalc_hydr.add(node);
			if (node.text == '') atoms_refresh_tips.add(node);
			else tips_update.add([node, bond]);
		}
	}

	// Find tranclated and scewed bonds and move atoms
	for (const atom of moving_atoms) {
		atom.translate(atom.x + moving_vec[0], atom.y + moving_vec[1])
		atoms_reloc_hydr.add(atom);
		for (const {bond, adjnode} of atom.connections) {
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
			else tips_update.add([node, bond]);
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
		if (atom.text != '') atom.renderHydr();
	}

	// Move bonds
	for (const bond of bonds_transl) {
		bond.translate();
		bonds_to_render.add(bond);
	}

	// Fetch auto double bonds
	for (const atom of atoms_auto_d_bond) {
		for (const {bond, adjnode} of atom.connections) {
			bonds_d_adjust.add(bond);
		}
	}

	// Find shifts of auto double bonds
	for (const bond of bonds_d_adjust) {
		if (ChemBond.auto_d_bonds.includes(bond.type)) {
			bond.posDouble();
			for (const node of bond.nodes) {
				if (node.text == '') atoms_refresh_tips.add(node);
				else tips_update.add([node, bond]);
			}
		}
	}

	// Reshape converging line tips (no symbol; implicit C)
	for (const atom of atoms_refresh_tips) {
		atom.calcLineTips();
		for (const {bond, adjnode} of atom.connections) {
			bonds_to_render.add(bond);
		}
	}

	// Reshape floating tips (some symbol is present)
	for (const [node, bond] of tips_update) {
		bond.updateTip(node)
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