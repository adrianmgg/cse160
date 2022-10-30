import { Camera, Mesh, Vec } from './3d.js';
import { getProgramVarLocations, loadProgramFromFiles, ProgramVarLocations } from './gl.js';
import { MCWorld } from './mc.js';
import { atlasImages, loadImages, TextureAtlasInfo } from './texture.js';
import { assert } from "./util.js";

// making a type to hold all these so i can just pass them around instead of having global variables
// for everything
export type MyGlStuff = {
    gl: WebGLRenderingContext;
    programInfo: MyProgramInfo;
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
    const imagesPromise = loadImages(['bedrock', 'cobblestone', 'dirt', 'grass_top', 'grass_side', 'stone']);
    // const imagesPromise = loadImages([]);
    const gl = initWebGL();
    setupWebGL(gl);
    const programInfo = await setupShaders(gl);
    const glStuff: MyGlStuff = {gl, programInfo};
    const atlas = atlasImages(await imagesPromise, 64);
    setupTextures(atlas, glStuff);
    // TODO temp debug thing, move this somewhere else
    for(const [level, tex] of atlas.textures) {
        // @ts-expect-error
        document.body.appendChild(tex);
        Object.assign((tex as HTMLCanvasElement).style, {
            width: '128px',
            height: '128px',
            imageRendering: 'pixelated',
        });
    }
    // setupUI();
    const world = await setupWorld();
    const camera = new Camera();
    const stuff: MyStuff = {glStuff, camera, world, atlas};

    // store these on the global scope. purely for easier debugging, none of our code will use it
    // @ts-expect-error
    window.mcStuff = stuff;
    requestAnimationFrame(tick.bind(null, stuff));
}

function initWebGL(): WebGLRenderingContext {
    const canvas = document.getElementById('canvas');
    assert(canvas !== null);
    assert(canvas instanceof HTMLCanvasElement);
    const gl = canvas.getContext('webgl', {antialias: false});
    assert(gl !== null);
    return gl;
}

function setupWebGL(gl: WebGLRenderingContext) {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
}

type MyProgramInfo = {
    program: WebGLProgram;
    vars: ProgramVarLocations<['a_Position', 'a_UV'], ['u_FragColor', 'u_CameraMat', 'u_BlockPos', 'u_TextureAtlas', 'u_CameraPos']>;
};

async function setupShaders(gl: WebGLRenderingContext): Promise<MyProgramInfo> {
    const program = await loadProgramFromFiles(gl, 'shaders/vertex.vert', 'shaders/fragment.frag');
    // TODO not the right place for this todo but whatever - should i be `deleteShader`ing after i'm
    // done making the program?
    gl.useProgram(program);
    return {
        program: program,
        vars: getProgramVarLocations(gl, program, ['a_Position', 'a_UV'] as const, ['u_FragColor', 'u_CameraMat', 'u_BlockPos', 'u_TextureAtlas', 'u_CameraPos'] as const),
    };
}

function setupTextures(atlas: TextureAtlasInfo, { gl, programInfo: { vars: { uniformLocations: { u_TextureAtlas } } } }: MyGlStuff) {
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas.image);
    for(const [level, tex] of atlas.textures) {
        gl.texImage2D(gl.TEXTURE_2D, level, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex);
    }
    // nearest neighbor for magnification
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // nearest neighbor with mip maps for minification
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    // clamp texture at edges
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    //
    gl.uniform1i(u_TextureAtlas, 0);
}

async function setupWorld(): Promise<MCWorld> {
    return await MCWorld.openWorld('new world');
}

function tick(stuff: MyStuff, now: DOMHighResTimeStamp): void {
    clearCanvas(stuff.glStuff);

    // stuff.camera.gaze = Vec.fromCylindrical(1, now / 1000, 0);
    // stuff.camera.pos = Vec.of(10, 0, 10);

    stuff.camera.pos = Vec.fromCylindrical(20, now / 1000, 20);
    // stuff.camera.pos = Vec.fromCylindrical(12, now / 1000, 20);
    stuff.camera.pos.x += 8;
    stuff.camera.pos.z += 8;
    stuff.camera.gazeTowards(Vec.of(8, 0, 8));
    // stuff.camera.gaze = stuff.camera.gaze.div(stuff.camera.gaze.magnitude());
    stuff.camera.pos.y += 20;

    // stuff.camera.pos = Vec.of(8, 51, 8);
    // stuff.camera.gaze = Vec.DOWN;
    // // stuff.camera.up = Vec.FORWARDS;
    // stuff.camera.up = Vec.fromCylindrical(1, now / 1000, 0);


    // 

    // render
    stuff.world.rebuildMeshes(stuff);

    // TODO buffer stuff here for now, should move
    const { glStuff: { gl, programInfo: { vars: { uniformLocations: { u_CameraMat, u_CameraPos } } } } } = stuff;
    // gl.bufferData(gl.ARRAY_BUFFER, Mesh.UNIT_CUBE.verts, gl.STATIC_DRAW);
    // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Mesh.UNIT_CUBE.indices, gl.STATIC_DRAW);

    gl.uniform3f(u_CameraPos, ...stuff.camera.pos.xyz());
    gl.uniformMatrix4fv(u_CameraMat, false, stuff.camera.world2viewMat().data);

    stuff.world.render(stuff.glStuff);

    requestAnimationFrame(tick.bind(null, stuff));
}

window.addEventListener('DOMContentLoaded', main);

function clearCanvas({ gl }: MyGlStuff) {
    gl.clearColor(.8, .8, .8, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

