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

let canvas, gl, a_Position, u_FragColor, a_PointSize;
let points = [];

function main() {
	setupWebGL();
	setupShaders();
	setupBuffers();
	canvas.addEventListener('mousedown', click);
	renderAll();
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
	
	clearCanvas();
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

function setupBuffers() {
	const vertexBuffer = gl.createBuffer();
	if(!vertexBuffer) {
		console.log('failed to create vertex buffer');
		return -1;
	}
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.enableVertexAttribArray(a_Position);
	gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
}

function clearCanvas() {
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

function renderAll() {
	clearCanvas();

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
	
	const point = new Point({x, y, size: 16, r: Math.random()/2+.5, g: Math.random()/2+.5, b: Math.random()/2+.5, a: 1.0});
	const tri = new Triangle({x, y, size: 16, r: Math.random()/2+.5, g: Math.random()/2+.5, b: Math.random()/2+.5, a: 1.0});
	const circ = new Circle({x, y, size: 16, steps: Math.floor(Math.random() * 9 + 3), r: Math.random()/2+.5, g: Math.random()/2+.5, b: Math.random()/2+.5, a: 1.0, angle: 0.0});
	// const circ = new Circle({x, y, size: 16, steps: 3, r: Math.random()/2+.5, g: Math.random()/2+.5, b: Math.random()/2+.5, a: 1.0, angle: 0.0});

	// points.push(point);
	points.push((Math.random() < 0.5) ? point : circ);
	// points.push(circ);
	
	renderAll();
}
