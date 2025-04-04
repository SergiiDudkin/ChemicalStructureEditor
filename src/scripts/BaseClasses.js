export const SENSOR = 0;
export const SHAPE = 1;
export const HIGHLIGHT = 2;
export const SELECTHOLE = 3;


export const registry = {
	classes: {},

	classes_vals: [],

	register(cls) {
		this.classes[cls.alias] = cls;
		this.classes_vals.push(cls);
		return true;
	},

	get citizens() {
		return this.classes_vals.filter(cls => cls.citizen);
	},

	get shapes() {
		return this.classes_vals.filter(cls => cls.shape);
	},

	get notShapes() {
		return this.classes_vals.filter(cls => !cls.shape);
	},

	get citizensShapes() {
		return this.classes_vals.filter(cls => cls.citizen && cls.shape);
	}
};


export class Registered {
	static register() {
		this.clsInit();
		registry.register(this);
	}
}


export class IdHolder extends Registered{
	constructor(id) {
		super();
		this.id = id;
		this.constructor.ids.add(id);
	}

	static id_prefix = ''; // Reassign!

	static clsInit() {
		this.counter = 0; // ID conuter
		this.ids = new Set();
	}

	static getNewId() {
		return this.id_prefix + this.counter++;
	}

	static getAllInstanceIDs() {
		return [...this.ids];
	}

	static getMaxId() {
		return Math.max(...this.getAllInstanceIDs().map(id => parseInt(id.slice(this.id_prefix.length))));
	}

	static setMaxIdCounter() {
		this.counter = Math.max(this.counter, this.getMaxId() + 1);
	}

	delete() {
		this.constructor.ids.delete(this.id);
	}
}


export class CanvasCitizen extends IdHolder {
	// Public info
	static movable = true;

	static citizen = true;

	static shape = false;

	// Parent elements
	static parents = {
		[SENSOR]: null,
		[SHAPE]: null,
		[HIGHLIGHT]: document.getElementById('selecthighlight'),
		[SELECTHOLE]: document.getElementById('selectholes')
	};

	static clsInit() {
		super.clsInit();
		this.delSel = new Set(); // Deleted elements while being selected
	}
}


window.registry = registry; // !!! Temp, for debug !!!
