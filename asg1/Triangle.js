
class Triangle extends Circle {
	constructor({x, y, size, r, g, b, a}) {
		super({x, y, size, r, g, b, a, steps: 3});
	}
}

// (this now unused, since i just handle triangles as a 3 point circle)
function drawTriangle(vertices) {
	// if it's already a float32array there's no point making another one
	const vertsBuf = (vertices instanceof Float32Array) ? vertices : new Float32Array(vertices);
	gl.bufferData(gl.ARRAY_BUFFER, vertsBuf, gl.DYNAMIC_DRAW);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
}
