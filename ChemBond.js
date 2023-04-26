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
ChemBond.mult = 				[ 0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];
ChemBond.linecnt = 				[ 1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];
ChemBond.ctrline = 				[ 0,  0,  0,  0,  0,  0,  0,  0,  1,   ,  0,  1,   ,  0,   ,  1];
ChemBond.auto_d_bonds = 		[11, 12, 13, 14];
ChemBond.next_type = 			[ 1, 14, 14, 14, 14, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15,  1];
ChemBond.pdshift1p_to_type = 	[11, 12, 13];
ChemBond.type_to_pdshift = 		[ 0,  0,  0,  0,  0,  0,  0,  0, -1,  0,  1, -1,  0,  1,   ,  0];

ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.recalcDims = function() {
	this.difxy = vecDif(...this.getNodeCenters().flat()); // Vector between nodes
	this.len = vecLen(...this.difxy); // Distance between nodes
	this.uv = vecDiv(...this.difxy, this.len); // Unit vector
	this.ouva = rot90(...this.uv); // Orthohonal unit vector ACW
};

ChemBond.prototype.getNodeVec = function(node) {
	var dir_factor = this.nodes[0] == node ? 1 : -1;
	return vecMul(...this.difxy, dir_factor);
};

ChemBond.prototype.getNextType = function() {
	return ChemBond.next_type[this.type];
}

ChemBond.prototype.setType = function(type) {
	this.type = type;
	this.multiplicity = ChemBond.mult[type];
	this.pdshift = ChemBond.type_to_pdshift[type];
	this.linecnt = ChemBond.linecnt[type]

	// Start and end half width of the bond line (determined by bond type)
	this.hw0 = 0.75;//0.55;
	this.hw1 = 0.75;//0.55;
	this.hws = 0.75;//0.55; // Side line half width 
	this.hsp = 1.5; // Half of space between lines in multiple bonds
	// ToDo: ! Create table and paste actual values depending on type

	this.juncs = [new Array(2), new Array(2)];
	this.lines = new Array(this.linecnt).fill().map(() => [[], []]);
	// this.lines[line][tip(start | end)][corner(prev | cntr | next)][axis(x | y)]
};

ChemBond.prototype.destruct = function() {
	for (node of this.nodes) node.connections = node.connections.filter(item => item.bond !== this);
	this.g.remove();
	delete this.nodes;
};

ChemBond.prototype.translate = function() {
	// !!! Move poligon corners
};

ChemBond.prototype.posDouble = function() {
	// Find the best shift of double bond; set type accordingly
	var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
	for (const [node_idx, node] of this.nodes.entries()) {
		for (const {bond, adjnode} of node.connections) {
			if (this != bond) {
				var sin = sinVec(...this.difxy, ...bond.difxy);
				if (bond.nodes[0] != node) sin *= -1; // Invert sin if the bond starts not from the node, but ends it (i.e. has opposit direction)
				if (sin > 0.1305) sinflags[node_idx][0] = 1;
				else if (sin < -0.1305) sinflags[node_idx][1] = -1;
			}
		}
	}
	pdshift = Math.sign(sinflags.flat().reduce((pv, cv) => pv + cv, 0)); // Sign of sum
	this.setType(ChemBond.pdshift1p_to_type[pdshift + 1]);
	return pdshift;
};

ChemBond.prototype.updateTip = function(node) {
	this.adjustLength(node);
	this.setSideTip(node);
}

ChemBond.prototype.setButtTip = function(node, line_idx, term_xy) {
	var node_idx = this.getNodeIdx(node);
	var hw_vec = vecMul(...this.ouva, this['hw' + node_idx]);
	var dir = node_idx ? 1 : -1;
	this.lines[line_idx][node_idx] = [
		vecSum(...term_xy, ...vecMul(...hw_vec, dir)), 
		, 
		vecSum(...term_xy, ...vecMul(...hw_vec, -dir))
	];
};

ChemBond.prototype.setHalfButt = function(node, acw) {
	var node_idx = this.getNodeIdx(node);
	var hw_len = this['hw' + node_idx] * (node_idx == acw ? -1 : 1);
	this.juncs[node_idx][acw] = vecSum(...node.xy, ...vecMul(...this.ouva, hw_len))
}

ChemBond.prototype.getShiftFactors = function() {
	return [...Array(this.linecnt).keys()].map(idx => [idx, idx * 2 - this.linecnt + 1 + this.pdshift]);
}

ChemBond.prototype.setSideTip = function(node) {
	var node_idx = this.getNodeIdx(node);
	var is_text = node.text != ''

	// Iterate over lines
	for (const [line_idx, shift_factor] of this.getShiftFactors()) {
		if ((shift_factor == 0) && (!is_text) && (node.ctr_bonds_cnt > 1)) { // Converging line tip
			this.lines[line_idx][node_idx] = [this.juncs[node_idx][0], node.xy, this.juncs[node_idx][1]];
		}
		else { // Floating line tip
			var shift_val = (this.hws + this.hsp) * shift_factor;
			var term_xy = is_text ? [this['x' + node_idx], this['y' + node_idx]] : node.xy;
			var xy = vecSum(...term_xy, ...vecMul(...this.ouva, shift_val));
			if ((node.connections.length > 1) && (this.linecnt == 2) && !is_text) {
				var step = shift_factor > 0 == node_idx ? -1 : 1;
				var adj_bond = node.goToBond(this, step);

				var this_vec = this.getNodeVec(node); // This bond vector
				var adj_vec = adj_bond.getNodeVec(node); // Adjacent bond vector

				var is_cw = node_idx == (shift_factor < 0); // True if clockwise
				var angle = is_cw ? angleVec(...this_vec, ...adj_vec) : angleVec(...adj_vec, ...this_vec);

				if ((angle < 1) && (Math.abs(shift_factor) == 2)) {
					var bisect_xy = angleBisector(...this_vec, ...adj_vec);
					xy = lineIntersec(xy, vecSum(...xy, ...this_vec), term_xy, vecSum(...term_xy, ...bisect_xy));
				}
				else if ((angle <= 0.84) && (Math.abs(shift_factor) == 1)) { // Double bond in center
					var adj_bond_border = adj_bond.getBorder(node, step > 0);
					side_shift = vecMul(...this.ouva, this.hws * (node_idx ? 1 : -1));

					t0 = vecSum(...xy, ...side_shift);
					t1 = vecSum(...t0, ...this_vec);
					t2 = vecSum(...xy, ...vecMul(...side_shift, -1));
					t3 = vecSum(...t2, ...this_vec);

					this.lines[line_idx][node_idx][0] = lineIntersec(t0, t1, ...adj_bond_border);
					this.lines[line_idx][node_idx][2] = lineIntersec(t2, t3, ...adj_bond_border);
					continue;
				}
			}
			this.setButtTip(node, line_idx, xy);
		}
	}
}

ChemBond.prototype.renderLines = function() {
	while (this.g.childElementCount > 1) this.g.lastChild.remove(); // Remove old lines
	for (const line of this.lines) {
		var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		polygon.setAttribute('points', line.flat().map(item => item.join()).join(' '));
		// polygon.setAttribute('fill', getColor());
		this.g.appendChild(polygon);
	}
}

ChemBond.prototype.updateRect = function() {
	var [ctrx, ctry] = vecDiv(...vecSum(...this.getNodeCenters().flat()), 2); // Center of bond
	var rotang = Math.atan2(...this.difxy.slice().reverse()) * 180 / Math.PI; // Rotation angle of backrect

	var backrect = this.g.firstChild;
	backrect.setAttribute('x', ctrx - this.len / 2);
	backrect.setAttribute('y', ctry - 5);
	backrect.setAttribute('width', this.len);
	backrect.transform.baseVal[0].setRotate(rotang, ctrx, ctry);
}

ChemBond.prototype.getNodeCenters = function() {
	return [this.nodes[0].xy, this.nodes[1].xy];
};

ChemBond.prototype.getNodeIdx = function(node) {
	// return this.nodes[0] == node ? 0 : 1;
	if (this.nodes[0] == node) return 0;
	else if (this.nodes[1] == node) return 1;
	else throw new Error('The bond does not have this node!');
}

ChemBond.prototype.getBorder = function(node, acw) { // Get border of central bond line
	var side = this.getNodeIdx(node) == acw ? 1 : -1; // Node = 0, acw = true => side = -1
	var [cxy0, cxy1] = this.getNodeCenters();
	var xy0 = vecSum(...cxy0, ...vecMul(...this.ouva, this.hw0 * side))
	var xy1 = vecSum(...cxy1, ...vecMul(...this.ouva, this.hw1 * side))
	return [xy0, xy1];
};

ChemBond.prototype.adjustLength = function(node) { // Prevents overlapping of the chemical symbol and bond
	var [cxy0, cxy1] = this.getNodeCenters();
	var node_idx = this.getNodeIdx(node);
	var curxy = node_idx == 0 ? cxy0 : cxy1;

	var textbox = node.g.childNodes[1].getBBox();
	var tb_w = textbox.width;
	var tb_h = textbox.height;

	// Adjust textbox borders
	tb_w += 2;
	tb_h = Math.max(0, tb_h - 2);

	var threshold = tb_h / tb_w;
	var [difx, dify] = this.difxy;
	var tan = Math.abs(dify / difx);
	var dirtab = [ // 0: R, 1: U, 2: L, 3: D
					[[2, 2],
					 [0, 0]],
					[[3, 1],
					 [3, 1]]
				 ];
	var dir = dirtab[+(tan > threshold)][+(node_idx == 0 == difx > 0)][+(node_idx == 0 == dify < 0)];
	var multab = [
		[ 0.5, -0.5,  0.5,  0.5], // Right
		[-0.5, -0.5,  0.5, -0.5], // Up
		[-0.5, -0.5, -0.5,  0.5], // Left
		[-0.5,  0.5,  0.5,  0.5]  // Down
	];
	var [fx0, fy0, fx1, fy1] = multab[dir];
	[this['x' + node_idx], this['y' + node_idx]] = lineIntersec(
		cxy0, cxy1, 
		vecSum(...curxy, ...[fx0 * tb_w, fy0 * tb_h]),
		vecSum(...curxy, ...[fx1 * tb_w, fy1 * tb_h])
	);
	return [this['x' + node_idx], this['y' + node_idx]];
};
