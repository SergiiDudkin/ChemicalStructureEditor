export const SENSOR = 0;
export const SHAPE = 1;
export const HIGHLIGHT = 2;
export const SELECTHOLE = 3;


export class IdBearer {
	constructor(id) {
		this.id = id;
	}

	static counter = 0; // ID conuter

	static id_prefix = '';

	static getNewId() {
		return this.id_prefix + this.counter++;
	}

	static getAllInstanceIDs() {
		return new Set([...this.parents[SENSOR].children].map(el => el.objref.id));
	}

	static getMaxId() {
		return Math.max(...this.getAllInstanceIDs().map(id => parseInt(id.slice(id_prefix.length))));
	}

	static setMaxIdCounter() {
		this.counter = Math.max(this.counter, this.getMaxId() + 1);
	}
}



export class CanvasCitizen {
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
	}

	// ID counter
	static counter = 0;

	static id_prefix = null;

	static getNewId() {
		return this.id_prefix + this.counter++;
	}

	// Deleted elements while being selected
	static delSel = new Set();

	static getAllInstanceIDs() {
		return new Set([...this.parents[SENSOR].children].map(el => el.objref.id));
	}
}
