class Canvas {
	constructor() {
		this.svg = document.getElementById('canvas');
		this.canvbckgrnd = document.getElementById('canvbckgrnd');
		this.cnvclippath = document.getElementById('cnvclippath');
		this.mainframe = document.getElementById('mainframe');
		this.cnvcontainer = document.getElementById('canvas-container');

		this.zoom_factor = 1;
		this.zoom_callbacks = {};
		this.zoom_callback_counter = 0;

		[this.w, this.h] = [794, 1123]; // A4
		this.clip_path_dict = {bg: [0, 0, this.w, this.h]};
		this.clip_path_counter = 0;
		this.fitSvgSize();
		[this.x, this.y] = this.getScreenPoint([0, 0]);
		[
			'fitSvgSize', 'updateMatrixrf', 'showChessGrid', 'hideGrid', 'zooming'
		].forEach(method => this[method] = this[method].bind(this));
		window.addEventListener('resize', this.fitSvgSize);
		window.addEventListener('scroll', this.updateMatrixrf); // ToDo: Consider to prevent the window overflow
		this.cnvcontainer.addEventListener('scroll', this.fitSvgSize);
	}

	fitSvgSize(event) { // eslint-disable-line no-unused-vars
		this.canvbckgrnd.setAttribute("width", this.w + 2);
		this.svg.setAttribute("width", this.w * this.zoom_factor + 6);
		this.cnvcontainer.style.width = this.mainframe.offsetWidth - 36 + 4 + 'px';

		this.canvbckgrnd.setAttribute("height", this.h + 2);
		this.svg.setAttribute("height", this.h * this.zoom_factor + 6);
		this.cnvcontainer.style.height = this.mainframe.offsetHeight - 36 + 4 + 'px';

		this.renderClipPath();
		this.updateMatrixrf();
	}

	updateMatrixrf() {
		this.matrixrf = this.svg.getScreenCTM().inverse();
	}

	clipRect(x0, y0, x1, y1) {
		const clip_path_num = this.clip_path_counter;
		this.clip_path_dict[this.clip_path_counter++] = [...this.clampToCnv([x0, y0]), ...this.clampToCnv([x1, y1])];
		this.renderClipPath();
		return clip_path_num;
	}

	unclipRect(clip_path_num) {
		delete this.clip_path_dict[clip_path_num];
		this.renderClipPath();
	}

	renderClipPath() {
		this.cnvclippath.setAttribute('d', 
			Object.entries(this.clip_path_dict)
				.map(([key, [x0, y0, x1, y1]]) => rectToPath(...(key == 'bg') ? [x0, y0, x1, y1] : [
					(x0 + this.cnvcontainer.scrollLeft) / this.zoom_factor, 
					(y0 + this.cnvcontainer.scrollTop) / this.zoom_factor, 
					(x1 + this.cnvcontainer.scrollLeft) / this.zoom_factor, 
					(y1 + this.cnvcontainer.scrollTop) / this.zoom_factor
				])).join(' ')
		);
	}

	getSvgPoint(event) {
		const {x, y} = new DOMPoint(event.clientX, event.clientY).matrixTransform(this.matrixrf);
		return [x, y];
	}

	getScreenPoint([svg_x, svg_y]) {
		const {x, y} = new DOMPoint(svg_x, svg_y).matrixTransform(this.matrixrf.inverse());
		return [x, y];
	}

	clampEventToCnv(event) {
		return this.clampToCnv(this.getSvgPoint(event));
	}

	clampToCnv([x, y]) {
		return [Math.min(Math.max(x, 0), this.w), Math.min(Math.max(y, 0), this.h)];
	}

	showChessGrid() {
		this.canvbckgrnd.setAttribute('fill', 'url(#chessgrid)');
	}

	hideGrid() {
		this.canvbckgrnd.setAttribute('fill', 'white');
	}

	isClicked(event) {
		return this.svg.contains(event.target);
	}

	getSvgContent() {
		const svg_el = this.svg.cloneNode();
		svg_el.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
		svg_el.appendChild(document.getElementById('bondsall').cloneNode(true));
		svg_el.appendChild(document.getElementById('atomsall').cloneNode(true));
		svg_el.appendChild(document.getElementById('shapes').cloneNode(true));
		svg_el.appendChild(document.getElementById('bondcutouts').cloneNode(true));
		svg_el.appendChild(document.getElementById('bondpatterns').cloneNode(true));
		const svg_content = svg_header + indentHtml(svg_el)
			.replaceAll(/class=".*?"/gm, '')
			.replaceAll(/ mask="null"/gm, '')
			.replaceAll(/ >/gm, '>');
		return svg_content;
	}

	zooming(zoom_factor) {
		this.zoom_factor = zoom_factor;
		this.svg.setAttribute('viewBox', `0 0 ${this.w + 6 / (zoom_factor)} ${this.h + 6 / (zoom_factor)}`);
		this.fitSvgSize();
		for (const callback of Object.values(this.zoom_callbacks)) {
			callback(zoom_factor);
		}
	}

	addZoomCallback(callback) {
		const zoom_callback_num = this.zoom_callback_counter;
		this.zoom_callbacks[this.zoom_callback_counter++] = callback;
		return zoom_callback_num;
	}

	removeZoomCallback(zoom_callback_num) {
		delete this.zoom_callbacks[zoom_callback_num];
	}
}


const svg_header =
`<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd" [
	<!ENTITY ns_svg "http://www.w3.org/2000/svg">
	<!ENTITY ns_xlink "http://www.w3.org/1999/xlink">
]>
`;


function indentHtml(el) {
	if (el.tagName == 'text' && !el.textContent.trim()) return '';
	if (el.childElementCount) {
		el.innerHTML = '\n' + [...el.children].map(child => indentHtml(child)).join('\n')
			.replaceAll(/^/gm, '\t').replaceAll(/(?<=tspan>)\s+(?=<tspan)/gm, '') + '\n';
	}
	return el.outerHTML.replaceAll(/<g>\s*<\/g>/gm, '').replaceAll(/^\s*\n/gm, '');
}


function rectToPath(x0, y0, x1, y1) {
	return `M ${x0} ${y0} H ${x1} V ${y1} H ${x0} Z`;
}


export const cnv = new Canvas();
