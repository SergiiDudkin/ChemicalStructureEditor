import {attachSvg, OffsetRect} from './Utils.js';
import {
	lineIntersec, vecLen, findDist, vecSum, vecDif, vecMul, vecDiv, sinVec, angleVec, rot90cw, angleBisector, unitVec
} from './Geometry.js';
import {getColor} from './Debug.js';
import {SENSOR, SHAPE, HIGHLIGHT, SELECTHOLE, CanvasCitizen} from './BaseClasses.js';


export class ChemBond extends CanvasCitizen {
	constructor(id, node0, node1, type) {
		super(id);

		this.g = attachSvg(this.constructor.parents[SHAPE], 'g');

		this.backrect = new OffsetRect('sensors_b', 0, 0, {id: id, class: 'brect', height: this.constructor.sel_h});
		this.backrect.shape.is_bond = true;
		this.backrect.shape.objref = this;

		Object.assign(this, this.constructor.default_style);
		this.setType(type);

		this.nodes = [node0, node1].map(node => typeof node === "string" ? document.getElementById(node).objref : node);
		this.nodes.forEach(node => node.connections.push(this));
		this.recalcDims();

		if (this.constructor.delSel.has(this.id)) {
			this.select();
			this.constructor.delSel.delete(this.id);
		}
	}

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_b'),
		[SHAPE]: document.getElementById('bondsall')
	}

	// Public info
	static alias = 'bonds';

	static movable = false;

	static id_prefix = 'b';

	static default_style = {
		color: 'black',
		bond_spacing: 3,
		normal: 1.5,
		thin: 0.5,
		thick: 6,
		bold: 5
	};

	static sel_h = 12; // Selection rectangle height

	static min_offset = 5;

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
	//					   Bond type: 0   1   2   3   4   5   6   7   8   9  10  11  12  13  14  15
	static mult =					[ 0,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];

	static linecnt =				[ 1,  1,  1,  1,  1,  1,  1,  1,  2,  2,  2,  2,  2,  2,  2,  3];

	static ctrline =				[ 0,  0,  0,  0,  0,  0,  0,  0,  1,   ,  0,  1,   ,  0,   ,  1];

	static next_type =		   	   [[ 1, 14,  1,  1,  1,  1,  1,  1, 15, 15, 15, 15, 15, 15, 15,  1],  // Simpe
		// eslint-disable-next-line @stylistic/js/indent
									[ 2,  2,  4,  2,  3,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2,  2],  // Up
		// eslint-disable-next-line @stylistic/js/indent
									[ 8,  8,  8,  8,  8,  8,  8,  8,  9, 10, 14,  8,  8,  8,  8,  8],  // Double
		// eslint-disable-next-line @stylistic/js/indent
									[ 5,  5,  5,  5,  5,  7,  5,  6,  5,  5,  5,  5,  5,  5,  5,  5]]; // Down

	static tip_type =			   [[ 0,  0,  1,  2,  3,  1,  2,  3,  0,  0,  0,  0,  0,  0,  0,  0],
		// eslint-disable-next-line @stylistic/js/indent
									[ 0,  0,  2,  1,  3,  2,  1,  3,  0,  0,  0,  0,  0,  0,  0,  0]];

	static type_to_pdshift = 		[ 0,  0,  0,  0,  0,  0,  0,  0, -1,  0,  1, -1,  0,  1,   ,  0];

	static rev_type =				[ 0,  1,  3,  2,  4,  6,  5,  7, 10,  9,  8, 13, 12, 11, 14, 15];

	static db_mirror =			    [ 0,  1,  2,  3,  4,  5,  6,  7, 10,  9,  8, 11, 12, 13, 14, 15];

	static pdshift1p_to_type =   	[11, 12, 13];

	static auto_d_bonds = 		    [11, 12, 13, 14];

	static eventsOnAll() {
		this.parents[SENSOR].classList.remove('sympoi');
	};

	static eventsOffAll() {
		this.parents[SENSOR].classList.add('sympoi');
	};

	static is_registered = this.register();

	recalcDims() {
		this.difxy = vecDif(...this.getNodeCenters()); // Vector between nodes
		this.len = vecLen(this.difxy); // Distance between nodes
		this.uv = unitVec(this.difxy); // Unit vector
		this.ouva = rot90cw(this.uv); // Orthohonal unit vector ACW
		this.rotang = Math.atan2(...this.uv.toReversed()); // Rotation angle of the bond
		this.recalcLims();
	};

	recalcLims() {
		var [node0ctr, node1ctr] = this.getNodeCenters();
		this.min_x = Math.min(node0ctr[0], node1ctr[0]);
		this.max_x = Math.max(node0ctr[0], node1ctr[0]);
		this.min_y = Math.min(node0ctr[1], node1ctr[1]);
		this.max_y = Math.max(node0ctr[1], node1ctr[1]);
		this.xy = vecDiv(vecSum(node0ctr, node1ctr), 2); // Center of bond
	};

	getNodeVec(node) {
		return vecMul(this.difxy, this.getNodeSign(node, true));
	};

	getNextType(map_idx) {
		return this.constructor.next_type[map_idx][this.type];
	};

	setType(type) {
		this.type = type;
		this.multiplicity = this.constructor.mult[type];
		this.pdshift = this.constructor.type_to_pdshift[type];
		this.linecnt = this.constructor.linecnt[type];

		// Start and end half width of the bond line (determined by bond type)
		var tip_thickness = [this.normal, this.thin, this.thick, this.bold];
		this.hw = [0, 1].map(idx => tip_thickness[this.constructor.tip_type[idx][type]] / 2);
		this.hws = this.normal / 2; // Side line half width
		this.hsp = this.bond_spacing / 2; // Half of space between lines in multiple bonds

		this.terms = new Array(2);
		this.offsets = new Array(2);
		this.hwt = new Array(2); // Actual half width of terminal
		this.juncs = [new Array(2), new Array(2)];
		this.lines = new Array(this.linecnt).fill().map(() => [[], []]);
		// this.lines[line][tip(start | end)][corner(prev | cntr | next)][axis(x | y)]

		if ([5, 6, 7].includes(this.type)) {
			if (!this.pattern) this.createPattern();
		}
		else this.deletePattern();
	};

	delete() {
		super.delete();
		if (this.select_rect) {
			this.constructor.delSel.add(this.id);
			this.deselect();
		}
		this.constructor.deleteMaskLines(this, document, true);
		for (const node of this.nodes) node.connections = node.connections.filter(item => item !== this);
		this.g.remove();
		this.backrect.delete();
		delete this.nodes;
		this.deletePattern();
		this.deleteMask();
	};

	posDouble() {
		// Find the best shift of double bond; set type accordingly
		var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
		for (const [node_idx, node] of this.nodes.entries()) {
			for (const bond of node.connections) {
				if (this != bond) {
					var sin = sinVec(this.difxy, bond.difxy);
					if (bond.nodes[0] != node) sin *= -1; /* Invert sin if the bond starts not from the node, but ends
					it (i.e. has opposit direction) */
					if (sin > 0.1305) sinflags[node_idx][0] = 1;
					else if (sin < -0.1305) sinflags[node_idx][1] = -1;
				}
			}
		}
		var pdshift = Math.sign(sinflags.flat().reduce((pv, cv) => pv + cv, 0)); // Sign of sum
		this.setType(this.constructor.pdshift1p_to_type[pdshift + 1]);
		return pdshift;
	};

	updateTip(node) {
		this.adjustLength(node);
		this.setSideTip(node);
	};

	updateConvTip(node) {
		var node_idx = this.getNodeIdx(node);
		this.terms[node_idx] = this.getNodeCenters()[node_idx];
		this.offsets[node_idx] = 0;
		this.hwt = this.hw.slice();
		this.setSideTip(node);
	};

	setButtTip(node, line_idx, term_xy) {
		var node_idx = this.getNodeIdx(node);
		var hw_vec = vecMul(this.ouva, this.hwt[node_idx]);
		var dir = this.getNodeSign(node);
		this.lines[line_idx][node_idx] = [
			vecSum(term_xy, vecMul(hw_vec, dir)),
			,
			vecSum(term_xy, vecMul(hw_vec, -dir))
		];
	};

	setHalfButt(node, acw) {
		var node_idx = this.getNodeIdx(node);
		var hw_len = this.hw[node_idx] * this.getNodeSign(node, acw);
		this.juncs[node_idx][+acw] = vecSum(node.xy, vecMul(this.ouva, hw_len));
	};

	getShiftFactors() {
		return [...Array(this.linecnt).keys()].map(idx => [idx, idx * 2 - this.linecnt + 1 + this.pdshift]);
	};

	setSideTip(node) {
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
					var step = this.getNodeSign(node, shift_factor > 0);

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
						var side_shift = vecMul(this.ouva, this.hws * this.getNodeSign(node));

						var t0 = vecSum(xy, side_shift);
						var t1 = vecSum(t0, this_vec);
						var t2 = vecSum(xy, vecMul(side_shift, -1));
						var t3 = vecSum(t2, this_vec);

						this.lines[line_idx][node_idx][0] = lineIntersec(t0, t1, ...adj_bond_border);
						this.lines[line_idx][node_idx][2] = lineIntersec(t2, t3, ...adj_bond_border);
						continue;
					}
				}
				this.setButtTip(node, line_idx, xy);
			}
		}
	};

	createPattern() {
		this.pattern = attachSvg(document.getElementById('bondpatterns'), 'pattern',
			{id: 'p' + this.id, x: 0, y: 0, width: 4, height: 1, patternUnits: 'userSpaceOnUse'}
		);
		attachSvg(this.pattern, 'rect', {x: 0, y: 0, width: 2, height: 1});
	};

	deletePattern() {
		if (this.pattern) {
			this.pattern.remove();
			delete this.pattern;
		}
	};

	createMask() {
		this.mask = document.createElementNS('http://www.w3.org/2000/svg', 'mask');
		this.mask.setAttribute('id', 'm' + this.id);
		this.mask.objref = this;

		attachSvg(this.mask, 'rect', {width: '100%', height: '100%', fill: 'white'}); // White bg

		document.getElementById('bondcutouts').appendChild(this.mask);
		this.renderBond(); // ToDo: Do not render bond! Set the mask for <g> instead.
	};

	createSubmask(upper_bond) {
		if (!this.mask) this.createMask();
		upper_bond.drawLines(this.mask, {'fill': 'black', 'stroke': 'black', 'stroke-width': 4,
			'class': `u${upper_bond.id}`});
	};

	deleteMask() {
		if (this.mask) {
			this.mask.remove();
			delete this.mask;
		}
	};

	deleteSubmask(upper_bond) {
		this.constructor.deleteMaskLines(upper_bond, this.mask, true);
	};

	static deleteMaskLines(upper_bond, root, del_mask=false) {
		var u_mask_lines = Array.from(root.getElementsByClassName(`u${upper_bond.id}`));
		var masks = new Set(u_mask_lines.map(m_line => m_line.parentNode));
		u_mask_lines.forEach(u_mask_line => u_mask_line.remove());
		if (del_mask) {
			for (const mask of masks) {
				if (mask.children.length <= 1) mask.objref.deleteMask();
			}
		}
		return masks;
	};

	drawLines(parent, attrs={}) {
		for (const line of this.lines) {
			attachSvg(parent, 'polygon', {points: line.flat().map(item => item.join()).join(' '), ...attrs});
		}
	};

	renderBond() {
		while (this.g.childElementCount) this.g.lastChild.remove(); // Remove old lines
		var color = window.DEBUG ? getColor() : this.color;
		if (this.pattern) {
			this.pattern.setAttribute('patternTransform', `rotate(${this.rotang * 180 / Math.PI})`);
			this.pattern.firstChild.setAttribute('fill', color);
		}
		this.drawLines(this.g, {
			'fill': (this.pattern ? `url(#p${this.id})` : color),
			'mask': (this.mask ? `url(#m${this.id})`: null),
			'class': 'sympoi'
		});
		this.constructor.deleteMaskLines(this, document, false).forEach(mask =>
			this.drawLines(mask, {'fill': 'black', 'stroke': 'black', 'stroke-width': 4, 'class': `u${this.id} sympoi`})
		);
	};

	updateAllRects() {
		var offsets = this.offsets.map(offset => Math.max(offset, this.constructor.min_offset));
		this.backrect.setCtr(this.xy).setWidth(this.len).setOffsets(offsets).setAbsRotAng(this.rotang).render();
		this.refreshSelectRect();
	};

	getNodeCenters() {
		return [this.nodes[0].xy.slice(), this.nodes[1].xy.slice()];
	};

	getNodeIdx(node) {
		// return this.nodes[0] == node ? 0 : 1;
		if (this.nodes[0] == node) return 0;
		else if (this.nodes[1] == node) return 1;
		else throw new Error('The bond does not have this node!');
	};

	getNodeSign(node, invert=false) {
		return (this.nodes[0] == node) != invert ? -1 : 1;
	};

	getBorder(node, acw) {
		var side = this.getNodeSign(node, !acw);
		return this.getNodeCenters().map((nc, idx) => vecSum(nc, vecMul(this.ouva, this.hw[idx] * side)));
	};

	adjustLength(node) {
		// Prevents overlapping of the chemical symbol and bond
		var node_centers = this.getNodeCenters();
		var node_idx = this.getNodeIdx(node);
		var curxy = node_centers[node_idx];

		var textbox = node.g.childNodes[0].getBBox();
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

		// Compute offsets
		this.offsets[node_idx] = vecLen(vecDif(curxy, this.terms[node_idx]));

		// Compute halw width of the actual bond terminals
		var prop = findDist(node_centers[node_idx], this.terms[node_idx]) / this.len;
		this.hwt[node_idx] = this.hw[node_idx] * (1 - prop) + this.hw[1 - node_idx] * prop;

		return this.terms[node_idx];
	};

	select() {
		this.eventsOff();
		this.select_rect = new OffsetRect('selecthighlight', 0, 0, {'height': this.constructor.sel_h});
		this.masksel_rect = new OffsetRect('selectholes', 0, 0, {'height': this.constructor.sel_h - 3});
		this.refreshSelectRect();
	};

	deselect() {
		this.select_rect.delete();
		this.select_rect = null;
		this.masksel_rect.delete();
		this.masksel_rect = null;
		this.eventsOn();
	};

	eventsOn() {
		this.backrect.shape.classList.remove('sympoi');
	};

	eventsOff() {
		this.backrect.shape.classList.add('sympoi');
	};

	getData() {
		return [...this.nodes.map(node => node.id), this.type];
	};

	refreshSelectRect() {
		if (this.select_rect && !this.offsets.includes(undefined)) {
			var offsets = this.offsets.map((offset, idx) => this.nodes[idx].select_circ ? 0 : Math.max(
				offset, this.constructor.min_offset
			));
			this.select_rect.setCtr(this.xy).setWidth(this.len).setOffsets(offsets).setAbsRotAng(this.rotang).render();
			this.masksel_rect.setCtr(this.xy).setWidth(this.len).setOffsets(offsets.map(item => item + 1.5))
				.setAbsRotAng(this.rotang).render();
		}
	};
}
