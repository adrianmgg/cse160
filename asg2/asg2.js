// @ts-check
'use strict';

const PRESERVE_BUFFER = false;

// Vertex shader program
var VSHADER_SOURCE =`
attribute vec4 a_Position;
void main() {
	gl_Position = a_Position;
	gl_PointSize = 32.0;
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

/** @type {WebGLRenderingContext} */
let gl;

let canvas, a_Position, u_FragColor;

function main() {
	setupWebGL();
	setupShaders();
	setupBuffers();
	// initUI();
	// canvas.addEventListener('mousedown', onCanvasMouseDown);
	// canvas.addEventListener('mousemove', onCanvasMouseMove);
	// canvas.addEventListener('mouseout', onCanvasMouseOut);
	// canvas.addEventListener('mouseup', onCanvasMouseUp);
	// renderAll();
	requestAnimationFrame(tick);
}

function setupWebGL() {
	// Retrieve <canvas> element
	canvas = document.getElementById('canvas');

	// Get the rendering context for WebGL
	// gl = getWebGLContext(canvas);
	gl = WebGLUtils.setupWebGL(canvas, {preserveDrawingBuffer: PRESERVE_BUFFER});
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
	
	// a_PointSize = gl.getAttribLocation(gl.program, 'a_PointSize');
	// if(a_PointSize < 0) {
	// 	console.log('Failed to get the storage location of a_PointSize');
	// 	return;
	// }

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
	// gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearColor(.8, .8, .8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
}

// TODO: haven't actually read their instructions on how to write a tick func yet, should probably do that
/**
 * @param {DOMHighResTimeStamp} curTime
 */
function tick(curTime) {
	const b = new Bone(Mat4x4.identity());
	gl.uniform4f(u_FragColor, 1, 0, 0, 1);
	b.render(gl, Mat4x4.identity());
	requestAnimationFrame(tick);
}

// function clearAll() {
// 	clearCanvas();
// 	points = [];
// }

// function renderAll() {
// 	clearCanvas();

// 	for(const point of points) {
// 		point.render();
// 	}
// }

// function pushPoint(point) {
// 	points.push(point);
// 	renderAll();
// }

// function popPoint() {
// 	if(PRESERVE_BUFFER) {
// 		throw 'unsupported';
// 	} else {
// 		points.pop();
// 		renderAll();
// 	}
// }

// function clearPoints() {
// 	points.length = 0; // clear points array in-place
// 	renderAll();
// }

/**
 * @param {MouseEvent} ev
 * @returns {[number, number]}
 */
function mouseevent2canvascoords(ev) {
	let x = ev.clientX;
	let y = ev.clientY;
	let rect = ev.target.getBoundingClientRect();
	x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
	return [x, y];
}

// let curStroke = null;

// function onCanvasMouseDown(ev) {
// 	const [x, y] = mouseevent2canvascoords(ev);

// 	if(paintProgramOptions.mode === 'stamp') {
// 		lastDrawPoint = [x, y];
// 		if(paintProgramOptions.stampOptions.mode === 'ngon') {
// 			pushPoint(new Circle({
// 				x,
// 				y,
// 				size: paintProgramOptions.stampOptions.size,
// 				steps: paintProgramOptions.stampOptions.sides,
// 				color: [...paintProgramOptions.stampOptions.color, paintProgramOptions.stampOptions.alpha],
// 				angle: paintProgramOptions.stampOptions.angle,
// 			}));
// 		}
// 	} else if(paintProgramOptions.mode === 'brush') {
// 		// // TODO if curstroke not null
// 		// curStroke = new BrushStroke();
// 		// pushPoint(curStroke);
// 	}
// }

// /** @type {[number, number] | null} */
// let lastDrawPoint = null;

// /**
//  * @param {MouseEvent} ev
//  */
// function onCanvasMouseMove(ev) {
// 	const [x, y] = mouseevent2canvascoords(ev);
// 	if(paintProgramOptions.mode === 'stamp') {
// 		if(ev.buttons === 0) {
// 			renderAll();
// 			new Circle({
// 				x,
// 				y,
// 				size: paintProgramOptions.stampOptions.size,
// 				steps: paintProgramOptions.stampOptions.sides,
// 				color: [...paintProgramOptions.stampOptions.color, paintProgramOptions.stampOptions.alpha],
// 				angle: paintProgramOptions.stampOptions.angle,
// 			}).render();
// 		} else if(ev.buttons === 1) {
// 			if(lastDrawPoint === null) {
// 				lastDrawPoint = [x, y];
// 			} else {
// 				const dist = Math.sqrt(Math.pow(x - lastDrawPoint[0], 2) + Math.pow(y - lastDrawPoint[1], 2));
// 				if(dist >= 1e-1) {
// 					lastDrawPoint = [x, y];
// 					pushPoint(new Circle({
// 						x,
// 						y,
// 						size: paintProgramOptions.stampOptions.size,
// 						steps: paintProgramOptions.stampOptions.sides,
// 						color: [...paintProgramOptions.stampOptions.color, paintProgramOptions.stampOptions.alpha],
// 						angle: paintProgramOptions.stampOptions.angle,
// 					}));
// 					renderAll();
// 				}
// 			}
// 		}
// 	} else if(paintProgramOptions.mode === 'brush') {
// 		// if(curStroke !== null && ev.buttons === 1) {
// 		// 	curStroke.points.push([x, y]);
// 		// 	renderAll();
// 		// }
// 	}
// }

// /**
//  * @param {MouseEvent} ev
//  */
// function onCanvasMouseOut(ev) {
// 	if(paintProgramOptions.mode === 'stamp') {
// 		renderAll();
// 		lastDrawPoint = null;
// 	}
// }

// /**
//  * @param {MouseEvent} ev
//  */
// function onCanvasMouseUp(ev) {
// 	lastDrawPoint = null;
// }

