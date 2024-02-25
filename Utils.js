function setAttrsSvg(el, attrs={}) {
	Object.entries(attrs).forEach(([key, val]) => el.setAttribute(key, val));
}

function makeSvg(tag, attrs={}) {
	el = document.createElementNS('http://www.w3.org/2000/svg', tag);
	setAttrsSvg(el, attrs);
	return el;
}

function attachSvg(parent, tag, attrs={}) {
	el = makeSvg(tag, attrs);
	parent.appendChild(el);
	return el;
}
