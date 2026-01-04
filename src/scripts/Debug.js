import {attachSvg} from './Utils.js';
import {vecDif} from './Geometry.js';
import {cnv} from './Canvas.js';


const debug_group = document.getElementById('debug');


function randInt(min_incl, max_excl) {
	return Math.floor(Math.random() * (max_excl - min_incl) + min_incl);
}


export function getColor() {
	return `rgb(${randInt(0, 224)},${randInt(0, 224)},${randInt(0, 224)})`;
}


export function drawPoint(x, y, r=1) {
	attachSvg(debug_group, 'circle', {fill: getColor(), r: r, cx: x, cy: y});
}


export function drawBBox(text_el) {
	const {x, y, width, height} = text_el.getBBox();
	attachSvg(debug_group, 'rect', {fill: 'blue', opacity: 0.3, x: x, y: y, width: width, height: height});
}


export function clearDebug() {
	debug_group.innerHTML = '';
}


function run_debug() {
	clearDebug();
	drawPoint(0, 0, 20);
	drawPoint(800, 800, 20);
	drawPoint(0, 0, 2);
	drawPoint(800, 800, 2);
	console.log('run_debug');
}


function check_dims() {
	const p0 = cnv.getScreenPoint([0, 0]);
	const p1 = cnv.getScreenPoint([800, 800]);
	const dif = vecDif(p0, p1);
	console.log(`p0 ${p0}, p1 ${p1}, dif ${dif}`)
}

window.run_debug = run_debug;
window.check_dims = check_dims;
