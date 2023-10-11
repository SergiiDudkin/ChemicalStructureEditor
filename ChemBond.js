function ChemBond(id, node0, node1, type) {
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

	Object.assign(this, ChemBond.default_style);
	this.setType(type);

	if (typeof node0 === "string") node0 = document.getElementById(node0).objref;
	if (typeof node1 === "string") node1 = document.getElementById(node1).objref;
	this.nodes = [node0, node1];
	node0.connections.push(this);
	node1.connections.push(this);
	this.recalcDims();
}

ChemBond.counter = 0;

ChemBond.default_style = {
	color: 'black',
	bond_spacing: 3,
	normal: 1.5,
	thin: 0.5,
	thick: 6,
	bold: 5
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
//                                0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
ChemBond.mult = 				[ 0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];
ChemBond.linecnt = 				[ 1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];
ChemBond.ctrline = 				[ 0,  0,  0,  0,  0,  0,  0,  0,  1,   ,  0,  1,   ,  0,   ,  1];
ChemBond.next_type = 		   [[ 1, 14,  1,  1,  1, 14, 14, 14, 15, 15, 15, 15, 15, 15, 15,  1],
								[ 2,  2,  4,  2,  3,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],
								[ 8,  8,  8,  8,  8,  8,  8,  8,  9, 10, 14,  8,  8,  8,  8,  8],
								[ 5,  5,  5,  5,  5,  7,  5,  6,  5,  5,  5,  5,  5,  5,  5,  5]];
ChemBond.tip_type =			   [[ 0,  0,  1,  2,  3,  1,  2,  3,  0,  0,  0,  0,  0,  0,  0,  0],
								[ 0,  0,  2,  1,  3,  2,  1,  3,  0,  0,  0,  0,  0,  0,  0,  0]];
ChemBond.type_to_pdshift = 		[ 0,  0,  0,  0,  0,  0,  0,  0, -1,  0,  1, -1,  0,  1,   ,  0];							
ChemBond.pdshift1p_to_type = 	[11, 12, 13];
ChemBond.auto_d_bonds = 		[11, 12, 13, 14];

ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.recalcDims = function() {
	this.xy = vecDiv(vecSum(...this.getNodeCenters()), 2); // Center of bond
	this.difxy = vecDif(...this.getNodeCenters()); // Vector between nodes
	this.len = vecLen(this.difxy); // Distance between nodes
	this.uv = vecDiv(this.difxy, this.len); // Unit vector
	this.ouva = rot90cw(this.uv); // Orthohonal unit vector ACW
	this.rotang = Math.atan2(...this.uv.toReversed()) * 180 / Math.PI; // Rotation angle of the bond
};

ChemBond.prototype.getNodeVec = function(node) {
	return vecMul(this.difxy, this.getNodeSign(node, true));
};

ChemBond.prototype.getNextType = function(map_idx) {
	return ChemBond.next_type[map_idx][this.type];
}

ChemBond.prototype.setType = function(type) {
	this.type = type;
	this.multiplicity = ChemBond.mult[type];
	this.pdshift = ChemBond.type_to_pdshift[type];
	this.linecnt = ChemBond.linecnt[type]

	// Start and end half width of the bond line (determined by bond type)
	var tip_thickness = [this.normal, this.thin, this.thick, this.bold];
	this.hw = [0, 1].map(idx => tip_thickness[ChemBond.tip_type[idx][type]] / 2);
	this.hws = this.normal / 2; // Side line half width 
	this.hsp = this.bond_spacing / 2; // Half of space between lines in multiple bonds

	this.terms = new Array(2);
	this.hwt = new Array(2); // Actual half width of terminal
	this.juncs = [new Array(2), new Array(2)];
	this.lines = new Array(this.linecnt).fill().map(() => [[], []]);
	// this.lines[line][tip(start | end)][corner(prev | cntr | next)][axis(x | y)]

	if ([5, 6, 7].includes(this.type)) {
		if (!this.pattern) this.createPattern();
	}
	else this.deletePattern();
};

ChemBond.prototype.delete = function() {
	for (node of this.nodes) node.connections = node.connections.filter(item => item !== this);
	this.g.remove();
	delete this.nodes;
	this.deletePattern();
};

ChemBond.prototype.translate = function(moving_vec) {
	for (line of this.lines) {
		for (tip of line) {
			tip.forEach((pt, i) => tip[i] = vecSum(pt, moving_vec)); // Move poligon corners
		}
	}
	this.xy = vecDiv(vecSum(...this.getNodeCenters()), 2); // Center of bond
};

ChemBond.prototype.posDouble = function() {
	// Find the best shift of double bond; set type accordingly
	var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
	for (const [node_idx, node] of this.nodes.entries()) {
		for (const bond of node.connections) {
			if (this != bond) {
				var sin = sinVec(this.difxy, bond.difxy);
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

ChemBond.prototype.updateConvTip = function(node) {
	var node_idx = this.getNodeIdx(node);
	this.terms[node_idx] = this.getNodeCenters()[node_idx];
	this.hwt = this.hw.slice();
	this.setSideTip(node);
}

ChemBond.prototype.setButtTip = function(node, line_idx, term_xy) {
	var node_idx = this.getNodeIdx(node);
	var hw_vec = vecMul(this.ouva, this.hwt[node_idx]);
	var dir = this.getNodeSign(node);
	this.lines[line_idx][node_idx] = [
		vecSum(term_xy, vecMul(hw_vec, dir)), 
		, 
		vecSum(term_xy, vecMul(hw_vec, -dir))
	];
};

ChemBond.prototype.setHalfButt = function(node, acw) {
	var node_idx = this.getNodeIdx(node);
	var hw_len = this.hw[node_idx] * this.getNodeSign(node, acw);
	this.juncs[node_idx][+acw] = vecSum(node.xy, vecMul(this.ouva, hw_len));
}

ChemBond.prototype.getShiftFactors = function() {
	return [...Array(this.linecnt).keys()].map(idx => [idx, idx * 2 - this.linecnt + 1 + this.pdshift]);
}

ChemBond.prototype.setSideTip = function(node) {
	var node_idx = this.getNodeIdx(node);

	// Iterate over lines
	for (const [line_idx, shift_factor] of this.getShiftFactors()) {
		if (shift_factor == 0 && !node.text && node.ctr_bonds_cnt > 1) { // Converging line tip
			this.lines[line_idx][node_idx] = [this.juncs[node_idx][0], node.xy, this.juncs[node_idx][1]];
		}
		else { // Floating line tip
			var shift_val = (this.hws + this.hsp) * shift_factor;
			var term_xy = this.terms[node_idx];
			var xy = vecSum(term_xy, vecMul(this.ouva, shift_val));
			if (node.connections.length > 1 && this.linecnt == 2 && !node.text) {
				var step = this.getNodeSign(node, shift_factor > 0)

				var adj_bond = node.goToBond(this, step);

				var this_vec = this.getNodeVec(node); // This bond vector
				var adj_vec = adj_bond.getNodeVec(node); // Adjacent bond vector

				var is_cw = node_idx == (shift_factor < 0); // True if clockwise
				var angle = is_cw ? angleVec(this_vec, adj_vec) : angleVec(adj_vec, this_vec);

				if ((angle < 1) && (Math.abs(shift_factor) == 2)) {
					var bisect_xy = angleBisector(this_vec, adj_vec);
					xy = lineIntersec(xy, vecSum(xy, this_vec), term_xy, vecSum(term_xy, bisect_xy));
				}
				else if ((angle <= 0.84) && (Math.abs(shift_factor) == 1)) { // Double bond in center
					var adj_bond_border = adj_bond.getBorder(node, step > 0);
					side_shift = vecMul(this.ouva, this.hws * this.getNodeSign(node));

					t0 = vecSum(xy, side_shift);
					t1 = vecSum(t0, this_vec);
					t2 = vecSum(xy, vecMul(side_shift, -1));
					t3 = vecSum(t2, this_vec);

					this.lines[line_idx][node_idx][0] = lineIntersec(t0, t1, ...adj_bond_border);
					this.lines[line_idx][node_idx][2] = lineIntersec(t2, t3, ...adj_bond_border);
					continue;
				}
			}
			this.setButtTip(node, line_idx, xy);
		}
	}
}

ChemBond.prototype.createPattern = function() {
	this.pattern = document.createElementNS('http://www.w3.org/2000/svg', 'pattern');
	this.pattern.setAttribute('id', 'p' + this.g.id);
	this.pattern.setAttribute('x', 0);
	this.pattern.setAttribute('y', 0);
	this.pattern.setAttribute('width', 4);
	this.pattern.setAttribute('height', 1);
	this.pattern.setAttribute('patternUnits', 'userSpaceOnUse');

	var fill_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	fill_rect.setAttribute('x', 0);
	fill_rect.setAttribute('y', 0);
	fill_rect.setAttribute('width', 2);
	fill_rect.setAttribute('height', 1);
	this.pattern.appendChild(fill_rect);

	var svg_defs = document.getElementById('svg_defs');
	svg_defs.appendChild(this.pattern);
}

ChemBond.prototype.deletePattern = function() {
	if (this.pattern) {
		this.pattern.remove();
		delete this.pattern;
	}
};

ChemBond.prototype.renderLines = function() {
	while (this.g.childElementCount > 1) this.g.lastChild.remove(); // Remove old lines
	for (const line of this.lines) {
		var polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
		polygon.setAttribute('points', line.flat().map(item => item.join()).join(' '));
		if (this.pattern) {
			this.pattern.setAttribute('patternTransform', `rotate(${this.rotang})`);
			this.pattern.firstChild.setAttribute('fill', this.color);
		}
		polygon.setAttribute('fill', this.pattern ? `url(#p${this.g.id})` : this.color);//getColor());
		this.g.appendChild(polygon);
	}
}

ChemBond.prototype.updateRect = function() {
	var backrect = this.g.firstChild;
	backrect.setAttribute('x', this.xy[0] - this.len / 2);
	backrect.setAttribute('y', this.xy[1] - 5);
	backrect.setAttribute('width', this.len);
	backrect.transform.baseVal[0].setRotate(this.rotang, ...this.xy);
}

ChemBond.prototype.getNodeCenters = function() {
	return [this.nodes[0].xy.slice(), this.nodes[1].xy.slice()];
};

ChemBond.prototype.getNodeIdx = function(node) {
	// return this.nodes[0] == node ? 0 : 1;
	if (this.nodes[0] == node) return 0;
	else if (this.nodes[1] == node) return 1;
	else throw new Error('The bond does not have this node!');
}

ChemBond.prototype.getNodeSign = function(node, invert=false) {
	return (this.nodes[0] == node) != invert ? -1 : 1;
}

ChemBond.prototype.getBorder = function(node, acw) {
	var side = this.getNodeSign(node, !acw);
	return this.getNodeCenters().map((nc, idx) => vecSum(nc, vecMul(this.ouva, this.hw[idx] * side)));
};

ChemBond.prototype.adjustLength = function(node) {
	// Prevents overlapping of the chemical symbol and bond
	var node_centers = this.getNodeCenters();
	var node_idx = this.getNodeIdx(node);
	var curxy = node_centers[node_idx];

	var textbox = node.g.childNodes[1].getBBox();
	var tb_w = textbox.width;
	var tb_h = textbox.height;

	// Adjust textbox borders
	tb_w += 2;
	tb_h = Math.max(0, tb_h - 2);

	// Find intersecting textbox border line
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

	// Compute intersection point
	var multab = [
		[ 0.5, -0.5,  0.5,  0.5], // Right
		[-0.5, -0.5,  0.5, -0.5], // Up
		[-0.5, -0.5, -0.5,  0.5], // Left
		[-0.5,  0.5,  0.5,  0.5]  // Down
	];
	var [fx0, fy0, fx1, fy1] = multab[dir];
	this.terms[node_idx] = lineIntersec(
		...node_centers, 
		vecSum(curxy, [fx0 * tb_w, fy0 * tb_h]),
		vecSum(curxy, [fx1 * tb_w, fy1 * tb_h])
	);

	// Compute halw width of the actual bond terminals
	prop = findDist(node_centers[node_idx], this.terms[node_idx]) / this.len;
	this.hwt[node_idx] = this.hw[node_idx] * (1 - prop) + this.hw[1 - node_idx] * prop;

	return this.terms[node_idx];
};

ChemBond.prototype.select = function() {
	// ToDo: !
};

ChemBond.prototype.deselect = function() {
	// ToDo: !
};
