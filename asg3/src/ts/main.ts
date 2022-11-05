import { Camera, Mesh, Vec, Mat4x4 } from './3d.js';
import { getProgramVarLocations, loadProgramFromFiles, ProgramVarLocations } from './gl.js';
import { MCWorld } from './mc.js';
import { atlasImages, loadImages, TextureAtlasInfo } from './texture.js';
import { assert } from "./util.js";

// TODO factor this into some debug settings thing eventually probably
/** debug option, disable use of webgl 2 */
const forceWebgl1 = false;

// making a type to hold all these so i can just pass them around instead of having global variables
// for everything
export type MyGlStuff = {
    program: MyProgramInfo;
} & WebGL1Or2;

export type WebGL1Or2 = (
    | { gl: WebGLRenderingContext,  hasWebgl2: false }
    | { gl: WebGL2RenderingContext, hasWebgl2: true  }
);

// TODO give this a better name
export type MyStuff = {
    glStuff: MyGlStuff;
    world: MCWorld;
    camera: Camera;
    atlas: TextureAtlasInfo;
    input: InputInfo;
};

type InputInfo = {
    heldKeys: Set<string>;
    pressedKeys: Set<string>;
    releasedKeys: Set<string>;
};

async function main() {
    const canvas = document.getElementById('canvas');
    assert(canvas !== null);
    assert(canvas instanceof HTMLCanvasElement);
    // start the images loading as early as possible, we'll await this later once we need them
    const imagesPromise = loadImages(['bedrock', 'cobblestone', 'dirt', 'grass_top', 'grass_side', 'stone']);
    // const imagesPromise = loadImages([]);
    const gl1or2 = initWebGL(canvas);
    const glExtensions = setupGLExtensions(gl1or2);
    setupWebGL(gl1or2);
    const programInfo = await setupShaders(gl1or2, glExtensions);
    const glStuff: MyGlStuff = {...gl1or2, program: programInfo};
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
            border: (level <= atlas.maxMipLevel)  ? '2px solid #0000' : '2px solid #F00',
        });
    }
    // setupUI();
    const world = await setupWorld();
    const camera = new Camera();
    const inputInfo: InputInfo = {heldKeys: new Set(), pressedKeys: new Set(), releasedKeys: new Set()};
    const stuff: MyStuff = {glStuff, camera, world, atlas, input: inputInfo};
    // TODO should load/restore player pos
    camera.pos = Vec.of(8, 32, 16+8);
    camera.rotX = Math.PI * (-1/2);
    // camera.pos = Vec.of(8, 50, 8);
    // camera.gaze = Vec.DOWN;
    // camera.up = Vec.FORWARDS;
    // TODO move these functions out
    let downKeys = new Set<string>();
    function mouseMoveDuringPointerLock(ev: MouseEvent) {
        // console.log(ev.movementX, ev.movementY);
        // const rot = Mat4x4.rotateXYZ(ev.movementY / 100, ev.movementX / 100, 0);
        // camera.gaze.transformInPlace(rot);
        // camera.up.transformInPlace(rot);
        // camera.rotX += ev.movementY / 100;
        // camera.rotY += ev.movementX / 100;

        camera.rotX = (camera.rotX + ev.movementX / 100) % (Math.PI * 2);
        // camera.rotY = Math.max(0, Math.min(Math.PI, (camera.rotY - ev.movementY / 100)));
        camera.rotY = Math.max(Math.PI / -2, Math.min(Math.PI / 2, (camera.rotY + ev.movementY / 100)));
        // camera.rotY = Math.max(Math.PI / -4, Math.min(Math.PI / 4, (camera.rotY - ev.movementY / 100)));
        // console.log(camera.rotX, camera.rotY);

        // const a = Vec.fromSpherical(1, camera.rotX, camera.rotY);
        // camera.gaze.x = a.z;
        // camera.gaze.y = a.x;
        // camera.gaze.z = a.y;
    }
    function keydownDuringPointerLock(ev: KeyboardEvent) {
        if(ev.repeat) return;
        inputInfo.heldKeys.add(ev.code);
        inputInfo.pressedKeys.add(ev.code);
        inputInfo.releasedKeys.delete(ev.code);
    }
    function keyupDuringPointerLock(ev: KeyboardEvent) {
        inputInfo.heldKeys.delete(ev.code);
        inputInfo.pressedKeys.delete(ev.code);
        inputInfo.releasedKeys.add(ev.code);
    }
    canvas.addEventListener('click', ev => {
        canvas.requestPointerLock();
        canvas.addEventListener('mousemove', mouseMoveDuringPointerLock, {capture: false});
        document.addEventListener('keydown', keydownDuringPointerLock, {capture: false});
        document.addEventListener('keyup', keyupDuringPointerLock, {capture: false});
    });
    document.addEventListener('pointerlockchange', ev => {
        if(document.pointerLockElement !== canvas) {
            canvas.removeEventListener('mousemove', mouseMoveDuringPointerLock, {capture: false});
            document.removeEventListener('keydown', keydownDuringPointerLock, {capture: false});
            document.removeEventListener('keyup', keyupDuringPointerLock, {capture: false});
            inputInfo.heldKeys.clear();
            inputInfo.pressedKeys.clear();
            inputInfo.releasedKeys.clear(); // TODO populate this properly
        }
    });

    // store these on the global scope. purely for easier debugging, none of our code will use it
    // @ts-expect-error
    window.mcStuff = stuff;
    requestAnimationFrame(tick.bind(null, stuff));
}

function initWebGL(canvas: HTMLCanvasElement): WebGL1Or2 {
    if(!forceWebgl1) {
        const gl2 = canvas.getContext('webgl2', {antialias: false});
        if(gl2 !== null) {
            return {gl: gl2, hasWebgl2: true};
        }
    }
    const gl = canvas.getContext('webgl', {antialias: false});
    assert(gl !== null);
    return {gl, hasWebgl2: false};
}

function setupWebGL({gl}: WebGL1Or2) {
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
}

const SHADER_ATTRIBUTE_NAMES = ['a_Position', 'a_UV'] as const;
const SHADER_UNIFORM_NAMES = ['u_CameraMat', 'u_BlockPos', 'u_TextureAtlas', 'u_MaxTextureAtlasLOD', 'u_TextureAtlasDimensions'] as const;

type MyProgramInfo = {
    program: WebGLProgram;
} & ProgramVarLocations<typeof SHADER_ATTRIBUTE_NAMES, typeof SHADER_UNIFORM_NAMES>;

function setupGLExtensions({gl}: WebGL1Or2): Set<string> {
    const supportedExtensions = gl.getSupportedExtensions() ?? [];
    const usedExtensions = new Set<string>();
    // console.log(supportedExtensions);
    for(const desiredExtension of [
        // list extensions here
        // TODO OES_standard_derivatives & EXT_shader_texture_lod are conditional on lack of webgl2 (not required even in that case tho)
        'OES_standard_derivatives', 'EXT_shader_texture_lod',
    ]) {
        if(supportedExtensions.includes(desiredExtension)) {
            usedExtensions.add(desiredExtension);
        }
    }
    for(const ext of usedExtensions) {
        gl.getExtension(ext);
    }
    return usedExtensions;
}

async function setupShaders({gl, hasWebgl2}: WebGL1Or2, extensions: Set<string>): Promise<MyProgramInfo> {
    const hasExtensionDefines = [];
    if(hasWebgl2) hasExtensionDefines.push('HAS_WEBGL2');
    for(const extension of extensions) {
        hasExtensionDefines.push(`HAS_EXT_${extension}`);
    }
    const glslVersion = (hasWebgl2) ? '300 es' : '100';
    const program = await loadProgramFromFiles(gl, 'shaders/vertex.vert', 'shaders/fragment.frag', glslVersion, [
        ...hasExtensionDefines,
    ]);
    // TODO not the right place for this todo but whatever - should i be `deleteShader`ing after i'm
    // done making the program?
    gl.useProgram(program);
    return {
        program: program,
        ...getProgramVarLocations(gl, program, SHADER_ATTRIBUTE_NAMES, SHADER_UNIFORM_NAMES),
    };
}

function setupTextures(atlas: TextureAtlasInfo, { gl, hasWebgl2, program: { uniform: { u_TextureAtlas, u_MaxTextureAtlasLOD, u_TextureAtlasDimensions } } }: MyGlStuff) {
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
    // TODO add an option to toggle this between NEAREST_MIPMAP_NEAREST and NEAREST_MIPMAP_LINEAR
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // clamp texture at edges
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    // set max LOD level for the texture (webgl 2 only)
    if(hasWebgl2) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAX_LOD, atlas.maxMipLevel);
    }
    if(u_MaxTextureAtlasLOD !== null) gl.uniform1f(u_MaxTextureAtlasLOD, atlas.maxMipLevel);
    if(u_TextureAtlasDimensions !== null) gl.uniform2f(u_TextureAtlasDimensions, atlas.width, atlas.height);
    //
    gl.uniform1i(u_TextureAtlas, 0);
}

async function setupWorld(): Promise<MCWorld> {
    return await MCWorld.openWorld('new world');
}

let lastTick = 0; // maybe shouldn't be global if we're trying to not be
function tick(stuff: MyStuff, now: DOMHighResTimeStamp): void {
    let delta = now - lastTick;
    clearCanvas(stuff.glStuff);

    const { camera, input: { heldKeys } } = stuff;
    // console.log(heldKeys);
    const posDelta = Vec.zero();
    if(heldKeys.has('KeyW')) { posDelta.addInPlace(Vec.fromPolarXZ(delta / 100, camera.rotX)); }
    if(heldKeys.has('KeyS')) { posDelta.addInPlace(Vec.fromPolarXZ(delta / 100, camera.rotX + Math.PI)); }
    if(heldKeys.has('KeyA')) { posDelta.addInPlace(Vec.fromPolarXZ(delta / 100, camera.rotX - Math.PI / 2)); }
    if(heldKeys.has('KeyD')) { posDelta.addInPlace(Vec.fromPolarXZ(delta / 100, camera.rotX + Math.PI / 2)); }
    if(heldKeys.has('Space')) { posDelta.y += delta / 100; }
    if(heldKeys.has('ShiftLeft')) { posDelta.y -= delta / 100; }
    camera.pos = camera.pos.add(posDelta);

    // stuff.camera.gaze = Vec.fromCylindrical(1, now / 1000, 0);
    // stuff.camera.pos = Vec.of(10, 0, 10);

    // stuff.camera.pos = Vec.fromCylindrical(20, now / 1000, 20);
    // // stuff.camera.pos = Vec.fromCylindrical(12, now / 1000, 20);
    // stuff.camera.pos.x += 8;
    // stuff.camera.pos.z += 8;
    // stuff.camera.gazeTowards(Vec.of(8, 0, 8));
    // // stuff.camera.gaze = stuff.camera.gaze.div(stuff.camera.gaze.magnitude());
    // stuff.camera.pos.y += 20;

    // stuff.camera.pos = Vec.fromCylindrical(20, Math.PI * (1/4+1/16), 20).add(Vec.of(8, 0, 8));
    // stuff.camera.gazeTowards(Vec.of(8, 0, 8));
    // stuff.camera.pos.y += 20;

    // stuff.camera.pos = Vec.of(8, 51, 8);
    // // stuff.camera.pos = Vec.of(8, 35+1, 8);
    // // stuff.camera.pos = Vec.of(8, 50 - 13, 8);
    // // stuff.camera.pos.y += (Math.sin(now / 1000 * Math.PI * 2 / 8)/2+0.5) * 8;
    // stuff.camera.gaze = Vec.DOWN;
    // // stuff.camera.up = Vec.FORWARDS;
    // // stuff.camera.up = Vec.fromCylindrical(1, now / 1000, 0);
    // stuff.camera.up = Vec.fromCylindrical(1, Math.floor(now / 1000) * (Math.PI / 4), 0);
    // // stuff.camera.up = Vec.fromCylindrical(1, Math.PI * (4/4), 0);
    // // stuff.camera.up = Vec.fromCylindrical(1, 1.467238, 0);


    // 

    // render
    stuff.world.rebuildMeshes(stuff);

    // TODO buffer stuff here for now, should move
    const { glStuff: { gl, program: { uniform: { u_CameraMat } } } } = stuff;
    // gl.bufferData(gl.ARRAY_BUFFER, Mesh.UNIT_CUBE.verts, gl.STATIC_DRAW);
    // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, Mesh.UNIT_CUBE.indices, gl.STATIC_DRAW);

    gl.uniformMatrix4fv(u_CameraMat, false, stuff.camera.world2viewMat().data);

    stuff.world.render(stuff.glStuff);

    // =====
    stuff.input.pressedKeys.clear();
    stuff.input.releasedKeys.clear();
    lastTick = now;
    requestAnimationFrame(tick.bind(null, stuff));
}

window.addEventListener('DOMContentLoaded', main);

function clearCanvas({ gl }: MyGlStuff) {
    gl.clearColor(.8, .8, .8, 1.0);
    // gl.clearColor(1., 0., 1., 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

