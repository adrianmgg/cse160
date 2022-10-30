import { assert, isPow2, setFind, setMap } from "./util.js";

function loadImgFromPath(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.addEventListener('load', ev => resolve(img));
        img.src = path;
    });
}

function texName2Path(name: string): string {
    return `textures/${name}.png`;
}

export async function loadImage(name: string): Promise<TexImageSource> {
    return await loadImgFromPath(texName2Path(name));
}

export async function loadImages(names: string[]): Promise<(readonly [name: string, img: HTMLImageElement])[]> {
    return await Promise.all(names.map(
        async (name) => [name, await loadImgFromPath(texName2Path(name))] as const
    ));
}

export type TextureAtlasInfo = {
    readonly image: TexImageSource;
    readonly texturePositions: Record<string, DOMRectReadOnly>;
    readonly mipImages: (readonly [mipLevel: number, image: TexImageSource])[];
};

// TODO factor these out to some settings thing, preferably one that can be changed at runtime
/** debug switch, draw internal state of atlasing algorithm to atlas image */
const drawFreeRects = false;
/** debug switch, colorize mipmap levels */
const colorizeMipLevels = false;

/** whether a and b overlap */
function overlaps(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
    // return !(a.top > b.bottom || a.right < b.left || a.bottom < b.top || a.left > b.right);
    return !(a.top >= b.bottom || a.right <= b.left || a.bottom <= b.top || a.left >= b.right);
}
/** whether a fits inside b (regardless of its current position) */
function fitsIn(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
    return a.width <= b.width && a.height <= b.height;
}
/** whether b &sube; a */
function contains(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
    return a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom;
}
function isDegenerate(r: DOMRectReadOnly): boolean {
    return r.width < 1 || r.height < 1;
}
function addIIFNotDegenerate(set: Set<DOMRectReadOnly>, r: DOMRectReadOnly) {
    if(!isDegenerate(r)) set.add(r);
}

type AtlasBuilderInput = (readonly [name: string, img: HTMLImageElement])[];

export function atlasImages(images: AtlasBuilderInput, initialAtlasSize: number = 128): TextureAtlasInfo {
    let atlasSize: number = initialAtlasSize;
    let ret: TextureAtlasInfo | null;
    while((ret = atlasImages_(images, atlasSize)) === null) {
        console.warn(`${atlasSize}x${atlasSize} atlas was too small to store all of the provided textures, trying the next size up.`);
        atlasSize *= 2;
    }
    return ret;
}

function atlasImages_(images: AtlasBuilderInput, atlasSize: number): TextureAtlasInfo | null {
    assert(isPow2(atlasSize), 'texture atlas dimension must be a power of 2');
    // setup initial free rectangles
    // DOMRectReadOnly already has everything we need, so might as well just use that instead of writing our
    // own rect stuff
    // const freeRects: DOMRectReadOnly[] = [];
    let freeRects: Set<DOMRectReadOnly> = new Set();
    freeRects.add(new DOMRectReadOnly(0, 0, atlasSize, atlasSize));

    //
    let packedRects: [string, HTMLImageElement, DOMRectReadOnly][] = [];

    // pack our images
    // TODO cite ("a thousand ways wto pack the bin", Algorithm 3: The Maximal Rectangles algorithm.)
    for(const [name, img] of images) {
        // const imgRect = new DOMRectReadOnly(0, 0, img.width, img.height);
        const imgRect = new DOMRectReadOnly(0, 0, img.width, img.height);
        // " Decide the free rectangle F_i to pack the rectangle R into
        const chosenFreeRect = setFind(freeRects,  r => fitsIn(imgRect, r));
        if(chosenFreeRect === undefined) return null;
        // " Decide the orientation for the rectangle and place it at the bottom-left of F_i
        // (here I've adjusted it to use top left)
        // " Denote by B the bounding box of R in the bin after it has been positioned
        const packedRect = new DOMRectReadOnly(chosenFreeRect.left, chosenFreeRect.top, imgRect.width, imgRect.height);
        packedRects.push([name, img, packedRect]);
        // " Use the MAXRECTS split scheme to subdivide F_i into F' and F''
        // " Set F <- F union {F', F''} \ {F_i}
        freeRects.delete(chosenFreeRect);
        const f1 = new DOMRectReadOnly(chosenFreeRect.x, packedRect.bottom, chosenFreeRect.width, chosenFreeRect.height - packedRect.height);
        const f2 = new DOMRectReadOnly(packedRect.right, chosenFreeRect.y, chosenFreeRect.width - packedRect.width, chosenFreeRect.height);
        if(!isDegenerate(f1)) freeRects.add(f1);
        if(!isDegenerate(f2)) freeRects.add(f2);
        // " for each free rectangle f do
        let newFreeRects = [];
        for(const freeRect of freeRects) {
            // " Compute f \ B and substitute the result into at most four new rectangles G_1...G_4
            // " Set F <- F union {G_1,...,G_4} \ {f}
            if(!overlaps(freeRect, packedRect)) continue;
            const g1 = new DOMRectReadOnly(packedRect.right, freeRect.top, Math.max(0, freeRect.right - packedRect.right), freeRect.height);
            const g2 = new DOMRectReadOnly(freeRect.left, packedRect.bottom, Math.max(0, freeRect.width - g1.width), Math.max(0, freeRect.bottom - packedRect.bottom));
            const g3 = new DOMRectReadOnly(freeRect.left, freeRect.top, Math.max(0, packedRect.left - freeRect.left), Math.max(0, packedRect.bottom - freeRect.top));
            const g4 = new DOMRectReadOnly(g3.left + g3.width, freeRect.top, Math.max(0, freeRect.width - g2.width - g3.width), Math.max(0, packedRect.top - freeRect.top));
            if(!isDegenerate(g1)) newFreeRects.push(g1);
            if(!isDegenerate(g2)) newFreeRects.push(g2);
            if(!isDegenerate(g3)) newFreeRects.push(g3);
            if(!isDegenerate(g4)) newFreeRects.push(g4);
            freeRects.delete(freeRect);
        }
        for(const r of newFreeRects) {
            freeRects.add(r);
        }
        // " for each ordered pair of free rectangles F_i, F_j do
        const toRemove = new Set<DOMRectReadOnly>();
        for(const r1 of freeRects) {
            for(const r2 of freeRects) {
                if(r1 === r2) continue;
                if(toRemove.has(r1)) continue;
                if(toRemove.has(r2)) continue;
                // " if F_i contains F_j then
                if(contains(r1, r2)) {
                    // " Set F <- F \ {F_j}
                    // freeRects.delete(r2);
                    // toRemove.add(r1);
                    toRemove.add(r2);
                    // break;
                }
            }
        }
        for(const r of toRemove) freeRects.delete(r);
    }

    // set up the canvas we'll be drawing the atlas to
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = atlasSize;
    atlasCanvas.height = atlasSize;
    const atlasCtx = atlasCanvas.getContext('2d');
    assert(atlasCtx !== null);

    const mipCanvases: (readonly [number, HTMLCanvasElement, CanvasRenderingContext2D])[] = [];
    for(let mipLevel = 1; atlasSize / Math.pow(2, mipLevel) >= 1; mipLevel++) {
        const mipScale = Math.pow(2, mipLevel);
        const mipSize = atlasSize / mipScale;
        assert(isPow2(mipSize));
        const canvas = document.createElement('canvas');
        canvas.width = mipSize;
        canvas.height = mipSize;
        const ctx = canvas.getContext('2d');
        assert(ctx !== null);
        mipCanvases.push([mipLevel, canvas, ctx] as const);
    }

    atlasCtx.fillStyle = '#000';
    atlasCtx.fillRect(0, 0, atlasSize, atlasSize);

    // draw the textures
    for(const [name, tex, rect] of packedRects) {
        // draw the full size
        atlasCtx.drawImage(tex, rect.x, rect.y, rect.width, rect.height);
        // draw the mipmaps
        // TODO how will this handle non power-of-2 dimensioned textures? probably wrong so might need to require that
        // for(let s = 2; s <= tex.width && s <= tex.height; s *= 2) {
            // atlasCtx.drawImage(tex, rect.x / s, rect.y / s, rect.width / s, rect.height / s);
        // }
        for(const [mipLevel, _, mipCtx] of mipCanvases) {
            const mipScale = Math.pow(2, mipLevel);
            mipCtx.drawImage(tex, rect.x / mipScale, rect.y / mipScale, rect.width / mipScale, rect.height / mipScale);
        }
    }

    if(colorizeMipLevels) {
        for(const [level, canvas, ctx] of mipCanvases) {
            ctx.fillStyle = `hsla(${level / mipCanvases.length * 100 * 300}, 100%, 50%, 0.5)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // debug - draw the remaining free rects
    if(drawFreeRects) {
        const abc: [DOMRectReadOnly, string][] = [];
        for(const r of freeRects) {
            const rgb = `${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}`;
            abc.push([r, rgb]);
        }
        for(const [r, rgb] of abc){
            atlasCtx.fillStyle = `rgba(${rgb}, .2)`;
            atlasCtx.fillRect(r.x, r.y, r.width, r.height);
        }
        for(const [r, rgb] of abc){
            atlasCtx.strokeStyle = `rgba(${rgb}, .5)`;
            atlasCtx.lineWidth = 1;
            atlasCtx.strokeRect(r.x + .5, r.y + .5, r.width - 1, r.height - 1);
        }
    }

    const texturePositions = Object.fromEntries(packedRects.map(([name, tex, r]) => [
        name,
        new DOMRectReadOnly(r.x / atlasSize, r.y / atlasSize, r.width / atlasSize, r.height / atlasSize),
    ] as const));

    const mipImages = mipCanvases.map(([level, canvas, ctx]) => [level, canvas] as const);
    console.log(mipImages);

    return {image: atlasCanvas, texturePositions, mipImages};
}
