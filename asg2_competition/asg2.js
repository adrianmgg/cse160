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
/** @type {HTMLElement} */
let animatorsUIContainer;

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

	animatorsUIContainer = document.createElement('div');
	uiContainer.appendChild(animatorsUIContainer);

	const camControlSection = document.createElement('details');
	// camControlSection.open = true;
	const camControlCaption = document.createElement('summary');
	camControlCaption.textContent = 'Camera Control';
	camControlSection.appendChild(camControlCaption);
	camRotSlider = document.createElement('input');
	camRotSlider.type = 'range';
	camRotSlider.min = 0;
	camRotSlider.max = Math.PI * 2;
	camRotSlider.value = camTheta;
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
	// perfInfoContainer.open = true;
	fpsDisplay = document.createTextNode('-1');
	perfInfoContainer.appendChild(fpsDisplay);
	perfInfoContainer.appendChild(document.createTextNode(' fps'));

	const miscContainer = document.createElement('details');
	// miscContainer.open = true;
	const miscLabel = document.createElement('summary');
	miscLabel.textContent = 'Debug Overlays';
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
	const marColorYellow = Color.fromRGBHex(0xfadc43);
	// non-preset meshes
	const cylinderUncapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, false);
	const cylinderCapped = Mesh.cylinder(6, Vec.of(0, 0, 0), 0.5, 1.0, true);

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
	const footLBone = new Bone(Mat4x4.translate(.1, .25, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (1/4)), 1, 'footL');
	const footRBone = new Bone(Mat4x4.translate(-.1, .25, -.3).rotateZ(Math.PI / 2 * -1).rotateX(Math.PI * (3/4)), 1, 'footR');
	// torsoBone.headChildren.push(footLBone, footRBone);
	rootBone.headChildren.push(footLBone, footRBone);
	const foot = new Model(Mesh.UNIT_ICOSPHERE_TOUCHING_XY, Mat4x4.scale(.6, 1, .8), marColorRed);
	footLBone.headChildren.push(foot);
	footRBone.headChildren.push(foot);
	// head
	const headBone = new Bone(Mat4x4.locRotScale(0,-.05,0,  0,0,0,  1.25,1.25,1.25), 1, 'head');
	torsoBone.tailChildren.push(headBone);
	// const head = new Model(headMesh, Mat4x4.scale(1.25).translate(0, -.1, 0), marColorSkin);
	const head = new Model(headMesh, Mat4x4.identity(), marColorSkin);
	const hat = new Model(hatMesh, Mat4x4.identity(), marColorRed);
	const hair = new Model(hairMesh, Mat4x4.identity(), marColorBrown);
	const hatPatch = new Model(hatPatchMesh, Mat4x4.identity(), marColorYellow);
	// const hat = new Model(hatMesh, Mat4x4.scale(1.25).translate(0, -.1, 0).scale(0, 0, 0), marColorRed);
	headBone.headChildren.push(head, hat, hair, hatPatch);
	// headBone.headChildren.push(hat);
	// face
	const eyeLBone = new Bone(Mat4x4.locRotScale(0.319053,1.05088,0.789927,  0,0,0,  1,1,1), .2, 'eyeL');
	const eyeRBone = new Bone(Mat4x4.locRotScale(-0.319053,1.05088,0.789927,  0,0,0,  1,1,1), .2, 'eyeR');
	headBone.headChildren.push(eyeLBone, eyeRBone);
	const eyeL = new Model(eyeLMesh, eyeLBone.mat.inverse(), marColorBlue); // TODO inverse jank because of the current mesh gen implementation.
	const eyeR = new Model(eyeRMesh, eyeRBone.mat.inverse(), marColorBlue); // TODO inverse jank because of the current mesh gen implementation.
	eyeLBone.headChildren.push(eyeL);
	eyeRBone.headChildren.push(eyeR);

	// TODO move this to anim probably
	const holdAtOneFor = (fac, x) => Math.max(0, Math.min(1, (x - fac) / (1 - fac)));

	const animBlink = new AnimatorGroup(
		new TransformAnimator(eyeLBone, 'animMat', {sclY: {offset: 0, period: 6.74389543, min: 0, max: 1, ease: t => easeInOutCubic(holdAtOneFor(1 - 0.5 / 6.74389543, t))}}),
		new TransformAnimator(eyeRBone, 'animMat', {sclY: {offset: 0.025, period: 6.74389543, min: 0, max: 1, ease: t => easeInOutCubic(holdAtOneFor(1 - 0.5 / 6.74389543, t))}}),
	);

	const runPeriod = 0.5;
	animators = new AnimatorController({
		'Manual Control': new ManualControlAnimator(rootBone),
		Wave: new AnimatorGroup(
			new TransformAnimator(armUpperLBone, 'animMat', {rotZ: {ease: easeInOutSine, min: Math.PI * (-2/8), max: Math.PI * (0/8)}}),
			new TransformAnimator(armLowerLBone, 'animMat', {rotZ: {ease: easeInOutCubic, min: Math.PI * (-1/16), max: Math.PI * (1/16)}}),
			new TransformAnimator(headBone, 'animMat', {rotZ: Math.PI * (-1/16)}),
			new TransformAnimator(armUpperRBone, 'animMat', {rotZ: {ease: easeInOutSine, period: 4, min: Math.PI * (1/8), max: Math.PI * (3/16)}}),
			new TransformAnimator(armLowerRBone, 'animMat', {rotZ: Math.PI * (2/8)}),
			animBlink,
			new TransformAnimator(torsoBone, 'animMat', {rotX: {period: 3, ease: easeInOutSine, min: Math.PI * (1/128), max: Math.PI * (-1/64)}}),
		),
		Jump: new AnimatorGroup(
			new TransformAnimator(rootBone, 'animMat', {posY: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7}}),
			new TransformAnimator(armUpperLBone, 'animMat', {rotZ: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (1/8), max: Math.PI * (-1/8)}}),
			new TransformAnimator(armUpperRBone, 'animMat', {rotZ: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (1/8), max: Math.PI * (-1/8)}}),
			new TransformAnimator(armLowerLBone, 'animMat', {rotZ: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (1/8), max: Math.PI * (-1/8)}}),
			new TransformAnimator(armLowerRBone, 'animMat', {rotZ: {easeUp: easeOutBounce, easeBack: easeOutCubic, period: 2, peakAt: .7, min: Math.PI * (1/8), max: Math.PI * (-1/8)}}),
			new TransformAnimator(footLBone, 'animMat', {rotZ: {ease: easeOutBack, period: 2, peakAt: .7, offset: .15, min: Math.PI * (0/8), max: Math.PI * (2/8)}}),
			new TransformAnimator(footRBone, 'animMat', {rotZ: {ease: easeOutBack, period: 2, peakAt: .7, offset: .15, min: Math.PI * (0/8), max: Math.PI * (2/8)}}),
			new TransformAnimator(torsoBone, 'animMat', {rotX: {period: 2, peakAt: .7, min: Math.PI * (1/32), max: Math.PI * (-1/64),}}),
			new TransformAnimator(headBone, 'animMat', {rotX: {period: 2, peakAt: .7, easeUp: easeOutBounce, easeBack: easeInOutSine, min: Math.PI * (-2/32), max: Math.PI * (2/16),}}),
			animBlink,
			// new TransformAnimator(eyeLBone, 'animMat', {sclY: {offset: .75, period: 2, peakAt: .7, min: 0, max: 1, ease: t => easeInOutCubic(holdAtOneFor(1 - 0.5 / 6, t))}}),
			// new TransformAnimator(eyeRBone, 'animMat', {sclY: {offset: .75, period: 2, peakAt: .7, min: 0, max: 1, ease: t => easeInOutCubic(holdAtOneFor(1 - 0.5 / 6, t))}}),
		),
		Blink: animBlink,
		// Run: new AnimatorGroup(
		// 	new TransformAnimator(footLBone, 'animMat', {rotZ: {period: runPeriod, offset: 0, min: Math.PI * (-2/16), max: Math.PI * (3/16), ease: easeInOutExpo, peakAt: 0.6}}),
		// 	new TransformAnimator(footRBone, 'animMat', {rotZ: {period: runPeriod, offset: runPeriod / 2, min: Math.PI * (-2/16), max: Math.PI * (3/16), ease: easeInOutExpo, peakAt: 0.6}}),
		// 	new TransformAnimator(rootBone, 'animMat', {posY: {period: runPeriod / 2, offset: runPeriod * 0.4, min: .2, max: 0, easeBack: easeInOutCubic, easeUp: easeInOutExpo}}),
		// ),
		// Fall: new AnimatorGroup(
		// 	new TransformAnimator(rootBone, 'animMat', {rotX: Math.PI / -2, posZ: -1.7, posY: {min: 6, max: 0, period: 4, peakAt: 0, ease: easeInBounce}}),
		// ),
	});
	animators.currentAnimator = 'Jump';

	animatorsUIContainer.appendChild(animators.initUI());
}


let spinCam = true;
// let camTheta = Math.PI * (1/2) - (Math.PI * (4 / 8));
let camTheta = Math.PI * (4/16);
let globalZoomFac = 1;
let globalViewHeight = 2;
let camTargetY = 0;

const HAS_PERF_NOW_API = ('performance' in window && 'now' in window.performance);
let fps = 1.0;
/** @type {number | DOMHighResTimeStamp} */
let prevTickTime = 0;
/**
 * @param {DOMHighResTimeStamp} curTime
 */
function tick(curTime) {
	if(HAS_PERF_NOW_API) curTime = window.performance.now();
	clearCanvas();
	const delta = curTime - prevTickTime;
	// ==== DON'T INSERT ANYTHING ELSE IN tick() BEFORE THIS LINE! ====

	renderScene(delta, curTime);
	
	// ==== DON'T INSERT ANYTHING ELSE IN tick() AFTER THIS LINE! ====
	// console.log({delta, curTime, prevTickTime});
	fpsDisplay.nodeValue = Math.round(1 / (delta / 1000)).toString().padStart(5, ' ');
	prevTickTime = curTime;
	requestAnimationFrame(tick);
	// setTimeout(() => tick(performance.now()), 1);
}

function renderScene(delta, curTime) {
	if(spinCam) {
		camTheta += delta / 1000;
	}
	if(0 > camTheta || camTheta > Math.PI * 2) {
		camTheta = camTheta - Math.floor(camTheta / (Math.PI * 2)) * Math.PI * 2;
	}
	// camera
	camera.pos = Vec.fromCylindrical(6 * globalZoomFac, camTheta, camTargetY);
	camera.gazeTowards(Vec.of(0, 1, 0));
	// camera.gaze = Vec.of(0, 0, 0).sub(camera.pos).no
	camera.pos.y += globalViewHeight;
	camRotSlider.valueAsNumber = camTheta;
	
	rootBone.resetAnimMatsRecursive();
	animators.exec(curTime / 1000);
	
	rootBone.render(gl, camera.world2viewMat());
}

// let curStroke = null;

/** @param {MouseEvent} ev */
function onCanvasMouseDown(ev) {
	if(ev.button === 0 && ev.buttons === 1 && ev.shiftKey && !ev.altKey && !ev.ctrlKey && !ev.metaKey) {
		animators.currentAnimator = 'Jump';
	} else if(ev.button === 1 && ev.buttons === 4) {
		ev.preventDefault();
		ev.stopImmediatePropagation();
	}
}
/** @param {MouseEvent} ev */
function onCanvasMouseMove(ev) {
	if(ev.buttons === 1 && !ev.altKey) {
		ev.preventDefault();
		ev.stopImmediatePropagation();
		// console.log(ev);
		camTheta += ev.movementX / canvas.width * Math.PI;
		globalViewHeight += ev.movementY / canvas.width * 4;
		spinCam = false;
	} else if(ev.buttons === 4 || ev.buttons === 1 && ev.altKey) {
		ev.preventDefault();
		ev.stopImmediatePropagation();
		camTargetY += ev.movementY / canvas.width * 4;
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


