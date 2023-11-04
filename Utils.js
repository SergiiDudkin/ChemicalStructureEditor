function setAttrsSvg(el, attrs={}) {
	Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
}

function makeSvg(tag, attrs={}) {
	el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	setAttrsSvg(el, attrs);
	return el;
}

function attachSvg(patent, tag, attrs={}) {
	el = makeSvg(tag, attrs);
	patent.appendChild(el);
	return el;
}
