// Vertex shader program
var VSHADER_SOURCE =`
attribute vec4 a_Position;
attribute float a_PointSize;
void main() {
	gl_Position = a_Position;
	gl_PointSize = a_PointSize;
}
`;

// Fragment shader program
var FSHADER_SOURCE = `
precision mediump float;
uniform vec4 u_FragColor;
void main() {
  gl_FragColor = u_FragColor;
}
`;

class Point {
	constructor({x, y, size, r, g, b, a}) {
		this.pos = new Float32Array([x, y, 0.0]);
		this.size = size;
		this.color = new Float32Array([r, g, b, a]);
	}
	
	render() {
		gl.vertexAttrib3fv(a_Position, this.pos);
		gl.vertexAttrib1f(a_PointSize, this.size);
		gl.uniform4fv(u_FragColor, this.color);
		gl.drawArrays(gl.POINTS, 0, 1);
	}
}

let canvas, gl, a_Position, u_FragColor, a_PointSize;
let points = [];

function main() {
	setupWebGL();
	setupShaders();
	canvas.addEventListener('mousedown', click);
	render();
}

function setupWebGL() {
	// Retrieve <canvas> element
	canvas = document.getElementById('canvas');

	// Get the rendering context for WebGL
	gl = getWebGLContext(canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}
}

function setupShaders() {
	// Initialize shaders
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// // Get the storage location of a_Position
	a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return;
	}
	
	a_PointSize = gl.getAttribLocation(gl.program, 'a_PointSize');
	if(a_PointSize < 0) {
		console.log('Failed to get the storage location of a_PointSize');
		return;
	}

	// Get the storage location of u_FragColor
	u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
	if (!u_FragColor) {
		console.log('Failed to get the storage location of u_FragColor');
		return;
	}
}

function render() {
	// Specify the color for clearing <canvas>
	gl.clearColor(0.0, 0.0, 0.0, 1.0);

	// Clear <canvas>
	gl.clear(gl.COLOR_BUFFER_BIT);

	for(const point of points) {
		point.render();
	}
}

function click(ev) {
	var x = ev.clientX; // x coordinate of a mouse pointer
	var y = ev.clientY; // y coordinate of a mouse pointer
	var rect = ev.target.getBoundingClientRect();

	x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

	points.push(new Point({x, y, size: 16, r: Math.random()/2+.5, g: Math.random()/2+.5, b: Math.random()/2+.5, a: 1.0}));

	render();
}
