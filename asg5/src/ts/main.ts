import { AmbientLight, BoxGeometry, Euler, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PerspectiveCamera, PointLight, Scene, SpotLight, Vector3, WebGLRenderer } from 'three';
import { getElementByIdAndValidate } from './util';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MCWorld, TEXTURE_NAMES } from './mc';
import { atlasImages, loadImages } from './texture';
import { debugToggles, setupDebugToggles } from './debug_toggles';

class KeysManager {
    private _prevHeldKeys: Set<string>;
    private _heldKeys: Set<string>;
    private _prevHeldMouse: Set<number>;
    private _heldMouse: Set<number>;
    constructor() {
        this._prevHeldKeys = new Set();
        this._heldKeys = new Set();
        this._prevHeldMouse = new Set();
        this._heldMouse = new Set();
    }

    isKeyPressed(key: string): boolean {
        return this._heldKeys.has(key) && !this._prevHeldKeys.has(key);
    }
    isKeyHeld(key: string): boolean {
        return this._heldKeys.has(key);
    }
    isKeyReleased(key: string): boolean {
        return !this._heldKeys.has(key) && this._prevHeldKeys.has(key);
    }
    isMousePressed(btn: number): boolean {
        return this._heldMouse.has(btn) && !this._prevHeldMouse.has(btn);
    }
    isMouseHeld(btn: number): boolean {
        return this._heldMouse.has(btn);
    }
    isMouseReleased(btn: number): boolean {
        return !this._heldMouse.has(btn) && this._prevHeldMouse.has(btn);
    }

    tick() {
        [this._prevHeldKeys, this._heldKeys] = [this._heldKeys, this._prevHeldKeys];
        [this._prevHeldMouse, this._heldMouse] = [this._heldMouse, this._prevHeldMouse];
        this._heldKeys.clear();
        this._heldMouse.clear();
        // wheel stuff works differently so we just exclude it. TODO handle this in a less janky way
        this._prevHeldKeys.delete('WheelDown');
        this._prevHeldKeys.delete('WheelUp');
        for(const s of this._prevHeldKeys) this._heldKeys.add(s);
        for(const s of this._prevHeldMouse) this._heldMouse.add(s);
    }

    keyDown(key: string) {
        this._heldKeys.add(key);
    }
    keyUp(key: string) {
        this._heldKeys.delete(key);
    }

    mouseDown(btn: number) {
        this._heldMouse.add(btn);
    }
    mouseUp(btn: number) {
        this._heldMouse.delete(btn);
    }

    clear() {
        this._heldKeys.clear();
        this._heldMouse.clear();
    }
    forceClear() {
        this._heldKeys.clear();
        this._prevHeldKeys.clear();
        this._heldMouse.clear();
        this._prevHeldMouse.clear();
    }
}

async function main() {
    setupDebugToggles();

    const imagesPromise = loadImages([...TEXTURE_NAMES]);

    const rendererContainer = getElementByIdAndValidate('renderer_container', { document });
    const clickToPlayElem = getElementByIdAndValidate('click_to_play', { document });

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
    camera.layers.enableAll();
    const renderer = new WebGLRenderer();

    const keysManager = new KeysManager();

    const atlas = atlasImages(await imagesPromise, { initialAtlasSize: 2 });
    // show atlas (TODO: probably move this elsewhere)
    {
        const atlasDisplayContainer = getElementByIdAndValidate('atlas_display_container');
        // TODO temp debug thing, move this somewhere else
        for(const [level, tex] of atlas.textures) {
            atlasDisplayContainer.appendChild(tex as HTMLCanvasElement);
            Object.assign((tex as HTMLCanvasElement).style, {
                width:  `${atlas.width}px`,
                height: `${atlas.width}px`,
                imageRendering: 'pixelated',
                border: (level <= atlas.maxMipLevel)  ? '2px solid #0000' : '2px solid #F00',
            });
        }
    }

    const world = await MCWorld.openWorld('new world', atlas);
    world.camera = camera;
    scene.add(world);

    // const controls = new FirstPersonControls(camera, rendererContainer);
    // controls.enabled = false;
    let lastLockTime: number | DOMHighResTimeStamp | null = null;
    const lockCooldown = 1250;
    // document.addEventListener('pointerlockchange', (ev) => {
    //     if(document.pointerLockElement === rendererContainer) {
    //         console.log(document.pointerLockElement);
    //         clickToPlayElem.style.display = 'none';
    //         controls.enabled = true;
    //     } else if(document.pointerLockElement === null) {
    //         clickToPlayElem.style.display = '';
    //         lastLockTime = performance.now();
    //         controls.enabled = false;
    //     }
    // });
    // clickToPlayElem.addEventListener('click', (ev) => {
    //     try {
    //         if(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
    //         if(lastLockTime !== null && (performance.now() - lastLockTime) < lockCooldown) return;
    //         rendererContainer.requestPointerLock();
    //     } catch(err) {
    //         console.warn('error requesting pointer lock', err);
    //     }
    // });
    const controls = new PointerLockControls(camera, rendererContainer);
    clickToPlayElem.addEventListener('click', (ev) => {
        if(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey) return;
        if(lastLockTime !== null && (performance.now() - lastLockTime) < lockCooldown) return;
        controls.lock();
        console.log('locking');
    });
    controls.addEventListener('lock', (ev) => {
        clickToPlayElem.style.display = 'none';
    });
    controls.addEventListener('unlock', (ev) => {
        clickToPlayElem.style.display = '';
        lastLockTime = performance.now();
        keysManager.clear();
    });
    controls.connect();
    scene.add(controls.getObject());
    window.addEventListener('keydown', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            keysManager.keyDown(ev.code);
        }
    }, { capture: true, passive: false });
    window.addEventListener('keyup', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            keysManager.keyUp(ev.code);
        }
    }, { capture: true, passive: false });
    window.addEventListener('keypress', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
        }
    }, { capture: true, passive: false });
    window.addEventListener('mousedown', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            keysManager.mouseDown(ev.button);
        }
    });
    window.addEventListener('mouseup', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            keysManager.mouseUp(ev.button);
        }
    });
    window.addEventListener('wheel', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            if(ev.deltaY > 0) keysManager.keyDown('WheelDown');
            if(ev.deltaY < 0) keysManager.keyDown('WheelUp');
            // keysManager.keyDown(ev.);
        }
    }, { passive: false });
    //@ts-ignore-next-error
    controls.pointerSpeed = 1.5;

    function rendererResize() {
        const width = rendererContainer.clientWidth;
        const height = rendererContainer.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }
    rendererContainer.appendChild(renderer.domElement);
    new ResizeObserver((entries) => {
        rendererResize();
    }).observe(rendererContainer);

    // {
        const ambientLight = new AmbientLight(0xffffff, .2);
        scene.add(ambientLight);
        const pointLight = new PointLight(0xffffff, 1, 100);
        pointLight.position.set(0, 10, 0);
        scene.add(pointLight);
        const spotlight = new SpotLight(0xffffff, 1, 30, Math.PI * (3/16), .1);
        // const spotlightTarget = new Object3D();
        scene.add(spotlight);
        // scene.add(spotlightTarget);
        // spotlight.target = spotlightTarget;
        scene.add(spotlight.target);
        // spotlightTarget.position.z += 8;
    // }
    // camera.position.z = 5;
    camera.position.y = 50;


    new OBJLoader().loadAsync('teapot.obj').then(teapot => {
        console.log('teapot loaded');
        teapot.position.y += 50;
        teapot.position.x += 16;
        // teapot.scale.set(4, 4, 4);
        scene.add(teapot);
    });

    // controls.lookSpeed = 0.4;
    // controls.movementSpeed = 20;

    const baseMoveSpeed = 5.0;
    let lastTickTime: number | DOMHighResTimeStamp = performance.now();
    let fastMove = false;
    function renderTick(time: DOMHighResTimeStamp) {
        const delta = time - lastTickTime;
        // ====
        let moveSpeed = baseMoveSpeed * (delta / 1000);
        if(keysManager.isKeyPressed('Backquote')) fastMove = !fastMove;
        if(fastMove) moveSpeed *= 4;
        const movementDelta = new Vector3(0, 0, 0);
        if(keysManager.isKeyHeld('KeyW')) movementDelta.z -= 1;
        if(keysManager.isKeyHeld('KeyS')) movementDelta.z += 1;
        if(keysManager.isKeyHeld('KeyA')) movementDelta.x -= 1;
        if(keysManager.isKeyHeld('KeyD')) movementDelta.x += 1;
        if(keysManager.isKeyHeld('Space')) movementDelta.y += 1;
        if(keysManager.isKeyHeld('ShiftLeft')) movementDelta.y -= 1;
        if(keysManager.isKeyPressed('KeyF')) spotlight.visible = !spotlight.visible;
        movementDelta.normalize().multiplyScalar(moveSpeed);
        const movvec = new Vector3();
        const tmpvec = new Vector3();
        movvec
            .add(tmpvec.setFromMatrixColumn(camera.matrix, 0).cross(camera.up).multiplyScalar(movementDelta.z))
            .add(tmpvec.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(movementDelta.x))
            .add(tmpvec.copy(camera.up).multiplyScalar(movementDelta.y));
        camera.position.add(movvec);
        world.tryBreakBlock = keysManager.isMousePressed(0);
        world.tryPlaceBlock = keysManager.isMousePressed(2);
        if(keysManager.isKeyPressed('WheelDown')) world.nextBlock();
        if(keysManager.isKeyPressed('WheelUp')) world.prevBlock();

        pointLight.position.x = camera.position.x;
        pointLight.position.z = camera.position.z;
        pointLight.position.y = 100;
        spotlight.position.copy(camera.position);
        // spotlight.quaternion.copy(camera.quaternion);
        // spotlightTarget.position.copy(camera.position);
        camera.getWorldDirection(tmpvec);
        spotlight.target.position.copy(camera.position);
        spotlight.target.position.add(tmpvec);
        // spotlightTarget.position.add(camera.look)

        // ====
        world.rebuildMeshes();
        // ====
        renderer.render(scene, camera);
        // ====
        lastTickTime = time;
        keysManager.tick();
        world.clientTick();
        requestAnimationFrame(renderTick);
    }
    // @ts-expect-error
    window.world = world; window.scene = scene;

    async function serverTick() {
        world.updatePlayerPos(camera.position);
        await world.serverTick();
        setTimeout(serverTick, 0);
    }

    renderTick(performance.now());
    setTimeout(serverTick, 0);
}

window.addEventListener('DOMContentLoaded', (ev) => {
    main();
});
