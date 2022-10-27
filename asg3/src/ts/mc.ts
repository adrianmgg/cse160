import { idbOpen, idbRequest2Promise } from "./db.js";
import { assert, debugAssert, Dict2D, NTupleOf, warnRateLimited } from "./util.js";
import { Color, Mesh } from './3d.js';
import type { MyGlStuff } from "./main.js";

const MC_WORLD_IDB_VERSION = 1 as const;

export enum Block {
    AIR = 0,
    STONE = 1,
    GRASS = 2,
    DIRT = 3,
    COBBLESTONE = 4,
    BEDROCK = 7,
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

    private constructor(db: IDBDatabase) {
        this.db = db;
        this.chunks = new Dict2D();
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

    async loadChunk(chunkX: number, chunkY: number): Promise<Chunk> {
        const chunk = await this.dbGetOrCreateChunk(chunkX, chunkY);
        this.chunks.set(chunkX, chunkY, chunk);
        return chunk;
    }

    async unloadChunk(chunkX: number, chunkY: number): Promise<void> {
        const chunk = this.chunks.get(chunkX, chunkY);
        if(chunk === undefined) return;
        console.log(`unloading chunk at ${chunkX},${chunkY}`);
        await this.dbSaveChunk(chunk);
        this.chunks.del(chunkX, chunkY);
    }

    private async dbGetChunk(chunkX: number, chunkY: number): Promise<Chunk | null> {
        const chunkData = await idbRequest2Promise<DBChunkData | undefined>(
            this.db.transaction('chunks', 'readonly')
                .objectStore('chunks')
                .get([chunkX, chunkY])
        );
        if(chunkData === undefined) return null;
        else return await Chunk.fromDB(chunkData);
    }

    private async dbGetOrCreateChunk(chunkX: number, chunkY: number): Promise<Chunk> {
        const existingChunk = await this.dbGetChunk(chunkX, chunkY);
        if(existingChunk !== null) {
            return existingChunk;
        }
        const newChunk = await Chunk.newChunk(chunkX, chunkY);
        // TODO do worldgen here (or maybe in newChunk)
        await idbRequest2Promise(
            this.db.transaction('chunks', 'readwrite')
                .objectStore('chunks')
                .add(newChunk.toDB())
        );
        return newChunk;
    }

    private async dbSaveChunk(chunk: Chunk) {
        console.log(`saving chunk at ${chunk.chunkPos}`);
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

    render(stuff: MyGlStuff): void {
        // TODO mesh rebuild loop should prob be elsewhere
        for(const [chunk] of this.chunks) {
            chunk.rebuildMeshes();
        }
        for(const [chunk] of this.chunks) {
            chunk.render(stuff);
        }
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
    private constructor(chunkX: number, chunkY: number, vChunks: Chunk['vChunks']) {
        this.chunkPos = [chunkX, chunkY];
        this.vChunks = vChunks;
    }

    private getOrCreateVChunk(vChunkY: number): VChunk {
        const existingVC = this.vChunks[vChunkY];
        assert(existingVC !== undefined, 'vchunk index out of range');
        if(existingVC !== null) return existingVC;
        return this.vChunks[vChunkY] = VChunk.newVChunk();
    }

    private static vcIdx(y: number): number {
        return y >> 4; // floor(y / 16)
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

    private async doWorldgen(): Promise<void> {
        console.log(`running worldgen for chunk ${this.chunkPos}`);
        this.fillArea(0,  0, 0, 15,  0, 15, Block.BEDROCK);
        this.fillArea(0,  1, 0, 15, 30, 15, Block.STONE);
        this.fillArea(0, 31, 0, 15, 33, 15, Block.DIRT);
        this.fillArea(0, 34, 0, 15, 34, 15, Block.GRASS);
    }

    static async newChunk(chunkX: number, chunkY: number): Promise<Chunk> {
        const chunk = new Chunk(chunkX, chunkY, new Array<null>(16).fill(null) as NTupleOf<null, 16>);
        chunk.doWorldgen();
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

    rebuildMeshes() {
        for(const [vChunk] of this.iterVChunks()) {
            if(vChunk !== null) vChunk.rebuildMesh();
        }
    }

    render(stuff: MyGlStuff): void {
        for(let i = 0; i < 16; i++) {
            const vChunk = this.vChunks[i];
            debugAssert(vChunk !== undefined);
            if(vChunk === null || vChunk === undefined) continue;
            vChunk.render(stuff, this.chunkPos[0] * 16, i * 16, this.chunkPos[0] * 16);
        }
    }
}

export class VChunk {
    private readonly blockData: Uint8Array;
    /**
     * vertices of this vchunk's mesh. will be null when there is no mesh data, but a non-null value
     * does NOT imply that the mesh doesn't need recalculating. for that, see {@link meshDirty}
     */
    private meshVerts: Float32Array | null;
    private meshIndices: Uint16Array | null;
    private meshDirty: boolean;

    constructor(blockData: Uint8Array) {
        this.blockData = blockData;
        this.meshVerts = null;
        this.meshIndices = null;
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

    setBlock(x: number, y: number, z: number, block: Block) {
        this.blockData[VChunk.blockIdx(x, y, z)] = block.valueOf();
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

    rebuildMesh() {
        if(this.meshDirty) this.buildMesh();
    }

    private static readonly CUBE_VERTS: readonly (readonly [number, number, number])[] = [
        [1, 1, 1],
        [0, 1, 1],
        [0, 0, 1],
        [1, 0, 1],
        [1, 0, 0],
        [1, 1, 0],
        [0, 1, 0],
        [0, 0, 0],
    ] as const;
    private static readonly CUBE_INDICES: readonly number[] = [
        0, 1, 2, 0, 2, 3, // front
        0, 3, 4, 0, 4, 5, // right
        0, 5, 6, 0, 6, 1, // up
        1, 6, 7, 1, 7, 2, // left
        7, 4, 3, 7, 3, 2, // down
        4, 7, 6, 4, 6, 5, // back
    ] as const;

    // TODO can i make this async?
    private buildMesh() {
        // TODO super unoptimized mesh building for now, just to make sure this all works
        // const perCube = /* quads per cube */ 6 /* tris per quad */ * 2 /* verts per tri */ * 3 /* data-s per vert */ * 3;
        // const meshData = new Float32Array(/* length * width * height */ 16 * 16 * 16 /* data-s per cube */ * perCube);
        const meshVerts: number[] = [];
        const meshIndices: number[] = [];
        for(let x = 0; x < 16; x++) {
            for(let y = 0; y < 16; y++) {
                for(let z = 0; z < 16; z++) {
                    const block = this.getBlock(x, y, z);
                    if(block === Block.AIR) continue;
                    // lack of a -1 here is intentional, since what we want is the index immediately
                    // after the current last element
                    const baseIdx = meshVerts.length / 3;
                    for(const vert of VChunk.CUBE_VERTS) {
                        meshVerts.push(vert[0] + x, vert[1] + y, vert[2] + z);
                    }
                    for(const idx of VChunk.CUBE_INDICES) {
                        meshIndices.push(idx + baseIdx);
                    }
                }
            }
        }
        this.meshVerts = new Float32Array(meshVerts);
        this.meshIndices = new Uint16Array(meshIndices);
        this.meshDirty = false;
    }

    render(stuff: MyGlStuff, chunkX: number, chunkY: number, chunkZ: number): void {
        const { gl, programInfo: { vars: { uniformLocations: { u_BlockPos, u_FragColor }, attribLocations: { a_Position } } } } = stuff;
        if(this.meshVerts !== null && this.meshIndices !== null) {
            // TODO is this how we should be doing it? or should we put the verts and indices into a
            // gl buffer when we calculate them and then change which buffer ARRAY_BUFFER has? gotta
            // read up on some more gl stuff or maybe ask in office hours
            gl.bufferData(gl.ARRAY_BUFFER, this.meshVerts, gl.STATIC_DRAW);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.meshIndices, gl.STATIC_DRAW);
            // our overall pos
            // TODO probably rename BlockPos to something more general like Offset or whatever
            // TODO should probably add helpers for setting these rather than doing the null check every single time
            if(u_BlockPos !== null) gl.uniform3f(u_BlockPos, chunkX, chunkY, chunkZ);
            if(u_FragColor !== null) gl.uniform4f(u_FragColor, (chunkX % 256) / 255, (chunkY % 256) / 255, (chunkZ % 256) / 255, 1.0);
            // render
            gl.drawElements(gl.TRIANGLES, this.meshIndices.length, gl.UNSIGNED_SHORT, 0);
            // gl.drawElements(gl.LINES, this.meshIndices.length, gl.UNSIGNED_SHORT, 0);
        } else {
            warnRateLimited(`skipping render of vchunk ${chunkX},${chunkY},${chunkZ} as it has no mesh`);
        }
    }
}
