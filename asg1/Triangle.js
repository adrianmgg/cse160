
class Triangle {
	constructor({x, y, size, r, g, b, a}) {
		this.buf = new Float32Array([
			x, y + 0.5 * size / 200,
			x + size * -.5  / 200, y + size * -.5  / 200,
			x + size * .5  / 200, y + size * -0.5  / 200,
		]);
		this.color = new Float32Array([r, g, b, a]);
	}
	
	render() {
		gl.uniform4fv(u_FragColor, this.color);
		drawTriangle(this.buf);
	}
}

function drawTriangle(vertices) {
	// if it's already a float32array there's no point making another one
	const vertsBuf = (vertices instanceof Float32Array) ? vertices : new Float32Array(vertices);
	gl.bufferData(gl.ARRAY_BUFFER, vertsBuf, gl.DYNAMIC_DRAW);
	gl.drawArrays(gl.TRIANGLES, 0, 3);
}
