
class Circle {
	constructor({x, y, size, steps, r, g, b, a, angle}) {
		this.color = new Float32Array([r, g, b, a]);
		angle += Math.PI / 2; // have angle 0 point polys corner up

		// special case for 3 steps, since we can just use a single triangle for that
		if(steps === 3) {
			this.buf = new Float32Array(6);
			let theta0 = 0 / steps * Math.PI * 2 + angle;
			let theta1 = 1 / steps * Math.PI * 2 + angle;
			let theta2 = 2 / steps * Math.PI * 2 + angle;
			this.buf[0] = x + Math.cos(theta0) * size / canvas.width;
			this.buf[1] = y + Math.sin(theta0) * size / canvas.height;
			this.buf[2] = x + Math.cos(theta1) * size / canvas.width;
			this.buf[3] = y + Math.sin(theta1) * size / canvas.height;
			this.buf[4] = x + Math.cos(theta2) * size / canvas.width;
			this.buf[5] = y + Math.sin(theta2) * size / canvas.height;
		}
		else {
			this.buf = new Float32Array((3 * 2) + ((steps - 1) * 1 * 2));
			for(let i = 0; i < steps; i++) {
				let theta0 = i / steps * Math.PI * 2 + angle;
				let theta1 = (i+1) / steps * Math.PI * 2 + angle;
				if(i === 0) {
					this.buf[0] = x;
					this.buf[1] = y;
					this.buf[2] = x + Math.cos(theta0) * size / canvas.width;
					this.buf[3] = y + Math.sin(theta0) * size / canvas.height;
					this.buf[4] = x + Math.cos(theta1) * size / canvas.width;
					this.buf[5] = y + Math.sin(theta1) * size / canvas.height;
				}
				else {
					const baseIdx = 6 + (i-1) * 2;	
					this.buf[baseIdx + 0] = x + Math.cos(theta1) * size / canvas.width;
					this.buf[baseIdx + 1] = y + Math.sin(theta1) * size / canvas.height;
				}
			}
		}
	}
	
	render() {
		gl.uniform4fv(u_FragColor, this.color);
		gl.bufferData(gl.ARRAY_BUFFER, this.buf, gl.DYNAMIC_DRAW);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, this.buf.length / 2);
	}
}
