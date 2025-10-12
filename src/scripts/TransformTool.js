import {cnv} from './Canvas.js';
import {Indicator} from './Indicator.js';
import {
	MOVE, ROTATE, SCALE, STRETCH, vecDif, rotateAroundCtr, vecDotProd, stretchAlongDir, vecSum, vecMul, unitVec,
	scaleAroundCtr, discreteAngle
} from './Geometry.js';
import {DeletableAbortable, attachSvg, CtrRect, CtrCircle, CtrPolygon} from './Utils.js';


export class TransformTool extends DeletableAbortable {
	constructor(parent_id, cx, cy, width, height, selection) {
		super();
		[
			'movingPivot', 'finishMovingPivot', 'startMovingPivot', 'startRotating', 'rotating', 'finishRotating',
			'startScaling', 'scaling', 'finishScaling', 'startStretching', 'stretching', 'finishStretching'
		].forEach(method => this[method] = this[method].bind(this));

		this.selection = selection;
		this.parent_id = parent_id;
		this.g = attachSvg(document.getElementById(parent_id), 'g', {id: 'transform-tool'});
		this.xy = [cx, cy];
		const hw = width / 2; // Transform tool half witdth
		const hh = height / 2; // Transform tool half height

		// Dimensions
		const cl = 8; // Corner rectangle length
		const sw = 6; // Side rectangle width
		const sh = 12; // Side rectangle height
		const aht = 2; // Pivot half thickness
		const ahl = 14; // Pivot half length
		const lever_r = 6; // Lever radius
		this.lever_len = 25; // Distanse from the circle to the nearest side rectangle

		const pivot_pts = [
			[aht, aht], [aht, ahl], [-aht, ahl], [-aht, -ahl], [aht, -ahl],
			[aht, aht], [-ahl, aht], [-ahl, -aht], [ahl, -aht], [ahl, aht]
		].map(pt => pt.join()).join(' ');

		const vals = [ // Jigs init data: [ShapeClass, cx, cy, svg_args, callback]
			[CtrPolygon, cx, cy, {points: pivot_pts, 'fill-rule': 'evenodd'}, this.startMovingPivot], // Pivot
			[CtrCircle, cx, cy - hh - this.lever_len, {r: lever_r}, this.startRotating], // Lever
			[CtrRect, cx + hw, cy + hh, {width: cl, height: cl}, this.startScaling], // Bottom-right square
			[CtrRect, cx - hw, cy + hh, {width: cl, height: cl}, this.startScaling], // Bottom-left square
			[CtrRect, cx - hw, cy - hh, {width: cl, height: cl}, this.startScaling], // Top-left square
			[CtrRect, cx + hw, cy - hh, {width: cl, height: cl}, this.startScaling], // Top-right square
			[CtrRect, cx + hw, cy, {width: sw, height: sh}, this.startStretching], // Right rectangle
			[CtrRect, cx - hw, cy, {width: sw, height: sh}, this.startStretching], // Left rectangle
			[CtrRect, cx, cy + hh, {width: sh, height: sw}, this.startStretching], // Bottom rectangle
			[CtrRect, cx, cy - hh, {width: sh, height: sw}, this.startStretching] // Top rectangle
		];
		vals.forEach(item => item[3].class = 'transformjig');
		this.jigs = vals.map(([ShapeClass, cx, cy, svg_args, callback]) =>
			new ShapeClass('transform-tool', cx, cy, svg_args).render()
				.addEventListener('mousedown', callback, this.signal_opt)
		);
		this.pivot = this.jigs[0];
		this.lever = this.jigs[1];

		this.enum_funcs = Object.freeze({
			[MOVE]: ({moving_vec}) => this.translate(moving_vec),
			[ROTATE]: ({rot_angle, rot_ctr}) => this.rotate(rot_angle, rot_ctr),
			[SCALE]: ({scale_factor, scale_ctr}) => this.scale(scale_factor, scale_ctr),
			[STRETCH]: ({stretch_factor, dir_angle, stretch_ctr}) => this.stretch(stretch_factor, dir_angle,
				stretch_ctr)
		});
	}

	// Moving all jigs
	translate(moving_vec) {
		this.xy = vecSum(this.xy, moving_vec);
		this.jigs.forEach(jig => jig.translate(moving_vec).render());
	}

	// Rotating
	startRotating(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_rot_angle = 0;
		this.rot_st = Math.atan2(...vecDif(this.pivot.xy, cnv.getSvgPoint(event)).toReversed());
		window.addEventListener('mousemove', this.rotating, this.signal_opt);
		window.addEventListener('mouseup', this.finishRotating, this.signal_opt);
	}

	rotating(event) {
		let rot_angle = Math.atan2(...vecDif(this.pivot.xy, cnv.getSvgPoint(event)).toReversed()) - this.rot_st;
		if (event.shiftKey) {
			const new_accum_rot_angle = discreteAngle(this.accum_rot_angle + rot_angle, 5);
			rot_angle = (new_accum_rot_angle != this.accum_rot_angle) ? new_accum_rot_angle - this.accum_rot_angle : 0;
		}
		this.accum_rot_angle += rot_angle;
		this.indicator.showDegree(event, ((this.accum_rot_angle * 180 / Math.PI - 540) % 360 + 180).toFixed(1));
		this.rot_st = this.rot_st + rot_angle;
		this.rotate(rot_angle, this.pivot.xy);
		this.selection.relocatingItems(ROTATE, {rot_angle: rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	finishRotating() {
		window.removeEventListener('mousemove', this.rotating);
		window.removeEventListener('mouseup', this.finishRotating);
		this.selection.finishRelocatingItems(ROTATE, {rot_angle: this.accum_rot_angle, rot_ctr: [...this.pivot.xy]});
	}

	rotate(rot_angle, rot_ctr) {
		this.pivot.setCtr(rot_ctr).render();
		this.xy = rotateAroundCtr(this.xy, rot_angle, rot_ctr);
		this.jigs.slice(1).forEach(jig => {
			jig.setCtr(rotateAroundCtr(jig.xy, rot_angle, rot_ctr)).rotate(rot_angle).render();
		});
	}

	// Scaling
	startScaling(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_factor = 1;
		this.curr_jig = event.target.objref;
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, cnv.getSvgPoint(event));
		window.addEventListener('mousemove', this.scaling, this.signal_opt);
		window.addEventListener('mouseup', this.finishScaling, this.signal_opt);
	}

	scaling(event) {
		const factor = this.getFactor();
		this.indicator.showPercent(event, (this.accum_factor * 100).toFixed(1));
		this.scale(factor, this.pivot.xy);
		this.selection.relocatingItems(SCALE, {scale_factor: factor, scale_ctr: [...this.pivot.xy]});
	}

	finishScaling() {
		window.removeEventListener('mousemove', this.scaling);
		window.removeEventListener('mouseup', this.finishScaling);
		this.selection.finishRelocatingItems(SCALE, {scale_factor: this.accum_factor, scale_ctr: [...this.pivot.xy]});
	}

	scale(scale_factor, scale_ctr) {
		this.pivot.setCtr(scale_ctr).render();
		this.xy = scaleAroundCtr(this.xy, scale_factor, scale_ctr);
		this.jigs.slice(2).forEach(jig => {
			jig.setCtr(scaleAroundCtr(jig.xy, scale_factor, scale_ctr)).render();
		});
		this.locateLever();
	}

	// Stretching along x or y
	startStretching(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.accum_factor = 1;
		this.curr_jig = event.target.objref;
		this.dir_angle = Math.atan2(...vecDif(this.xy, this.curr_jig.xy).toReversed());
		this.init_ctr_pt_error = vecDif(this.curr_jig.xy, cnv.getSvgPoint(event));
		window.addEventListener('mousemove', this.stretching, this.signal_opt);
		window.addEventListener('mouseup', this.finishStretching, this.signal_opt);
	}

	stretching(event) {
		const factor = this.getFactor();
		this.indicator.showPercent(event, (this.accum_factor * 100).toFixed(1));
		this.stretch(factor, this.dir_angle, this.pivot.xy);
		this.selection.relocatingItems(STRETCH, {stretch_factor: factor, dir_angle: this.dir_angle,
			stretch_ctr: [...this.pivot.xy]});
	}

	finishStretching() {
		window.removeEventListener('mousemove', this.stretching);
		window.removeEventListener('mouseup', this.finishStretching);
		this.selection.finishRelocatingItems(STRETCH, {stretch_factor: this.accum_factor, dir_angle: this.dir_angle,
			stretch_ctr: [...this.pivot.xy]});
	}

	stretch(stretch_factor, dir_angle, stretch_ctr) {
		this.pivot.setCtr(stretch_ctr).render();
		this.xy = stretchAlongDir(this.xy, stretch_factor, dir_angle, stretch_ctr);
		this.jigs.slice(2).forEach(jig => {
			jig.setCtr(stretchAlongDir(jig.xy, stretch_factor, dir_angle, stretch_ctr)).render();
		});
		this.locateLever();
	}

	// Moving pivot
	startMovingPivot(event) {
		event.stopPropagation();
		this.indicator = new Indicator(this.parent_id);
		this.init_ctr_pt_error = vecDif(this.pivot.xy, cnv.getSvgPoint(event));
		this.jigs.slice(1).forEach(jig => jig.shape.classList.add('sympoi'));
		window.addEventListener('mousemove', this.movingPivot, this.signal_opt);
		window.addEventListener('mouseup', this.finishMovingPivot, this.signal_opt);
	}

	movingPivot(event) {
		let corrected_point = vecDif(this.init_ctr_pt_error, cnv.getSvgPoint(event));
		if (event.shiftKey) {
			this.pivot.shape.classList.add('sympoi', 'jigforcehover');
			this.selection.eventsOff();
			const el = event.target;
			if (el.is_atom || el.is_bond) corrected_point = el.objref.xy;
		}
		else {
			this.pivot.shape.classList.remove('sympoi', 'jigforcehover');
			this.selection.eventsOn();
		}
		this.indicator.showPt(event, corrected_point.map(val => val.toFixed(0)));
		this.pivot.setCtr(corrected_point).render();
	}

	finishMovingPivot() {
		window.removeEventListener('mousemove', this.movingPivot);
		window.removeEventListener('mouseup', this.finishMovingPivot);
		this.jigs.forEach(jig => jig.shape.classList.remove('sympoi'));
		this.pivot.shape.classList.remove('jigforcehover');
		this.selection.eventsOn();
	}

	// Utils
	getFactor() {
		const corrected_point = vecDif(this.init_ctr_pt_error, cnv.getSvgPoint(event));
		const transform_vec = vecDif(this.pivot.xy, corrected_point);
		const ref_vec = vecDif(this.pivot.xy, this.curr_jig.xy);
		const dir_vec = vecDif(this.xy, this.curr_jig.xy);
		let factor = vecDotProd(dir_vec, transform_vec) / vecDotProd(dir_vec, ref_vec);
		factor = Math.abs(this.accum_factor * factor) > 0.0250001 ? factor : 1;
		if (event.shiftKey) {
			const rounded_new_accum_factor = Math.round(this.accum_factor * factor / 0.05) * 0.05;
			factor = rounded_new_accum_factor != this.accum_factor ? rounded_new_accum_factor / this.accum_factor : 1;
		}
		this.accum_factor = this.accum_factor * factor;
		return factor;
	}

	locateLever() {
		const new_lever_ctr = vecSum(this.jigs[9].xy,
			vecMul(unitVec(vecDif(this.xy, this.jigs[9].xy)), this.lever_len));
		this.lever.setCtr(new_lever_ctr).render();
	}

	delete() {
		this.jigs.forEach(jig => jig.delete());
		this.g.remove();
		super.delete();
	}
}