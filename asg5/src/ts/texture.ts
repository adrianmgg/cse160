import { CanvasTexture, NearestFilter, NearestMipMapLinearFilter, RepeatWrapping, Texture, UVMapping } from "three";
import { debugToggles } from "./debug_toggles";
import { assert, isPow2, setFind, setMap, warnRateLimited } from "./util";

function loadImgFromPath(path: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = document.createElement('img');
        img.addEventListener('load', ev => resolve(img));
        img.src = path;
    });
}

function texName2Path(name: string): string {
    return `textures/${name}.png`;
    // return `textures/debug.png`;
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
    readonly texturePositions: Record<string, DOMRectReadOnly>;
    readonly textures: (readonly [mipLevel: number, image: TexImageSource])[];
    /** highest mipmap level where no atlased textures overlap */
    readonly maxMipLevel: number;
    readonly width: number;
    readonly height: number;
};

type AtlasBuilderInputItem = readonly [name: string, img: HTMLImageElement];

export function atlasImages(images: AtlasBuilderInputItem[], initialAtlasSize: number = 128): TextureAtlasInfo {
    let atlasSize: number = initialAtlasSize;
    let ret: TextureAtlasInfo | null;
    while((ret = atlasImages_(images, atlasSize)) === null) {
        console.warn(`${atlasSize}x${atlasSize} atlas was too small to store all of the provided textures, trying the next size up.`);
        atlasSize *= 2;
    }
    return ret;
}

/**
 * implementation of the MAXRECTS algorithm from
 * "A Thousand Ways to Pack the Bin - A Practical Approach to Two-Dimensional Rectangle Bin Packing"
 * by Jukka Jylänki
 * 
 * (the algorithm is on page 19, labeled "Algorithm 3: The Maximal Rectangles algorithm")
 */
class RectPacker<T> {
    // DOMRectReadOnly already has everything we need for keeping track of our rectangles, including
    // some useful stuff like automatically calculating the bottom & right sides' location, so I can
    // just use that instead of writing my own

    public readonly width: number;
    public readonly height: number;
    public readonly freeRects: Set<DOMRectReadOnly>;
    public readonly packedRects: (readonly [rect: DOMRectReadOnly, data: T])[] = [];
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.freeRects = new Set();
        this.freeRects.add(new DOMRectReadOnly(0, 0, width, height));
    }

    /** whether a and b overlap */
    private static overlaps(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
        // return !(a.top > b.bottom || a.right < b.left || a.bottom < b.top || a.left > b.right);
        return !(a.top >= b.bottom || a.right <= b.left || a.bottom <= b.top || a.left >= b.right);
    }
    /** whether a fits inside b (regardless of its current position) */
    private static fitsIn(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
        return a.width <= b.width && a.height <= b.height;
    }
    /** whether b &sube; a */
    private static contains(a: DOMRectReadOnly, b: DOMRectReadOnly): boolean {
        return a.left <= b.left && a.right >= b.right && a.top <= b.top && a.bottom >= b.bottom;
    }
    private static isDegenerate(r: DOMRectReadOnly): boolean {
        return r.width < 1 || r.height < 1;
    }
    private static addIIFNotDegenerate(set: Set<DOMRectReadOnly>, r: DOMRectReadOnly) {
        if(!RectPacker.isDegenerate(r)) set.add(r);
    }

    /**
     * @returns boolean representing whether the insert was successful. if false this indicates that
     * the data was NOT inserted, so should likely be treated as an error.
     */
    insertRect(data: T, width: number, height: number): boolean {
        const imgRect = new DOMRectReadOnly(0, 0, width, height);
        // " Decide the free rectangle F_i to pack the rectangle R into
        const chosenFreeRect = setFind(this.freeRects, r => RectPacker.fitsIn(imgRect, r));
        if(chosenFreeRect === undefined) return false;
        // " Decide the orientation for the rectangle and place it at the bottom-left of F_i
        // (here I've adjusted it to use top left)
        // " Denote by B the bounding box of R in the bin after it has been positioned
        const packedRect = new DOMRectReadOnly(chosenFreeRect.left, chosenFreeRect.top, imgRect.width, imgRect.height);
        this.packedRects.push([packedRect, data] as const);
        // " Use the MAXRECTS split scheme to subdivide F_i into F' and F''
        // " Set F <- F union {F', F''} \ {F_i}
        this.freeRects.delete(chosenFreeRect);
        const f1 = new DOMRectReadOnly(chosenFreeRect.x, packedRect.bottom, chosenFreeRect.width, chosenFreeRect.height - packedRect.height);
        const f2 = new DOMRectReadOnly(packedRect.right, chosenFreeRect.y, chosenFreeRect.width - packedRect.width, chosenFreeRect.height);
        if(!RectPacker.isDegenerate(f1)) this.freeRects.add(f1);
        if(!RectPacker.isDegenerate(f2)) this.freeRects.add(f2);
        // " for each free rectangle f do
        let newFreeRects = [];
        for(const freeRect of this.freeRects) {
            // " Compute f \ B and substitute the result into at most four new rectangles G_1...G_4
            // " Set F <- F union {G_1,...,G_4} \ {f}
            if(!RectPacker.overlaps(freeRect, packedRect)) continue;
            const g1 = new DOMRectReadOnly(packedRect.right, freeRect.top, Math.max(0, freeRect.right - packedRect.right), freeRect.height);
            const g2 = new DOMRectReadOnly(freeRect.left, packedRect.bottom, Math.max(0, freeRect.width - g1.width), Math.max(0, freeRect.bottom - packedRect.bottom));
            const g3 = new DOMRectReadOnly(freeRect.left, freeRect.top, Math.max(0, packedRect.left - freeRect.left), Math.max(0, packedRect.bottom - freeRect.top));
            const g4 = new DOMRectReadOnly(g3.left + g3.width, freeRect.top, Math.max(0, freeRect.width - g2.width - g3.width), Math.max(0, packedRect.top - freeRect.top));
            if(!RectPacker.isDegenerate(g1)) newFreeRects.push(g1);
            if(!RectPacker.isDegenerate(g2)) newFreeRects.push(g2);
            if(!RectPacker.isDegenerate(g3)) newFreeRects.push(g3);
            if(!RectPacker.isDegenerate(g4)) newFreeRects.push(g4);
            this.freeRects.delete(freeRect);
        }
        for(const r of newFreeRects) {
            this.freeRects.add(r);
        }
        // " for each ordered pair of free rectangles F_i, F_j do
        const toRemove = new Set<DOMRectReadOnly>();
        for(const r1 of this.freeRects) {
            for(const r2 of this.freeRects) {
                if(r1 === r2) continue;
                if(toRemove.has(r1)) continue;
                if(toRemove.has(r2)) continue;
                // " if F_i contains F_j then
                if(RectPacker.contains(r1, r2)) {
                    // " Set F <- F \ {F_j}
                    // freeRects.delete(r2);
                    // toRemove.add(r1);
                    toRemove.add(r2);
                    // break;
                }
            }
        }
        for(const r of toRemove) {
            this.freeRects.delete(r);
        }
        // success!
        return true;
    }
}

function atlasImages_(images: AtlasBuilderInputItem[], atlasSize: number, margin: number = 16): TextureAtlasInfo | null {
    assert(isPow2(atlasSize), 'texture atlas dimension must be a power of 2');
    const atlasPack = new RectPacker<AtlasBuilderInputItem>(atlasSize, atlasSize);

    for(const img of images) {
        // if(!(atlasPack.insertRect(img, img[1].width, img[1].height))) {
        if(!(atlasPack.insertRect(img, img[1].width + margin * 2, img[1].height + margin * 2))) {
            return null;
        }
    }

    
    const mipCanvases: (readonly [number, HTMLCanvasElement, CanvasRenderingContext2D])[] = [];
    for(let mipLevel = 0; atlasSize / Math.pow(2, mipLevel) >= 1; mipLevel++) {
        const mipScale = Math.pow(2, mipLevel);
        const mipSize = atlasSize / mipScale;
        assert(isPow2(mipSize));
        const canvas = document.createElement('canvas');
        canvas.width = mipSize;
        canvas.height = mipSize;
        const ctx = canvas.getContext('2d');
        assert(ctx !== null);
        // ctx.imageSmoothingEnabled = false;
        mipCanvases.push([mipLevel, canvas, ctx] as const);
        // debug - fill with magenta
        ctx.fillStyle = debugToggles.has('draw_atlas_packing_internal_state') ? '#fff' : '#00F';
        ctx.fillRect(0, 0, mipSize, mipSize);
    }
    
    // atlasCtx.fillStyle = '#000';
    // atlasCtx.fillRect(0, 0, atlasSize, atlasSize);
    
    // store uv coordinates of each packed texture
    const texturePositions: Record<string, DOMRectReadOnly> = {};
    for(const [rect, [name, tex]] of atlasPack.packedRects) {
        // store the rect (transformed to [0, 1] uv space) to be returned
        if(name in texturePositions) {
            warnRateLimited(`duplicate texture name "${name}" in texture atlas, duplicates will be stored but only one will be accessible`);
        } else {
            // texturePositions[name] = new DOMRectReadOnly(rect.x / atlasSize, rect.y / atlasSize, rect.width / atlasSize, rect.height / atlasSize);
            texturePositions[name] = new DOMRectReadOnly((rect.x + margin) / atlasSize, (rect.y + margin) / atlasSize, (rect.width - margin * 2) / atlasSize, (rect.height - margin * 2) / atlasSize);
            // const a = 1e-2;
            // texturePositions[name] = new DOMRectReadOnly(rect.x / atlasSize, rect.y / atlasSize, (rect.width - a) / atlasSize, (rect.height - a) / atlasSize);
        }
    }

    // render each mipmap level, also keep track of what the highest ok mipmap level is
    let maxMipLevel = 0;
    let passedMaxMipLevel = false;
    for(const [mipLevel, _, mipCtx] of mipCanvases) {
        let allWholeNumberSizes = true;
        for(const [rect, [name, tex]] of atlasPack.packedRects) {
            const mipScale = Math.pow(2, mipLevel);
            // let drawX = rect.x / mipScale, drawY = rect.y / mipScale, drawWidth = rect.width / mipScale, drawHeight = rect.height / mipScale;
            let drawX = (rect.x + margin) / mipScale, drawY = (rect.y + margin) / mipScale, drawWidth = (rect.width - margin * 2) / mipScale, drawHeight = (rect.height - margin * 2) / mipScale;
            allWholeNumberSizes &&= Number.isInteger(drawX) && Number.isInteger(drawY) && Number.isInteger(drawWidth) && Number.isInteger(drawHeight);
            if(margin > 0) allWholeNumberSizes &&= Number.isInteger(margin / mipScale);
            for(let a = margin / mipScale; a > 0; a--) {
                mipCtx.drawImage(tex, drawX+a, drawY+a, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX+a, drawY-a, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX-a, drawY+a, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX-a, drawY-a, drawWidth, drawHeight);
                // 
                mipCtx.drawImage(tex, drawX+a, drawY, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX-a, drawY, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX, drawY+a, drawWidth, drawHeight);
                mipCtx.drawImage(tex, drawX, drawY-a, drawWidth, drawHeight);
            }
            mipCtx.drawImage(tex, drawX, drawY, drawWidth, drawHeight);
        }
        if(!passedMaxMipLevel) {
            if(allWholeNumberSizes) maxMipLevel = mipLevel;
            else passedMaxMipLevel = true;
        }
    }

    // optionally draw some debug info about the atlasing process to the free space in the texture
    {
        const fullSizeAtlasCtx = mipCanvases.find(([level]) => level === 0)?.[2];
        assert(fullSizeAtlasCtx !== undefined);
            // debug - draw the remaining free rects
            if(debugToggles.has('draw_atlas_packing_internal_state')) {
                const abc: [DOMRectReadOnly, string][] = [];
                for(const r of atlasPack.freeRects) {
                    const rgb = `${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255}`;
                    abc.push([r, rgb]);
                }
                for(const [r, rgb] of abc){
                    fullSizeAtlasCtx.fillStyle = `rgba(${rgb}, .2)`;
                    fullSizeAtlasCtx.fillRect(r.x, r.y, r.width, r.height);
                }
                for(const [r, rgb] of abc){
                    fullSizeAtlasCtx.strokeStyle = `rgba(${rgb}, .5)`;
                    fullSizeAtlasCtx.lineWidth = 1;
                    fullSizeAtlasCtx.strokeRect(r.x + .5, r.y + .5, r.width - 1, r.height - 1);
                }
            }
    }

    if(debugToggles.has('colorize_mipmaps')) {
        for(const [level, canvas, ctx] of mipCanvases) {
            ctx.fillStyle = `hsla(${level / (mipCanvases.length - 1) * 300}, 100%, 50%, 0.5)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    const mipImages = mipCanvases.map(([level, canvas]) => [level, canvas] as const);

    return {texturePositions, textures: mipImages, maxMipLevel, width: atlasSize, height: atlasSize};
}

export function atlasTo3JS(atlas: TextureAtlasInfo): Texture {
    const tex = new Texture();
    tex.image = atlas.textures[0]![1];
    tex.generateMipmaps = false;
    // tex.mipmaps = atlas.textures.map(([mipLevel, tex]) => tex);
    for(const [mipLevel, t] of atlas.textures) {
        tex.mipmaps[mipLevel] = t;
    }
    // TODO make the filters configurable
    tex.magFilter = NearestFilter;
    tex.minFilter = NearestMipMapLinearFilter;
    tex.wrapS = RepeatWrapping;
    tex.wrapT = RepeatWrapping;
    tex.needsUpdate = true;
    tex.mapping = UVMapping;
    return tex;
}
