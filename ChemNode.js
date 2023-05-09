function ChemNode(id, x, y, text) {
	Object.assign(this, ChemNode.default_style);
	this.text = text.toString(); // ??? maybe .toString() is not needed
	this.connections = [];
	this.select_circ = null;
	
	this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	this.g.id = id;
	this.g.objref = this;
	this.g.setAttribute('class', 'ag');
	document.getElementById('atomsall').appendChild(this.g);

	var backcircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	backcircle.setAttribute('class', 'anode');
	backcircle.setAttribute('r', 8);
	this.g.appendChild(backcircle);

	var atom = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	atom.setAttribute('class', 'chemtxt sympoi');
	atom.setAttribute('style', `fill:${this.color};font-family:'${this.default_font_family}';font-size:${this.default_size}px;`);
	atom.setAttribute('dy', 5.5);
	this.g.appendChild(atom);

	this.translate(x, y)
	atom.appendChild(document.createTextNode('')); // Add atom text (without hydrogens)
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

ChemNode.prototype.renderSymb = function() {
	var atom = this.g.childNodes[1];
	target_text = this.isMethane() ? 'C' : this.text; // Convert floating C atoms into CH4
	if (atom.firstChild.nodeValue != target_text) { // Update text, if needed
		atom.firstChild.nodeValue = target_text;
		atom.setAttribute('dx', -atom.getBBox().width / 2); // Adjust (center) position of text
		this.corrSymbPos();
	}
};

ChemNode.prototype.corrSymbPos = function() {
	// ToDo: ? Reuse corrAtomPos from main0.js
	var atom = this.g.childNodes[1]
	var bbox = atom.getBBox();
	var bboxxctr = bbox.x + bbox.width / 2;
	ctr_err = (this.xy[0] - bboxxctr).toFixed(1);
	this.width_err = -ctr_err * 1.5; // ??? Why 1.5? Should be 2
	if (ctr_err != 0) atom.setAttribute('dx', -(bbox.width + this.width_err) / 2); // Adjust (center) position of text
};

ChemNode.prototype.calcHydr = function() {
	var used_valency = this.connections.reduce((prev, curr) => prev + curr.multiplicity, 0);
	hmax = this.g.childNodes[1].firstChild.nodeValue;
	this.H_cnt = hmax in hmaxtab ? 
		Math.max(ChemNode.hmaxtab[hmax] - used_valency, 0) : 0;
};

ChemNode.prototype.translate = function(new_x, new_y) {
	this.xy = [new_x, new_y];

	var backcircle = this.g.childNodes[0];
	backcircle.setAttribute('cx', new_x);
	backcircle.setAttribute('cy', new_y);

	var atom = this.g.childNodes[1];
	atom.setAttribute('x', new_x);
	atom.setAttribute('y', new_y);

	if (this.select_circ != null) {
		this.select_circ.setAttribute('cx', new_x);
		this.select_circ.setAttribute('cy', new_y);
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

ChemNode.prototype.removeHydr = function() {
	var hydrogens = this.g.childNodes[2];
	if (hydrogens !== undefined) hydrogens.remove(); // Erase old hydrogens
}

ChemNode.prototype.renderHydr = function() {
	if (this.H_cnt > 0) { // If there are hydrogens
		var atom = this.g.childNodes[1]

		// Create H box
		var hydrogens = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		hydrogens.setAttribute('class', 'sympoi');
		hydrogens.setAttribute('x', atom.getAttribute('x'));
		hydrogens.setAttribute('y', atom.getAttribute('y'));
		this.g.appendChild(hydrogens);

		// Draw H symbol
		var hsymb = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
		hsymb.setAttribute('class', 'chemtxt');
		hsymb.setAttribute('style', atom.getAttribute('style'));
		hsymb.appendChild(document.createTextNode('H'));
		hydrogens.appendChild(hsymb);

		// Draw count of hydrogens, if more then 1
		if (this.H_cnt > 1) {
			var hnumb = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
			hnumb.setAttribute('class', 'chemtxt');
			hnumb.setAttribute('style', `fill:${this.color};font-family:'${this.default_font_family}';font-size:${this.default_size * 0.7}px;`);
			hnumb.setAttribute('dy', 3);
			hnumb.appendChild(document.createTextNode(this.H_cnt));
			hydrogens.appendChild(hnumb);
		}

		// Place hydrogens in correct position
		var atbox = atom.getBBox();
		var halfatom_w = (atbox.width + this.width_err) / 2;
		var hwidth = hydrogens.firstChild.getBBox().width;
		this.locateHydr();
		if (this.position_idx == 0) { // Right
			hydrogens.setAttribute("dx", halfatom_w);
			hydrogens.setAttribute("dy", 5.5);
		}
		else if (this.position_idx == 1) { // Left
			hydrogens.setAttribute("dx", -(halfatom_w + hydrogens.getBBox().width));
			hydrogens.setAttribute("dy", 5.5);
		}
		else if (this.position_idx == 2) { // Down
			hydrogens.setAttribute("dx", -(hwidth + this.width_err) / 2);
			hydrogens.setAttribute("dy", atbox.height + 2);
		}
		else { // Up
			hydrogens.setAttribute("dx", -(hwidth + this.width_err) / 2);
			hydrogens.setAttribute("dy", -atbox.height + 9);
		}
	}
};

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

// ChemNode.prototype.makeCursor = function() {
// 	this.renderSymb();
// 	this.g.firstChild.setAttribute('class', 'cursor-circ');
// };

// ChemNode.getCursorAtom = function(event, atomtext) {
// 	var cursoratom = new ChemNode('cursoratom', ...clampToCnv(getSvgPoint(event)), atomtext);
// 	cursoratom.renderSymb();
// 	cursoratom.g.firstChild.setAttribute('class', 'cursor-circ');
// 	return cursoratom;
// };

