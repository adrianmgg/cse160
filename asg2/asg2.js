// @ts-check
'use strict';

const PRESERVE_BUFFER = false;

// Vertex shader program
var VSHADER_SOURCE =`
uniform mat4 u_ModelMat;
attribute vec3 a_Position;
void main() {
	gl_Position = u_ModelMat * vec4(a_Position, 1.0);
	gl_PointSize = 8.0;
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

let canvas, a_Position, u_FragColor, u_ModelMat;

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

	gl.enable(gl.DEPTH_TEST);
	
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

	u_ModelMat = gl.getUniformLocation(gl.program, 'u_ModelMat');
	if (!u_ModelMat) {
		console.log('Failed to get the storage location of u_ModelMat');
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
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
}

function clearCanvas() {
	// gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearColor(.8, .8, .8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}



const rootBone = new Bone(Mat4x4.identity());
const anotherBone = new Bone(Mat4x4.translate(0, rootBone.length, 0));
anotherBone.length = 2;
rootBone.children.push(anotherBone);
anotherBone.children.push(new Mesh(
	new Float32Array([
		1, 1, 1,
		-1, 1, 1,
		-1, -1, 1,
		1, -1, 1,
		1, -1, -1,
		1, 1, -1,
		-1, 1, -1,
		-1, -1, -1,
	].map(n => n / 2)),
	new Uint16Array([
		0, 1, 2, 0, 2, 3, // front
		0, 3, 4, 0, 4, 5, // right
		0, 5, 6, 0, 6, 1, // up
		1, 6, 7, 1, 7, 2, // left
		7, 4, 3, 7, 3, 2, // down
		4, 7, 6, 4, 6, 5, // back
	]),
));
const camera = new Camera();

/** @type {number | DOMHighResTimeStamp} */
let prevTickTime = 0;
// TODO: haven't actually read their instructions on how to write a tick func yet, should probably do that
/**
 * @param {DOMHighResTimeStamp} curTime
 */
function tick(curTime) {
	clearCanvas();
	const delta = curTime - prevTickTime;
	// ==== DON'T INSERT ANYTHING ELSE IN tick() BEFORE THIS LINE! ====

	// camera.pos = Vec.fromPolar(6, curTime / 1000);
	// camera.gazeTowards(Vec.ZERO);
	// camera.pos = camera.pos.transform(Mat4x4.translate(0, 2, 0));
	camera.pos = Vec.of(0, 2, 6);

	rootBone.mat = Mat4x4.translate(...Vec.fromPolar(1, curTime / 1000).xyz()).rotateY(-curTime / 1000 - Math.PI / 2);
	anotherBone.mat = Mat4x4.translate(0, rootBone.length, 0).rotateX((Math.cos(curTime / 1000) / 4 + .25) * Math.PI);

	// gl.uniform4f(u_FragColor, 1, 0, 0, 1);
	rootBone.render(gl, camera.world2viewMat());

	// ==== DON'T INSERT ANYTHING ELSE IN tick() AFTER THIS LINE! ====
	prevTickTime = curTime;
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

