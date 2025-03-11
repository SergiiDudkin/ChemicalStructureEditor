import {attachSvg} from './Utils.js';
import {unitVec, vecDif, vecSum, vecMul, rotateVec, rot90cw} from './Geometry.js';
import {SENSOR} from './BaseClasses.js';
import {ControlPoint} from './ControlPoints.js'
import {Line} from './Shapes.js';


export class Arrow extends Line {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_r')
	}

	static alias = 'arrows';

	static id_prefix = 'r';

	getMarkerId(layer_idx) {
		return `m${layer_idx}-${this.id}`
	}

	createMarker(layer_idx, attrs) {
		this.marker = attachSvg(attachSvg(this.layers[layer_idx], 'defs'), 'marker', {
			id: this.getMarkerId(layer_idx),
			viewBox: '-17 -10 30 20', refX: 0, refY: 0,
			markerWidth: 30, markerHeight: 20,
			orient: 'auto', markerUnits: 'userSpaceOnUse'
		});

		const stroke_width = attrs['stroke-width'] - this.style['stroke-width'];
		attachSvg(this.marker, 'polygon', {...attrs, points: '-12,-5 3,0 -12,5', 'stroke-width': stroke_width});
	}

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const line_end = vecSum(this.cps[1].xy, vecMul(unitVec(vec), -3));
		this.coords = [
			{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: line_end[0], y2: line_end[1]},
		];
	}

	createElements(layer_idx, attrs) {
		const line = attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0], 'marker-end': `url(#${this.getMarkerId(layer_idx)})`});
		this.createMarker(layer_idx, attrs);
		return [line];
	}
}


export class DoubleArrow extends Arrow {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).parents, 
		[SENSOR]: document.getElementById('sensors_da')
	}

	static alias = 'arrows2x';

	static id_prefix = 'da';

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const uv = unitVec(vec);
		const ouva = rot90cw(uv);
		const st0 = vecSum(this.cps[0].xy, vecMul(ouva, -5));
		const en0 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, -5)), vecMul(uv, -3));
		const st1 = vecSum(this.cps[1].xy, vecMul(ouva, 5));
		const en1 = vecSum(vecSum(this.cps[0].xy, vecMul(ouva, 5)), vecMul(uv, 3));
		this.coords = [
			{x1: st0[0], y1: st0[1], x2: en0[0], y2: en0[1]},
			{x1: st1[0], y1: st1[1], x2: en1[0], y2: en1[1]}
		];
	}

	createElements(layer_idx, attrs) {
		const lines = [0, 1].map(i => attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[i], 'marker-end': `url(#${this.getMarkerId(layer_idx)})`}));
		this.createMarker(layer_idx, attrs);
		return lines;
	}
}


export class ResonanceArrow extends Arrow {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(Object.getPrototypeOf(this))).parents, 
		[SENSOR]: document.getElementById('sensors_re')
	}

	static alias = 'arrowsre';

	static id_prefix = 're';

	createMarker(layer_idx, attrs) {
		this.marker = attachSvg(attachSvg(this.layers[layer_idx], 'defs'), 'marker', {
			id: this.getMarkerId(layer_idx),
			viewBox: '-15 -15 20 30', refX: 0, refY: 0,
			markerWidth: 20, markerHeight: 30,
			orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse'
		});
		attachSvg(this.marker, 'polyline', {...attrs, points: '-10,-10 0,0 -10,10', fill: 'none'});
	}

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		this.coords = [
			{x1: this.cps[0].xy[0], y1: this.cps[0].xy[1], x2: this.cps[1].xy[0], y2: this.cps[1].xy[1]},
		];
	}

	createElements(layer_idx, attrs) {
		const marker_ref = `url(#${this.getMarkerId(layer_idx)})`;
		const line = attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[0], 
			'marker-start': marker_ref, 'marker-end': marker_ref});
		this.createMarker(layer_idx, attrs);
		return [line];
	}
}


export class RetroArrow extends Line {
	static parents = {
		...Object.getPrototypeOf(Object.getPrototypeOf(this)).parents, 
		[SENSOR]: document.getElementById('sensors_rt')
	}

	static alias = 'arrowsrt';

	static id_prefix = 'rt';

	static triangle = [[-10, -20], [0, 0], [-10, 20]];

	calcCoordinates() {
		const vec = vecDif(this.cps[0].xy, this.cps[1].xy);
		const uv = unitVec(vec);
		const ouva = rot90cw(uv);
		const st0 = vecSum(this.cps[0].xy, vecMul(ouva, -10));
		const en0 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, -10)), vecMul(uv, -5));
		const st1 = vecSum(this.cps[0].xy, vecMul(ouva, 10));
		const en1 = vecSum(vecSum(this.cps[1].xy, vecMul(ouva, 10)), vecMul(uv, -5));
		const rot_ang = Math.atan2(vec[1], vec[0]);
		const triangle = this.constructor.triangle.map(
			pt => vecSum(rotateVec(pt, rot_ang), this.cps[1].xy).join()
		).join(' ');
		this.coords = [
			{x1: st0[0], y1: st0[1], x2: en0[0], y2: en0[1]},
			{x1: st1[0], y1: st1[1], x2: en1[0], y2: en1[1]},
			{points: triangle}
		];
	}

	createElements(layer_idx, attrs) {
		const elements = [0, 1].map(i => attachSvg(this.layers[layer_idx], 'line', {...attrs, ...this.coords[i]}));
		elements.push(attachSvg(this.layers[layer_idx], 'polyline', {...attrs, ...this.coords[2], fill: 'none'}));
		return elements;
	}
}


[Arrow, DoubleArrow, ResonanceArrow, RetroArrow].forEach(cls => cls.register());
