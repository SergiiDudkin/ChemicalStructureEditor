function ChemBond(node0, node1, id=null, multiplicity=1) {
	if (typeof node0 === "string") node0 = document.getElementById(node0).objref;
	if (typeof node1 === "string") node1 = document.getElementById(node1).objref;

	this.nodes = [node0, node1];
	node0.connections.push({'adjnode': node1, 'bond': this});
	node1.connections.push({'adjnode': node0, 'bond': this});
	this.recalcDims();
	
	this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); // Container for the bond elements
	this.g.id = id === null ? this.getNewId() : id;
	this.g.setAttribute('class', 'bg');
	this.g.objref = this;
	bondsall.appendChild(this.g)
	
	var backrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // Background rectangle
	backrect.setAttribute('class', 'brect');
	backrect.setAttribute('height', 10);
	backrect.transform.baseVal.appendItem(canvas.createSVGTransform()); // Append rotation
	this.g.appendChild(backrect);

	this.renderBackRect();
	this.adjustLength(0);
	this.adjustLength(1);
	this.multiplicity = multiplicity;
	this.pdshift = 0;
}

ChemBond.counter = 0;

ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.recalcDims = function() {
	var [x0, y0, x1, y1] = this.getNodeCenters();
	this.difx = x1 - x0;
	this.dify = y1 - y0;
	this.len = vecLen(this.difx, this.dify);
	this.shx = -this.dify * bondspace / this.len; // Ortohonal (ACW) shift vector, X
	this.shy = this.difx * bondspace / this.len; // Ortohonal (ACW) shift vector, Y

	// Orthohonal unit vector ACW
	this.ouvax = -this.dify / this.len;
	this.ouvay = this.difx / this.len;

	// Start and end half width of the bond line (determined by bond type)
	this.hw_st = 0.55;
	this.hw_en = 0.55;
};

ChemBond.prototype.renderBackRect = function() {
	var [x0, y0, x1, y1] = this.getNodeCenters();
	var backrect = this.g.firstChild;
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
	backrect.setAttribute('width', this.len);

	var rotang = Math.acos(this.difx / this.len) * 180 / Math.PI; // Rotation angle of backrect
	rotang = this.dify > 0 ? rotang : 360 - rotang; // Make the angle positive
	backrect.transform.baseVal[0].setRotate(rotang, (x0 + x1) / 2, (y0 + y1) / 2);
};

ChemBond.prototype.moveTerminal = function() {
	this.recalcDims();
	this.adjustLength(0);
	this.adjustLength(1);
	this.renderBond();
	this.renderBackRect();
};

ChemBond.prototype.translate = function() {
	this.renderBond();

	var [x0, y0, x1, y1] = this.getNodeCenters();
	var backrect = this.g.firstChild;
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
};

ChemBond.prototype.getNodeVec = function(node) {
	if (node == this.nodes[0]) return [this.difx, this.dify];
	else if (node == this.nodes[1]) return [-this.difx, -this.dify];
	else console.log('Invalid node!');
};

ChemBond.prototype.adjustLength = function(node) { // Prevents overlapping of the chemical symbol and bond
	var [x0, y0, x1, y1] = this.getNodeCenters();
	var curx = node == 0 ? x0 : x1, cury = node == 0 ? y0 : y1;

	if (this.nodes[node].text != '') {
		var textbox = this.nodes[node].g.childNodes[2].getBBox();
		var tb_w = textbox.width;
		var tb_h = textbox.height;

		// Adjust textbox borders
		tb_w += 2;
		tb_h = Math.max(0, tb_h - 2);

		var threshold = tb_h / tb_w;
		var tan = Math.abs(this.dify / (this.difx == 0 ? 0.001 : this.difx));
		var dirtab = [
						[[2, 2],
						 [0, 0]],
						[[3, 1],
						 [3, 1]]
					 ];
		var dir = dirtab[+(tan > threshold)][+(node == 0 ? this.difx > 0 : this.difx < 0)][+(node == 0 ? this.dify < 0 : this.dify > 0)];
		var multab = [[0.5, -0.5, 0.5, 0.5], [-0.5, -0.5, 0.5, -0.5], [-0.5, -0.5, -0.5, 0.5], [-0.5, 0.5, 0.5, 0.5]];
		var mulrow = multab[dir];

		[this['x' + node], this['y' + node]] = lineIntersec(x0, y0, x1, y1, curx + mulrow[0] * tb_w, cury + mulrow[1] * tb_h, curx + mulrow[2] * tb_w, cury + mulrow[3] * tb_h);
	}
	else [this['x' + node], this['y' + node]] = [curx, cury]
};

ChemBond.prototype.getNodeCenters = function(node=null) {
	if (node == 0) return [
		parseInt(this.nodes[0].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[0].g.firstChild.getAttribute('cy')),
	]
	else if (node == 1) return [
		parseInt(this.nodes[1].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cy')),
	]
	else return [
		parseInt(this.nodes[0].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[0].g.firstChild.getAttribute('cy')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cy')),
	]
};

ChemBond.prototype.renderNodes = function() {
	this.nodes[0].renderAtom();
	this.nodes[1].renderAtom();
};

ChemBond.prototype.rotateMultData = function() {
	var this_id = this.g.id;
	var redo_data = [dispatcher.rotateMultUR, this_id, this.multiplicity % 3 + 1];
	var undo_data = [dispatcher.rotateMultUR, this_id, this.multiplicity];
	return [redo_data, undo_data]
};

ChemBond.prototype.renderBond = function() {
	while (this.g.childNodes[1]) this.g.childNodes[1].remove(); // Remove all bond lines
	switch (this.multiplicity) {
		case 1:
			this.drawBondLines(0);
			break;
		case 2:
			var pdshift = this.posDouble();
			this.drawBondLines(-1 + pdshift, 1 + pdshift);
			break;
		case 3:
			this.drawBondLines(-2, 0, 2);
			break;
	}
};

ChemBond.prototype.drawBondLines = function() {
	for (const shiftfactor of arguments) {
		var bondline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		bondline.setAttribute('class', 'sympoi');
		bondline.setAttribute('style', "fill:none;stroke:#000000;stroke-width:1.1;");
		var linepoints = [
			this.x0 + this.shx * shiftfactor,
			this.y0 + this.shy * shiftfactor,
			this.x1 + this.shx * shiftfactor,
			this.y1 + this.shy * shiftfactor
		]
		if (arguments.length == 2 && Math.abs(shiftfactor) == 2) { // Case of position-shifted double bond
			for (var node = 0; node < 2; node++) {
				curnode = this.nodes[node];
				if (curnode.connections.length >= 2 && curnode.g.childNodes[2].firstChild.nodeValue == '') {
					var x0, y0, x1, y1, angles = [];
					[x0, y0] = this.getNodeVec(curnode);
					for (const connection of curnode.connections) {
						var bond = connection.bond;
						if (bond != this) {
							[x1, y1] = bond.getNodeVec(curnode);
							angles.push(angleVec(x0, y0, x1, y1));
						}
					}
					var nodeshiftfactor = shiftfactor > 0 != Boolean(node);
					var theang = nodeshiftfactor ? Math.min(...angles) : Math.max(...angles);
					if (theang != 1 && nodeshiftfactor == theang < 1) {
						var [x2, y2] = rotateVec(x0, y0, theang * Math.PI / 2);
						var [x3, y3] = this.getNodeCenters(node);
						[linepoints[0 + 2 * node], linepoints[1 + 2 * node]] = lineIntersec(...linepoints, x3, y3, x3 + x2, y3 + y2);
					}
				}
			}
		}
		bondline.setAttribute('x1', linepoints[0]);
		bondline.setAttribute('y1', linepoints[1]);
		bondline.setAttribute('x2', linepoints[2]);
		bondline.setAttribute('y2', linepoints[3]);
		this.g.appendChild(bondline);
	}
};

ChemBond.prototype.destruct = function() {
	// Remove bond from the nodes connection lists
	for (node of this.nodes) node.connections = node.connections.filter(item => item.bond !== this);

	// Destroy
	this.g.remove();
	delete this.nodes;
};

ChemBond.prototype.getSurBonds = function() {
	var aos = this.nodes.map(node => new Set(node.getAdjBonds())); // Array of sets
	surbonds = new Set([...aos[0], ...aos[1]]);
	surbonds.delete(this);
	return surbonds
}; // Set

ChemBond.prototype.deleteBond = function() {
	var nodes = this.nodes;
	var surbonds = this.getSurBonds();
	this.destruct();
	nodes.forEach(node => node.renderAtom());
	surbonds.forEach(bond => {if (bond.multiplicity == 2) bond.renderBond()});
};

ChemBond.prototype.restoreBond = function() {
	this.renderNodes();
	this.getSurBonds().forEach(bond => {if (bond.multiplicity == 2) bond.renderBond()});
};

ChemBond.prototype.eraseData = function() {
	var this_id = this.g.id;
	var this_data = [this.nodes[0].g.id, this.nodes[1].g.id, this_id, this.multiplicity];

	var redo_data = [dispatcher.deleteChemBondR, this_id];
	var undo_data = [dispatcher.deleteChemBondU, this_data];

	return [redo_data, undo_data]
}

ChemBond.prototype.posDouble = function() { // Find the best shift of double bond
	var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
	for (var node = 0; node < 2; node++) {
		for (const connection of this.nodes[node].connections) {
			var sin = (this.difx * connection.bond.dify - this.dify * connection.bond.difx) / (this.len * connection.bond.len); // Calculate sin of angle between bonds
			if (connection.bond.nodes[0] != this.nodes[node]) sin *= -1; // Invert sin if the bond starts not from the node, but ends it (i.e. has opposit direction)
			var sinflag = sin > 0.1305 ? 1 : (sin < -0.1305 ? -1 : 0);
			if (sin > 0.1305) sinflags[node][0] = 1;
			else if (sin < -0.1305) sinflags[node][1] = -1;
		}
	}
	var pdshift = sinflags[0][0] + sinflags[0][1] + sinflags[1][0] + sinflags[1][1];
	this.pdshift = pdshift == 0 ? 0 : (pdshift < 0 ? -1 : 1);
	return this.pdshift;
};

ChemBond.prototype.getBorder = function(node, acw) { // Get border line of bond
	var side = (node == this.nodes[0]) == acw ? 1 : -1; // Node = 0, acw = 1 => side = 1
	var x0 = cx0 + this.hw_st * this.ouvax * side;
	var y0 = cy0 + this.hw_st * this.ouvay * side;
	var x1 = cx1 + this.hw_en * this.ouvax * side;
	var y1 = cy1 + this.hw_en * this.ouvay * side;
	return [x0, y0, x1, y1];
};

