
class Circle {
	constructor({x, y, size, steps, r, g, b, a, angle}) {
		this.color = new Float32Array([r, g, b, a]);
		// TODO do triangle strips or w/e rather than all full triangles
		this.buf = new Float32Array(steps * 3 * 2);
		angle += Math.PI / 2; // have angle 0 point polys corner up
		for(let i = 0; i < steps; i++) {
			let theta0 = i / steps * Math.PI * 2 + angle;
			let theta1 = (i+1) / steps * Math.PI * 2 + angle;
			const baseIdx = i * 3 * 2;
			this.buf[baseIdx + 0] = x;
			this.buf[baseIdx + 1] = y;
			this.buf[baseIdx + 2] = x + Math.cos(theta0) * size * 2 / canvas.width;
			this.buf[baseIdx + 3] = y + Math.sin(theta0) * size * 2 / canvas.height;
			this.buf[baseIdx + 4] = x + Math.cos(theta1) * size * 2 / canvas.width;
			this.buf[baseIdx + 5] = y + Math.sin(theta1) * size * 2 / canvas.height;
		}
	}
	
	render() {
		gl.uniform4fv(u_FragColor, this.color);
		gl.bufferData(gl.ARRAY_BUFFER, this.buf, gl.DYNAMIC_DRAW);
		gl.drawArrays(gl.TRIANGLES, 0, this.buf.length / 2);
	}
}
