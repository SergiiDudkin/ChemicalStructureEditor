import {DeletableAbortable, excludeNonExisting, attachSvg, setAttrsSvg} from './Utils.js';
import {dispatcher, refreshBondCutouts, invertCmd} from './Dispatcher.js';
import {ChemNode} from './ChemNode.js';
import {ChemBond} from './ChemBond.js';
import {newcnv} from './CanvasControl.js';
import {TransformTool} from './TransformTool.js';
import {Indicator} from './Indicator.js';
import {editStructure} from './Executor.js';
import {vecSum, vecDif, MOVE} from './Geometry.js';


export class SelectShape extends DeletableAbortable {
	// Abstract class
	constructor(parent_id) {
		super();
		this.shape = attachSvg(document.getElementById(parent_id), this.constructor.tag, {
			class: 'sympoi', 'fill-opacity': 0, stroke: 'blue', 'stroke-dasharray': 2, 'stroke-width': 1
		});

		this.recalc = this.recalc.bind(this);
		this.selectStop = this.selectStop.bind(this);
		window.addEventListener('mousemove', this.recalc, this.signal_opt);
		window.addEventListener('mouseup', this.selectStop, this.signal_opt);
	}

	static tag; // Abstract attribute

	// eslint-disable-next-line no-unused-vars
	recalc(event) {} // Abstract method

	selectStop() {
		window.removeEventListener('mousemove', this.recalc);
		window.removeEventListener('mouseup', this.selectStop);
		this.shape.removeAttribute('class');
		selection.activateFromShape(this.shape);
		this.delete();
	}

	delete() {
		this.shape.remove();
		super.delete();
	}
}


export class SelectRect extends SelectShape {
	constructor(parent_id) {
		super(parent_id);
		this.svg_pt0 = newcnv.getSvgPoint(event);
		this.recalc(event);
	}

	static tag = 'rect';

	recalc(event) {
		var svg_pt1 = newcnv.getSvgPoint(event);
		var rect_x = Math.min(this.svg_pt0[0], svg_pt1[0]);
		var rect_y = Math.min(this.svg_pt0[1], svg_pt1[1]);
		var rect_w = Math.abs(svg_pt1[0] - this.svg_pt0[0]);
		var rect_h = Math.abs(svg_pt1[1] - this.svg_pt0[1]);
		setAttrsSvg(this.shape, {x: rect_x, y: rect_y, width: rect_w, height: rect_h});
	}
}


export class SelectLasso extends SelectShape {
	constructor(parent_id) {
		super(parent_id);
		this.shape.setAttribute('fill-rule', 'evenodd');
		this.pts = [newcnv.getSvgPoint(event)];
		this.recalc(event);
	}

	static tag = 'polygon';

	recalc(event) {
		var pt = newcnv.getSvgPoint(event);
		if (findDist(this.pts[this.pts.length - 1], pt) > 4) {
			this.pts.push(pt);
			this.shape.setAttribute('points', this.pts.map(pt => pt.join()).join(' '));
		}
	}
}


function objsUnderShape(cls, cover) {
	return cls.getAllInstanceIDs().filter(id => document.elementFromPoint(
		...newcnv.getScreenPoint(document.getElementById(id).objref.xy)) == cover);
}


function pickCp(pt) {
	var pt_elem = document.elementFromPoint(...newcnv.getScreenPoint(pt));
	return (pt_elem != null && pt_elem.is_cp) ? pt_elem.objref : null;
}


export function pickNode(pt) {
	var pt_elem = document.elementFromPoint(...newcnv.getScreenPoint(pt));
	return (pt_elem != null && pt_elem.is_atom) ? pt_elem.objref : null;
}


class SelectionBase {
	constructor(dispatcher) {
		for (const [key, val] of Object.entries(this.constructor.event_handlers)) {
			this[key] = this[key].bind(this);
			if (val) document.addEventListener(val, this[key]);
		}

		this.highlights = document.getElementById('selecthighlight');
		this.transform_tool = null;
		this.bottom_ptr = Infinity;
		this.clipboard = null;
		this.dispatcher = dispatcher;
		dispatcher.callback = this.undoRedo;

		this.citizens = this.constructor.classes.filter(cls => cls.citizen);
		this.attrs = this.constructor.classes.map(cls => cls.alias);

		for (const attr of this.attrs) {
			this[`#${attr}`] = new Set();
			Object.defineProperty(this, attr, {
				get() {
					return excludeNonExisting(this[`#${attr}`]);
				},
				set(new_value) {
					this[`#${attr}`] = new Set(new_value);
				}
			});
		}
	}

	static classes = [];

	static event_handlers = {
		keyDownHandler: 'keydown',
		copy: 'copy',
		cut: 'cut',
		paste: 'paste',
		startMoving: null,
		moving: null,
		finishMoving: null,
		deactivate: null,
		undoRedo: null
	};

	get selected_collections() {
		return this.citizens.map(citizen => this[citizen.alias]);
	}

	activateFromShape(covering_shape) {
		this.selectFromShape(covering_shape);
		this.activate();
	}

	selectFromShape(cover) {
		this.citizens.forEach(citizen => this[citizen.alias] = objsUnderShape(citizen, cover));
	}

	activateFromIds(grouped_ids) {
		Object.entries(grouped_ids).forEach(([group, ids]) => this[group] = ids);
		this.activate();
	}

	activate() {
		this.highlight();
		this.addTransformTool();
		if (this.highlights.hasChildNodes()) this.highlights.addEventListener('mousedown', this.startMoving);
	}

	addTransformTool() {
		if (this.highlights.hasChildNodes()) {
			var margin = 6;
			var bbox = this.highlights.getBBox();
			var width = bbox.width + margin * 2;
			var height = bbox.height + margin * 2;
			var cx = bbox.x - margin + width / 2;
			var cy = bbox.y - margin + height / 2;
			this.transform_tool = new TransformTool('utils', cx, cy, width, height, this);
		}
	}

	removeTransformTool() {
		if (this.transform_tool) {
			this.transform_tool.delete();
			this.transform_tool = null;
		}
	}

	setSelectedItem(item) {
		this[item.constructor.alias] = [item.id];
		this.highlight();
	}

	highlight() {
		this.selected_collections.flat().forEach(item_id => document.getElementById(item_id).objref.select());
	}

	dehighlight() {
		this.selected_collections.flat().forEach(item_id => document.getElementById(item_id).objref.deselect());
	}

	eventsOn() {}

	eventsOff() {}

	prepareGroup() {} // Helper

	initCtrPtErrSpecialCase() { // Helper
		this.init_ctr_pt_error = [0, 0];
		return false;
	}

	startMoving(event) { // Click on selection
		event.stopPropagation();
		this.indicator = new Indicator('utils');
		this.accum_vec = [0, 0];
		this.pt = newcnv.getSvgPoint(event);
		this.prepareGroup();
		this.initCtrPtErrSpecialCase();
		this.mo_st = vecDif(this.init_ctr_pt_error, this.pt);

		window.addEventListener('mousemove', this.moving);
		window.addEventListener('mouseup', this.finishMoving);
	}

	corrPtSpecialCase(event) { // Helper
		this.corrected_point = vecDif(this.init_ctr_pt_error, newcnv.getSvgPoint(event));
		return false;
	}

	moving(event) { // Active moving
		this.corrPtSpecialCase(event);
		var moving_vec = vecDif(this.mo_st, this.corrected_point);

		this.accum_vec = vecSum(this.accum_vec, moving_vec);
		this.mo_st = this.corrected_point;
		this.relocatingItems(MOVE, {moving_vec: moving_vec});

		if (this.transform_tool) this.transform_tool.translate(moving_vec);
		this.indicator.showDelta(event, this.accum_vec.map(val => val.toFixed(0)));
	}

	finishMoving(event) { // eslint-disable-line no-unused-vars
		window.removeEventListener('mousemove', this.moving);
		window.removeEventListener('mouseup', this.finishMoving);
		this.finishRelocatingItems(MOVE, {moving_vec: this.accum_vec});
	}

	paramsToTransform(action_type, params) {
		const ids = Object.fromEntries(
			this.constructor.classes.filter(cls => cls.movable).map(cls => [cls.alias, new Set(this[cls.alias])])
		);
		return [action_type, ids, params];
	}

	relocatingItems(action_type, params) {
		let kwargs = {transforms: [this.paramsToTransform(action_type, params)]};
		editStructure(kwargs);
	}

	// eslint-disable-next-line no-unused-vars
	augmentCmd(kwargs_dir, kwargs_rev) {} // Helper

	finishRelocatingItems(action_type, params) {
		let kwargs_dir = {transforms: [this.paramsToTransform(action_type, params)]};
		let kwargs_rev = invertCmd(kwargs_dir);
		this.augmentCmd(kwargs_dir, kwargs_rev);
		this.finishAction(kwargs_dir, kwargs_rev);
	}

	finishAction(kwargs_dir, kwargs_rev) {
		this.bottom_ptr = Math.min(this.bottom_ptr, this.dispatcher.ptr);
		this.dispatcher.addCmd(kwargs_dir, kwargs_rev);
		if (!this.transform_tool) this.deactivate();
		this.postAction();
	}

	postAction() {} // Helper

	keyDownHandler(event) {
		if (['Delete', 'Backspace'].includes(event.key)) this.delItems();
	}

	getCopyKwargs() { // Helper
		return {create: Object.fromEntries(this.citizens.map(cls => [cls.alias, gatherData(this[cls.alias])]))};
	}

	copy(event) {
		event.preventDefault();
		this.clipboard = null;
		let kwargs = this.getCopyKwargs();
		this.clipboard = Object.keys(kwargs).length ? {kwargs: kwargs, pt0: newcnv.getSvgPoint(event), cnt: 0} : null;
	}

	cut(event) {
		this.copy(event);
		this.delItems();
	}

	setNewCopyIds() { // Helper
		const id_map = {};
		for (const cls of this.citizens) {
			const cr_subcmd = this.clipboard.kwargs.create[cls.alias];
			const sorted_ids = Object.keys(cr_subcmd).sort();
			for (const old_id of sorted_ids) {
				const new_id = cls.getNewId();
				cr_subcmd[new_id] = cr_subcmd[old_id];
				delete cr_subcmd[old_id];
				id_map[old_id] = new_id;
			}
		}
		return id_map;
	}

	// eslint-disable-next-line no-unused-vars
	updateNewCopySubIds(id_map) {} // Helper

	activateFromPasteKwargs(kwargs) {
		let ids_to_activate = {};
		for (const {alias} of this.citizens) {
			if (alias in kwargs.create) ids_to_activate[alias] = Object.keys(kwargs.create[alias]);
		}
		this.activateFromIds(ids_to_activate);
	}

	paste(event) {
		event.preventDefault();
		if (this.clipboard) {
			this.updateNewCopySubIds(this.setNewCopyIds());
			editStructure(this.clipboard.kwargs);
			this.deactivate();
			this.activateFromPasteKwargs(this.clipboard.kwargs);
			const moving_vec = vecMul([15, 15], ++this.clipboard.cnt);
			this.relocatingItems(MOVE, {moving_vec: moving_vec});
			if (this.transform_tool) this.transform_tool.translate(moving_vec);
			const kwargs_dir = this.getCopyKwargs();
			this.dispatcher.addCmd(kwargs_dir, invertCmd(kwargs_dir));
			this.postAction();
			window.addEventListener('mousedown', this.deactivate);
		}
	}

	getDelKwargs() { // Helper
		let kwargs = {del: {}};
		for (const {alias} of this.citizens) {
			kwargs.del[alias] = new Set(this[alias]);
		}
		return kwargs;
	}

	delItems() {
		this.dispatcher.do(this.getDelKwargs());
		this.deactivate();
		this.postAction();
	}

	undoRedo(cmd, is_undo) {
		if (this.highlights.hasChildNodes()) {
			if (this.dispatcher.ptr + is_undo <= this.bottom_ptr) {
				this.removeTransformTool();
				this.addTransformTool();
			}
			else if (this.transform_tool) {
				// eslint-disable-next-line no-unused-vars
				cmd.transforms.forEach(([type, ids, params]) => this.transform_tool.enum_funcs[type](params));
			}
			else {
				this.addTransformTool();
			}
		}
		else {
			this.removeTransformTool();
		}
	}

	deselect() {
		for (const attr of this.attrs) this[`#${attr}`] = [];
	}

	deactivate() {
		window.removeEventListener('mousedown', this.deactivate);
		this.highlights.removeEventListener('mousedown', this.startMoving);
		this.removeTransformTool();
		this.bottom_ptr = Infinity;
		this.dehighlight();
		this.deselect();
		this.citizens.forEach(cls => cls.delSel.clear());
	}
}


class SelectionShape extends SelectionBase {
	static classes = [...super.classes,  ...registry.shapes];

	static shapes_names = registry.citizensShapes.map(cls => cls.alias);

	get shapes() {
		return this.constructor.shapes_names.map(name => this[name]).flat();
	}

	prepareGroup() {
		super.prepareGroup();
		this.pointed_cp = pickCp(this.pt);
	}

	initCtrPtErrSpecialCase() {
		let flag = super.initCtrPtErrSpecialCase();
		if (!flag && this.pointed_cp) {
			this.init_ctr_pt_error = vecDif(this.pointed_cp.xy, this.pt);
			flag = true;
		}
		return flag;
	}

	corrPtSpecialCase(event) {
		let flag = super.corrPtSpecialCase(event);
		if (!flag && this.pointed_cp) {
			let pt = newcnv.getSvgPoint(event);
			if (event.shiftKey) this.corrected_point = pt.map(val => Math.round(val / 10) * 10);
			flag = true;
		}
		return flag;
	}

	updateNewCopySubIds(id_map) { // Get new IDs for control points
		for (const cls of this.citizens.filter(cls => cls.shape)) {
			// eslint-disable-next-line no-unused-vars
			for (const [id, data] of Object.entries(this.clipboard.kwargs.create[cls.alias])) {
				data[0].forEach(cp_data => cp_data[0] = ControlPoint.getNewId());
			}
		}
		super.updateNewCopySubIds(id_map);
	}
}


export class SelectionChem extends SelectionShape {
	static classes = [...super.classes, ...registry.notShapes.toSorted((a, b) => (b === ChemNode) - (a === ChemNode))];

	static event_handlers = {...super.event_handlers, keyUpHandler: 'keyup'};

	static atomsbonds_names = registry.notShapes.map(cls => cls.alias);

	get atomsbonds() {
		return this.constructor.atomsbonds_names.map(name => this[name]).flat();
	}

	setSelectedItem(item) {
		if (item instanceof ChemBond) this.atoms = item.nodes.map(node => node.id);
		super.setSelectedItem(item);
	}

	eventsOn() {
		this.highlights.classList.remove('sympoi');
		this.atomsbonds.forEach(item_id => document.getElementById(item_id).objref.eventsOff());
	};

	eventsOff() {
		this.highlights.classList.add('sympoi');
		this.atomsbonds.forEach(item_id => document.getElementById(item_id).objref.eventsOn());
	};

	prepareGroup() {
		super.prepareGroup();
		this.eventsOff();
		this.pointed_atom = pickNode(this.pt); // Moved atom, pointed by the cursor
		this.join_cmd = null;
		this.eventsOn();
		if (event.shiftKey) this.focusElement();
	}

	initCtrPtErrSpecialCase() {
		let flag = super.initCtrPtErrSpecialCase();
		if (!flag && this.pointed_atom) {
			this.init_ctr_pt_error = vecDif(this.pointed_atom.xy, this.pt);
			flag = true;
		}
		return flag;
	}

	joinMols(event) {
		let kwargs = {};
		let target_node = event.target.objref; // Target atom (static)
		let bonds_data = gatherData(new Set(target_node.connections.map(bond => bond.id)));
		kwargs.del = { // Delete
			atoms: new Set([target_node.id]), // Target atom
			bonds: new Set(Object.keys(bonds_data)) // Bonds of the target atom
		};

		// Apply target atom's text to the pointed atom
		kwargs.alter = {atoms: {[this.pointed_atom.id]: {text: target_node.text}}};

		kwargs.create = {bonds: {}};
		for (const [id, data] of Object.entries(bonds_data)) {
			if (data[0] == target_node.id) data[0] = this.pointed_atom.id;
			if (data[1] == target_node.id) data[1] = this.pointed_atom.id;
			if (data[0] == data[1]) continue;
			kwargs.create.bonds[id] = data;
		}
		this.join_cmd = {dir: kwargs, rev: invertCmd(kwargs)};
		editStructure(kwargs);
		this.pointed_atom.eventsOn();
	}

	disjoinMols() {
		editStructure(this.join_cmd.rev);
		this.join_cmd = null;
		this.pointed_atom.eventsOff();
	}

	corrPtSpecialCase(event) {
		let flag = super.corrPtSpecialCase(event);
		if (!flag && this.pointed_atom) {
			let pt = newcnv.getSvgPoint(event);
			let to_join = event.shiftKey && event.target.is_atom;
			let to_rejoin = this.join_cmd && to_join && event.target.objref.id != this.pointed_atom.id;
			let skip = to_rejoin && vecLen(vecDif(pt, event.target.objref.xy)) > vecLen(vecDif(pt,
				this.pointed_atom.xy));

			if (!skip) {
				if ((this.join_cmd && !to_join) || to_rejoin) this.disjoinMols();
				if ((!this.join_cmd && to_join) || to_rejoin) this.joinMols(event);
			}

			if (to_join) {
				this.corrected_point = skip ? this.pointed_atom.xy : event.target.objref.xy;
			}

			flag = true;
		}
		return flag;
	}

	augmentCmd(kwargs_dir, kwargs_rev) {
		super.augmentCmd(kwargs_dir, kwargs_rev);
		if (this.join_cmd) {
			Object.assign(kwargs_dir, this.join_cmd.dir);
			Object.assign(kwargs_rev, this.join_cmd.rev);
			this.join_cmd = null;
		}
		this.blurElement();
		this.pointed_atom = null;
	}

	postAction() {
		refreshBondCutouts();
	}

	keyDownHandler(event) {
		super.keyDownHandler(event);
		if (event.shiftKey) this.focusElement();
	}

	keyUpHandler(event) {
		if (!event.shiftKey) this.blurElement();
	}

	focusElement() {
		if (this.pointed_atom) {
			this.pointed_atom.promoteMaskSel();
			ChemBond.eventsOffAll();
			this.highlights.classList.add('sympoi');
			document.getElementById('selectholes').setAttribute('visibility', 'hidden');
		}
	}

	blurElement() {
		if (this.pointed_atom) this.pointed_atom.demoteMaskSel();
		ChemBond.eventsOnAll();
		this.highlights.classList.remove('sympoi');
		document.getElementById('selectholes').setAttribute('visibility', 'visible');
	}

	computeFormula() {
		var atoms = this.atoms.size ? [...this.atoms] : [...document.getElementById('sensors_a').children]
			.map(el => el.objref.id);
		return atoms.reduce(
			(acc, atom_id) => sumFormula(acc, document.getElementById(atom_id).objref.formula), {}
		);
	}

	computeMolInfo() {
		var [formula, unrecognized] = separateUnrecognized(this.computeFormula());
		var hill_string = hillToStr(toHillSystem(formula));
		var hill_unrecognized = hillToStr(toHillSystem(unrecognized));
		var fw = formulaToFw(formula);
		var el_comp = computeElementalComposition(formula).map(([el, part]) => `${el}: ${(part * 100).toFixed(2)}%`)
			.join(', ');
		var str_output =
`	Brutto formula 
	${hill_string}

	Fw
	${fw}

	Elemental composition
	${el_comp}${hill_unrecognized.length ? '\n\t\n\tUnrecognized part\n\t' + hill_unrecognized : ''}`;
		return str_output;
	}

	getCopyKwargs() {
		const kwargs = super.getCopyKwargs();
		if (this.bonds.length && this.clipboard == null) {
			kwargs.create.bonds = Object.fromEntries(Object.entries(kwargs.create.bonds)
				// eslint-disable-next-line no-unused-vars
				.filter(([id, data]) => data[0] in kwargs.create.atoms && data[1] in kwargs.create.atoms)
			);
		}
		return kwargs;
	}

	updateNewCopySubIds(id_map) { // Replace IDs for atoms in bonds data
		// eslint-disable-next-line no-unused-vars
		for (const [id, data] of Object.entries(this.clipboard.kwargs.create.bonds)) {
			data[0] = id_map[data[0]];
			data[1] = id_map[data[1]];
		}
		super.updateNewCopySubIds(id_map);
	}

	getDelKwargs() {
		let kwargs = super.getDelKwargs();
		kwargs.del.atoms.forEach(atom_id => document.getElementById(atom_id).objref.connections
			.forEach(bond => kwargs.del.bonds.add(bond.id)));
		return kwargs;
	}
}
