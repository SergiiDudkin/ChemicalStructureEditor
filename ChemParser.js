function buildPrefixTree(prefix_tree, words, leaf_type) {
	for (const word of words) {
		var parent;
		var branch = prefix_tree;
		for (const char of word) {
			if (!branch[char]) branch[char] = {children: {}, leaf_type: 0};
			parent = branch[char];
			branch = parent.children;
		}
		parent.leaf_type = leaf_type;
	}
}

function tokenize(formula) {
	var tokens = [];
	var branch = prefix_tree;
	var accum = '';
	var res = null;
	var res_i;
	for (var i = 0; i < formula.length; i++) {
		var char = formula[i];
		if (char in branch) {
			accum += char;
			var parent = branch[char];
			var {children, leaf_type} = parent;
			if (leaf_type) [res, res_i] = [accum, i];
			branch = parent.children;
		}
		else {
			if (!res) throw new Error(`Token ${accum ? accum : char} does not exist!`);
			tokens.push(res);
			branch = prefix_tree;
			accum = '';
			res = null;
			i = res_i;
		}
	}
	tokens.push(res);
	return tokens;
}

function buildBracketTree(text_arr) {
	var bracket_tree = [];
	var bracket_stack = [];
	var bracket_content = [];
	var group_obj;
	for (const item of text_arr) {
		if (bracket_stack.length) {
			if (item == ')') bracket_stack.pop();
			if (!bracket_stack.length) {
				group_obj.brackets.push(item);
				group_obj.content = buildBracketTree(bracket_content);
				bracket_tree.push(group_obj);
				bracket_content = [];
				continue
			}
			bracket_content.push(item);
		}
		else {
			if (item == '(') group_obj = {brackets: [item], count: null};
			else if (/^\d+$/.test(item)) bracket_tree.slice(-1)[0].count = parseInt(item);
			else bracket_tree.push({content: item, brackets: [], count: null});
		}
		if (item == '(') bracket_stack.push(item);
	}
	return bracket_tree;
}

function styleToString(styledict, extras={}) {
	var aug_styledict = Object.assign({...styledict}, extras);
	return Object.entries(aug_styledict).map(entry => entry.join(':')).join(';');
}

function styleText(text_arr, parent, styledict, [x, y]=[0, 0]) {
	var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
	text.setAttribute('x', x);
	text.setAttribute('y', y);
	text.setAttribute('style', styleToString(styledict));
	parent.appendChild(text);

	var font_size = parseInt(styledict['font-size']);
	var dy = font_size / 5;
	var was_dy = false;
	for (var item of text_arr) {
		var is_dy = false;
		if (typeof item === 'object') {
			var flags;
			[item, flags] = Object.entries(item)[0];
			is_dy = flags.includes('s');
		}
		var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
		tspan.appendChild(document.createTextNode(item));
		if (is_dy) tspan.setAttribute('style', `font-size:${font_size * 0.7}px`);
		tspan.setAttribute('dy', (is_dy - was_dy) * dy);
		text.appendChild(tspan);
		was_dy = is_dy;
	}
	return text;
}

function dockText(anchor, satelite, dir) {
	var x = parseInt(anchor.getAttribute('x')); 
	var y = parseInt(anchor.getAttribute('y'));
	var dy = parseInt(anchor.style.fontSize) * 0.9;

	if (dir == 0) x += anchor.getBBox().width;
	else if (dir == 1) x -= satelite.getBBox().width;
	else if (dir == 2) y += dy;
	else if (dir == 3) y -= dy;

	satelite.setAttribute('x', x);
	satelite.setAttribute('y', y);
}


atoms = new Set(['Mg', 'I', 'Br', 'Cl', 'F', 'S', 'N', 'O', 'C', 'H', 'P', 'B', 'Al', 'NCFS']);
residues = new Set(['Me', 'Et', 'Pr', 'Bu', 'Ph']);
punctuation = new Set(['-', ',']);
brackets = new Set(['(', ')']);
digits = new Set([...Array(10).keys()].map(digit => '' + digit));

styledict = {
	'fill': 'black',
	'font-family': 'Arial',
	'font-size': '16px'
}

prefix_tree = {};
buildPrefixTree(prefix_tree, atoms, 1);
buildPrefixTree(prefix_tree, residues, 2);
buildPrefixTree(prefix_tree, punctuation, 3);
buildPrefixTree(prefix_tree, brackets, 4);
buildPrefixTree(prefix_tree, digits, 5);
digit_children = Object.fromEntries([...digits].map(digit => [digit, prefix_tree[digit]]));
digits.forEach(digit => prefix_tree[digit].children = digit_children);



// console.log(prefix_tree);

var tokens = tokenize('(Br(Mg26(SO4)3(NO3)2)3N5)');
// var tokens = tokenize('Al2(SO4)3');

// var tokens = tokenize('O124N94C3');
// var tokens = tokenize('NCFI');

// console.log(tokens);

// var bracket_tree = buildBracketTree(tokens);
// console.log(bracket_tree);
//`fill:${this.color};font-family:'${this.default_font_family}';font-size:${this.default_size * 0.7}px;`



normal_style = styleToString(styledict);
// console.log(normal_style);
italic_style = styleToString(styledict, {'font-style': 'italic'});
// console.log(italic_style);

var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
document.getElementById('utils').appendChild(g);

var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
text.setAttribute('x', 20);
text.setAttribute('y', 40);
text.setAttribute('style', styleToString(styledict));
g.appendChild(text);

var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
tspan.appendChild(document.createTextNode('N'));
text.appendChild(tspan);



drawBBox(text);
// console.log(text);

drawPoint(20, 40, 0.5);
drawPoint(20, 40 - 16, 0.5);

char0end = text.getEndPositionOfChar(0);
drawPoint(char0end.x, char0end.y, 0.5);




anch = styleText(['N'], g, styledict, [20, 70]);
res = styleText(['H', 'S', 'O', {'3': 's'}, {'4': 's'}, 'H'], g, styledict);
// res = styleText(['H'], g, styledict);




dockText(anch, res, 0);

// function dockText(text_arr, parent, anchor, dir) {


// 	var text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
// 	text.setAttribute('x', 0);
// 	text.setAttribute('y', 0);
// 	text.setAttribute('style', styleToString(styledict));
// 	parent.appendChild(text);

// 	var tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
// 	tspan.appendChild(document.createTextNode(text_arr));
// 	text.appendChild(tspan);


// 	var x = anchor.x.baseVal[0].value; 
// 	var y = anchor.y.baseVal[0].value;
// 	var abox = anchor.getBBox();
// 	if (dir == 0) {
// 		x = abox.x + abox.width;
// 	}
// 	if (dir == 1) {
// 		x = abox.x - text.getBBox().width;
// 	}
// 	if (dir == 2) {
// 		y += abox.height * 0.8;
// 	}
// 	if (dir == 3) {
// 		y -= abox.height * 0.8;
// 	}


// 	text.setAttribute('x', x);
// 	text.setAttribute('y', y);

// }

// dockText('N', g, text, 3);

// for (var i = 0; i < 5; i++) {
//     if (i == 2) i++;
//     console.log(i);
// };

// function ChemText(bracket_tree, sub_num=undefined) {
// 	this.content = [];
// 	this.index = null;
// 	this.brackets = [];
// }


// a.dx.baseVal[0].value;


