// Geometry utilities
function lineIntersec([x1, y1], [x2, y2], [x3, y3], [x4, y4]) { // Find intersection point of two lines
	var a = x1 * y2 - y1 * x2;
	var b = x3 - x4;
	var c = x1 - x2;
	var d = x3 * y4 - y3 * x4;
	var e = y3 - y4;
	var f = y1 - y2;
	var g = c * e - f * b;
	if (g == 0) {
		throw new Error('Non-intersecting lines!');
	};
	var ipoi_y = (a * e - f * d) / g; // Intersection point, x value
	var ipoi_x = (a * b - c * d) / g; // Intersection point, y value
	return [ipoi_x, ipoi_y];
}

function sqVecLen([x, y]) { // Find squired length of vector
	return x * x + y * y;
}

function vecLen(xy) { // Find length of vector
	return Math.sqrt(sqVecLen(xy));
}

function findDist(xy0, xy1) { // Find distance between two points
	return vecLen(vecDif(xy0, xy1));
}

function unitVec(xy) { // Find unit vector
	return vecDiv(xy, vecLen(xy));
}

function vecSum([x0, y0], [x1, y1]) { // Add vectors
	return [x0 + x1, y0 + y1];
}

function vecDif([x0, y0], [x1, y1]) { // Subtract vectors
	return [x1 - x0, y1 - y0];
}

function vecMul([x, y], factor) { // Multiply vector by scalar value
	return [x * factor, y * factor];
}

function vecDiv([x, y], divisor) { // Divide vector by scalar value
	return [x / divisor, y / divisor];
}

function vecDotProd([x0, y0], [x1, y1]) { // Find dot product
	return x0 * x1 + y0 * y1;
}

function vecCrossProd([x0, y0], [x1, y1]) { // Find dot product
	return x0 * y1 - x1 * y0;
}

function clampSinCos(val) {
	return Math.min(Math.max(val, -1), 1); // Clamp sin or cos against calculation noise
}

function cosVec(xy0, xy1) { // Find cos between two vectors
	return clampSinCos(vecDotProd(xy0, xy1) / (vecLen(xy0) * vecLen(xy1)));
}

function sinVec(xy0, xy1) { // Find sin between two vectors
	return clampSinCos(vecCrossProd(xy0, xy1) / (vecLen(xy0) * vecLen(xy1)));
}

function angleVec(xy0, xy1) { // Calculate angle (in rad*pi) between two vectors
	var angle = Math.atan2(vecCrossProd(xy0, xy1), vecDotProd(xy0, xy1));
	return (angle / Math.PI + 2) % 2;
}

function rotateVec([x, y], angle) { // Rotate vector
	var cosa = Math.cos(angle);
	var sina = Math.sin(angle);
	var newx = x * cosa - y * sina;
	var newy = x * sina + y * cosa;
	return [newx, newy];
}

function rot90cw([x, y]) {
	return [-y, x];
}

function rot90acw([x, y]) {
	return [y, -x];
}

function rotateAroundCtr(pt, rot_angle, rot_ctr) {
	var old_casted_pt = vecDif(rot_ctr, pt);
	var new_casted_pt = rotateVec(old_casted_pt, rot_angle);
	var moving_vec = vecDif(old_casted_pt, new_casted_pt);
	return vecSum(pt, moving_vec);
}

function scaleAroundCtr(pt, scale_factor, scale_ctr) {
	var old_casted_pt = vecDif(scale_ctr, pt);
	var new_casted_pt = vecMul(old_casted_pt, scale_factor);
	var moving_vec = vecDif(old_casted_pt, new_casted_pt);
	return vecSum(pt, moving_vec);
}

function stretchAlongDir(pt, stretch_factor, dir_angle, stretch_ctr) {
	var casted_pt = rotateVec(vecDif(stretch_ctr, pt), -dir_angle);
	casted_pt[0] *= stretch_factor;
	return vecSum(rotateVec(casted_pt, dir_angle), stretch_ctr);
}


function angleBisector(xy0, xy1) { // Not normalized, no direction control
	if (vecDotProd(xy0, xy1) < 0) { // If obtuse angle, rotate vectors 90 deg towards each other for better precision
		xy0 = rot90cw(xy0);
		xy1 = rot90acw(xy1);
	}
	return vecSum(unitVec(xy0), unitVec(xy1));
}

function polygonAngle(num) {
	return Math.PI * (1 - 2 / num);
}

function polygonEdgeCtrDist(angle, side_len) {
	return side_len * Math.tan(angle / 2) / 2;
}

function polygonVertexCtrDist(angle, side_len) {
	return side_len / Math.cos(angle / 2) / 2;
}

function getAngleSigns(a_xy0, a_xy1, b_xy0, b_xy1) {
	var vec_a = vecDif(a_xy0, a_xy1);
	var vec_b = vecDif(b_xy0, b_xy1);
	var sign_a1_a0_b0 = Math.sign(sinVec(vec_a, vecDif(a_xy0, b_xy0)));
	var sign_a1_a0_b1 = Math.sign(sinVec(vec_a, vecDif(a_xy0, b_xy1)));
	var sign_b1_b0_a0 = Math.sign(sinVec(vec_b, vecDif(b_xy0, a_xy0)));
	var sign_b1_b0_a1 = Math.sign(sinVec(vec_b, vecDif(b_xy0, a_xy1)));
	return [sign_a1_a0_b0, sign_a1_a0_b1, sign_b1_b0_a0, sign_b1_b0_a1];
}

function checkIntersec(a_xy0, a_xy1, b_xy0, b_xy1) {
	var angle_signs = getAngleSigns(a_xy0, a_xy1, b_xy0, b_xy1);
	var no_zero_angle = !angle_signs.some(sign => sign == 0);
	var no_common_terminals = !angle_signs.some(sign => Number.isNaN(sign));
	var [sign_a1_a0_b0, sign_a1_a0_b1, sign_b1_b0_a0, sign_b1_b0_a1] = angle_signs;
	var has_common_point = (sign_a1_a0_b0 != sign_a1_a0_b1) && (sign_b1_b0_a0 != sign_b1_b0_a1);
	return has_common_point && no_zero_angle && no_common_terminals;
}
