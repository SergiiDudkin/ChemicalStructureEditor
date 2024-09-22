import {attachSvg} from './Utils.js';

const DEBUG_GROUP = document.getElementById('debug');


function randInt(min_incl, max_excl) {
	return Math.floor(Math.random() * (max_excl - min_incl) + min_incl);
}


export function getColor() {
	return `rgb(${randInt(0, 224)},${randInt(0, 224)},${randInt(0, 224)})`;
}


export function drawPoint(x, y, r=1) {
	attachSvg(DEBUG_GROUP, 'circle', {fill: getColor(), r: r, cx: x, cy: y});
}


export function drawBBox(text_el) {
	var {x, y, width, height} = text_el.getBBox();
	attachSvg(DEBUG_GROUP, 'rect', {fill: 'blue', opacity: 0.3, x: x, y: y, width: width, height: height});
}


export function clearDebug() {
	DEBUG_GROUP.innerHTML = '';
}
