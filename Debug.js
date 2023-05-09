colors = ['Red', 'Orange', 'Gold', 'Green', 'Cyan', 'Blue', 'DarkViolet', 'Silver', 'Gray', 'Teal'];
color_idx = 0


function getColor() {
	color = colors[color_idx];
	color_idx = (color_idx + 1) % 10;
	return color;
}


function drawPoint(x, y) {
	var point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
	point.setAttribute('fill', getColor());
	point.setAttribute('r', 1);
	point.setAttribute('cx', x);
	point.setAttribute('cy', y);
	document.getElementById('debug').appendChild(point);
}


function clearDebug() {
	document.getElementById('debug').innerHTML = '';
	color_idx = 0;
}
