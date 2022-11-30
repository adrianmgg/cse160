import { AmbientLight, BoxGeometry, Euler, Mesh, MeshBasicMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, Scene, Vector3, WebGLRenderer } from 'three';
import { getElementByIdAndValidate } from './util';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { MCWorld, TEXTURE_NAMES } from './mc';
import { atlasImages, loadImages } from './texture';
import { debugToggles, setupDebugToggles } from './debug_toggles';

class KeysManager {
    private _prevHeldKeys: Set<string>;
    private _heldKeys: Set<string>;
    constructor() {
        this._prevHeldKeys = new Set();
        this._heldKeys = new Set();
    }

    isPressed(key: string): boolean {
        return this._heldKeys.has(key) && !this._prevHeldKeys.has(key);
    }
    isHeld(key: string): boolean {
        return this._heldKeys.has(key);
    }
    isReleased(key: string): boolean {
        return !this._heldKeys.has(key) && this._prevHeldKeys.has(key);
    }

    tick() {
        [this._prevHeldKeys, this._heldKeys] = [this._heldKeys, this._prevHeldKeys];
        this._heldKeys.clear();
        for(const s of this._prevHeldKeys) this._heldKeys.add(s);
    }

    down(key: string) {
        this._heldKeys.add(key);
    }
    up(key: string) {
        this._heldKeys.delete(key);
    }

    clear() {
        this._heldKeys.clear();
    }
    forceClear() {
        this._heldKeys.clear();
        this._prevHeldKeys.clear();
    }
}

async function main() {
    setupDebugToggles();

    const imagesPromise = loadImages([...TEXTURE_NAMES]);

    const rendererContainer = getElementByIdAndValidate('renderer_container', { document });
    const clickToPlayElem = getElementByIdAndValidate('click_to_play', { document });

    const scene = new Scene();
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000);
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
            keysManager.down(ev.code);
        }
    }, { capture: true, passive: false });
    window.addEventListener('keyup', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
            keysManager.up(ev.code);
        }
    }, { capture: true, passive: false });
    window.addEventListener('keypress', (ev) => {
        if(controls.isLocked) {
            ev.preventDefault();
            ev.stopImmediatePropagation();
            ev.stopPropagation();
        }
    }, { capture: true, passive: false });
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

    {
        const ambientLight = new AmbientLight(0xffffff, .2);
        scene.add(ambientLight);
        const light = new PointLight(0xffffff, 1, 100);
        light.position.set(0, 10, 0);
        scene.add(light);
    }
    // camera.position.z = 5;
    camera.position.y = 50;

    // controls.lookSpeed = 0.4;
    // controls.movementSpeed = 20;

    const baseMoveSpeed = 5.0;
    let lastTickTime: number | DOMHighResTimeStamp = performance.now();
    let fastMove = false;
    function renderTick(time: DOMHighResTimeStamp) {
        const delta = time - lastTickTime;
        // ====
        let moveSpeed = baseMoveSpeed * (delta / 1000);
        if(keysManager.isPressed('Backquote')) fastMove = !fastMove;
        if(fastMove) moveSpeed *= 4;
        const movementDelta = new Vector3(0, 0, 0);
        if(keysManager.isHeld('KeyW')) movementDelta.z -= 1;
        if(keysManager.isHeld('KeyS')) movementDelta.z += 1;
        if(keysManager.isHeld('KeyA')) movementDelta.x -= 1;
        if(keysManager.isHeld('KeyD')) movementDelta.x += 1;
        if(keysManager.isHeld('Space')) movementDelta.y += 1;
        if(keysManager.isHeld('ShiftLeft')) movementDelta.y -= 1;
        movementDelta.normalize().multiplyScalar(moveSpeed);
        const movvec = new Vector3();
        const tmpvec = new Vector3();
        movvec
            .add(tmpvec.setFromMatrixColumn(camera.matrix, 0).cross(camera.up).multiplyScalar(movementDelta.z))
            .add(tmpvec.setFromMatrixColumn(camera.matrix, 0).multiplyScalar(movementDelta.x))
            .add(tmpvec.copy(camera.up).multiplyScalar(movementDelta.y));
        camera.position.add(movvec);
        // ====
        world.rebuildMeshes();
        // ====
        renderer.render(scene, camera);
        // ====
        lastTickTime = time;
        keysManager.tick();
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
