import { Camera, Mesh, Vec } from './3d.js';
import { getProgramVarLocations, loadProgramFromFiles, ProgramVarLocations } from './gl.js';
import { MCWorld } from './mc.js';
import { atlasImages, loadImages, TextureAtlasInfo } from './texture.js';
import { assert } from "./util.js";

/*

just gonna make drop some notes here -

general overview of TODO stuff
- texture loading
- texture atlasing
  - mip mapping atlases? might need to roll this myself since the standard mip mapping will probably
    blur across the atlased textures, which we don't want
- add uv to mesh, shader stuff
- vchunks should generate meshes

*/


// making a type to hold all these so i can just pass them around instead of having global variables
// for everything
export type MyGlStuff = {
    gl: WebGLRenderingContext;
    programInfo: MyProgramInfo;
    buffers: MyBuffersInfo;
};

// TODO give this a better name
export type MyStuff = {
    glStuff: MyGlStuff;
    world: MCWorld;
    camera: Camera;
    atlas: TextureAtlasInfo;
};

async function main() {
    // start the images loading as early as possible, we'll await this later once we need them
    const imagesPromise = loadImages(['bedrock', 'cobblestone', 'dirt', 'grass_top', 'stone']);
    const gl = initWebGL();
    setupWebGL(gl);
    const programInfo = await setupShaders(gl);
    const buffersInfo = setupBuffers(gl, programInfo);
    const glStuff: MyGlStuff = {gl, programInfo, buffers: buffersInfo};
    const atlas = atlasImages(await imagesPromise);
    // TODO temp debug thing
    document.body.appendChild(atlas.image);
    // setupUI();
    const world = await setupWorld();
    const camera = new Camera();
    const stuff: MyStuff = {glStuff, camera, world, atlas};

    // TODO move this elsewhere
    {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.image);
    }

    // store these on the global scope. purely for easier debugging, none of our code will use it
    // @ts-expect-error
    window.mcStuff = stuff;
    requestAnimationFrame(tick.bind(null, stuff));
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
    vars: ProgramVarLocations<['a_Position'], ['u_FragColor', 'u_ModelMat', 'u_BlockPos']>;
};

async function setupShaders(gl: WebGLRenderingContext): Promise<MyProgramInfo> {
    const program = await loadProgramFromFiles(gl, 'shaders/vertex.vert', 'shaders/fragment.frag');
    // TODO not the right place for this todo but whatever - should i be `deleteShader`ing after i'm
    // done making the program?
    gl.useProgram(program);
    return {
        program: program,
        vars: getProgramVarLocations(gl, program, ['a_Position'] as const, ['u_FragColor', 'u_ModelMat', 'u_BlockPos'] as const),
    };
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

function tick(stuff: MyStuff, now: DOMHighResTimeStamp): void {
    clearCanvas(stuff.glStuff);

    // stuff.camera.gaze = Vec.fromCylindrical(1, now / 1000, 0);
    // stuff.camera.pos = Vec.of(10, 0, 10);
    stuff.camera.pos = Vec.fromCylindrical(20, now / 1000, 20);
    stuff.camera.pos.x += 8;
    stuff.camera.pos.z += 8;
    stuff.camera.gazeTowards(Vec.of(8, 0, 8));
    stuff.camera.gaze = stuff.camera.gaze.div(stuff.camera.gaze.magnitude());
    stuff.camera.pos.y += 20;

    // 

    // render
    // TODO buffer stuff here for now, should move
    const { glStuff: { gl, programInfo: { vars: { uniformLocations: { u_ModelMat } } } } } = stuff;
    gl.bufferData(gl.ARRAY_BUFFER, Mesh.UNIT_CUBE.verts, gl.STATIC_DRAW);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Mesh.UNIT_CUBE.indices, gl.STATIC_DRAW);

    gl.uniformMatrix4fv(u_ModelMat, false, stuff.camera.world2viewMat().data);

    stuff.world.render(stuff.glStuff);

    requestAnimationFrame(tick.bind(null, stuff));
}

window.addEventListener('DOMContentLoaded', main);

function clearCanvas({ gl }: MyGlStuff) {
    gl.clearColor(.8, .8, .8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}
