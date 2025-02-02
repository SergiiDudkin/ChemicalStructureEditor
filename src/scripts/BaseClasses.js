export const SENSOR = 0;
export const SHAPE = 1;
export const HIGHLIGHT = 2;
export const SELECTHOLE = 3;


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
