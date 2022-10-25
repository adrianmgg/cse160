import { getProgramVarLocations, loadProgramFromFiles, ProgramVarLocations } from './gl.js';
import { MCWorld } from './mc.js';
import { assert } from "./util.js";

type MyGlStuff = {
    gl: WebGLRenderingContext;
    programInfo: MyProgramInfo;
    buffers: MyBuffersInfo;
}

async function main() {
    const gl = initWebGL();
    setupWebGL(gl);
    const programInfo = await setupShaders(gl);
    const buffersInfo = setupBuffers(gl, programInfo);
    const stuff: MyGlStuff = {gl, programInfo, buffers: buffersInfo};
    // setupUI();
    const world = await setupWorld();
    requestAnimationFrame(tick);
}

function initWebGL(): WebGLRenderingContext {
    const canvas = document.getElementById('canvas');
    assert(canvas !== null);
    assert(canvas instanceof HTMLCanvasElement);
    const gl = canvas.getContext('webgl');
    assert(gl !== null);
    return gl;
}

function setupWebGL(gl: WebGLRenderingContext) {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

type MyProgramInfo = {
    program: WebGLProgram;
    vars: ProgramVarLocations<['a_Position'], ['u_FragColor']>;
};

async function setupShaders(gl: WebGLRenderingContext): Promise<MyProgramInfo> {
    const program = await loadProgramFromFiles(gl, 'shaders/vertex.vert', 'shaders/fragment.frag');
    return {
        program: program,
        vars: getProgramVarLocations(gl, program, ['a_Position' as const], ['u_FragColor' as const]),
    }
}

type MyBuffersInfo = {
    vertices: WebGLBuffer;
    indices: WebGLBuffer;
};

function setupBuffers(gl: WebGLRenderingContext, programInfo: MyProgramInfo): MyBuffersInfo {
    const vertices = gl.createBuffer();
    assert(vertices !== null);
    gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
    if(programInfo.vars.attribLocations.a_Position !== null) {
        gl.enableVertexAttribArray(programInfo.vars.attribLocations.a_Position);
        gl.vertexAttribPointer(programInfo.vars.attribLocations.a_Position, 3, gl.FLOAT, false, 0, 0);
    }
    const indices = gl.createBuffer();
    assert(indices !== null);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
    return {vertices, indices};
}

async function setupWorld(): Promise<MCWorld> {
    return await MCWorld.openWorld('new world');
}

function tick(now: DOMHighResTimeStamp): void {
}

window.addEventListener('DOMContentLoaded', main);

