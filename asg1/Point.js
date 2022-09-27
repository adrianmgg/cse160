
class Point {
	constructor({x, y, size, r, g, b, a}) {
		this.pos = new Float32Array([x, y, 0.0]);
		this.size = size;
		this.color = new Float32Array([r, g, b, a]);
	}
	
	render() {
		gl.bufferData(gl.ARRAY_BUFFER, this.pos, gl.DYNAMIC_DRAW);
		gl.vertexAttrib1f(a_PointSize, this.size);
		gl.uniform4fv(u_FragColor, this.color);
		gl.drawArrays(gl.POINTS, 0, 1);
	}
}
