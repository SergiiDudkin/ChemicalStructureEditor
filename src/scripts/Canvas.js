class Canvas {
	constructor() {
		this.svg = document.getElementById('canvas');
		this.canvbckgrnd = document.getElementById('canvbckgrnd');
		this.cnvclippath = document.getElementById('cnvclippath');
		this.mainframe = document.getElementById('mainframe'); // ToDo: Replace with "canvas-container"

		this.clip_path_dict = {};
		this.clip_path_counter = 0;

// this.hmax = 500;
		this.svgWidth();
		[this.x, this.y] = this.getScreenPoint([0, 0]);
		[
			'svgWidth', 'updateMatrixrf', 'showChessGrid', 'hideGrid'
		].forEach(method => this[method] = this[method].bind(this));
		window.addEventListener('resize', this.svgWidth);
		window.addEventListener('scroll', this.updateMatrixrf);
	}

	svgWidth(event) { // eslint-disable-line no-unused-vars
		// console.log(this.mainframe.offsetWidth, document.body.offsetWidth);
		console.log(document.documentElement.clientWidth);
		this.wmax = this.mainframe.offsetWidth - 36;
		this.canvbckgrnd.setAttribute("width", this.wmax);
		this.svg.setAttribute("width", this.wmax + 4);

		this.hmax = this.mainframe.offsetHeight - 36;
		this.canvbckgrnd.setAttribute("height", this.hmax);
		this.svg.setAttribute("height", this.hmax + 4);

		this.renderClipPath();
		this.updateMatrixrf();
	}

	updateMatrixrf() {
		this.matrixrf = this.svg.getScreenCTM().inverse();
	}

	clip(path) {
		const clip_path_num = this.clip_path_counter;
		this.clip_path_dict[this.clip_path_counter++] = path;
		this.renderClipPath();
		return clip_path_num;
	}

	clipRect(x0, y0, x1, y1) {
		return this.clip(rectToPath(...this.clampToCnv([x0, y0]), ...this.clampToCnv([x1, y1])));
	}

	unclip(clip_path_num) {
		delete this.clip_path_dict[clip_path_num];
		this.renderClipPath();
	}

	renderClipPath() {
		this.cnvclippath.setAttribute('d', [
			rectToPath(0, 0, ...this.clampToCnv([this.wmax, this.hmax])),
			...Object.values(this.clip_path_dict)
		].join(' '));
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
		return [Math.min(Math.max(x, 0), this.wmax - 2), Math.min(Math.max(y, 0), this.hmax - 2)];
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
