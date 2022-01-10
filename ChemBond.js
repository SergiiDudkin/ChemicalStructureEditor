function ChemBond(node0, node1, id=null, multiplicity=1) {
	if (typeof node0 === "string") node0 = document.getElementById(node0).objref;
	if (typeof node1 === "string") node1 = document.getElementById(node1).objref;

	this.nodes = [node0, node1];
	node0.connections.push({'adjnode': node1, 'bond': this});
	node1.connections.push({'adjnode': node0, 'bond': this});

	var x0, y0, x1, y1;
	[x0, y0, x1, y1] = this.getnodecenters();
	this.difx = x1 - x0;
	this.dify = y1 - y0;
	this.len = veclen(this.difx, this.dify);
	this.shx = -this.dify * bondspace / this.len; // Ortohonal (ACW) shift vector, X
	this.shy = this.difx * bondspace / this.len; // Ortohonal (ACW) shift vector, Y
	this.pdshift = 0;

	this.g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	this.g.id = id === null ? this.getNewId() : id;
	this.g.setAttribute('class', 'bg');
	this.g.objref = this;
	bondsall.appendChild(this.g)

	var backrect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); // Background rectangle
	backrect.setAttribute('class', 'brect');
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
	backrect.setAttribute('width', this.len);
	backrect.setAttribute('height', 10);

	// Perform rotation of background rectangle
	var rotang = Math.acos(this.difx / this.len) * 180 / Math.PI; // Rotation angle of backrect
	rotang = this.dify > 0 ? rotang : 360 - rotang; // Make the angle positive
	var rotate = canvas.createSVGTransform();
	rotate.setRotate(rotang, (x0 + x1) / 2, (y0 + y1) / 2);
	backrect.transform.baseVal.appendItem(rotate);
	this.g.appendChild(backrect);

	this.adjustlength(0);
	this.adjustlength(1);
	this.multiplicity = multiplicity;

	this.render_nodes();
}

ChemBond.counter = 0;

ChemBond.prototype.getNewId = function() {
	return 'b' + ChemBond.counter++;
};

ChemBond.prototype.translate = function() {
	this.adjustlength(0);
	this.adjustlength(1);
	this.renderBond();

	var x0, y0, x1, y1;
	[x0, y0, x1, y1] = this.getnodecenters();
	var backrect = this.g.firstChild;
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
};

ChemBond.prototype.moveterminal = function() {
	var x0, y0, x1, y1;
	[x0, y0, x1, y1] = this.getnodecenters();
	this.difx = x1 - x0;
	this.dify = y1 - y0;
	this.len = veclen(this.difx, this.dify);
	this.shx = -this.dify * bondspace / this.len; // Ortohonal (ACW) shift vector, X
	this.shy = this.difx * bondspace / this.len; // Ortohonal (ACW) shift vector, Y
	
	this.adjustlength(0);
	this.adjustlength(1);
	this.renderBond();

	var backrect = this.g.firstChild;
	backrect.setAttribute('x', (x0 + x1) / 2 - this.len / 2);
	backrect.setAttribute('y', (y0 + y1) / 2 - 5);
	backrect.setAttribute('width', this.len);

	var pathTransform = backrect.transform;
	var rotateTransform = pathTransform.baseVal[0];
	var rotang = Math.acos(this.difx / this.len) * 180 / Math.PI; // Rotation angle of backrect
	rotang = this.dify > 0 ? rotang : 360 - rotang; // Make the angle positive
	rotateTransform.setRotate(rotang, (x0 + x1) / 2, (y0 + y1) / 2);
};

ChemBond.prototype.getnodevec = function(node) {
	if (node == this.nodes[0]) return [this.difx, this.dify];
	else if (node == this.nodes[1]) return [-this.difx, -this.dify];
	else console.log('Invalid node!');
};

ChemBond.prototype.adjustlength = function(node) { // Prevents overlapping of the chemical symbol and bond
	var x0, y0, x1, y1;
	[x0, y0, x1, y1] = this.getnodecenters();
	var curx = node == 0 ? x0 : x1, cury = node == 0 ? y0 : y1;

	if (this.nodes[node].text != '') {
		var textbox = this.nodes[node].g.childNodes[2].getBBox();
		var tb_w = textbox.width;
		var tb_h = textbox.height;

		// Adjust textbox borders
		tb_w += 2;
		tb_h = Math.max(0, tb_h - 2);

		var threshold = tb_h / tb_w;
		var tan = Math.abs(this.dify / (this.difx == 0 ? 0.001 : this.difx));
		var dirtab = [
						[[2, 2],
						 [0, 0]],
						[[3, 1],
						 [3, 1]]
					 ];
		var dir = dirtab[+(tan > threshold)][+(node == 0 ? this.difx > 0 : this.difx < 0)][+(node == 0 ? this.dify < 0 : this.dify > 0)];
		var multab = [[0.5, -0.5, 0.5, 0.5], [-0.5, -0.5, 0.5, -0.5], [-0.5, -0.5, -0.5, 0.5], [-0.5, 0.5, 0.5, 0.5]];
		var mulrow = multab[dir];

		[this['x' + node], this['y' + node]] = line_intersec(x0, y0, x1, y1, curx + mulrow[0] * tb_w, cury + mulrow[1] * tb_h, curx + mulrow[2] * tb_w, cury + mulrow[3] * tb_h);
	}
	else [this['x' + node], this['y' + node]] = [curx, cury]
};

ChemBond.prototype.getnodecenters = function(node=null) {
	if (node == 0) return [
		parseInt(this.nodes[0].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[0].g.firstChild.getAttribute('cy')),
	]
	else if (node == 1) return [
		parseInt(this.nodes[1].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cy')),
	]
	else return [
		parseInt(this.nodes[0].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[0].g.firstChild.getAttribute('cy')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cx')),
		parseInt(this.nodes[1].g.firstChild.getAttribute('cy')),
	]
};

ChemBond.prototype.render_nodes = function() {
	this.nodes[0].renderAtom();
	this.nodes[1].renderAtom();
};

ChemBond.prototype.rotatemultiplicity = function() {
	this.multiplicity = this.multiplicity % 3 + 1;
	this.renderBond();
	this.renderAtom();
};

ChemBond.prototype.renderBond = function() {
	while (this.g.childNodes[1]) this.g.childNodes[1].remove(); // Remove all bond lines
	switch (this.multiplicity) {
		case 1:
			this.drawbondlines(0);
			break;
		case 2:
			var pdshift = this.posdouble();
			this.drawbondlines(-1 + pdshift, 1 + pdshift);
			break;
		case 3:
			this.drawbondlines(-2, 0, 2);
			break;
	}
};

ChemBond.prototype.drawbondlines = function() {
	for (const shiftfactor of arguments) {
		var bondline = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		bondline.setAttribute('class', 'sympoi');
		bondline.setAttribute('style', "fill:none;stroke:#000000;stroke-width:1.1;");
		var linepoints = [
			this.x0 + this.shx * shiftfactor,
			this.y0 + this.shy * shiftfactor,
			this.x1 + this.shx * shiftfactor,
			this.y1 + this.shy * shiftfactor
		]
		if (arguments.length == 2 && Math.abs(shiftfactor) == 2) { // Case of position-shifted double bond
			for (var node = 0; node < 2; node++) {
				curnode = this.nodes[node];
				if (curnode.connections.length >= 2 && curnode.g.childNodes[2].firstChild.nodeValue == '') {
					var x0, y0, x1, y1, angles = [];
					[x0, y0] = this.getnodevec(curnode);
					for (const connection of curnode.connections) {
						var bond = connection.bond;
						if (bond != this) {
							[x1, y1] = bond.getnodevec(curnode);
							angles.push(angle_vec(x0, y0, x1, y1));
						}
					}
					var nodeshiftfactor = shiftfactor > 0 != Boolean(node);
					var theang = nodeshiftfactor ? Math.min(...angles) : Math.max(...angles);
					if (theang != 1 && nodeshiftfactor == theang < 1) {
						var x2, y2, x3, y3;
						[x2, y2] = rotate_vec(x0, y0, theang * Math.PI / 2);
						[x3, y3] = this.getnodecenters(node);
						[linepoints[0 + 2 * node], linepoints[1 + 2 * node]] = line_intersec(...linepoints, x3, y3, x3 + x2, y3 + y2);
					}
				}
			}
		}
		bondline.setAttribute('x1', linepoints[0]);
		bondline.setAttribute('y1', linepoints[1]);
		bondline.setAttribute('x2', linepoints[2]);
		bondline.setAttribute('y2', linepoints[3]);
		this.g.appendChild(bondline);
	}
};

ChemBond.prototype.erase = function() {
	var surbonds = new Set();
	for (var node = 0; node < 2; node++) {
		var curnode = this.nodes[node];
		for (var idx = 0; idx < curnode.connections.length; idx++) {
			if (curnode.connections[idx].bond == this) {
				curnode.connections.splice(idx, 1);
				curnode.renderAtom();
				break;
			}
		}
		surbonds = new Set([...surbonds, ...curnode.connections.map(conn => conn.bond)]);
	}
	this.g.remove();
	delete this.nodes;
	return surbonds;
};

ChemBond.prototype.destruct = function() {
	for (var node = 0; node < 2; node++) {
		var curnode = this.nodes[node];
		for (var idx = 0; idx < curnode.connections.length; idx++) {
			if (curnode.connections[idx].bond == this) {
				curnode.connections.splice(idx, 1);
				break;
			}
		}
	}
	this.g.remove();
	delete this.nodes;
};

ChemBond.prototype.posdouble = function() { // Find the best shift of double bond
	var sinflags = [[0, 0], [0, 0]]; // Flags indicating presence of bonds on each side
	for (var node = 0; node < 2; node++) {
		for (const connection of this.nodes[node].connections) {
			var sin = (this.difx * connection.bond.dify - this.dify * connection.bond.difx) / (this.len * connection.bond.len); // Calculate sin of angle between bonds
			if (connection.bond.nodes[0] != this.nodes[node]) sin *= -1; // Invert sin if the bond starts not from the node, but ends it (i.e. has opposit direction)
			var sinflag = sin > 0.1305 ? 1 : (sin < -0.1305 ? -1 : 0);
			if (sin > 0.1305) sinflags[node][0] = 1;
			else if (sin < -0.1305) sinflags[node][1] = -1;
		}
	}
	var pdshift = sinflags[0][0] + sinflags[0][1] + sinflags[1][0] + sinflags[1][1];
	this.pdshift = pdshift == 0 ? 0 : (pdshift < 0 ? -1 : 1);
	return this.pdshift;
};