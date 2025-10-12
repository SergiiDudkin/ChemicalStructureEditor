import {checkIntersec} from './Geometry.js';


function detectIntersec(exclude=[]) {
	const intersections = [];
	const bond_group = Array.from(document.getElementById('sensors_b').children).map(el => el.objref).filter(bond =>
		!exclude.includes(bond.id));
	bond_group.sort((a, b) => a.min_x < b.min_x ? -1 : 1);
	for (const [i, bond0] of Object.entries(bond_group)) {
		let j = parseInt(i);
		let bond1 = bond_group[++j];
		while (j < bond_group.length && bond1.min_x < bond0.max_x) {
			if (bond1.min_y < bond0.max_y && bond0.min_y < bond1.max_y &&
				checkIntersec(...[...bond0.nodes, ...bond1.nodes].map(node => node.xy))
			) intersections.push([bond0.id, bond1.id].sort((a, b) => parseInt(a.slice(1)) -
				parseInt(b.slice(1))).join('&'));
			bond1 = bond_group[++j];
		}
	}
	return intersections;
}

function getCutouts() {
	const old_masks = [];
	for (const mask of [...document.getElementById('bondcutouts').children]) {
		for (const polygon of [...mask.children]) {
			if (polygon.tagName != 'polygon') continue;
			old_masks.push(mask.id.slice(1) + '&' + polygon.classList[0].slice(1));
		}
	}
	return old_masks;
}

export function refreshBondCutouts(exclude=[]) {
	let lower_bond, upper_bond;
	const set_new = new Set(detectIntersec(exclude));
	const set_old = new Set(getCutouts());

	// Add masks
	const masks_to_add = [...set_new].filter(new_mask => !set_old.has(new_mask));
	for (const mask of masks_to_add) {
		[lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
		lower_bond.createSubmask(upper_bond);
	}

	// Remove masks
	const masks_to_remove = [...set_old].filter(old_mask => !set_new.has(old_mask));
	for (const mask of masks_to_remove) {
		[lower_bond, upper_bond] = mask.split('&').map(id => document.getElementById(id).objref);
		lower_bond.deleteSubmask(upper_bond);
	}
}
