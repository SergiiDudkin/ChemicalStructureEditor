import {ChemBond} from './ChemBond.js';
import {textTermBuilder, treeToFormula, buildBracketTree, tokenize} from './ChemParser.js';
import {attachSvg} from './Utils.js';
import {lineIntersec, vecSum, vecDif, cosVec, angleVec} from './Geometry.js';
import {SENSOR, SHAPE, HIGHLIGHT, SELECTHOLE, CanvasCitizen} from './BaseClasses.js';


export class ChemNode extends CanvasCitizen {
	constructor(id, x, y, text) {
		super(id);

		this.style = {};
		Object.assign(this.style, this.constructor.default_style);
		this.text = text.toString(); // ??? maybe .toString() is not needed
		this.connections = [];
		this.select_circ = null;

		this.g = attachSvg(this.constructor.parents[SHAPE], 'g');

		this.backcircle = attachSvg(this.constructor.parents[SENSOR], 'circle',
			{id: id, class: 'anode', r: this.constructor.sel_r, cx: x, cy: y});
		this.backcircle.is_atom = true;
		this.backcircle.is_chem = true;
		this.backcircle.objref = this;

		this.xy = [x, y];

		if (this.constructor.delSel.has(this.id)) {
			this.select();
			this.constructor.delSel.delete(this.id);
		}
	}

	static parents = {
		...super.parents, 
		[SENSOR]: document.getElementById('sensors_a'),
		[SHAPE]: document.getElementById('atomsall')
	}

	// Public info
	static alias = 'atoms';

	static id_prefix = 'a';

	static default_style = {
		fill: 'black',
		'font-family': 'Arial',
		'font-size': '16px'
	};

	static sel_r = 12; // Selection circle radius

	static hmaxtab = {'': 0, 'C': 4, 'H': 1, 'N': 3, 'O': 2, 'S': 2, 'F': 1, 'Cl': 1, 'Br': 1, 'I': 1, 'Mg': 2};

	delete() {
		super.delete();
		if (this.select_circ) {
			this.constructor.delSel.add(this.id);
			this.deselect();
		}
		this.g.remove();
		this.backcircle.remove();
		delete this.connections;
	};

	isImplicit() {
		// Is it implicit carbon (line terminal, no explicit atom symbol)
		return this.connections.length > 0 && this.text == '';
	};

	isMethane() {
		// Is is lonely implicit carbon (should be displayed as CH4)
		return this.connections.length == 0 && this.text == '';
	};

	hasNoMultBonds() {
		return !(this.connections.some(bond => bond.multiplicity >= 2));
	}

	getBondsBetween(other_node) {
		return this.connections.filter(bond => other_node.connections.includes(bond));
	}

	parse() {
		var target_text;
		var used_valency = this.connections.reduce((prev, curr) => prev + curr.multiplicity, 0);
		if (this.text.startsWith('@')) {
			target_text = this.text.slice(1);
			try {
				this.bracket_tree = buildBracketTree(tokenize(target_text));
			}
			catch {
				this.bracket_tree = [{content: target_text, brackets: [], count: null}];
			}
		}
		else {
			target_text = this.isMethane() ? 'C' : this.text; // Convert floating C atoms into CH4
			this.bracket_tree = [{content: target_text, brackets: [], count: null}];
			var h_cnt = target_text in this.constructor.hmaxtab ? Math.max(this.constructor.hmaxtab[target_text] -
				used_valency, 0) : 0;
			if (h_cnt) this.bracket_tree.push({content: 'H', brackets: [], count: h_cnt > 1 ? h_cnt : null});
		}
		this.formula = target_text ? treeToFormula(this.bracket_tree) : {C: 1, H: Math.max(4 - used_valency, 0)};
	};

	setCtr(xy) {
		var [dx, dy] = vecDif(this.xy, xy);
		let [x, y] = xy;
		this.xy = [...xy]; // Copy the array

		this.backcircle.setAttribute('cx', x);
		this.backcircle.setAttribute('cy', y);

		for (var textnode of this.g.childNodes) {
			textnode.setAttribute('x', parseFloat(textnode.getAttribute('x')) + dx);
			textnode.setAttribute('y', parseFloat(textnode.getAttribute('y')) + dy);
		}

		if (this.select_circ != null) {
			this.select_circ.setAttribute('cx', x);
			this.select_circ.setAttribute('cy', y);
			this.masksel_circ.setAttribute('cx', x);
			this.masksel_circ.setAttribute('cy', y);
		}	
	}

	select() {
		this.eventsOff();
		this.select_circ = attachSvg(this.constructor.parents[HIGHLIGHT], 'circle', {'cx': this.xy[0], 'cy': this.xy[1],
			'r': this.constructor.sel_r});
		this.masksel_circ = attachSvg(this.constructor.parents[SELECTHOLE], 'circle',
			{'cx': this.xy[0], 'cy': this.xy[1], 'r': this.constructor.sel_r - 1.5});
	};

	deselect() {
		this.select_circ.remove();
		this.select_circ = null;
		this.masksel_circ.remove();
		this.masksel_circ = null;
		this.eventsOn();
	};

	eventsOn() {
		this.backcircle.classList.remove('sympoi');
	};

	eventsOff() {
		this.backcircle.classList.add('sympoi');
	};

	getData() {
		return [...this.xy, this.text];
	};

	promoteMaskSel() {
		this.eventsOff();
		this.masksel_circ.remove();
		this.masksel_circ.setAttribute('fill', 'black');
		this.constructor.parents[SELECTHOLE].parentNode.appendChild(this.masksel_circ);
	};

	demoteMaskSel() {
		this.eventsOn();
		this.masksel_circ.remove();
		this.masksel_circ.removeAttribute('fill');
		this.constructor.parents[SELECTHOLE].appendChild(this.masksel_circ);
	};

	renderText() {
		while (this.g.childElementCount) this.g.lastChild.remove(); // Remove old text
		this.locateHydr();
		textTermBuilder(this.bracket_tree, this.g, this.position_idx, this.style, this.xy);
	};

	locateHydr() {
		/* Find the least ocupied direction in terms of the most interfearing bond angle
		(or to be exect, unit vector projection) */
		var proj_rldu = [0, 0, 0, 0];
		for (const bond of this.connections) {
			var [bondcos, bondsin] = bond.getNodeVec(this).map(dif => dif / bond.len);
			proj_rldu = [bondcos, -bondcos, bondsin, -bondsin].map((item, idx) => Math.max(item, proj_rldu[idx]));
		}
		proj_rldu = [0, 1e-6, 2e-6, 3e-6].map((item, idx) => item + proj_rldu[idx]); // Set micro priority
		this.position_idx = proj_rldu.indexOf(Math.min(...proj_rldu)); // Find index of the least ocupied direction
	};

	sortConnections() {
		// Sort by the angle between surrounding bonds and x-axis
		this.connections.sort((a, b) => angleVec([1, 0], a.getNodeVec(this)) - angleVec([1, 0], b.getNodeVec(this)));
	};

	goToBond(bond, step) {
		// Go to another bond
		var idx = this.connections.indexOf(bond);
		var bond_cnt = this.connections.length;
		var target_idx = (idx + bond_cnt + step % bond_cnt) % bond_cnt;
		return this.connections[target_idx];
	};

	computeBondsJunc(bond0, bond1) {
		var cos_a = cosVec(bond0.getNodeVec(this), bond1.getNodeVec(this));
		if (Math.abs(cos_a) > Math.cos(Math.PI / 24) || !bond0.len || !bond1.len) {
			bond0.setHalfButt(this, true);
			bond1.setHalfButt(this, false);
		}
		else {
			var junc = lineIntersec(...bond0.getBorder(this, false), ...bond1.getBorder(this, true));
			bond0.juncs[bond0.getNodeIdx(this)][1] = junc;
			bond1.juncs[bond1.getNodeIdx(this)][0] = junc;
		}
	};

	calcLineTips() {
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
}

ChemNode.register();
