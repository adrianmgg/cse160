import { idbOpen, idbRequest2Promise } from "./db.js";
import { assert, debugAssert, Dict2D, NTupleOf, warnRateLimited } from "./util.js";
import { Color, Mesh, Vec } from './3d.js';
import type { MyGlStuff, MyStuff } from "./main.js";
import type { TextureAtlasInfo } from "./texture.js";
import { PerlinNoise } from "./noise.js";
import { debugToggles } from "./debug_toggles.js";

const MC_WORLD_IDB_VERSION = 1 as const;

export enum Block {
    AIR = 0,
    STONE = 1,
    GRASS = 2,
    DIRT = 3,
    COBBLESTONE = 4,
    BEDROCK = 7,
}

enum CubeFace { FRONT = 0, RIGHT = 1, UP = 2, LEFT = 3, DOWN = 4, BACK = 5 };

const BLOCK_TEXTURES: Record<Block, null | string | readonly [front: string, right: string, up: string, left: string, down: string, back: string]> = {
    [Block.AIR]:         null,
    [Block.STONE]:       'stone',
    [Block.GRASS]:       ['grass_side', 'grass_side', 'grass_top', 'grass_side', 'dirt', 'grass_side'],
    [Block.DIRT]:        'dirt',
    [Block.COBBLESTONE]: 'cobblestone',
    [Block.BEDROCK]:     'bedrock',
} as const;

function _getTextureFor(block: Block, face: CubeFace, atlas: TextureAtlasInfo): DOMRectReadOnly | null {
    const a = BLOCK_TEXTURES[block];
    if(a === null) return null; // TODO avoid new here.
    if(typeof a === 'string') {
        return atlas.texturePositions[a] ?? null;
    }
    const b = a[face];
    if(b === undefined) return null;
    return atlas.texturePositions[b] ?? null;
}
function getTextureFor(block: Block, face: CubeFace, atlas: TextureAtlasInfo): DOMRectReadOnly {
    return _getTextureFor(block, face, atlas) ?? new DOMRectReadOnly();
}

const block_colors: Record<Block, Color> = {
    [Block.AIR]:         Color.fromRGBHex(0xFFFFFF),
    [Block.STONE]:       Color.fromRGBHex(0x747474),
    [Block.GRASS]:       Color.fromRGBHex(0x589258),
    [Block.DIRT]:        Color.fromRGBHex(0x785539),
    [Block.COBBLESTONE]: Color.fromRGBHex(0x525252),
    [Block.BEDROCK]:     Color.fromRGBHex(0x000000),
}

export class MCWorld {
    private readonly db: IDBDatabase;
    private readonly chunks: Dict2D<number, number, Chunk>;
    private readonly renderDistance: number = 2;
    private readonly noise: PerlinNoise;

    private constructor(db: IDBDatabase) {
        this.db = db;
        this.chunks = new Dict2D();
        this.noise = new PerlinNoise(5489);
    }

    static async openWorld(worldName: string): Promise<MCWorld> {
        const db = await idbOpen(worldName, MC_WORLD_IDB_VERSION, this.upgradeWorldDB);
        const world = new MCWorld(db);
        const spawnChunk = await world.loadChunk(0, 0);
        // spawnChunk.setBlock(0, 0, 20, Block.GRASS);
        // await world.unloadChunk(0, 0);
        // const chunkB = await world.getOrCreateChunk(0, 1);
        // chunkA.vChunks[0] = VChunk.newVChunk();
        // world.saveChunk(chunkA);
        return world;
    }

    static upgradeWorldDB(db: IDBDatabase, ev: IDBVersionChangeEvent): void {
        assert(ev.oldVersion === 0);
        // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#structuring_the_database
        const chunksStore = db.createObjectStore('chunks', { autoIncrement: false, keyPath: 'chunkPos' });
    }

    async loadChunk(chunkX: number, chunkZ: number): Promise<Chunk> {
        // console.log(`loading chunk at ${chunkX},${chunkZ}`);
        const chunk = await this.dbGetOrCreateChunk(chunkX, chunkZ);
        this.chunks.set(chunkX, chunkZ, chunk);
        return chunk;
    }

    async unloadChunk(chunkX: number, chunkY: number): Promise<void> {
        const chunk = this.chunks.get(chunkX, chunkY);
        if(chunk === undefined) return;
        // console.log(`unloading chunk at ${chunkX},${chunkY}`);
        await this.dbSaveChunk(chunk);
        this.chunks.del(chunkX, chunkY);
    }

    private async dbGetChunk(chunkX: number, chunkZ: number): Promise<Chunk | null> {
        const chunkData = await idbRequest2Promise<DBChunkData | undefined>(
            this.db.transaction('chunks', 'readonly')
                .objectStore('chunks')
                .get([chunkX, chunkZ])
        );
        if(chunkData === undefined) return null;
        else return await Chunk.fromDB(chunkData);
    }

    private async dbGetOrCreateChunk(chunkX: number, chunkZ: number): Promise<Chunk> {
        const existingChunk = await this.dbGetChunk(chunkX, chunkZ);
        if(existingChunk !== null) {
            return existingChunk;
        }
        const newChunk = await Chunk.newChunk(chunkX, chunkZ, this.noise);
        // TODO do worldgen here (or maybe in newChunk)
        await idbRequest2Promise(
            this.db.transaction('chunks', 'readwrite')
                .objectStore('chunks')
                .put(newChunk.toDB())
        );
        return newChunk;
    }

    private async dbSaveChunk(chunk: Chunk) {
        // console.log(`saving chunk at ${chunk.chunkPos}`);
        await idbRequest2Promise(
            this.db.transaction('chunks', 'readwrite')
                .objectStore('chunks')
                .put(chunk.toDB())
        );
    }

    public async close(): Promise<void> {
        console.log('saving world');
        console.log('saving all loaded chunks');
        for(const [chunk, [x, y]] of this.chunks) {
            this.dbSaveChunk(chunk);
        }
    }

    rebuildMeshes(stuff: MyStuff) {
        for(const [chunk] of this.chunks) {
            chunk.rebuildMeshes(stuff);
        }
    }

    private static readonly BLOCKSELECT_CUBE_POINTS = new Float32Array([
        0,0,0, 0,0,1,  0,0,1, 0,1,1,  0,1,1, 0,1,0,  0,1,0, 0,0,0,
        1,0,0, 1,0,1,  1,0,1, 1,1,1,  1,1,1, 1,1,0,  1,1,0, 1,0,0,
        0,0,0, 1,0,0,  0,0,1, 1,0,1,  0,1,1, 1,1,1,  0,1,0, 1,1,0,
    ].map(n => (n - 0.5) * 1.01 + 0.5));
    private blockSelectBuf: WebGLBuffer | null = null; // TODO handle this better
    render(stuff: MyGlStuff): void {
        const { gl, program: { attrib: { a_Position }, uniform: { u_BlockPos, u_Color } } } = stuff;
        if(u_Color !== null) gl.uniform4f(u_Color, 0, 0, 0, 0);
        for(const [chunk] of this.chunks) {
            chunk.render(stuff);
        }
        // TODO scissor section in a corner & draw a minimap?
        // TODO should do this stuff elsewhere
        if(this.blockSelectBuf === null) {
            this.blockSelectBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
            gl.bufferData(gl.ARRAY_BUFFER, MCWorld.BLOCKSELECT_CUBE_POINTS, gl.STATIC_DRAW);
        }
        if(this.focusedBlockPos !== null) {
            if(a_Position !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
                gl.enableVertexAttribArray(a_Position);
                gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
            }
            if(u_BlockPos !== null) gl.uniform3f(u_BlockPos, this.focusedBlockPos.x, this.focusedBlockPos.y, this.focusedBlockPos.z);
            if(u_Color !== null) gl.uniform4f(u_Color, 0, 1, 0, 1);
            gl.drawArrays(gl.LINES, 0, MCWorld.BLOCKSELECT_CUBE_POINTS.length / 3);
        }
    }

    // TODO should move player pos into world eventually, then this can be computed from that rather
    //      than passed in
    private playerChunkX: number = 0;
    private playerChunkZ: number = 0;
    updatePlayerPos(pos: Vec) {
        this.playerChunkX = Math.floor(pos.x / 16);
        this.playerChunkZ = Math.floor(pos.z / 16);
    }
    private shouldBeLoaded(chunkX: number, chunkZ: number): boolean {
        return Math.max(Math.abs(this.playerChunkX - chunkX), Math.abs(this.playerChunkZ - chunkZ)) <= this.renderDistance;
    }

    private readonly unloadChunksJob: AsyncGenerator<void, void, void> = this.unloadChunksJobFunc();
    private async *unloadChunksJobFunc(): AsyncGenerator<void, void, void> {
        while(true) {
            let didUnloadAny = false;
            for(const [chunk, [chunkX, chunkZ]] of this.chunks) {
                if(!this.shouldBeLoaded(chunkX, chunkZ)) {
                    await this.unloadChunk(chunkX, chunkZ);
                    yield;
                    didUnloadAny = true;
                }
            }
            // avoid infinite loop when there's no chunks to unload
            if(!didUnloadAny) yield;
        }
    }

    private readonly loadChunksJob: AsyncGenerator<void, void, void> = this.loadChunksJobFunc();
    private async *loadChunksJobFunc(): AsyncGenerator<void, void, void> {
        while(true) {
            let didLoadAny = false;
            // TODO should do the one closest to the player every time
            for(let ox = -this.renderDistance; ox <= this.renderDistance; ox++) {
                for(let oz = -this.renderDistance; oz <= this.renderDistance; oz++) {
                    const x = this.playerChunkX + ox;
                    const z = this.playerChunkZ + oz;
                    if(this.shouldBeLoaded(x, z) && !this.chunks.has(x, z)) {
                        await this.loadChunk(x, z);
                        yield;
                        didLoadAny = true;
                    }
                }
            }
            // avoid infinite loop when there's no chunks to load
            if(!didLoadAny) yield;
        }
    }

    async serverTick(): Promise<void> {
        await this.unloadChunksJob.next();
        await this.loadChunksJob.next();
    }

    private getBlock(x: number, y: number, z: number): Block {
        if(y < 0 || y > 255) return Block.AIR;
        const cX = Math.floor(x / 16);
        const cZ = Math.floor(z / 16);
        return this.chunks.get(cX, cZ)?.getBlock(x - (cX * 16), y, z - (cZ * 16)) ?? Block.AIR;
    }

    setBlock(x: number, y: number, z: number, block: Block) {
        const cX = Math.floor(x / 16);
        const cZ = Math.floor(z / 16);
        const chunk = this.chunks.get(cX, cZ);
        assert(chunk !== undefined, 'tried to set block in unloaded chunk');
        chunk.setBlock(x - (cX * 16), y, z - (cZ * 16), block);
    }

    private focusedBlockPos: Vec | null = null;
    focusBlock(v: Vec | null) {
        this.focusedBlockPos = (v === null) ? null : v.clone();
    }

    // implementation of "A fast voxel traversal algorithm for ray tracing." by John Amanatides and Andrew Woo
    intersect(pos: Vec, dir: Vec, maxDistance: number): null | readonly [Vec, Block] {
        // "The initialization phase begins by identifying the voxel in which the ray origin is
        //  found"
        let curBlockPos = pos.floor();
        // "stepX and stepY are initialized to either 1 or -1 indicating whether X and Y are
        //  incremented or decremented as the ray crosses voxel boundaries (this is determined by
        //  the sign of the x and y components of v)""
        let step = dir.sign();
        // "determine the value of t at which the ray crosses the first ... voxel boundary"
        const maxT = curBlockPos.add(step).subInPlace(pos).divInPlace(dir);
        // "compute ... how far along the ray we must move (in units of t) for the ... component of
        //  such a movement to equal the width of a voxel"
        const delta = step.div(dir);

        if(Number.isNaN(maxT.x)) maxT.x = Infinity;
        if(Number.isNaN(maxT.y)) maxT.y = Infinity;
        if(Number.isNaN(maxT.z)) maxT.z = Infinity;
        if(Number.isNaN(delta.x)) delta.x = 0;
        if(Number.isNaN(delta.y)) delta.y = 0;
        if(Number.isNaN(delta.z)) delta.z = 0;

        // if(dir.x === 0 && dir.z === 0 && dir.y !== 0) {
        //     // console.log({dir, step, maxT, delta, curBlockPos: curBlockPos.clone()});
        //     console.log(curBlockPos.add(step), curBlockPos.add(step).subInPlace(pos), curBlockPos.add(step).subInPlace(pos).divInPlace(dir));
        // }

        // incremental phase
        // (i've modified the algorithm to use a maximum distance cutoff rather than preset bounds)
        let distanceSoFarPrev: number | null = null;
        let distanceSoFar: number = 0;
        while(true) {
            // console.log(distanceSoFar);
            // check current block
            const curBlock = this.getBlock(curBlockPos.x, curBlockPos.y, curBlockPos.z);
            if(curBlock !== Block.AIR) {
                // return [pos.add(dir.mul(distanceSoFar)), ] as const;
                return [curBlockPos, curBlock];
            }

            // do the next incremental phase
            if(maxT.x < maxT.y) {
                if(maxT.x < maxT.z) {
                    curBlockPos.x += step.x;
                    maxT.x += delta.x;
                    distanceSoFar += delta.x;
                } else {
                    curBlockPos.z += step.z;
                    maxT.z += delta.z;
                    distanceSoFar += delta.z;
                }
            } else {
                if(maxT.y < maxT.z) {
                    curBlockPos.y += step.y;
                    maxT.y += delta.y;
                    distanceSoFar += delta.y;
                } else {
                    curBlockPos.z += step.z;
                    maxT.z += delta.z;
                    distanceSoFar += delta.z;
                }
            }

            if(distanceSoFar > maxDistance || distanceSoFar === distanceSoFarPrev) {
                break;
            }
            distanceSoFarPrev = distanceSoFar;
        } // while(distanceSoFar <= maxDistance);
        return null;
    }
}

type DBChunkData = {
    chunkPos: [number, number];
    vChunks: NTupleOf<DBVChunkData | null, 16>;
};
type DBVChunkData = Uint8Array;

export class Chunk {
    readonly chunkPos: Readonly<[number, number]>;
    readonly vChunks: NTupleOf<VChunk | null, 16>;
    private constructor(chunkX: number, chunkZ: number, vChunks: Chunk['vChunks']) {
        this.chunkPos = [chunkX, chunkZ];
        this.vChunks = vChunks;
    }

    get chunkX(): number { return this.chunkPos[0]; }
    get chunkZ(): number { return this.chunkPos[1]; }

    private getVChunk(vChunkY: number): VChunk | null {
        const vc = this.vChunks[vChunkY];
        assert(vc !== undefined, 'vchunk index out of range');
        return vc;
    }
    private getOrCreateVChunk(vChunkY: number): VChunk {
        const existingVC = this.getVChunk(vChunkY);
        if(existingVC !== null) return existingVC;
        return this.vChunks[vChunkY] = VChunk.newVChunk();
    }

    private static vcIdx(y: number): number {
        return y >> 4; // floor(y / 16)
    }

    getBlock(x: number, y: number, z: number): Block {
        const vcY = Chunk.vcIdx(y);
        const vc = this.getVChunk(vcY);
        if(vc === null || vc === undefined) return Block.AIR;
        else return vc.getBlock(x, y - (vcY * 16), z);
    }

    setBlock(x: number, y: number, z: number, block: Block) {
        const vcY = Chunk.vcIdx(y);
        const vc = this.getOrCreateVChunk(vcY);
        vc.setBlock(x, y - (vcY * 16), z, block);
    }

    fillArea(minX: number, minY: number, minZ: number, maxX: number, maxY: number, maxZ: number, block: Block) {
        debugAssert(0 <= minX && minX <  16, 'fillArea() minX out of range');
        debugAssert(0 <= minY && minY < 256, 'fillArea() minY out of range');
        debugAssert(0 <= minZ && minZ <  16, 'fillArea() minZ out of range');
        debugAssert(0 <= maxX && maxX <  16, 'fillArea() maxX out of range');
        debugAssert(0 <= maxY && maxY < 256, 'fillArea() maxY out of range');
        debugAssert(0 <= maxZ && maxZ <  16, 'fillArea() maxZ out of range');
        for(let x = minX; x <= maxX; x++) {
            for(let y = minY; y <= maxY; y++) {
                for(let z = minZ; z <= maxZ; z++) {
                    this.setBlock(x, y, z, block);
                }
            }
        }
    }

    private async doWorldgen(noise: PerlinNoise): Promise<void> {
        console.log(`running worldgen for chunk ${this.chunkPos}`);
        // this.fillArea(0,  0, 0, 15,  0, 15, Block.BEDROCK);
        // this.fillArea(0,  1, 0, 15, 30, 15, Block.STONE);
        // this.fillArea(0, 31, 0, 15, 33, 15, Block.DIRT);
        // this.fillArea(0, 34, 0, 15, 34, 15, Block.GRASS);
        // this.fillArea(0,  0, 0, 15,  0, 15, Block.BEDROCK);
        // this.fillArea(0,  1, 0, 15, 30, 15, Block.STONE);
        // const dirtHeight = Math.floor(Math.random() * 4) + 1;
        // this.fillArea(0, 31, 0, 15, 31 + dirtHeight, 15, Block.DIRT);
        // this.fillArea(0, 31 + dirtHeight + 1, 0, 15, 31 + dirtHeight + 1, 15, Block.GRASS);
        const worldScale = 16 / 18.712891738912;
        for(let x = 0; x < 16; x++) {
            for(let z = 0; z < 16; z++) {
                const sample = noise.sample((this.chunkX + (x / 16)) * worldScale, (this.chunkZ + (z / 16)) * worldScale) / 2 + 0.5;
                // const sample = noise.sample((this.chunkX*16 + x) / 32, (this.chunkZ*16 + z) / 32) / 2 + 0.5;
                const height = 30 + Math.floor(sample * 16);
                // const height = (this.chunkX*16+x) % 200;
                this.fillArea(x, 0, z, x, height, z, Block.STONE);
                this.setBlock(x, 0, z, Block.BEDROCK);
                this.fillArea(x, height + 1, z, x, height + 3, z, Block.DIRT);
                this.setBlock(x, height + 4, z, Block.GRASS);
            }
        }
    }

    static async newChunk(chunkX: number, chunkZ: number, noise: PerlinNoise): Promise<Chunk> {
        const chunk = new Chunk(chunkX, chunkZ, new Array<null>(16).fill(null) as NTupleOf<null, 16>);
        chunk.doWorldgen(noise);
        return chunk;
    }

    static fromDB(data: DBChunkData): Chunk {
        return new Chunk(data.chunkPos[0], data.chunkPos[1], data.vChunks.map(vc => vc === null ? null : VChunk.fromDB(vc)) as NTupleOf<VChunk | null, 16>);
    }

    toDB(): DBChunkData {
        return {
            chunkPos: [...this.chunkPos],
            vChunks: this.vChunks.map(v => v === null ? null : v.toDB()) as NTupleOf<DBVChunkData | null, 16>,
        };
    }

    private *iterVChunks(): Generator<readonly [vchunk: VChunk | null, idx: number], void, void> {
        for(let i = 0; i < 16; i++) {
            const vChunk = this.vChunks[i];
            debugAssert(vChunk !== undefined);
            yield [vChunk, i] as const;
        }
    }

    rebuildMeshes(stuff: MyStuff) {
        for(const [vChunk] of this.iterVChunks()) {
            if(vChunk !== null) vChunk.rebuildMesh(stuff);
        }
    }

    render(stuff: MyGlStuff): void {
        for(let i = 0; i < 16; i++) {
            const vChunk = this.vChunks[i];
            debugAssert(vChunk !== undefined);
            if(vChunk === null || vChunk === undefined) continue;
            vChunk.render(stuff, this.chunkPos[0] * 16, i * 16, this.chunkPos[1] * 16);
        }
    }
}

export class VChunk {
    private readonly blockData: Uint8Array;
    /**
     * vertices of this vchunk's mesh. will be null when there is no mesh data, but a non-null value
     * does NOT imply that the mesh doesn't need recalculating. for that, see {@link meshDirty}
     */
    // TODO should move all this stuff into some kinda mesh buffer manager
    private meshVerts: WebGLBuffer | null;
    private meshIndices: WebGLBuffer | null;
    private meshUVs: WebGLBuffer | null;
    private meshNormals: WebGLBuffer | null;
    private meshDirty: boolean;
    private numIndices: number = 0;

    constructor(blockData: Uint8Array) {
        this.blockData = blockData;
        this.meshVerts = null;
        this.meshIndices = null;
        this.meshUVs = null;
        this.meshNormals = null;
        this.meshDirty = true;
    }

    private static blockIdx(x: number, y: number, z: number): number {
        debugAssert(0 <= x && x < 16, 'vchunk block index x out if range');
        debugAssert(0 <= y && y < 16, 'vchunk block index y out if range');
        debugAssert(0 <= z && z < 16, 'vchunk block index z out if range');
        return (x << 0) + (y << 8) + (z << 4);
    }

    getBlock(x: number, y: number, z: number): Block {
        return this.blockData[VChunk.blockIdx(x, y, z)] as Block;
    }

    hasBlockAt(x: number, y: number, z: number): boolean {
        return (
            // must be a valid index
            (0 <= x && x < 16 && 0 <= y && y < 16 && 0 <= z && z < 16)
            // must not be air there
            && (this.getBlock(x, y, z) !== Block.AIR)
        );
    }

    setBlock(x: number, y: number, z: number, block: Block) {
        this.blockData[VChunk.blockIdx(x, y, z)] = block.valueOf();
        this.meshDirty = true;
    }

    static newVChunk(): VChunk {
        return new VChunk(new Uint8Array(16 * 16 * 16));
    }

    static fromDB(data: DBVChunkData): VChunk {
        return new VChunk(data);
    }

    toDB(): DBVChunkData {
        return this.blockData;
    }

    rebuildMesh(stuff: MyStuff) {
        if(this.meshDirty) this.buildMesh(stuff);
    }

    private static readonly CUBE_FACE_OFFSETS: Record<CubeFace, readonly [number, number, number]> = {
        [CubeFace.FRONT]: [ 0,  0,  1],
        [CubeFace.RIGHT]: [ 1,  0,  0],
        [CubeFace.UP]:    [ 0,  1,  0],
        [CubeFace.LEFT]:  [-1,  0,  0],
        [CubeFace.DOWN]:  [ 0, -1,  0],
        [CubeFace.BACK]:  [ 0,  0, -1],
    } as const;
    private static readonly CUBE_FACE_VERTS: Record<CubeFace, readonly (readonly [number, number, number])[]> = {
        [CubeFace.FRONT]: [[0,1,1], [1,1,1], [1,0,1], [0,0,1]],
        [CubeFace.RIGHT]: [[1,1,0], [1,1,1], [1,0,1], [1,0,0]],
        [CubeFace.UP]:    [[0,1,0], [0,1,1], [1,1,1], [1,1,0]],
        [CubeFace.LEFT]:  [[0,1,0], [0,1,1], [0,0,1], [0,0,0]],
        [CubeFace.DOWN]:  [[0,0,0], [0,0,1], [1,0,1], [1,0,0]],
        [CubeFace.BACK]:  [[0,1,0], [1,1,0], [1,0,0], [0,0,0]],
    } as const;
    private static readonly CUBE_FACE_INDICES: Record<CubeFace, readonly (readonly [number, number, number])[]> = {
        [CubeFace.FRONT]: [[0,2,1], [0,3,2]],
        [CubeFace.RIGHT]: [[0,1,2], [0,2,3]],
        [CubeFace.UP]:    [[0,1,2], [0,2,3]],
        [CubeFace.LEFT]:  [[0,2,1], [0,3,2]],
        [CubeFace.DOWN]:  [[0,2,1], [0,3,2]],
        [CubeFace.BACK]:  [[0,1,2], [0,2,3]],
    } as const;

    private buildMesh(stuff: MyStuff) {
        const meshVerts: number[] = [];
        const meshIndices: number[] = [];
        const meshUVs: number[] = [];
        const meshNormals: number[] = [];
        let elemIdx = 0;
        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const block = this.getBlock(x, y, z);
                    if(block === Block.AIR) continue;
                    for(const face of [CubeFace.UP, CubeFace.DOWN, CubeFace.LEFT, CubeFace.RIGHT, CubeFace.FRONT, CubeFace.BACK]) {
                        const [ox, oy, oz] = VChunk.CUBE_FACE_OFFSETS[face];
                        if(this.hasBlockAt(x+ox, y+oy, z+oz)) continue;
                        const faceVerts = VChunk.CUBE_FACE_VERTS[face];
                        for(const [vx, vy, vz] of faceVerts) {
                            meshVerts.push(x+vx, y+vy, z+vz);
                        }
                        if(debugToggles.has('render_wireframe')) {
                            meshIndices.push(
                                elemIdx + 0, elemIdx + 1,
                                elemIdx + 1, elemIdx + 2,
                                elemIdx + 2, elemIdx + 3,
                                elemIdx + 3, elemIdx + 0,
                            );
                        } else {
                            for(const tri of VChunk.CUBE_FACE_INDICES[face]) {
                                for(const idx of tri) meshIndices.push(elemIdx + idx);
                            }
                        }
                        elemIdx += faceVerts.length;
                        const tex = getTextureFor(block, face, stuff.atlas);
                        meshUVs.push(
                            tex.left , tex.top   ,
                            tex.right, tex.top   ,
                            tex.right, tex.bottom,
                            tex.left , tex.bottom,
                        );
                        meshNormals.push(0, 0, 0, 1, 1, 1, 1, 0); // TODO
                    }
                }
            }
        }

        this.deleteMesh(stuff);
        const { glStuff: { gl, program: { attrib: { a_Position } } } } = stuff;

        this.meshVerts = gl.createBuffer();
        assert(this.meshVerts !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVerts);
        // TODO can this be STATIC_DRAW?
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshVerts), gl.STATIC_DRAW);
        if(a_Position !== null) {
            gl.enableVertexAttribArray(a_Position);
            gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        }

        this.meshIndices = gl.createBuffer();
        assert(this.meshIndices !== null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndices);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(meshIndices), gl.STATIC_DRAW);
        this.numIndices = meshIndices.length;

        this.meshUVs = gl.createBuffer();
        assert(this.meshUVs !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshUVs);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshUVs), gl.STATIC_DRAW);

        this.meshNormals = gl.createBuffer();
        assert(this.meshNormals !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.meshNormals);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(meshNormals), gl.STATIC_DRAW);

        this.meshDirty = false;
    }
    
    private deleteMesh(stuff: MyStuff) {
        const { glStuff: { gl } } = stuff;
        if(this.meshVerts !== null) {
            gl.deleteBuffer(this.meshVerts);
            this.meshVerts = null;
        }
        if(this.meshIndices !== null) {
            gl.deleteBuffer(this.meshIndices);
            this.meshIndices = null;
        }
        if(this.meshUVs !== null) {
            gl.deleteBuffer(this.meshUVs);
            this.meshUVs = null;
        }
        if(this.meshNormals !== null) {
            gl.deleteBuffer(this.meshNormals);
            this.meshNormals = null;
        }
        // this.meshDirty = true;
    }

    cleanup(stuff: MyStuff) {
        this.deleteMesh(stuff);
    }

    render(stuff: MyGlStuff, chunkX: number, chunkY: number, chunkZ: number): void {
        const { gl, program: { uniform: { u_BlockPos }, attrib: { a_Position, a_UV, a_Normal } } } = stuff;
        if(this.meshVerts !== null && this.meshIndices !== null && this.meshUVs !== null && this.meshNormals !== null) {
            if(a_Position !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVerts);
                gl.enableVertexAttribArray(a_Position);
                gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
            }
            if(a_UV !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.meshUVs);
                gl.enableVertexAttribArray(a_UV);
                gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
            }
            if(a_Normal !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.meshUVs);
                gl.enableVertexAttribArray(a_Normal);
                gl.vertexAttribPointer(a_Normal, 2, gl.FLOAT, false, 0, 0);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndices);

            // TODO probably rename BlockPos to something more general like Offset or whatever
            // TODO should probably add helpers for setting these rather than doing the null check every single time
            // our overall pos
            if(u_BlockPos !== null) gl.uniform3f(u_BlockPos, chunkX, chunkY, chunkZ);

            // render
            if(debugToggles.has('render_wireframe')) {
                gl.drawElements(gl.LINES, this.numIndices, gl.UNSIGNED_SHORT, 0);
            } else {
                gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
            }
        } else {
            warnRateLimited(`skipping render of vchunk ${chunkX},${chunkY},${chunkZ} as it has no mesh`);
        }
    }
}
