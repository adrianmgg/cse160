import { idbOpen, idbRequest2Promise } from "./db.js";
import { assert, NTupleOf } from "./util.js";

const MC_WORLD_IDB_VERSION: number = 1;

export class MCWorld {
    private readonly db: IDBDatabase;
    private constructor(db: IDBDatabase) {
        this.db = db;
    }

    private async getOrCreateChunk(chunkX: number, chunkY: number): Promise<Chunk> {
        console.log(`trying to get chunk ${chunkX}, ${chunkX}`);
        const existingChunkData = await idbRequest2Promise<DBChunkData | undefined>(
            this.db.transaction('chunks', 'readonly')
                .objectStore('chunks')
                .get([chunkX, chunkY])
        );
        if(existingChunkData !== undefined) {
            return Chunk.fromDB(existingChunkData);
        } else {
            const newChunk = Chunk.newChunk(chunkX, chunkY);
            // TODO do worldgen here
            await idbRequest2Promise(
                this.db.transaction('chunks', 'readwrite')
                    .objectStore('chunks')
                    .add(newChunk)
            );
            return newChunk;
        }
    }

    private async saveChunk(chunk: Chunk) {
        console.log(`saving chunk ${chunk.chunkPos}`);
        await idbRequest2Promise(
            this.db.transaction('chunks', 'readwrite')
                .objectStore('chunks')
                .put(chunk)
        );
    }

    static async openWorld(worldName: string): Promise<MCWorld> {
        const db = await idbOpen(worldName, MC_WORLD_IDB_VERSION, this.upgradeWorldDB);
        const world = new MCWorld(db);
        // const chunkA = await world.getOrCreateChunk(0, 0);
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
}

type DBChunkData = {
    chunkPos: [number, number];
    vChunks: NTupleOf<DBVChunkData | null, 16>;
}
type DBVChunkData = {
    blockData: ArrayBuffer;
};

export class Chunk {
    readonly chunkPos: Readonly<[number, number]>;
    readonly vChunks: NTupleOf<VChunk | null, 16>;
    private constructor(chunkX: number, chunkY: number, vChunks: Chunk['vChunks']) {
        this.chunkPos = [chunkX, chunkY];
        this.vChunks = vChunks;
    }

    static newChunk(chunkX: number, chunkY: number): Chunk {
        return new Chunk(chunkX, chunkY, new Array<null>(16).fill(null) as NTupleOf<null, 16>);
    }

    static fromDB(data: DBChunkData): Chunk {
        return new Chunk(data.chunkPos[0], data.chunkPos[1], data.vChunks.map(vc => vc === null ? null : null) as NTupleOf<VChunk | null, 16>);
    }
}

export class VChunk {
    private readonly blockData: ArrayBuffer;
    constructor(blockData: ArrayBuffer) {
        this.blockData = blockData;
    }

    static newVChunk(): VChunk {
        return new VChunk(new ArrayBuffer(16 * 16 * 16));
    }

    static fromDB(data: DBVChunkData): VChunk {
        return new VChunk(data.blockData);
    }
}
