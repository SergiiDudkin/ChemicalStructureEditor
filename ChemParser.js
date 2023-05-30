function ChemText(bracket_tree, sub_num=undefined) {
	this.content = [];
	this.index = null;
	this.brackets = [];
}

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

// function buildBracketTree(text_arr) {
// 	var bracket_tree = [];
// 	var bracket_stack = [];
// 	var bracket_content = [];
// 	for (const item of text_arr) {
// 		if (item == '(') bracket_stack.push(item);
// 		(bracket_stack.length ? bracket_content : bracket_tree).push(item)
// 		if (item == ')') {
// 			bracket_stack.pop();
// 			if (!bracket_stack.length) {
// 				bracket_tree.push([bracket_content[0], ...buildBracketTree(bracket_content.slice(1, -1)), ...bracket_content.slice(-1)]);
// 				bracket_content = [];
// 			}
// 		}
// 	}
// 	return bracket_tree;
// }




function buildBracketTree(text_arr) {
	var bracket_tree = [];
	var bracket_stack = [];
	var bracket_content = [];
	var group_obj;
	for (const item of text_arr) {
		// if (bracket_stack.length) {
		// 	if (item == ')') {
		// 		bracket_stack.pop();
		// 		if (!bracket_stack.length) {
		// 			group_obj.brackets.push(item);
		// 			group_obj.content = buildBracketTree(bracket_content);
		// 			bracket_tree.push(group_obj);
		// 			bracket_content = [];
		// 		}
		// 		else {
		// 			bracket_content.push(item);
		// 		}
		// 	}
		// 	else {
		// 		if (item == '(') {
		// 			bracket_stack.push(item);
		// 		}
		// 		bracket_content.push(item);
		// 	}
		// }
		// else {
		// 	if (item == '(') {
		// 		bracket_stack.push(item);
		// 		group_obj = {brackets: [item], count: null};
		// 	}
		// 	else if (/^\d+$/.test(item)) {
		// 		bracket_tree.slice(-1)[0].count = parseInt(item);
		// 	}
		// 	else {
		// 		bracket_tree.push({content: item, brackets: [], count: null});
		// 	}
		// }


		// if (bracket_stack.length) {
		// 	if (item == ')') {
		// 		bracket_stack.pop();
		// 		if (!bracket_stack.length) {
		// 			group_obj.brackets.push(item);
		// 			group_obj.content = buildBracketTree(bracket_content);
		// 			bracket_tree.push(group_obj);
		// 			bracket_content = [];
		// 			continue
		// 		}
		// 	}
		// 	else if (item == '(') bracket_stack.push(item);
		// 	bracket_content.push(item);
		// }
		// else {
		// 	if (item == '(') {
		// 		bracket_stack.push(item);
		// 		group_obj = {brackets: [item], count: null};
		// 	}
		// 	else if (/^\d+$/.test(item)) bracket_tree.slice(-1)[0].count = parseInt(item);
		// 	else bracket_tree.push({content: item, brackets: [], count: null});
		// }


		if (bracket_stack.length) {
			if (item == ')') {
				bracket_stack.pop();
				if (!bracket_stack.length) {
					group_obj.brackets.push(item);
					group_obj.content = buildBracketTree(bracket_content);
					bracket_tree.push(group_obj);
					bracket_content = [];
					continue
				}
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











// function buildGroupTree(branch) {
// 	var group_tree = [];
// 	var group_obj = undefined;
// 	for (var i = 0; i < branch.length; i++) {
// 		var item = branch[i];
// 		if (group_obj === undefined) {
// 			if (atoms.has(item) || residues.has(item)) {
// 				group_obj = {content: item, brackets: [], count: null}
// 			}
// 			if (Array.isArray(item)) {
// 				group_obj = {
// 					content: buildGroupTree(item.slice(1, item.length - 1)),
// 					brackets: [item[0], ...item.slice(-1)],
// 					count: null
// 				}
// 			}
// 		}
// 		else {
// 			if (/^\d+$/.test(item)) group_obj.count = parseInt(item);
// 			else i--;
// 			group_tree.push(group_obj);
// 			group_obj = undefined;
// 		}
// 	}
// 	if (group_obj !== undefined) group_tree.push(group_obj);
// 	return group_tree;
// }

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


// console.log(tokens);

// var text_arr = mergeDigits(tokens);
var bracket_tree = buildBracketTree(tokens);
// var group_tree = buildGroupTree(bracket_tree);

console.log(bracket_tree);

// for (var i = 0; i < 5; i++) {
//     if (i == 2) i++;
//     console.log(i);
// };

