import { idbOpen, idbRequest2Promise } from "./db.js";
import { assert, debugAssert, Dict2D, NTupleOf } from "./util.js";

const MC_WORLD_IDB_VERSION = 1 as const;

export enum Block {
    AIR = 0,
    STONE = 1,
    GRASS = 2,
    DIRT = 3,
    COBBLESTONE = 4,
    BEDROCK = 7,
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
        // world.unloadChunk(0, 0);
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
        const chunk = await this.dbGetChunk(chunkX, chunkY);
        if(chunk === null) return;
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
                .add(newChunk)
        );
        return newChunk;
    }

    private async dbSaveChunk(chunk: Chunk) {
        console.log(`saving chunk at ${chunk.chunkPos}`);
        await idbRequest2Promise(
            this.db.transaction('chunks', 'readwrite')
                .objectStore('chunks')
                .put(chunk)
        );
    }

    public async close(): Promise<void> {
        console.log('saving world');
        console.log('saving all loaded chunks');
        for(const [chunk, [x, y]] of this.chunks) {
            this.dbSaveChunk(chunk);
        }
    }
}

type DBChunkData = {
    chunkPos: [number, number];
    vChunks: NTupleOf<DBVChunkData | null, 16>;
}
type DBVChunkData = {
    blockData: Uint8Array;
};

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

    private static vcIdx(z: number): number {
        return z >> 4; // floor(z / 16)
    }

    setBlock(x: number, y: number, z: number, block: Block) {
        const vcZ = Chunk.vcIdx(z);
        const vc = this.getOrCreateVChunk(vcZ);
        vc.setBlock(x, y, z - (vcZ * 16), block);
    }

    private async doWorldgen(): Promise<void> {
        console.log(`running worldgen for chunk ${this.chunkPos}`);
        this.setBlock(0, 0, 0, Block.STONE);
    }

    static async newChunk(chunkX: number, chunkY: number): Promise<Chunk> {
        const chunk = new Chunk(chunkX, chunkY, new Array<null>(16).fill(null) as NTupleOf<null, 16>);
        chunk.doWorldgen();
        return chunk;
    }

    static fromDB(data: DBChunkData): Chunk {
        return new Chunk(data.chunkPos[0], data.chunkPos[1], data.vChunks.map(vc => vc === null ? null : null) as NTupleOf<VChunk | null, 16>);
    }
}

export class VChunk {
    private readonly blockData: Uint8Array;
    constructor(blockData: Uint8Array) {
        this.blockData = blockData;
    }

    private static blockIdx(x: number, y: number, z: number): number {
        debugAssert(0 <= x && x < 16, 'vchunk block index x out if range');
        debugAssert(0 <= y && y < 16, 'vchunk block index y out if range');
        debugAssert(0 <= z && z < 16, 'vchunk block index z out if range');
        return (x << 0) + (y << 4) + (z << 8);
    }

    setBlock(x: number, y: number, z: number, block: Block) {
        this.blockData[VChunk.blockIdx(x, y, z)] = block.valueOf();
    }

    static newVChunk(): VChunk {
        return new VChunk(new Uint8Array(16 * 16 * 16));
    }

    static fromDB(data: DBVChunkData): VChunk {
        return new VChunk(data.blockData);
    }
}
