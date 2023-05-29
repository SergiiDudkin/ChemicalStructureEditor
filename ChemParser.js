function ChemText(bracket_tree, sub_num=undefined) {
	this.content = [];
	this.index = null;
	this.brackets = null;
	// for (var i = 0; i < tokens.length; i++) {
	// 	token = tokens[i];
	// }
	// for (const item of bracket_tree) {

	// }

}

// ChemText.prototype.tokenize = function(text, idx) {
// 	var branch = prefix_tree;
// 	var key;
// 	for (var i; i < text.length; i++) {
// 		key = text[i];
// 		if (key in branch)
// 		branch[text[i]]
// 	}
// }

atoms = new Set(['Mg', 'I', 'Br', 'Cl', 'F', 'S', 'N', 'O', 'C', 'H', 'P', 'B', 'Al']);
residues = new Set(['Me', 'Et', 'Pr', 'Bu', 'Ph']);
punctuation = new Set(['-', ',']);
brackets = new Set(['(', ')']);
digits = new Set([...Array(10).keys()].map(digit => '' + digit));


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
	for (var i = 0; i < formula.length; i++) {
		var char = formula[i];
		if (char in branch) {
			accum += char;
			var parent = branch[char];
			var {children, leaf_type} = parent;
			if (leaf_type) res = accum;
			branch = parent.children;
		}
		else {
			if (!res) throw new Error(`Token ${accum ? accum : char} does not exist!`);
			tokens.push(res);
			branch = prefix_tree;
			accum = '';
			res = null;
			i--;
		}
	}
	tokens.push(res);
	return tokens;
}

// function mergeDigits(tokens) {
// 	var text_arr = [];
// 	var digit_accum = '';
// 	for (const token of tokens) {
// 		if (digits.has(token)) {
// 			digit_accum += token;
// 		}
// 		else {
// 			if (digit_accum) {
// 				text_arr.push(parseInt(digit_accum));
// 				digit_accum = '';
// 			}
// 			text_arr.push(token);
// 		}
// 	}
// 	if (digit_accum) text_arr.push(parseInt(digit_accum));
// 	return text_arr;
// }

function buildBracketTree(text_arr) {
	var bracket_tree = [];
	var bracket_stack = [];
	var bracket_content = [];
	for (const item of text_arr) {
		if (item == '(') bracket_stack.push(item);
		(bracket_stack.length ? bracket_content : bracket_tree).push(item)
		if (item == ')') {
			bracket_stack.pop();
			if (!bracket_stack.length) {
				var cl_brack = bracket_content.pop();
				bracket_tree.push([bracket_content[0], ...buildBracketTree(bracket_content.slice(1)), cl_brack]);
				bracket_content = [];
			}
		}
	}
	return bracket_tree;
}

function buildGroupTree(branch) {
	var group_tree = [];
	var group_obj = undefined;
	for (var i = 0; i < branch.length; i++) {
		var item = branch[i];
		if (group_obj === undefined) {
			if (atoms.has(item) || residues.has(item)) {
				group_obj = {content: item, brackets: null, count: null}
			}
			if (Array.isArray(item)) {
				group_obj = {
					content: buildGroupTree(item.slice(1, item.length - 1)),
					brackets: item[0],
					count: null
				}
			}
		}
		else {
			// if (typeof(item) == 'number') group_obj.count = item;
			if (/^\d+$/.test(item)) group_obj.count = parseInt(item);
			else i--;
			group_tree.push(group_obj);
			group_obj = undefined;
		}
	}
	if (group_obj !== undefined) group_tree.push(group_obj);
	return group_tree;
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


console.log(tokens);

// var text_arr = mergeDigits(tokens);
var bracket_tree = buildBracketTree(tokens);
var group_tree = buildGroupTree(bracket_tree);

console.log(group_tree);

// for (var i = 0; i < 5; i++) {
//     if (i == 2) i++;
//     console.log(i);
// };

