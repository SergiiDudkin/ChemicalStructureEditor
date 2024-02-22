function ChemNode(id, x, y, text) {
	this.id = id

	Object.assign(this, ChemNode.default_style);
	this.text = text.toString(); // ??? maybe .toString() is not needed
	this.connections = [];
	this.select_circ = null;

	this.g = attachSvg(document.getElementById('atomsall'), 'g', {'class': 'ag'});
	this.g.objref = this;

	this.backcircle = attachSvg(document.getElementById('sensors_a'), 'circle', {'id': id, 'class': 'anode', 'r': 8, 'cx': x, 'cy': y});
	this.backcircle.is_atom = true;
	this.backcircle.objref = this;

	this.xy = [x, y];
}

ChemNode.counter = 0;

ChemNode.default_style = {
	color: 'black',
	default_font_family: 'Arial',
	default_size: 16
};

ChemNode.hmaxtab = {'': 0, 'C': 4, 'H': 1, 'N': 3, 'O': 2, 'S': 2, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'Mg': 2};

ChemNode.prototype.getNewId = function() {
	return 'a' + ChemNode.counter++;
};

ChemNode.prototype.delete = function() {
	this.g.remove();
	this.backcircle.remove();
	delete this.connections;
};

ChemNode.prototype.isImplicit = function() {
	// Is it implicit carbon (line terminal, no explicit atom symbol)
	return this.connections.length > 0 && this.text == '';
}

ChemNode.prototype.isMethane = function() {
	// Is is lonely implicit carbon (should be displayed as CH4)
	return this.connections.length == 0 && this.text == '';
}

ChemNode.prototype.parse = function() {
	var target_text;
	var used_valency = this.connections.reduce((prev, curr) => prev + curr.multiplicity, 0);
	if (this.text.startsWith('@')) {
		target_text = this.text.slice(1);
		try {
			this.bracket_tree = buildBracketTree(tokenize(target_text));
		}
		catch {
			this.bracket_tree = [{content: target_text, brackets: [], count: null}]
		}
	}
	else {
		target_text = this.isMethane() ? 'C' : this.text; // Convert floating C atoms into CH4
		this.bracket_tree = [{content: target_text, brackets: [], count: null}]
		var h_cnt = target_text in ChemNode.hmaxtab ? Math.max(ChemNode.hmaxtab[target_text] - used_valency, 0) : 0;
		if (h_cnt) this.bracket_tree.push({content: 'H', brackets: [], count: h_cnt > 1 ? h_cnt : null});
	}
};

ChemNode.prototype.translate = function(moving_vec) {
	var [dx, dy] = moving_vec;
	var [x, y] = this.xy;
	this.xy = vecSum(this.xy, moving_vec);

	this.backcircle.setAttribute('cx', x + dx);
	this.backcircle.setAttribute('cy', y + dy);

	for (var textnode of this.g.childNodes) {
		textnode.setAttribute('x', parseFloat(textnode.getAttribute('x')) + dx);
		textnode.setAttribute('y', parseFloat(textnode.getAttribute('y')) + dy);
	}

	if (this.select_circ != null) {
		this.select_circ.setAttribute('cx', x + dx);
		this.select_circ.setAttribute('cy', y + dy);
	}
};

ChemNode.prototype.select = function() { // !!! Temp
	this.select_circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	this.select_circ.setAttribute('class', 'hlcirc');
	this.select_circ.setAttribute('cx', this.xy[0]);
	this.select_circ.setAttribute('cy', this.xy[1]);
	this.select_circ.setAttribute('r', 10);
	ahl.appendChild(this.select_circ);
};

ChemNode.prototype.deselect = function() { // !!! Temp
	this.select_circ.remove();
	this.select_circ = null;
};

ChemNode.prototype.renderText = function() {
	while (this.g.childElementCount) this.g.lastChild.remove(); // Remove old text
	this.locateHydr();
	textTermBuilder(this.bracket_tree, this.g, this.position_idx, styledict, this.xy)
}

ChemNode.prototype.locateHydr = function() { 
	// Find the least ocupied direction in terms of the most interfearing bond angle (or to be exect, unit vector projection)
	if (this.connections.length == 0) this.position_idx = 0; // If there are no bonds, draw hydrogens right
	else {
		var proj_rldu = [[], [], [], []]; // Unit vector projections in each direction, right, left, down and up respectively
		for (const bond of this.connections) {
			var [bondcos, bondsin] = bond.getNodeVec(this).map(dif => dif / bond.len)
			proj_rldu[0].push(bondcos > 0 ? bondcos : 0);
			proj_rldu[1].push(-bondcos > 0 ? -bondcos : 0);
			proj_rldu[2].push(bondsin > 0 ? bondsin : 0);
			proj_rldu[3].push(-bondsin > 0 ? -bondsin : 0);
		}
		var max_rldu = proj_rldu.map(projs => Math.max(...projs)) // Within each direction, isolate projections of the most interfearing bonds
		this.position_idx = max_rldu.indexOf(Math.min(...max_rldu)); // Find index of the least ocupied direction
	}
};

ChemNode.prototype.sortConnections = function() {
	// Sort by the angle between surrounding bonds and x-axis
	this.connections.sort((a, b) => angleVec([1, 0], a.getNodeVec(this)) - angleVec([1, 0], b.getNodeVec(this)));
};

ChemNode.prototype.goToBond = function(bond, step) {
	// Go to another bond
	var idx = this.connections.indexOf(bond);
	var bond_cnt = this.connections.length;
	var target_idx = (idx + bond_cnt + step % bond_cnt) % bond_cnt;
	return this.connections[target_idx];
};

ChemNode.prototype.computeBondsJunc = function(bond0, bond1) {
	cos_a = cosVec(bond0.getNodeVec(this), bond1.getNodeVec(this));
	if (Math.abs(cos_a) > Math.cos(Math.PI / 24)) {
		bond0.setHalfButt(this, true);
		bond1.setHalfButt(this, false);
	}
	else {
		var junc = lineIntersec(...bond0.getBorder(this, false), ...bond1.getBorder(this, true));
		bond0.juncs[bond0.getNodeIdx(this)][1] = junc;
		bond1.juncs[bond1.getNodeIdx(this)][0] = junc;
	}
}

ChemNode.prototype.calcLineTips = function() {
	this.sortConnections();
	var ctr_bonds = this.connections.filter(bond => ChemBond.ctrline[bond.type] !== undefined);
	this.ctr_bonds_cnt = ctr_bonds.length;
	if (ctr_bonds.length > 1) {
		ctr_bonds.forEach((bond, i) => this.computeBondsJunc(bond, ctr_bonds[(i + 1) % ctr_bonds.length]));
	}
	for (const bond of this.connections) {
		bond.updateConvTip(this);
	}
};
