function ChemBond(id, node0, node1, type) {
	Object.assign(this, ChemBond.default_style);
	this.setType(type);

	if (typeof node0 === "string") node0 = document.getElementById(node0).objref;
	if (typeof node1 === "string") node1 = document.getElementById(node1).objref;
	this.nodes = [node0, node1];
	node0.connections.push({'adjnode': node1, 'bond': this});
	node1.connections.push({'adjnode': node0, 'bond': this});
	this.recalcDims();
	
	this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); // Container for the bond elements
	this.g.id = id;
	this.g.objref = this;
	this.g.setAttribute('class', 'bg');
	document.getElementById('bondsall').appendChild(this.g)
	
	var backrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // Background rectangle
	backrect.setAttribute('class', 'brect');
	backrect.setAttribute('height', 10);
	backrect.transform.baseVal.appendItem(canvas.createSVGTransform()); // Append rotation
	this.g.appendChild(backrect);
}

ChemBond.counter = 0;

ChemBond.default_style = {
	color: 'black',
	thickness: 1.1,
	bond_spacing: 4,
	bold: 4
};

ChemBond.mult = [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3]; /*
0 - hydrogen bond;
1 - single plain;
2 - single up dir;
3 - single up rev;
4 - single up thik;
5 - single down dir;
6 - single down rev;
7 - single down thik;
8 - double -;
9 - double 0;
10 - double +;
11 - double auto -;
12 - double auto 0;
13 - double auto +;
14 - double auto undef;
15 - triple; */
ChemBond.linecnt = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3];

ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.recalcDims = function() {
	var [x0, y0, x1, y1] = this.getNodeCenters();
	this.difx = x1 - x0;
	this.dify = y1 - y0;
	this.len = vecLen(this.difx, this.dify);

	// Orthohonal shift vectors ACW
	this.shx = -this.dify * bondspace / this.len;
	this.shy = this.difx * bondspace / this.len;

	// Orthohonal unit vectors ACW
	this.ouvax = -this.dify / this.len;
	this.ouvay = this.difx / this.len;

	// Start and end half width of the bond line (determined by bond type)
	this.hw_st = 0.55;
	this.hw_en = 0.55;
};

ChemBond.prototype.getNodeVec = function(node) {
	var dir_factor = this.nodes[0] == node ? 1 : -1;
	return [this.difx, this.dify].map(projection => projection * dir_factor);
	// [this.difx * dir_factor, this.dify * dir_factor]
};

ChemBond.prototype.setType = function(type) {
	this.type = type;
	this.multiplicity = ChemBond.mult[type];
	this.lines = Array(ChemBond.linecnt[type]).fill(null).map(() => 
		[ // Line
			[ // Start tip
				[NaN, NaN], 
				[NaN, NaN], 
				[NaN, NaN]
			], 
			[ // End tip
				[NaN, NaN], 
				[NaN, NaN], 
				[NaN, NaN]
			]
		]
	); // [line][tip(start, end)][corner(prev, crt, next)][axis (x, y)]
}

ChemBond.prototype.destruct = function() {
	for (node of this.nodes) node.connections = node.connections.filter(item => item.bond !== this);
	this.g.remove();
	delete this.nodes;
};

ChemBond.prototype.translate = function() {
	// !!! Move poligon corners
};

ChemBond.prototype.posDouble = function() {
	// Find the best shift of double bond
	var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
	for (const [node_idx, node] of this.nodes.entries()) {
		for (const {bond, adjnode} of node.connections) {
			var sin = (this.difx * bond.dify - this.dify * bond.difx) / (this.len * bond.len); // Calculate sin of angle between bonds
			if (bond.nodes[0] != node) sin *= -1; // Invert sin if the bond starts not from the node, but ends it (i.e. has opposit direction)
			if (sin > 0.1305) sinflags[node_idx][0] = 1;
			else if (sin < -0.1305) sinflags[node_idx][1] = -1;
		}
	}
	this.pdshift = Math.sign(sinflags.flat().reduce((pv, cv) => pv + cv, 0)); // Sign of sum
	return this.pdshift;
};

ChemBond.prototype.updateTip = function(node) {
	// !!!
}

ChemBond.prototype.renderLines = function() {
	// !!!
}

ChemBond.prototype.updateRect = function() {
	var [x0, y0, x1, y1] = this.getNodeCenters();
	var backrect = this.g.firstChild;
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
	backrect.setAttribute('width', this.len);

	var rotang = Math.acos(this.difx / this.len) * 180 / Math.PI; // Rotation angle of backrect
	rotang = this.dify > 0 ? rotang : 360 - rotang; // Make the angle positive
	backrect.transform.baseVal[0].setRotate(rotang, (x0 + x1) / 2, (y0 + y1) / 2);
}

ChemBond.prototype.getNodeCenters = function() {
	return [this.nodes[0].x, this.nodes[0].y, this.nodes[1].x, this.nodes[1].y]
};

