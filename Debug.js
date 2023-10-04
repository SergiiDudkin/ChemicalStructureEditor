colors = ['Red', 'Orange', 'Gold', 'Green', 'Cyan', 'Blue', 'DarkViolet', 'Silver', 'Gray', 'Teal'];
color_idx = 0


function getColor() {
	color = colors[color_idx];
	color_idx = (color_idx + 1) % 10;
	return color;
}


function drawPoint(x, y, r=1) {
	var point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	point.setAttribute('fill', getColor());
	point.setAttribute('r', r);
	point.setAttribute('cx', x);
	point.setAttribute('cy', y);
	document.getElementById('debug').appendChild(point);
}


function clearDebug() {
	document.getElementById('debug').innerHTML = '';
	color_idx = 0;
}


function drawBBox(text_el) {
	var text_bbox = text_el.getBBox();
	var bbox_rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bbox_rect.setAttribute('fill', 'blue');
	bbox_rect.setAttribute('opacity', 0.3);
	bbox_rect.setAttribute('x', text_bbox.x);
	bbox_rect.setAttribute('y', text_bbox.y);
	bbox_rect.setAttribute('width', text_bbox.width);
	bbox_rect.setAttribute('height', text_bbox.height);
	document.getElementById('utils').appendChild(g).appendChild(bbox_rect);
}
