
class BrushStroke {
    constructor() {
        this.points = [];
    }

    render() {
        if(this.points.length > 2) {
            const buf = new Float32Array(1 + 1 + (2 * 2 * (this.points.length -  2)));
            buf[0] = this.points[0][1];
            buf[1] = this.points[0][0];
            for(let i = 1; i < this.points.length; i++) {
                const baseidx = ((i - 1) * 4) + 1;
                // currently the angle is just hardcoded, should be either stored on the stroke or auto-computed when building the mesh
                buf[baseidx + 0] = this.points[i][1] - 1e-2;
                buf[baseidx + 1] = this.points[i][0];
                buf[baseidx + 2] = this.points[i][1] + 1e-2;
                buf[baseidx + 3] = this.points[i][0];
            }
            buf[buf.length - 1] = this.points[this.points.length - 1][1];
            buf[buf.length    ] = this.points[this.points.length - 1][0];
            // gl.uniform4fv(u_FragColor, this.color);
            gl.uniform4f(u_FragColor, 1, 0, 0, 1);
            gl.bufferData(gl.ARRAY_BUFFER, buf, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, buf.length / 2);
        }
    }
}
