function ChemBond(id, node0, node1, type) {
	Object.assign(this, ChemBond.default_style);
	this.setType(type);

	if (typeof node0 === "string") node0 = document.getElementById(node0).objref;
	if (typeof node1 === "string") node1 = document.getElementById(node1).objref;
	this.nodes = [node0, node1];
	node0.connections.push({adjnode: node1, bond: this});
	node1.connections.push({adjnode: node0, bond: this});
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

/*	Bond types:
0 - hydrogen bond
1 - single plain
2 - single up dir
3 - single up rev
4 - single up thik
5 - single down dir
6 - single down rev
7 - single down thik
8 - double -
9 - double 0
10 - double +
11 - double auto -
12 - double auto 0
13 - double auto +
14 - double auto undef
15 - triple 
*/
ChemBond.mult = [0, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3];
ChemBond.linecnt = [1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 3];
ChemBond.ctrline = [0, 0, 0, 0, 0, 0, 0, 0, 1,  , 0, 1,  , 0,  , 1];
// ChemBond.ctrline = [0, 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 14];



ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.recalcDims = function() {
	var [x0, y0, x1, y1] = this.getNodeCenters();
	this.difx = x1 - x0;
	this.dify = y1 - y0;
	this.len = vecLen(this.difx, this.dify);

	// Orthohonal unit vector ACW
	this.ouvax = -this.dify / this.len;
	this.ouvay = this.difx / this.len;

	// Orthohonal shift vector ACW
	this.shx = this.ouvax * bondspace;
	this.shy = this.ouvay * bondspace;
};

ChemBond.prototype.getNodeVec = function(node) {
	var dir_factor = this.nodes[0] == node ? 1 : -1;
	return [this.difx, this.dify].map(projection => projection * dir_factor);
	// [this.difx * dir_factor, this.dify * dir_factor]
};

ChemBond.prototype.setType = function(type) {
	this.type = type;
	this.multiplicity = ChemBond.mult[type];

	// Start and end half width of the bond line (determined by bond type)
	this.hw0 = 0.55;
	this.hw1 = 0.55;
	// ToDo: ! Create table and paste actual values depending on type

	this.lines = Array(ChemBond.linecnt[type]).fill([[], []]);
		// [ // Line
		// 	[ // Start tip
		// 		[NaN, NaN], // x, y
		// 		[NaN, NaN], 
		// 		[NaN, NaN]
		// 	], 
		// 	[ // End tip
		// 		[NaN, NaN], // x, y
		// 		[NaN, NaN], 
		// 		[NaN, NaN]
		// 	]
		// ]
	// [line][tip(start, end)][corner(prev, cntr, next)][axis (x, y)]
	// console.log(this.lines);
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
	// ToDo: ! Process other types of bonds
	var node_idx = this.getNodeIdx(node);
	var [x, y] = this.adjustLength(node_idx);
	var cur_hw = this['hw' + node_idx];
	var [hwx, hwy] = [this.ouvax, this.ouvay].map(item => item * cur_hw);
	var dir = node_idx ? 1 : -1;
	this.lines[0][node_idx][0] = vecSum(x, y, hwx * dir, hwy * dir);
	this.lines[0][node_idx][2] = vecSum(x, y, -hwx * dir, -hwy * dir);
}

ChemBond.prototype.renderLines = function() {
	for (const line of this.lines) {
		var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		polygon.setAttribute('points', line.flat().map(item => item.join()).join(' '));
		polygon.setAttribute('fill', 'black');
		this.g.appendChild(polygon);
	}
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
	return [this.nodes[0].x, this.nodes[0].y, this.nodes[1].x, this.nodes[1].y].map(Number);
};

ChemBond.prototype.getNodeIdx = function(node) {
	// return this.nodes[0] == node ? 0 : 1;
	if (this.nodes[0] == node) return 0;
	else if (this.nodes[1] == node) return 1;
	else throw new Error('The bond does not have this node!');
}

ChemBond.prototype.getBorder = function(node, acw) { // Get border line of bond
	// var side = (node == this.nodes[0]) == acw ? 1 : -1; // Node = 0, acw = 1 => side = 1
	var side = getNodeIdx(node) == acw ? -1 : 1; // Node = 0, acw = true => side = 1
	var [cx0, cy0, cx1, cy1] = this.getNodeCenters();
	var x0 = cx0 + this.hw0 * this.ouvax * side;
	var y0 = cy0 + this.hw0 * this.ouvay * side;
	var x1 = cx1 + this.hw1 * this.ouvax * side;
	var y1 = cy1 + this.hw1 * this.ouvay * side;
	return [x0, y0, x1, y1];
};

ChemBond.prototype.adjustLength = function(node) { // Prevents overlapping of the chemical symbol and bond
	var [x0, y0, x1, y1] = this.getNodeCenters();
	var curx = node == 0 ? x0 : x1, cury = node == 0 ? y0 : y1;

	if (this.nodes[node].text != '') { // ToDo: ? Consider removing this checkup
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

		[this['x' + node], this['y' + node]] = lineIntersec(
			x0, y0, x1, y1, 
			curx + mulrow[0] * tb_w, 
			cury + mulrow[1] * tb_h, 
			curx + mulrow[2] * tb_w, 
			cury + mulrow[3] * tb_h
		);
	}
	else [this['x' + node], this['y' + node]] = [curx, cury];
	return [this['x' + node], this['y' + node]];
};
