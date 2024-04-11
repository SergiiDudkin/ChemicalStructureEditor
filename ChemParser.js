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
	var accum = ''; // Char container to assemble a token
	var token = null; // Assembled token
	var saved_i; // i after the last complete token
	for (var i = 0; i < formula.length; i++) {
		var char = formula[i];
		if (char in branch) {
			accum += char;
			var parent = branch[char];
			branch = parent.children;
			if (parent.leaf_type) {
				[token, saved_i] = [accum, i];
				continue;
			};
			if (i < formula.length - 1) continue;
		}
		if (!token) throw new Error(`Token ${accum ? accum : char} does not exist!`);
		tokens.push(token);
		branch = prefix_tree;
		accum = '';
		token = null;
		i = saved_i;
	}
	if (token) tokens.push(token);
	return tokens;
}

function buildBracketTree(tokens) {
	var bracket_tree = [];
	var bracket_stack = [];
	var bracket_content = [];
	var group_obj, popped;
	for (const item of tokens) {
		if (bracket_stack.length) {
			if (item == ')' || item == ']') {
				popped = bracket_stack.pop();
				if (popped != bracket_pairs[item]) throw new Error(`"${popped}" and "${item}" mismatch!`);
			}
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
			else if (item == ')' || item == ']') throw new Error('Closing bracket before the opening one!');
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
	var text = attachSvg(parent, 'text', {x: x, y: y, style: styleToString(styledict), class: 'chemtxt sympoi'});

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
		if (is_dy != was_dy) tspan.setAttribute('dy', (is_dy - was_dy) * dy);
		text.appendChild(tspan);
		was_dy = is_dy;
	}
	if (center) centering(text);
	return text;
}

function dockText(anchor, satelite, dir) {
	// Stack satelite text to the anchor one
	var x = parseFloat(anchor.getAttribute('x')); 
	var y = parseFloat(anchor.getAttribute('y'));
	var dy = parseFloat(anchor.style.fontSize) * 0.8;

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
	text.setAttribute('y', parseFloat(text.getAttribute('y')) + parseFloat(text.style.fontSize) * 0.34);
}

function textTermBuilder(bracket_tree, parent, dir, styledict, [x, y]) {
	var rev = dir == 1;
	var text_arr = flattenBracketTree(bracket_tree, rev);
	var [brackets_cnt, subscript_cnt, has_1st_subscript] = firstElemIdx(bracket_tree);

	if (dir == 0) { // R
		var anch = styleText([text_arr[brackets_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 1, text_arr.slice(0, brackets_cnt), parent, styledict); // l_sat
		attachTextArr(anch, 0, text_arr.slice(brackets_cnt + 1), parent, styledict); // r_sat
	}
	else if (dir == 1) { // L
		var both_cnt = brackets_cnt + subscript_cnt;
		var anch = styleText([text_arr[both_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 0, text_arr.slice(0, both_cnt).reverse(), parent, styledict); // r_sat
		attachTextArr(anch, 1, text_arr.slice(both_cnt + 1).reverse(), parent, styledict); // l_sat
	}
	else if (dir == 2 || dir == 3) { // D, U
		var anch = styleText([text_arr[brackets_cnt]], parent, styledict, [x, y], true);
		attachTextArr(anch, 1, text_arr.slice(0, brackets_cnt), parent, styledict); // l_sat
		if (has_1st_subscript) attachTextArr(anch, 0, [text_arr[brackets_cnt + 1]], parent, styledict); // r_sat
		var vl_brackets = [];
		var ptr = brackets_cnt + has_1st_subscript;
		while (['(', '['].includes(text_arr[++ptr])) vl_brackets.push(text_arr[ptr]);
		var v_sat = attachTextArr(anch, dir, text_arr.slice(ptr), parent, styledict); // v_sat
		attachTextArr(v_sat, 1, vl_brackets, parent, styledict); // vl_sat
	}
}


// MolInfo helpers
function sumFormula(formula_a, formula_b) {
	var merged = {...formula_a};
	for (const [atom, count] of Object.entries(formula_b)) {
		if (!(atom in merged)) merged[atom] = 0;
		merged[atom] += count;
	}
	return merged;
}

function mulFormula(formula, factor) {
	return Object.fromEntries(Object.entries(formula).map(([atom, count]) => [atom, count * factor]));
}

function tokenToFormula(token) {
	return token in residue_formulae ? residue_formulae[token] : {[token]: 1};
}

function treeToFormula(bracket_tree, formula={}) {
	for (const group_obj of bracket_tree) {
		formula = sumFormula(formula, 
			mulFormula(
				group_obj.content instanceof Array ?
				treeToFormula(group_obj.content) : 
				tokenToFormula(group_obj.content), 
				group_obj.count === null ? 1 : group_obj.count
			)
		);
	}
	return formula;
}

function separateUnrecognized(formula) {
	var recognized = Object.fromEntries(Object.entries(formula).filter(([el, cnt]) => el in std_atomic_weights));
	var unrecognized = Object.fromEntries(Object.entries(formula).filter(([el, cnt]) => !(el in std_atomic_weights)));
	return [recognized, unrecognized];
}

function formulaToFw(formula) {
	return Math.round(Object.entries(formula)
	.map(([el, cnt]) => std_atomic_weights[el] * cnt)
	.reduce((acc, val) => acc + val, 0) * 1e12) / 1e12;
}

function toHillSystem(formula) {
	var hill_arr = [];
	el_set = new Set(Object.keys(formula));
	if ('C' in formula) {
		hill_arr.push(['C', formula.C]);
		el_set.delete('C');
		if ('H' in formula) {
			hill_arr.push(['H', formula.H]);
			el_set.delete('H');
		}
	}
	[...el_set].toSorted().forEach(el => hill_arr.push([el, formula[el]]));
	return hill_arr;
}

function hillToStr(hill_arr) {
	return hill_arr.map(([el, cnt]) => el + (cnt > 1 ? cnt : '')).join('');
}

function computeElementalComposition(formula) {
	var fw = formulaToFw(formula);
	return toHillSystem(formula).map(([el, cnt]) => [el, std_atomic_weights[el] * cnt / fw]);
}


var bracket_pairs = {')': '(', ']': '['};
var punctuation = new Set(['-', ',']);
var brackets = new Set(['(', ')', '[', ']']);
var digits = new Set([...Array(10).keys()].map(digit => '' + digit));

styledict = {
	'fill': 'black',
	'font-family': 'Arial',
	'font-size': '16px'
}


prefix_tree = {};
buildPrefixTree(prefix_tree, Object.keys(std_atomic_weights), 1);
buildPrefixTree(prefix_tree, Object.keys(residue_formulae), 2);
buildPrefixTree(prefix_tree, punctuation, 3);
buildPrefixTree(prefix_tree, brackets, 4);
buildPrefixTree(prefix_tree, digits, 5);
digit_children = Object.fromEntries([...digits].map(digit => [digit, prefix_tree[digit]]));
digits.forEach(digit => prefix_tree[digit].children = digit_children);
