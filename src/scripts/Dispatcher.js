import {MOVE, ROTATE, SCALE, STRETCH, vecMul} from './Geometry.js';
import {editStructure} from './Executor.js';
import {gatherData} from './Utils.js';
import {refreshBondCutouts} from './BondCutouts.js';


const transform_inverts = Object.freeze({
	[MOVE]: ({moving_vec}) => ({moving_vec: vecMul(moving_vec, -1)}),
	[ROTATE]: ({rot_angle, rot_ctr}) => ({rot_angle: -rot_angle, rot_ctr: rot_ctr.slice()}),
	[SCALE]: ({scale_factor, scale_ctr}) => ({scale_factor: 1 / scale_factor, scale_ctr: scale_ctr.slice()}),
	[STRETCH]: ({stretch_factor, dir_angle, stretch_ctr}) => ({stretch_factor: 1 / stretch_factor,
		dir_angle: dir_angle + Math.PI, stretch_ctr: stretch_ctr.slice()})
});

export function invertCmd(kwargs_dir) {
	let kwargs_rev = {};
	if (kwargs_dir.del) {
		kwargs_rev.create = {};
		for (const [cls_alias, content] of Object.entries(kwargs_dir.del)) {
			kwargs_rev.create[cls_alias] = gatherData(content);
		}
	}
	if (kwargs_dir.create) {
		kwargs_rev.del = {};
		for (const [cls_alias, content] of Object.entries(kwargs_dir.create)) {
			kwargs_rev.del[cls_alias] = new Set(Object.keys(content));
		}
	}
	if (kwargs_dir.alter) {
		kwargs_rev.alter = {};
		for (const [cls_alias, content] of Object.entries(kwargs_dir.alter)) {
			kwargs_rev.alter[cls_alias] = {};
			for (const [id, new_attrs] of Object.entries(content)) {
				kwargs_rev.alter[cls_alias][id] = {};
				const obj = document.getElementById(id).objref;
				// eslint-disable-next-line no-unused-vars
				for (const [key, val] of Object.entries(new_attrs)) {
					kwargs_rev.alter[cls_alias][id][key] = obj[key];
				}
			}
		}
	}
	if (kwargs_dir.transforms) {
		kwargs_rev.transforms = kwargs_dir.transforms.toReversed().map(([type, ids, params]) => [type,
			structuredClone(ids), transform_inverts[type](params)]);
	}
	return kwargs_rev;
}


class Dispatcher {
	// eslint-disable-next-line no-unused-vars
	constructor(executor, inverter, postaction = () => void 0, callback = (cmd, is_undo) => void 0) {
		this.commands = [];
		this.ptr = 0;
		this.executor = executor;
		this.inverter = inverter;
		this.postaction = postaction;
		this.callback = callback;
		document.addEventListener('keydown', event => this.keyHandler(event)); // !!! ToDo: bind and simplify
	}

	addCmd(args_dir, args_rev) {
		this.commands = this.commands.slice(0, this.ptr); // Delete extra commands
		this.commands.push([args_dir, args_rev]); // Add new command to the history
		this.ptr++;
	}

	do(kwargs_dir) {
		const kwargs_rev = this.inverter(kwargs_dir);
		this.executor(kwargs_dir);
		this.addCmd(kwargs_dir, kwargs_rev);
	}

	redo() {
		if (this.ptr >= this.commands.length) return;
		let args_rev = this.commands[this.ptr++][0]; // Fetch command
		this.executor(args_rev); // Execute the given function with args
		this.callback(args_rev, false);
	}

	undo() {
		if (this.ptr <= 0) return;
		const args_dir = this.commands[--this.ptr][1]; // Fetch command
		this.executor(args_dir); // Execute the given function with args
		this.callback(args_dir, true);
	}

	keyHandler(event) {
		if ((event.ctrlKey || event.metaKey) && !event.repeat) {
			var to_redo = event.key == 'y' || event.key == 'Z' || (event.key == 'z' && event.shiftKey);
			var to_undo = event.key == 'z' && !event.shiftKey;
			if (to_redo) this.redo();
			if (to_undo) this.undo();
			if (to_undo || to_redo) this.postaction();
		}
	}
}

export const dispatcher = new Dispatcher(editStructure, invertCmd, refreshBondCutouts);
