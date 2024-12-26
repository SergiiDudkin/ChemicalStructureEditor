import {CtrRect} from './Utils.js';


export class ControlPoint extends CtrRect {
	constructor(id, cx, cy) {
		// this.rect = new CtrRect('control_points', x, y, {width: 5, height: 5});
		super('control_points', cx, cy, {width: 15, height: 15, class: 'transformjig', id: id});
		this.id = id;
	}
}
