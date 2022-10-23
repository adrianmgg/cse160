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

	// gl.enable(gl.BLEND);
	// gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

	gl.enable(gl.CULL_FACE);
	
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

/** @type {WebGLBuffer} */
let vertexBuffer;
/** @type {WebGLBuffer} */
let indexBuffer;
function setupBuffers() {
	const vert = gl.createBuffer();
	if(vert === null) {
		console.log('failed to create vertex buffer');
		return -1;
	}
	vertexBuffer = vert;
	gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
	gl.enableVertexAttribArray(a_Position);
	gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
	const idx = gl.createBuffer();
	if(idx === null) {
		console.log('failed to create index buffer');
		return -1;
	}
	indexBuffer = idx;
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
}

function clearCanvas() {
	// gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clearColor(.8, .8, .8, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}


// colors
const marColorSkin = Color.fromRGBHex(0xff8bb0);
const marClothesBlue = Color.fromRGBHex(0x4972e5);
const marColorRed = Color.fromRGBHex(0xdb394f);
// non-preset meshes
const cylinderUncapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, false);
const cylinderCapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, true);
// const headMesh = Mesh.UNIT_CUBE_TOUCHING_XY; // for now
const headMesh = new Mesh([
    0.0, 1.5584028959274292, 0.7071067690849304, 0.0, 0.851296067237854, 1.0, 0.0, 0.14418935775756836, 0.7071067690849304, 0.6123725175857544, 1.5584028959274292, 0.35355332493782043, 0.8660255074501038, 0.851296067237854, 0.4999999403953552, 0.6123725175857544, 0.14418935775756836, 0.35355332493782043, 0.6123724579811096, 1.5584028959274292, -0.35355356335639954, 0.866025447845459, 0.851296067237854, -0.6731863021850586, 0.6123724579811096, 0.14418935775756836, -0.5866334438323975, -1.0310358788956364e-07, 1.5584028959274292, -0.7071069478988647, -1.6270823266495427e-07, 0.851296067237854, -1.0268092155456543, -1.0310358788956364e-07, 0.14418935775756836, -0.8802716732025146, 0.0, 0.0, -8.742277657347586e-08, -7.571034643660823e-08, 1.732195496559143, -1.3113414354393171e-07, -0.612372636795044, 1.5584028959274292, -0.3535533845424652, -0.8660255670547485, 0.851296067237854, -0.6731859445571899, -0.612372636795044, 0.14418935775756836, -0.5866333246231079, -0.6123724579811096, 1.5584028959274292, 0.3535535931587219, -0.8660253286361694, 0.851296067237854, 0.5000001788139343, -0.6123724579811096, 0.14418935775756836, 0.3535535931587219
], [
    12, 2, 5, 1, 3, 4, 1, 5, 2, 0, 13, 3, 12, 5, 8, 4, 6, 7, 5, 7, 8, 3, 13, 6, 12, 8, 11, 7, 9, 10, 8, 10, 11, 6, 13, 9, 12, 11, 16, 9, 15, 10, 10, 16, 11, 9, 13, 14, 14, 13, 17, 12, 16, 19, 14, 18, 15, 15, 19, 16, 18, 2, 19, 17, 13, 0, 12, 19, 2, 17, 1, 18, 1, 0, 3, 1, 4, 5, 4, 3, 6, 5, 4, 7, 7, 6, 9, 8, 7, 10, 9, 14, 15, 10, 15, 16, 14, 17, 18, 15, 18, 19, 18, 1, 2, 17, 0, 1
]);
const hatMesh = new Mesh([
    0.8660255074501038, 0.851296067237854, 0.4999999403953552, 0.6123724579811096, 1.5584028959274292, -0.3535535931587219, -1.1920928955078125e-07, 1.5584028959274292, -0.7071069478988647, 0.6123725175857544, 1.5584028959274292, 0.35355332493782043, 0.8660255074501038, 1.029260277748108, 0.878173828125, 0.624752402305603, 1.7029988765716553, -0.30906257033348083, 0.6123725175857544, 1.7029988765716553, 0.3980443775653839, -0.8660256862640381, 0.851296067237854, 0.4999999403953552, -2.384185791015625e-07, 0.851296067237854, 1.0, -0.612372636795044, 1.5584028959274292, -0.3535535931587219, -2.384185791015625e-07, 1.5584028959274292, 0.7071067690849304, -0.6123727560043335, 1.5584028959274292, 0.35355332493782043, -1.7881393432617188e-07, 1.732195496559143, -1.1920928955078125e-07, -0.8660256862640381, 1.029260277748108, 0.878173828125, -2.384185791015625e-07, 0.8957870602607727, 1.3114373683929443, -0.6247526407241821, 1.7029988765716553, -0.3090626001358032, -1.1920928955078125e-07, 1.7029988765716553, -0.6626158952713013, -2.384185791015625e-07, 1.914331316947937, 0.8961937427520752, -0.6123727560043335, 1.7029988765716553, 0.3980443775653839, -1.7881393432617188e-07, 2.0102646350860596, -1.1175870895385742e-07
], [
    3, 8, 0, 1, 3, 0, 2, 12, 1, 3, 12, 10, 3, 1, 12, 4, 17, 6, 5, 4, 6, 16, 5, 19, 6, 17, 19, 6, 19, 5, 0, 5, 1, 8, 4, 0, 1, 16, 2, 8, 11, 7, 9, 7, 11, 2, 9, 12, 11, 10, 12, 11, 12, 9, 13, 17, 14, 15, 18, 13, 16, 19, 15, 18, 19, 17, 18, 15, 19, 7, 15, 13, 8, 13, 14, 16, 9, 2, 3, 10, 8, 4, 14, 17, 0, 4, 5, 8, 14, 4, 1, 5, 16, 8, 10, 11, 13, 18, 17, 7, 9, 15, 8, 7, 13, 16, 15, 9
]);

const rootBone = new Bone(Mat4x4.identity(), .25);
// torso
const torsoBone = new Bone(Mat4x4.identity(), 1.5);
rootBone.tailChildren.push(torsoBone);
const torso = new Model(Mesh.UNIT_ICOSPHERE_TOUCHING_XY, Mat4x4.scale(1.5), marClothesBlue);
torsoBone.headChildren.push(torso);
// upper arms
const armUpperLBone = new Bone(Mat4x4                 .rotateZ(Math.PI / 2 * -1).translate(0.25, 0.25, 0), .5);
const armUpperRBone = new Bone(Mat4x4.rotateX(Math.PI).rotateZ(Math.PI / 2 *  1).translate(0.25, 0.25, 0), .5);
torsoBone.tailChildren.push(armUpperLBone);
torsoBone.tailChildren.push(armUpperRBone);
const arm = new Model(cylinderCapped, Mat4x4.scale(.2, .5, .2).translate(0, 0.5, 0), marColorSkin);
armUpperLBone.headChildren.push(arm);
armUpperRBone.headChildren.push(arm);
// lower arms
const armLowerLBone = new Bone(Mat4x4.identity(), .5);
const armLowerRBone = new Bone(Mat4x4.identity(), .5);
armUpperLBone.tailChildren.push(armLowerLBone);
armUpperRBone.tailChildren.push(armLowerRBone);
armLowerLBone.headChildren.push(arm);
armLowerRBone.headChildren.push(arm);
// hands
const hand = new Model(Mesh.UNIT_ICOSPHERE, Mat4x4.scale(.8), marColorSkin);
const handThing = new Model(cylinderCapped, Mat4x4.translate(0, -.3, 0).scale(.6, .2, .6), marColorRed);
armLowerLBone.tailChildren.push(hand, handThing);
armLowerRBone.tailChildren.push(hand, handThing);
// feet
const footLBone = new Bone(Mat4x4.translate(.1, 0, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (1/4)), 1);
const footRBone = new Bone(Mat4x4.translate(-.1, 0, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (3/4)), 1);
torsoBone.headChildren.push(footLBone);
torsoBone.headChildren.push(footRBone);
const foot = new Model(Mesh.UNIT_ICOSPHERE_TOUCHING_XY, Mat4x4.scale(.6, 1, .8), marColorRed);
footLBone.headChildren.push(foot);
footRBone.headChildren.push(foot);
// head
// TODO which is our forwards direction? theres some conflicting stuff
const headBone = new Bone(Mat4x4.identity(), 1);
torsoBone.tailChildren.push(headBone);
const head = new Model(headMesh, Mat4x4.scale(1.25).translate(0, -.1, 0), marColorSkin);
const hat = new Model(hatMesh, Mat4x4.scale(1.25).translate(0, -.1, 0), marColorRed);
headBone.headChildren.push(head, hat);



const camera = new Camera();

const spinCam = true;
let camTheta = Math.PI * (1/2);

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

	if(spinCam) {
		camTheta += delta / 1000;
	}
	camera.pos = Vec.fromCylindrical(6, camTheta);
	camera.gazeTowards(Vec.ZERO);
	camera.pos.y += 2;
	// camera.pos = Vec.of(0, 2, 6);

	// rootBone.mat = Mat4x4.translate(...Vec.fromPolar(1, curTime / 1000).xyz()).rotateY(-curTime / 1000 - Math.PI / 2);
	// anotherBone.mat = Mat4x4.translate(0, rootBone.length, 0).rotateX((Math.cos(curTime / 1000) / 4 + .25) * Math.PI);

	// cube1.mat = Mat4x4.scale((Math.sin(curTime / 1000) + 1) / 4 + 1);

	// animate
	{
		// torsoBone.animMat = Mat4x4.rotateX(Math.sin(curTime / 1000) / 8 + (1/8));
		const armBounce = easeInOutSine(sawtooth(curTime, 2000));
		armUpperLBone.animMat = Mat4x4.rotateZ(lerp(armBounce, Math.PI * (-2/16), Math.PI * (-1/16)));
		armUpperRBone.animMat = Mat4x4.rotateZ(lerp(armBounce, Math.PI * (-2/16), Math.PI * (-1/16)));
		// armUpperLBone.animMat = Mat4x4.rotateZ(Math.sin(curTime / 1000) / 4 - .2);
		// armUpperRBone.animMat = Mat4x4.rotateZ(Math.sin(curTime / 1000) / 4 - .2);
		// armLowerLBone.animMat = Mat4x4.rotateZ(Math.sin(curTime / 1000) / 4 - .2);
		// armLowerRBone.animMat = Mat4x4.rotateZ(Math.sin(curTime / 1000) / 4 - .2);
		armLowerLBone.animMat = Mat4x4.rotateZ(lerp(armBounce, Math.PI * (-2/8), Math.PI * (0/16)));
		armLowerRBone.animMat = Mat4x4.rotateZ(lerp(armBounce, Math.PI * (-2/8), Math.PI * (0/16)));
	}

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

