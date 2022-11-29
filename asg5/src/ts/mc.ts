import { idbOpen, idbRequest2Promise } from './db';
import { assert, debugAssert, Dict2D, mapRecord, NTupleOf, warnRateLimited } from './util';
import type { TextureAtlasInfo } from './texture';
import { createNoise3D, NoiseFunction3D } from 'simplex-noise';
import { debugToggles } from './debug_toggles';
import { BoxGeometry, BufferAttribute, BufferGeometry, Material, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import alea from 'alea';
import { backwardsVec, downVec, forwardsVec, leftVec, rightVec, upVec } from './threeutil';

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

export class MCWorld extends Object3D {
    private readonly db: IDBDatabase;
    private readonly chunks: Dict2D<number, number, Chunk>;
    private readonly renderDistance: number = 2;
    private readonly noise: NoiseFunction3D;
    readonly blocksMat: Material;
    // readonly worldObjects: Model[]; // TODO clean this system up

    private constructor(db: IDBDatabase) {
        super();
        this.db = db;
        this.chunks = new Dict2D();
        this.noise = createNoise3D(alea('seed')); // TODO add seed option
        this.blocksMat = new MeshStandardMaterial({color: 0xffffff});
        // this.blocksMat = new MeshBasicMaterial({color: 0xffffff});
        // this.worldObjects = [];
    }

    static async openWorld(worldName: string): Promise<MCWorld> {
        const db = await idbOpen(`asg5world-${worldName}`, MC_WORLD_IDB_VERSION, this.upgradeWorldDB);
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
        this.add(chunk);
        return chunk;
    }

    async unloadChunk(chunkX: number, chunkY: number): Promise<void> {
        const chunk = this.chunks.get(chunkX, chunkY);
        if(chunk === undefined) return;
        // console.log(`unloading chunk at ${chunkX},${chunkY}`);
        this.remove(chunk);
        await this.dbSaveChunk(chunk);
        this.chunks.del(chunkX, chunkY);
        chunk.dispose();
    }

    private async dbGetChunk(chunkX: number, chunkZ: number): Promise<Chunk | null> {
        const chunkData = await idbRequest2Promise<DBChunkData | undefined>(
            this.db.transaction('chunks', 'readonly')
                .objectStore('chunks')
                .get([chunkX, chunkZ])
        );
        if(chunkData === undefined) return null;
        else return await Chunk.fromDB(this, chunkData);
    }

    private async dbGetOrCreateChunk(chunkX: number, chunkZ: number): Promise<Chunk> {
        const existingChunk = await this.dbGetChunk(chunkX, chunkZ);
        if(existingChunk !== null) {
            return existingChunk;
        }
        const newChunk = await Chunk.newChunk(this, chunkX, chunkZ, this.noise);
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

    rebuildMeshes() {
        for(const [chunk] of this.chunks) {
            chunk.rebuildMeshes();
        }
    }

    // private static readonly BLOCKSELECT_CUBE_POINTS = new Float32Array([
    //     0,0,0, 0,0,1,  0,0,1, 0,1,1,  0,1,1, 0,1,0,  0,1,0, 0,0,0,
    //     1,0,0, 1,0,1,  1,0,1, 1,1,1,  1,1,1, 1,1,0,  1,1,0, 1,0,0,
    //     0,0,0, 1,0,0,  0,0,1, 1,0,1,  0,1,1, 1,1,1,  0,1,0, 1,1,0,
    // ].map(n => (n - 0.5) * 1.01 + 0.5));
    // private blockSelectBuf: WebGLBuffer | null = null; // TODO handle this better
    // render(stuff: MyGlStuff): void {
    //     const { gl, program: { attrib: { a_Position }, uniform: { u_ModelMat, u_Color } } } = stuff;
    //     if(u_Color !== null) gl.uniform4f(u_Color, 0, 0, 0, 0);
    //     // render chunks
    //     if(!debugToggles.has('no_draw_chunks')) {
    //         for(const [chunk] of this.chunks) {
    //             chunk.render(stuff);
    //         }
    //     }

    //     // TODO scissor section in a corner & draw a minimap?

    //     // render selected block outline
    //     // TODO should do this stuff elsewhere
    //     if(this.blockSelectBuf === null) {
    //         this.blockSelectBuf = gl.createBuffer();
    //         gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
    //         gl.bufferData(gl.ARRAY_BUFFER, MCWorld.BLOCKSELECT_CUBE_POINTS, gl.STATIC_DRAW);
    //     }
    //     if(this.focusedBlockPos !== null) {
    //         if(a_Position !== null) {
    //             gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
    //             gl.enableVertexAttribArray(a_Position);
    //             gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    //         }
    //         if(u_ModelMat !== null) gl.uniformMatrix4fv(u_ModelMat, false, Mat4x4.translate(this.focusedBlockPos).data); // TODO avoid constucting vecs here
    //         if(u_Color !== null) gl.uniform4f(u_Color, 0, 1, 0, 1);
    //         gl.drawArrays(gl.LINES, 0, MCWorld.BLOCKSELECT_CUBE_POINTS.length / 3);
    //     }

    //     // render other models
    //     for(const model of this.worldObjects) {
    //         model.render(stuff);
    //     }
    // }

    // TODO should move player pos into world eventually, then this can be computed from that rather
    //      than passed in
    private playerChunkX: number = 0;
    private playerChunkZ: number = 0;
    updatePlayerPos(pos: Vector3) {
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

    private focusedBlockPos: Vector3 | null = null;
    focusBlock(v: Vector3 | null) {
        this.focusedBlockPos = (v === null) ? null : v.clone();
    }

    // // implementation of "A fast voxel traversal algorithm for ray tracing." by John Amanatides and Andrew Woo
    // intersect(pos: Vector3, dir: Vector3, maxDistance: number): null | readonly [Vec, Block] {
    //     // "The initialization phase begins by identifying the voxel in which the ray origin is
    //     //  found"
    //     let curBlockPos = pos.floor();
    //     // "stepX and stepY are initialized to either 1 or -1 indicating whether X and Y are
    //     //  incremented or decremented as the ray crosses voxel boundaries (this is determined by
    //     //  the sign of the x and y components of v)""
    //     let step = dir.sign();
    //     // "determine the value of t at which the ray crosses the first ... voxel boundary"
    //     const maxT = curBlockPos.add(step).subInPlace(pos).divInPlace(dir);
    //     // "compute ... how far along the ray we must move (in units of t) for the ... component of
    //     //  such a movement to equal the width of a voxel"
    //     const delta = step.div(dir);

    //     if(Number.isNaN(maxT.x)) maxT.x = Infinity;
    //     if(Number.isNaN(maxT.y)) maxT.y = Infinity;
    //     if(Number.isNaN(maxT.z)) maxT.z = Infinity;
    //     if(Number.isNaN(delta.x)) delta.x = 0;
    //     if(Number.isNaN(delta.y)) delta.y = 0;
    //     if(Number.isNaN(delta.z)) delta.z = 0;

    //     // if(dir.x === 0 && dir.z === 0 && dir.y !== 0) {
    //     //     // console.log({dir, step, maxT, delta, curBlockPos: curBlockPos.clone()});
    //     //     console.log(curBlockPos.add(step), curBlockPos.add(step).subInPlace(pos), curBlockPos.add(step).subInPlace(pos).divInPlace(dir));
    //     // }

    //     // incremental phase
    //     // (i've modified the algorithm to use a maximum distance cutoff rather than preset bounds)
    //     let distanceSoFarPrev: number | null = null;
    //     let distanceSoFar: number = 0;
    //     while(true) {
    //         // console.log(distanceSoFar);
    //         // check current block
    //         const curBlock = this.getBlock(curBlockPos.x, curBlockPos.y, curBlockPos.z);
    //         if(curBlock !== Block.AIR) {
    //             // return [pos.add(dir.mul(distanceSoFar)), ] as const;
    //             return [curBlockPos, curBlock];
    //         }

    //         // do the next incremental phase
    //         if(maxT.x < maxT.y) {
    //             if(maxT.x < maxT.z) {
    //                 curBlockPos.x += step.x;
    //                 maxT.x += delta.x;
    //                 distanceSoFar += delta.x;
    //             } else {
    //                 curBlockPos.z += step.z;
    //                 maxT.z += delta.z;
    //                 distanceSoFar += delta.z;
    //             }
    //         } else {
    //             if(maxT.y < maxT.z) {
    //                 curBlockPos.y += step.y;
    //                 maxT.y += delta.y;
    //                 distanceSoFar += delta.y;
    //             } else {
    //                 curBlockPos.z += step.z;
    //                 maxT.z += delta.z;
    //                 distanceSoFar += delta.z;
    //             }
    //         }

    //         if(distanceSoFar > maxDistance || distanceSoFar === distanceSoFarPrev) {
    //             break;
    //         }
    //         distanceSoFarPrev = distanceSoFar;
    //     } // while(distanceSoFar <= maxDistance);
    //     return null;
    // }
}

type DBChunkData = {
    chunkPos: [number, number];
    vChunks: NTupleOf<DBVChunkData | null, 16>;
};
type DBVChunkData = Uint8Array;

export class Chunk extends Object3D {
    readonly chunkPos: Readonly<[number, number]>;
    readonly vChunks: NTupleOf<VChunk | null, 16>;
    private readonly world: MCWorld;
    private constructor(world: MCWorld, chunkX: number, chunkZ: number, vChunks: Chunk['vChunks']) {
        super();
        this.world = world;
        this.chunkPos = [chunkX, chunkZ];
        this.vChunks = vChunks;
        this.position.x = chunkX * 16;
        this.position.z = chunkZ * 16;
        for(const vChunk of vChunks) {
            if(vChunk !== null) this.add(vChunk);
        }
    }

    get chunkX(): number { return this.chunkPos[0]; }
    get chunkZ(): number { return this.chunkPos[1]; }

    private getVChunk(vChunkY: number): VChunk | null {
        const vc = this.vChunks[vChunkY];
        assert(vc !== undefined, 'vchunk index out of range');
        return vc;
    }
    private getOrCreateVChunk(material: Material, vChunkY: number): VChunk {
        const existingVC = this.getVChunk(vChunkY);
        if(existingVC !== null) return existingVC;
        const newVC = this.vChunks[vChunkY] = VChunk.newVChunk(material);
        newVC.position.y = vChunkY * 16;
        this.add(newVC);
        return newVC;
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
        const vc = this.getOrCreateVChunk(this.world.blocksMat, vcY);
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

    private async doWorldgen(noise: NoiseFunction3D): Promise<void> {
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
                const sample = noise((this.chunkX + (x / 16)) * worldScale, 0, (this.chunkZ + (z / 16)) * worldScale) / 2 + 0.5;
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

    static async newChunk(world: MCWorld, chunkX: number, chunkZ: number, noise: NoiseFunction3D): Promise<Chunk> {
        const chunk = new Chunk(world, chunkX, chunkZ, new Array<null>(16).fill(null) as NTupleOf<null, 16>);
        chunk.doWorldgen(noise);
        return chunk;
    }

    static fromDB(world: MCWorld, data: DBChunkData): Chunk {
        return new Chunk(world, data.chunkPos[0], data.chunkPos[1], data.vChunks.map((vc, i) => {
            if(vc === null) return null;
            const vChunk = VChunk.fromDB(world.blocksMat, vc);
            vChunk.position.y = i * 16;
            return vChunk;
        }) as NTupleOf<VChunk | null, 16>);
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

    // render(): void {
    //     for(let i = 0; i < 16; i++) {
    //         const vChunk = this.vChunks[i];
    //         debugAssert(vChunk !== undefined);
    //         if(vChunk === null || vChunk === undefined) continue;
    //         vChunk.render(stuff, this.chunkPos[0] * 16, i * 16, this.chunkPos[1] * 16);
    //     }
    // }

    dispose() {
        for(const vChunk of this.vChunks) {
            if(vChunk !== null) vChunk.dispose();
        }
    }
}

export class VChunk extends Mesh {
    private readonly blockData: Uint8Array;
    // private geometry: BufferGeometry;
    /* whether the mesh is out of sync with the current block data */
    private meshDirty: boolean;

    constructor(material: Material, blockData: Uint8Array) {
        super(new BufferGeometry(), material);
        this.blockData = blockData;
        this.meshDirty = true;
        // this.mat = Mat4x4.identity();
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

    static newVChunk(material: Material): VChunk {
        return new VChunk(material, new Uint8Array(16 * 16 * 16));
    }

    static fromDB(material: Material, data: DBVChunkData): VChunk {
        return new VChunk(material, data);
    }

    toDB(): DBVChunkData {
        return this.blockData;
    }

    rebuildMesh() {
        if(this.meshDirty) this.buildMesh();
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
    // private static readonly CUBE_FACE_NORMALS: Record<CubeFace, Readonly<NTupleOf<number, 8>>> = {
    //     [CubeFace.FRONT]: [0, 0, 0, 0, 0, 0, 0, 0],
    //     [CubeFace.RIGHT]: [0, 0, 0, 0, 0, 0, 0, 0],
    //     [CubeFace.UP]:    [0, 0, 0, 0, 0, 0, 0, 0],
    //     [CubeFace.LEFT]:  [0, 0, 0, 0, 0, 0, 0, 0],
    //     [CubeFace.DOWN]:  [0, 0, 0, 0, 0, 0, 0, 0],
    //     [CubeFace.BACK]:  [0, 0, 0, 0, 0, 0, 0, 0],
    // } as const;
    private static readonly CUBE_FACE_NORMALS: Record<CubeFace, Readonly<NTupleOf<NTupleOf<number, 3>, 4>>> = mapRecord({
        [CubeFace.FRONT]: forwardsVec() ,
        [CubeFace.RIGHT]: rightVec()    ,
        [CubeFace.UP   ]: upVec()       ,
        [CubeFace.LEFT ]: leftVec()     ,
        [CubeFace.DOWN ]: downVec()     ,
        [CubeFace.BACK ]: backwardsVec(),
    } as const, (k, v) => {
        return [v.toArray(), v.toArray(), v.toArray(), v.toArray()] as const;
    });

    private buildMesh() {
        const verts: number[] = [];
        const indices: number[] = [];
        const uvs: number[] = [];
        const normals: number[] = [];
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
                            verts.push(x+vx, y+vy, z+vz);
                        }
                        if(debugToggles.has('render_wireframe')) {
                            indices.push(
                                elemIdx + 0, elemIdx + 1,
                                elemIdx + 1, elemIdx + 2,
                                elemIdx + 2, elemIdx + 3,
                                elemIdx + 3, elemIdx + 0,
                            );
                        } else {
                            for(const tri of VChunk.CUBE_FACE_INDICES[face]) {
                                for(const idx of tri) indices.push(elemIdx + idx);
                            }
                        }
                        elemIdx += faceVerts.length;
                        // const tex = getTextureFor(block, face, stuff.atlas);
                        // uvs.push(
                        //     tex.left , tex.top   ,
                        //     tex.right, tex.top   ,
                        //     tex.right, tex.bottom,
                        //     tex.left , tex.bottom,
                        // );
                        for(const norm of VChunk.CUBE_FACE_NORMALS[face]) {
                            normals.push(...norm);
                        }
                    }
                }
            }
        }
        // if(debugToggles.has('render_wireframe')) {
        //     this.mesh.mode = stuff.glStuff.gl.LINES;
        // } else {
        //     this.mesh.mode = stuff.glStuff.gl.TRIANGLES;
        // }
        // this.mesh.compile(stuff.glStuff);
        // compile mesh
        // TODO better to typedarray-ify these?
        this.geometry.setIndex(indices);
        this.geometry.setAttribute('position', new BufferAttribute(new Float32Array(verts), 3));
        this.geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
        // this.geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
        this.geometry.getIndex()!.needsUpdate = true;
        this.geometry.getAttribute('position').needsUpdate = true;
        this.geometry.getAttribute('normal').needsUpdate = true;
        // TODO we can probably do the bounds calc more efficiently if we roll it ourselves
        this.geometry.computeBoundingBox();
        this.geometry.computeBoundingSphere();
        this.meshDirty = false;
    }

    dispose() {
        this.geometry.dispose();
    }

    // render(stuff: MyGlStuff, chunkX: number, chunkY: number, chunkZ: number): void {
    //     const { gl, program: { uniform: { u_ModelMat }, attrib: { a_Position, a_UV, a_Normal } } } = stuff;
    //     if(u_ModelMat !== null) {
    //         this.mat.setInPlace(
    //             1, 0, 0, chunkX,
    //             0, 1, 0, chunkY,
    //             0, 0, 1, chunkZ,
    //             0, 0, 0, 1,
    //         );
    //         gl.uniformMatrix4fv(u_ModelMat, false, this.mat.data);
    //     }
    //     this.geometry.render(stuff);

    // //     if(this.meshVerts !== null && this.meshIndices !== null && this.meshUVs !== null && this.meshNormals !== null) {
    // //         if(a_Position !== null) {
    // //             gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVerts);
    // //             gl.enableVertexAttribArray(a_Position);
    // //             gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    // //         }
    // //         if(a_UV !== null) {
    // //             gl.bindBuffer(gl.ARRAY_BUFFER, this.meshUVs);
    // //             gl.enableVertexAttribArray(a_UV);
    // //             gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    // //         }
    // //         if(a_Normal !== null) {
    // //             gl.bindBuffer(gl.ARRAY_BUFFER, this.meshNormals);
    // //             gl.enableVertexAttribArray(a_Normal);
    // //             gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    // //         }
    // //         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndices);

    // //         // TODO probably rename BlockPos to something more general like Offset or whatever
    // //         // TODO should probably add helpers for setting these rather than doing the null check every single time
    // //         // our overall pos
    // //         // if(u_BlockPos !== null) gl.uniform3f(u_BlockPos, chunkX, chunkY, chunkZ);
    // //         this.mat.setInPlace(
    // //             1, 0, 0, chunkX,
    // //             0, 1, 0, chunkY,
    // //             0, 0, 1, chunkZ,
    // //             0, 0, 0, 1,
    // //         );
    // //         if(u_ModelMat !== null) gl.uniformMatrix4fv(u_ModelMat, false, this.mat.data);

    // //         // render
    // //         if(debugToggles.has('render_wireframe')) {
    // //             gl.drawElements(gl.LINES, this.numIndices, gl.UNSIGNED_SHORT, 0);
    // //         } else {
    // //             gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
    // //         }
    // //     } else {
    // //         warnRateLimited(`skipping render of vchunk ${chunkX},${chunkY},${chunkZ} as it has no mesh`);
    // //     }
    // // }
    // }
}
