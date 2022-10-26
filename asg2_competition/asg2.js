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

/** @type {Camera} */
let camera;
/** @type {AnimatorController} */
let animators;
/** @type {Bone} */
let rootBone;

/** @type {HTMLElement} */
let uiContainer;

function main() {
	setupWebGL();
	setupShaders();
	setupBuffers();
	setupUI();
	setupScene();
	canvas.addEventListener('mousedown', onCanvasMouseDown);
	canvas.addEventListener('mousemove', onCanvasMouseMove);
	canvas.addEventListener('mouseout', onCanvasMouseOut);
	canvas.addEventListener('mouseup', onCanvasMouseUp);
	canvas.addEventListener('wheel', onCanvasWheel);
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


/** @type {HTMLInputElement} */
let camRotSlider;
/** @type {Text} */
let fpsDisplay;
/** @type {boolean} */
let showBones = false;
function setupUI() {
	uiContainer = document.getElementById('ui_container');

	const camControlSection = document.createElement('figure');
	const camControlCaption = document.createElement('figcaption');
	camControlCaption.textContent = 'Camera';
	camControlSection.appendChild(camControlCaption);
	camRotSlider = document.createElement('input');
	camRotSlider.type = 'range';
	camRotSlider.min = 0;
	camRotSlider.max = Math.PI * 2;
	camRotSlider.value = 0;
	camRotSlider.step = 'any';
	camRotSlider.addEventListener('input', () => {camTheta = camRotSlider.valueAsNumber; spinCam = false;});
	const label = document.createElement('label');
	label.textContent = 'view angle';
	label.appendChild(camRotSlider);
	camControlSection.appendChild(label);
	const spinButton = document.createElement('button');
	spinButton.textContent = 'toggle auto spin';
	spinButton.addEventListener('click', () => { spinCam = !spinCam; });
	camControlSection.appendChild(spinButton);
	uiContainer.appendChild(camControlSection);

	const perfInfoContainer = document.createElement('details');
	const perfInfoLabel = document.createElement('summary');
	perfInfoContainer.style.whiteSpace = 'pre-wrap';
	perfInfoLabel.textContent = 'Performance';
	perfInfoContainer.appendChild(perfInfoLabel);
	uiContainer.appendChild(perfInfoContainer);
	perfInfoContainer.open = true;
	fpsDisplay = document.createTextNode('-1');
	perfInfoContainer.appendChild(fpsDisplay);
	perfInfoContainer.appendChild(document.createTextNode(' fps'));

	const miscContainer = document.createElement('details');
	const miscLabel = document.createElement('summary');
	miscLabel.textContent = 'Misc';
	miscContainer.appendChild(miscLabel);
	uiContainer.appendChild(miscContainer);
	const boneToggle = document.createElement('input');
	boneToggle.type = 'checkbox';
	boneToggle.checked = false;
	const boneToggleLabel = document.createElement('label');
	boneToggleLabel.textContent = 'render bones';
	boneToggleLabel.appendChild(boneToggle);
	miscContainer.appendChild(boneToggleLabel);
	boneToggle.addEventListener('click', () => {showBones = boneToggle.checked});
}


function setupScene() {
	camera = new Camera();

	// colors
	const marColorSkin = Color.fromRGBHex(0xff8bb0);
	const marColorBlue = Color.fromRGBHex(0x4972e5);
	const marColorRed = Color.fromRGBHex(0xdb394f);
	const marColorBrown = Color.fromRGBHex(0x4c2912);
	// non-preset meshes
	const cylinderUncapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, false);
	const cylinderCapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, true);
	const headMesh = new Mesh([
		0.0, 1.504119634628296, -0.7071067690849304, 0.0, 0.7970128059387207, -1.0, 0.0, 0.08990609645843506, -0.7071067690849304, 0.6123725175857544, 1.504119634628296, -0.35355332493782043, 0.8660255074501038, 0.7970128059387207, -0.4999999403953552, 0.6123725175857544, 0.08990609645843506, -0.35355332493782043, 0.6123724579811096, 1.504119634628296, 0.35355356335639954, 0.866025447845459, 0.7970128059387207, 0.6731863021850586, 0.6123724579811096, 0.08990609645843506, 0.5866334438323975, -1.0310358788956364e-07, 1.504119634628296, 0.7071069478988647, -1.6270823266495427e-07, 0.7970128059387207, 1.0268092155456543, -1.0310358788956364e-07, 0.08990609645843506, 0.8802716732025146, 0.0, -0.0542832612991333, 8.742277657347586e-08, -7.571034643660823e-08, 1.6779122352600098, 1.3113414354393171e-07, -0.612372636795044, 1.504119634628296, 0.3535533845424652, -0.8660255670547485, 0.7970128059387207, 0.6731859445571899, -0.612372636795044, 0.08990609645843506, 0.5866333246231079, -0.6123724579811096, 1.504119634628296, -0.3535535931587219, -0.8660253286361694, 0.7970128059387207, -0.5000001788139343, -0.6123724579811096, 0.08990609645843506, -0.3535535931587219
	], [
		12, 2, 5, 1, 3, 4, 1, 5, 2, 0, 13, 3, 12, 5, 8, 4, 6, 7, 5, 7, 8, 3, 13, 6, 12, 8, 11, 7, 9, 10, 8, 10, 11, 6, 13, 9, 12, 11, 16, 9, 15, 10, 10, 16, 11, 9, 13, 14, 14, 13, 17, 12, 16, 19, 14, 18, 15, 15, 19, 16, 18, 2, 19, 17, 13, 0, 12, 19, 2, 17, 1, 18, 1, 0, 3, 1, 4, 5, 4, 3, 6, 5, 4, 7, 7, 6, 9, 8, 7, 10, 9, 14, 15, 10, 15, 16, 14, 17, 18, 15, 18, 19, 18, 1, 2, 17, 0, 1
	]);
	const hatMesh = new Mesh([
		0.8660255074501038, 0.7970128059387207, -0.4999999403953552, 0.6123724579811096, 1.504119634628296, 0.3535535931587219, -1.1920928955078125e-07, 1.504119634628296, 0.7071069478988647, 0.6123725175857544, 1.504119634628296, -0.35355332493782043, 0.8660255074501038, 0.9749770164489746, -0.878173828125, 0.624752402305603, 1.648715615272522, 0.30906257033348083, 0.6123725175857544, 1.648715615272522, -0.3980443775653839, -0.8660256862640381, 0.7970128059387207, -0.4999999403953552, -2.384185791015625e-07, 0.7970128059387207, -1.0, -0.612372636795044, 1.504119634628296, 0.3535535931587219, -2.384185791015625e-07, 1.504119634628296, -0.7071067690849304, -0.6123727560043335, 1.504119634628296, -0.35355332493782043, -1.7881393432617188e-07, 1.6779122352600098, 1.1920928955078125e-07, -0.8660256862640381, 0.9749770164489746, -0.878173828125, -2.384185791015625e-07, 0.8415037989616394, -1.3114373683929443, -0.6247526407241821, 1.648715615272522, 0.3090626001358032, -1.1920928955078125e-07, 1.648715615272522, 0.6626158952713013, -2.384185791015625e-07, 1.8600480556488037, -0.8961937427520752, -0.6123727560043335, 1.648715615272522, -0.3980443775653839, -1.7881393432617188e-07, 1.9559813737869263, 1.1175870895385742e-07
	], [
		3, 8, 0, 1, 3, 0, 2, 12, 1, 3, 12, 10, 3, 1, 12, 4, 17, 6, 5, 4, 6, 16, 5, 19, 6, 17, 19, 6, 19, 5, 0, 5, 1, 8, 4, 0, 1, 16, 2, 8, 11, 7, 9, 7, 11, 2, 9, 12, 11, 10, 12, 11, 12, 9, 13, 17, 14, 15, 18, 13, 16, 19, 15, 18, 19, 17, 18, 15, 19, 7, 15, 13, 8, 13, 14, 16, 9, 2, 3, 10, 8, 4, 14, 17, 0, 4, 5, 8, 14, 4, 1, 5, 16, 8, 10, 11, 13, 18, 17, 7, 9, 15, 8, 7, 13, 16, 15, 9
	]);
	const hairMesh = new Mesh([
		0.7520225048065186, 1.1148186922073364, -0.11637425422668457, 0.6123724579811096, 1.504119634628296, 0.3535535931587219, 0.624752402305603, 1.648715615272522, 0.30906257033348083, -0.7520225048065186, 1.1148186922073364, -0.11637425422668457, -0.612372636795044, 1.504119634628296, 0.3535535931587219, -0.6247526407241821, 1.648715615272522, 0.3090626001358032, 1.1336801052093506, 1.2162690162658691, 0.37880173325538635, -1.1336801052093506, 1.2162690162658691, 0.37880173325538635, -0.7453891634941101, 1.2228642702102661, -0.095468670129776, 0.7453889846801758, 1.2228642702102661, -0.095468670129776, -0.6247526407241821, 1.648715615272522, 0.3090626001358032, -0.7520225048065186, 1.1148186922073364, -0.11637425422668457, -0.7453891634941101, 1.2228642702102661, -0.095468670129776, -1.3277758359909058, 0.975525975227356, 0.15411293506622314, 1.3277758359909058, 0.975525975227356, 0.15411293506622314, -2.384185791015625e-07, 0.7970128059387207, -1.0, -0.8660256862640381, 0.8859950304031372, -0.6890867948532104, 0.8660256862640381, 0.8859950304031372, -0.6890867948532104, 0.0, 0.8192582726478577, -1.1557188034057617, -0.8660256862640381, 0.7970128059387207, -0.4999999403953552, 0.8660255074501038, 0.7970128059387207, -0.4999999403953552, -2.384185791015625e-07, 0.5789206027984619, -1.1545876264572144, -0.8660256862640381, 0.5789206027984619, -0.6545875668525696, 0.8660255074501038, 0.5789206027984619, -0.6545875668525696
	], [
		3, 4, 7, 0, 2, 6, 2, 1, 6, 1, 0, 6, 5, 3, 7, 4, 5, 7, 5, 12, 10, 9, 2, 14, 10, 12, 13, 8, 11, 12, 3, 10, 11, 12, 11, 13, 11, 10, 13, 0, 9, 14, 2, 0, 14, 5, 8, 12, 8, 3, 11, 3, 5, 10, 16, 18, 21, 20, 23, 17, 15, 19, 22, 15, 21, 23, 16, 22, 19, 17, 23, 21, 16, 21, 22, 15, 22, 21, 15, 23, 20, 17, 21, 18, 19, 15, 18, 18, 16, 19, 20, 17, 15, 17, 18, 15
	]);

	rootBone = new Bone(Mat4x4.identity(), .25, 'root');
	// torso
	const torsoBone = new Bone(Mat4x4.identity(), 1.5, 'torso');
	rootBone.tailChildren.push(torsoBone);
	const torso = new Model(Mesh.UNIT_ICOSPHERE_TOUCHING_XY, Mat4x4.scale(1.5), marColorBlue);
	torsoBone.headChildren.push(torso);
	// upper arms
	const armUpperLBone = new Bone(Mat4x4                 .rotateZ(Math.PI / 2 * -1).translate(0.25, 0.25, 0), .5, 'armUpperL');
	const armUpperRBone = new Bone(Mat4x4.rotateX(Math.PI).rotateZ(Math.PI / 2 *  1).translate(0.25, 0.25, 0), .5, 'armUpperR');
	torsoBone.tailChildren.push(armUpperLBone);
	torsoBone.tailChildren.push(armUpperRBone);
	const arm = new Model(cylinderCapped, Mat4x4.scale(.2, .5, .2).translate(0, 0.5, 0), marColorSkin);
	armUpperLBone.headChildren.push(arm);
	armUpperRBone.headChildren.push(arm);
	// lower arms
	const armLowerLBone = new Bone(Mat4x4.identity(), .5, 'armLowerL');
	const armLowerRBone = new Bone(Mat4x4.identity(), .5, 'armLowerR');
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
	const footLBone = new Bone(Mat4x4.translate(.1, 0, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (1/4)), 1, 'footL');
	const footRBone = new Bone(Mat4x4.translate(-.1, 0, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (3/4)), 1, 'footR');
	torsoBone.headChildren.push(footLBone);
	torsoBone.headChildren.push(footRBone);
	const foot = new Model(Mesh.UNIT_ICOSPHERE_TOUCHING_XY, Mat4x4.scale(.6, 1, .8), marColorRed);
	footLBone.headChildren.push(foot);
	footRBone.headChildren.push(foot);
	// head
	const headBone = new Bone(Mat4x4.scale(1.25), 1, 'head');
	torsoBone.tailChildren.push(headBone);
	// const head = new Model(headMesh, Mat4x4.scale(1.25).translate(0, -.1, 0), marColorSkin);
	const head = new Model(headMesh, Mat4x4.identity(), marColorSkin);
	const hat = new Model(hatMesh, Mat4x4.identity(), marColorRed);
	const hair = new Model(hairMesh, Mat4x4.identity(), marColorBrown);
	// const hat = new Model(hatMesh, Mat4x4.scale(1.25).translate(0, -.1, 0).scale(0, 0, 0), marColorRed);
	headBone.headChildren.push(head, hat, hair);
	// headBone.headChildren.push(hat);

	animators = new AnimatorController({
		Wave: new AnimatorGroup(
			new TransformAnimator(armUpperLBone, 'animMat', {rotZ: {ease: easeInOutSine, min: Math.PI * (-2/8), max: Math.PI * (0/8)}}),
			new TransformAnimator(armLowerLBone, 'animMat', {rotZ: {ease: easeInOutCubic, min: Math.PI * (-1/16), max: Math.PI * (1/16)}}),
			new TransformAnimator(headBone, 'animMat', {rotZ: Math.PI * (-1/16)}),
			new TransformAnimator(armUpperRBone, 'animMat', {rotZ: Math.PI * (1/8)}),
			new TransformAnimator(armLowerRBone, 'animMat', {rotZ: Math.PI * (2/8)}),
		),
		Jump: new AnimatorGroup(
			new TransformAnimator(rootBone, 'animMat', {posY: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7}}),
			new TransformAnimator(armUpperLBone, 'animMat', {rotZ: {easeUp: easeOutCubic, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (0/8), max: Math.PI * (-2/8)}}),
			new TransformAnimator(armUpperRBone, 'animMat', {rotZ: {easeUp: easeOutCubic, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (0/8), max: Math.PI * (-2/8)}}),
			new TransformAnimator(footLBone, 'animMat', {rotZ: {ease: easeOutBack, period: 2, peakAt: .7, offset: .15, min: Math.PI * (0/8), max: Math.PI * (2/8)}}),
			new TransformAnimator(footRBone, 'animMat', {rotZ: {ease: easeOutBack, period: 2, peakAt: .7, offset: .15, min: Math.PI * (0/8), max: Math.PI * (2/8)}}),
		),
		'Manual Control': new ManualControlAnimator(rootBone),
	});
	animators.currentAnimator = 'Wave';

	uiContainer.appendChild(animators.initUI());
}


let spinCam = true;
let camTheta = Math.PI * (1/2);
let globalRotTheta = 0;
let globalZoomFac = 1;
let globalViewHeight = 2;

let fps = 1.0;
/** @type {number | DOMHighResTimeStamp} */
let prevTickTime = 0;
/**
 * @param {DOMHighResTimeStamp} curTime
 */
function tick(curTime) {
	clearCanvas();
	const delta = curTime - prevTickTime;
	// ==== DON'T INSERT ANYTHING ELSE IN tick() BEFORE THIS LINE! ====

	renderScene(delta, curTime);
	
	// ==== DON'T INSERT ANYTHING ELSE IN tick() AFTER THIS LINE! ====
	fpsDisplay.nodeValue = Math.round(1 / (delta / 1000)).toString().padStart(5, ' ');
	prevTickTime = curTime;
	requestAnimationFrame(tick);
}

function renderScene(delta, curTime) {
	if(spinCam) {
		camTheta += delta / 1000;
	}
	if(0 > camTheta || camTheta > Math.PI * 2) {
		camTheta = camTheta - Math.floor(camTheta / (Math.PI * 2)) * Math.PI * 2;
	}
	camera.pos = Vec.fromCylindrical(6 * globalZoomFac, camTheta + globalRotTheta);
	camera.gazeTowards(Vec.ZERO);
	camera.pos.y += globalViewHeight;
	camRotSlider.valueAsNumber = camTheta;
	
	rootBone.resetAnimMatsRecursive();
	animators.exec(curTime / 1000);
	
	rootBone.render(gl, camera.world2viewMat());
}

// let curStroke = null;

/** @param {MouseEvent} ev */
function onCanvasMouseDown(ev) {
	if(ev.buttons === 1 && ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
		animators.currentAnimator = 'Jump';
	}
}
/** @param {MouseEvent} ev */
function onCanvasMouseMove(ev) {
	if(ev.buttons === 1) {
		// console.log(ev);
		camTheta += ev.movementX / canvas.width * Math.PI;
		globalViewHeight += ev.movementY / canvas.width * 4;
		spinCam = false;
	}
}
/** @param {MouseEvent} ev */
function onCanvasMouseOut(ev) {
}
/** @param {MouseEvent} ev */
function onCanvasMouseUp(ev) {
}
/** @param {WheelEvent} ev */
function onCanvasWheel(ev) {
	globalZoomFac = Math.max(1e-1, ev.deltaY / 100 / 10 + globalZoomFac);
	ev.stopPropagation();
	ev.preventDefault();
}


