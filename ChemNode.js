function ChemNode(x, y, nodetext, id=null) {
	this.connections = [];
	this.hlcirc = null;
	this.text = nodetext == 'C' ? '' : nodetext;

	this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	this.g.id = id === null ? this.getNewId() : id;
	this.g.setAttribute('class', 'ag');
	this.g.objref = this;
	atomsall.appendChild(this.g);

	var corner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	corner.setAttribute('class', 'sympoi');
	corner.setAttribute('cx', x);
	corner.setAttribute('cy', y);
	corner.setAttribute('r', 0.55);
	corner.setAttribute('fill', 'none');
	this.g.appendChild(corner);

	var backcircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	backcircle.setAttribute('class', 'anode');
	backcircle.setAttribute('cx', x);
	backcircle.setAttribute('cy', y);
	backcircle.setAttribute('r', 8);
	this.g.appendChild(backcircle);

	var atom = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	atom.setAttribute('x', x);
	atom.setAttribute('y', y);
	atom.setAttribute('class', 'chemtxt sympoi');
	atom.setAttribute('style', "font-family:'Arial';font-size:12px;");
	atom.setAttribute('dy', 4.5);
	this.g.appendChild(atom);

	atom.appendChild(document.createTextNode('')); // Add atom text (without hydrogens)
}

ChemNode.counter = 0;

ChemNode.prototype.getNewId = function() {
	return 'a' + ChemNode.counter++;
};

ChemNode.prototype.createSingleData = function(x, y, cursortext) {
	// console.log(this);
	// var this_id = ChemNode.prototype.getNewId();
	var this_id = this.getNewId();
	var redo_data = [dispatcher.createSingleR, this_id, x, y, cursortext];
	var undo_data = [dispatcher.createSingleU, this_id];
	return [redo_data, undo_data]
};

ChemNode.prototype.highlight = function() {
	this.hlcirc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	this.hlcirc.setAttribute('class', 'hlcirc');
	this.hlcirc.setAttribute('cx', parseInt(this.g.firstChild.getAttribute('cx')));
	this.hlcirc.setAttribute('cy', parseInt(this.g.firstChild.getAttribute('cy')));
	this.hlcirc.setAttribute('r', 10);
	ahl.appendChild(this.hlcirc);
};

ChemNode.prototype.dehighlight = function() {
	this.hlcirc.remove();
	this.hlcirc = null;
};

ChemNode.prototype.translate = function(dx, dy) {
	var x = parseInt(this.g.firstChild.getAttribute('cx')) + Math.round(dx);
	var y = parseInt(this.g.firstChild.getAttribute('cy')) + Math.round(dy);

	var corner = this.g.firstChild;
	corner.setAttribute('cx', x);
	corner.setAttribute('cy', y);

	var backcircle = this.g.childNodes[1];
	backcircle.setAttribute('cx', x);
	backcircle.setAttribute('cy', y);

	if (this.hlcirc != null) {
		this.hlcirc.setAttribute('cx', x);
		this.hlcirc.setAttribute('cy', y);
	}

	var atom = this.g.childNodes[2];
	atom.setAttribute('x', x);
	atom.setAttribute('y', y);
	this.renderAtom();
};

ChemNode.prototype.changeAtom = function(cursortext) {
	var used_valency = this.connections.reduce((prev, curr) => prev + curr.bond.multiplicity, 0);
	this.text = (cursortext == 'C' && this.text != '' && used_valency > 0) ? '' : cursortext;
	this.renderAtom();

	// Adjust length of the surrounding bonds
	for (const connection of this.connections) {
		var bond = connection.bond;
		for (var term=0; term < 2; term++) {
			if (bond.nodes[term] == this) {
				bond.adjustLength(term);
				bond.renderBond();
				break;
			}
		}
	}
};

ChemNode.prototype.setAtomData = function(cursortext) {
	var this_id = this.g.id;
	var redo_data = [dispatcher.setAtomUR, this_id, cursortext];
	var undo_data = [dispatcher.setAtomUR, this_id, this.text];
	return [redo_data, undo_data]
};

ChemNode.prototype.getAdjBonds = function() {
	return this.connections.map(connection => connection.bond);
}; // Array

ChemNode.prototype.getAdjNodes = function() {
	return this.connections.map(connection => connection.adjnode);
}; // Array

ChemNode.prototype.getNextAdjBonds = function() {
	return new Set(this.getAdjNodes().reduce((prev, curr) => prev.concat(curr.getAdjBonds()), []));
}; // Set

ChemNode.prototype.getSurBonds = function() {
	var adjbonds = this.getAdjBonds();
	var nextadjbonds = this.getNextAdjBonds();
	for (var bond of adjbonds) nextadjbonds.delete(bond);
	return nextadjbonds;
}; // Set

ChemNode.prototype.eraseData = function() {
	var this_id = this.g.id;
	var this_data = [this.g.firstChild.getAttribute('cx'), this.g.firstChild.getAttribute('cy'), this.g.childNodes[2].firstChild.nodeValue, this_id];

	var adjbonds = this.getAdjBonds();
	var adjbonds_data = adjbonds.map(adjbond => [adjbond.nodes[0].g.id, adjbond.nodes[1].g.id, adjbond.g.id, adjbond.multiplicity]);

	var redo_data = [dispatcher.deleteChemNodeR, this_id];
	var undo_data = [dispatcher.deleteChemNodeU, this_data, adjbonds_data];

	return [redo_data, undo_data]
}

ChemNode.prototype.restoreWithBonds = function() {
	var adjnodes = this.getAdjNodes();
	var adjbonds = this.getAdjBonds();
	var surbonds = this.getSurBonds();

	for (const node of [...adjnodes, this]) node.renderAtom(); // Draw hydrogens [this, ...adjnodes]
	for (const adjbond of adjbonds) adjbond.renderBond(); // Draw surrounding bonds
	for (const surbond of surbonds) if (surbond.multiplicity == 2) surbond.renderBond(); // Refresh surrounding double bonds
}

ChemNode.prototype.deleteWithBonds = function() {
	var adjbonds = this.getAdjBonds();
	var surbonds = this.getSurBonds();
	var adjnodes = this.getAdjNodes();

	for (const adjbond of adjbonds) adjbond.destruct(); // Delete bonds [...adjbonds]
	this.g.remove(); // Delete the atom [this]
	this.connections = [];
	for (const surbond of surbonds) if (surbond.multiplicity == 2) surbond.renderBond(); // Update double bond shifts [...surbonds]
	for (const adjnode of adjnodes) adjnode.renderAtom(); // Draw hydrogens [...adjnodes]
}

ChemNode.prototype.renderAtom = function() {
	hydrogens = this.g.childNodes[3];
	if (hydrogens !== undefined) hydrogens.remove();

	var atom = this.g.childNodes[2];
	var used_valency = this.connections.reduce((prev, curr) => prev + curr.bond.multiplicity, 0);

	target_text = used_valency == 0 && this.text == '' ? 'C' : this.text // Convert floating C atoms into CH4
	if (atom.firstChild.nodeValue != target_text) { // Update text, if needed
		atom.firstChild.nodeValue = target_text;
		atom.setAttribute('dx', -atom.getBBox().width / 2); // Adjust (center) position of text
		this.widthcorr = corrAtomPos(atom, this.g.firstChild.getAttribute('cx'));
	}

	var count = 0;
	for (const connection of this.connections) if (connection.bond.multiplicity != 2 || connection.bond.pdshift != 0) count++;
	this.g.firstChild.setAttribute('fill', count >= 2 && atom.firstChild.nodeValue == '' ? 'black' : 'none'); // Show or hide the corner circle

	// Find hydrogens count
	var H_cnt;
	if (atom.firstChild.nodeValue in hmaxtab) H_cnt = Math.max(hmaxtab[atom.firstChild.nodeValue] - used_valency, 0);
	else H_cnt = 0;

	if (H_cnt > 0) { // If there are hydrogens
		hydrogens = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		hydrogens.setAttribute('class', 'sympoi');
		hydrogens.setAttribute('x', atom.getAttribute('x'));
		hydrogens.setAttribute('y', atom.getAttribute('y'));
		this.g.appendChild(hydrogens);

		// Draw H symbol
		var hsymb = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
		hsymb.setAttribute('class', 'chemtxt');
		hsymb.setAttribute('style', "font-family:'Arial';font-size:12px;");
		hsymb.appendChild(document.createTextNode('H'));
		hydrogens.appendChild(hsymb);

		var hwidth = hydrogens.getBBox().width;

		// Draw count of hydrogens
		if (H_cnt > 1) {
			var hnumb = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
			hnumb.setAttribute('class', 'chemtxt');
			hnumb.setAttribute('style', "font-family:'Arial';font-size:8px;");
			hnumb.setAttribute('dy', 3);
			hnumb.appendChild(document.createTextNode(H_cnt));
			hydrogens.appendChild(hnumb);
		}

		var atbox = atom.getBBox();
		var halfatom_w = (atbox.width + this.widthcorr) / 2;//  + this.widthcorr;

		// Place hydrogens in correct position
		if (this.connections.length == 0) { // If there are no bonds, draw hydrogens right
			hydrogens.setAttribute('dx', halfatom_w);
			hydrogens.setAttribute('dy', 4.5);
		}
		else { // Find the least ocupied direction in terms of the most interfearing bond angle (or to be exect, unit vector projection)
			var proj_rldu = [[], [], [], []]; // Unit vector projections in each direction, right, left, down and up respectively
			for (const connection of this.connections) {
				var bond = connection.bond;
				var bondlength = bond.len;
				var difx, dify;
				[difx, dify] = bond.getNodeVec(this);

				var bondcos = difx / bondlength;
				var bondsin = dify / bondlength;
				proj_rldu[0].push(bondcos > 0 ? bondcos : 0);
				proj_rldu[1].push(-bondcos > 0 ? -bondcos : 0);
				proj_rldu[2].push(bondsin > 0 ? bondsin : 0);
				proj_rldu[3].push(-bondsin > 0 ? -bondsin : 0);
			}

			var max_rldu = [];
			for (var k = 0; k < 4; k++) max_rldu.push(Math.max(...proj_rldu[k])); // Within each direction, isolate projections of the most interfearing bonds
			var position_idx = max_rldu.indexOf(Math.min(...max_rldu)); // Find index of the least ocupied direction

			if (position_idx == 0) { // Right
				hydrogens.setAttribute("dx", halfatom_w);
				hydrogens.setAttribute("dy", 4.5);
			}
			else if (position_idx == 1) { // Left
				hydrogens.setAttribute("dx", -(halfatom_w + hydrogens.getBBox().width));
				hydrogens.setAttribute("dy", 4.5);
			}
			else if (position_idx == 2) { // Down
				hydrogens.setAttribute("dx", -(hwidth + this.widthcorr) / 2);
				hydrogens.setAttribute("dy", atbox.height + 1);
			}
			else { // Up
				hydrogens.setAttribute("dx", -(hwidth + this.widthcorr) / 2);
				hydrogens.setAttribute("dy", H_cnt > 1 ? -atbox.height + 8 : -atbox.height + 8);
			}
		}
	}
};
