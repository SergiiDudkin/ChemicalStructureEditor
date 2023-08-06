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
	// ToDo: Fix bug with 'NCFS' token and 'NC' text to parse (missing C)
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
			// var {children, leaf_type} = parent;
			branch = parent.children;
			if (parent.leaf_type) {
				[res, res_i] = [accum, i];
				continue;
			};
			if (i < formula.length - 1) continue;
		}
		// else {
		if (!res) throw new Error(`Token ${accum ? accum : char} does not exist!`);
		tokens.push(res);
		branch = prefix_tree;
		accum = '';
		res = null;
		i = res_i;
		// }
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
			if (item == ')' || item == ']') bracket_stack.pop();
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
			if (item == '(' || item == '[') group_obj = {brackets: [item], count: null};
			else if (/^\d+$/.test(item)) bracket_tree.slice(-1)[0].count = parseInt(item);
			else bracket_tree.push({content: item, brackets: [], count: null});
		}
		if (item == '(' || item == '[') bracket_stack.push(item);
	}
	return bracket_tree;
}

function styleToString(styledict, extras={}) {
	var aug_styledict = Object.assign({...styledict}, extras);
	return Object.entries(aug_styledict).map(entry => entry.join(':')).join(';');
}

function styleText(text_arr, parent, styledict, [x, y]=[0, 0], center=false) {
	// Render text_arr
	// text_arr format:
	// [str, str, ..., {str: format_flag}, ..., str]
	// format_flag == 's' - subscript
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
	if (center) centering(text);
	return text;
}

function dockText(anchor, satelite, dir) {
	// Stack satelite text to the anchor text
	// if (!satelite.length) return;
	// console.log('satelite.length', satelite.length, satelite);

	var x = parseFloat(anchor.getAttribute('x')); 
	var y = parseFloat(anchor.getAttribute('y'));
	var dy = parseFloat(anchor.style.fontSize) * 0.9;

	if (dir == 0) x += anchor.getBBox().width; // R
	else if (dir == 1) x -= satelite.getBBox().width; // L
	else if (dir == 2) y += dy; // D
	else if (dir == 3) y -= dy; // U

	satelite.setAttribute('x', x);
	satelite.setAttribute('y', y);
}

function attachTextArr(anchor, dir, text_arr, parent, styledict) {
	if (text_arr.length) {
		var satelite = styleText(text_arr, parent, styledict);
		dockText(anchor, satelite, dir);
		return satelite;
	}
}

function flattenBracketTree(bracket_tree, rev=false) {
	var text_arr=[];
	for (var {brackets, content, count} of bracket_tree) {
		var appendix = [];
		if (brackets.length) appendix.push(brackets[0]);
		if (content instanceof Array) {
			var nested_text_arr = flattenBracketTree(content, rev);
			if (rev) nested_text_arr.reverse();
			appendix.push(...nested_text_arr)
		}
		else appendix.push(content);
		if (brackets.length) appendix.push(brackets[1]);
		if (count !== null) appendix.push({[count.toString()]: 's'});
		if (rev) appendix.reverse();
		text_arr.push(...appendix);
	}
	return text_arr
}

function firstElemIdx(bracket_tree) {
	var branch = bracket_tree;
	var brackets_cnt = 0;
	var subscript_cnt = 0;
	while (true) {
		if (branch[0].brackets.length) brackets_cnt++;
		if (branch[0].count !== null) subscript_cnt++;
		if (branch[0].content instanceof Array) branch = branch[0].content;
		else break;
	}
	return [brackets_cnt, subscript_cnt, branch[0].count !== null];
}

function centering(text) {
	text.setAttribute('x', parseFloat(text.getAttribute('x')) - text.getBBox().width / 2);
	text.setAttribute('y', parseFloat(text.getAttribute('y')) + parseFloat(text.style.fontSize) * 0.36);
	// text.setAttribute('id', 'my_text');
	// console.log(text);
	// drawBBox(text);
	// var {x, y} = text.getStartPositionOfChar(0);
	// drawPoint(x, y, 0.5);
	// console.log(x, text.getAttribute('x'));
}

function textTermBuilder(bracket_tree, parent, dir, styledict, [x, y]) {
	var rev = dir == 1;
	var text_arr = flattenBracketTree(bracket_tree, rev);
	var [brackets_cnt, subscript_cnt, has_1st_subscript] = firstElemIdx(bracket_tree);

	if (dir == 0) {
		var anch = styleText([text_arr[brackets_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 1, text_arr.slice(0, brackets_cnt), parent, styledict); // l_sat
		attachTextArr(anch, 0, text_arr.slice(brackets_cnt + 1), parent, styledict); // r_sat
	} // R
	else if (dir == 1) {
		var both_cnt = brackets_cnt + subscript_cnt;
		var anch = styleText([text_arr[both_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 0, text_arr.slice(0, both_cnt).reverse(), parent, styledict); // r_sat
		attachTextArr(anch, 1, text_arr.slice(both_cnt + 1).reverse(), parent, styledict); // l_sat
	} // L
	else if (dir == 2 || dir == 3) {
		var anch = styleText([text_arr[brackets_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 1, text_arr.slice(0, brackets_cnt), parent, styledict); // l_sat
		if (has_1st_subscript) attachTextArr(anch, 0, [text_arr[brackets_cnt + 1]], parent, styledict); // r_sat
		var vl_brackets = [];
		var ptr = brackets_cnt + has_1st_subscript;
		while (['(', '['].includes(text_arr[++ptr])) vl_brackets.push(text_arr[ptr]);
		var v_sat = attachTextArr(anch, dir, text_arr.slice(ptr), parent, styledict); // v_sat
		attachTextArr(v_sat, 1, vl_brackets, parent, styledict); // vl_sat
	} // D, U
}


atoms = new Set(['Mg', 'I', 'Br', 'Cl', 'F', 'S', 'N', 'O', 'C', 'H', 'P', 'B', 'Al', 'NCFS']);
residues = new Set(['Me', 'Et', 'Pr', 'Bu', 'Ph']);
punctuation = new Set(['-', ',']);
brackets = new Set(['(', ')', '[', ']']);
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

// var tokens = tokenize('(Br(Mg26(SO4)3(NO3)2)3N5)');
// var tokens = tokenize('((N2)5CH3)');
// var tokens = tokenize('N(CH2)5COOH');
var tokens = tokenize('CHSO3Cl');
// var tokens = tokenize('(H2(N3))');
// var tokens = tokenize('Al2(SO4)3');

// var tokens = tokenize('O124N94C3');
// var tokens = tokenize('NCFI');

console.log(tokens);

var bracket_tree = buildBracketTree(tokens);
console.log(bracket_tree);
var flat = flattenBracketTree(bracket_tree, rev=false);
console.log(flat);
var [brackets_cnt, subscript_cnt, has_1st_subscript] = firstElemIdx(bracket_tree);
console.log(brackets_cnt, subscript_cnt, has_1st_subscript);

var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
document.getElementById('utils').appendChild(g);

textTermBuilder(bracket_tree, g, 2, styledict, [180, 150])
drawPoint(180, 150);

// console.log(JSON.stringify(bracket_tree));
//`fill:${this.color};font-family:'${this.default_font_family}';font-size:${this.default_size * 0.7}px;`



normal_style = styleToString(styledict);
// console.log(normal_style);
italic_style = styleToString(styledict, {'font-style': 'italic'});
// console.log(italic_style);


/*
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
// res = styleText(['H', 'S', 'O', {'3': 's'}, {'4': 's'}, 'H'], g, styledict);
res = styleText(['HSO', {'34': 's'}, 'H'], g, styledict);
// res = styleText(['H'], g, styledict);


dockText(anch, res, 0);


// styleText(flat.reverse(), g, styledict, [180, 70]);
styleText(flat, g, styledict, [180, 70]);
*/



// var text_arr = buildBracketTree(tokenize('NHSO34H'));
// console.log(text_arr);
// console.log(JSON.stringify(text_arr));
// res2 = styleText(text_arr, g, styledict);
// dockText(anch, res2, 0);


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


