import { idbOpen, idbRequest2Promise } from "./db.js";
import { assert, debugAssert, Dict2D, warnRateLimited } from "./util.js";
import { Color } from './3d.js';
import { PerlinNoise } from "./noise.js";
import { debugToggles } from "./debug_toggles.js";
const MC_WORLD_IDB_VERSION = 1;
export var Block;
(function (Block) {
    Block[Block["AIR"] = 0] = "AIR";
    Block[Block["STONE"] = 1] = "STONE";
    Block[Block["GRASS"] = 2] = "GRASS";
    Block[Block["DIRT"] = 3] = "DIRT";
    Block[Block["COBBLESTONE"] = 4] = "COBBLESTONE";
    Block[Block["BEDROCK"] = 7] = "BEDROCK";
})(Block || (Block = {}));
var CubeFace;
(function (CubeFace) {
    CubeFace[CubeFace["FRONT"] = 0] = "FRONT";
    CubeFace[CubeFace["RIGHT"] = 1] = "RIGHT";
    CubeFace[CubeFace["UP"] = 2] = "UP";
    CubeFace[CubeFace["LEFT"] = 3] = "LEFT";
    CubeFace[CubeFace["DOWN"] = 4] = "DOWN";
    CubeFace[CubeFace["BACK"] = 5] = "BACK";
})(CubeFace || (CubeFace = {}));
;
const BLOCK_TEXTURES = {
    [Block.AIR]: null,
    [Block.STONE]: 'stone',
    [Block.GRASS]: ['grass_side', 'grass_side', 'grass_top', 'grass_side', 'dirt', 'grass_side'],
    [Block.DIRT]: 'dirt',
    [Block.COBBLESTONE]: 'cobblestone',
    [Block.BEDROCK]: 'bedrock',
};
function _getTextureFor(block, face, atlas) {
    var _a, _b;
    const a = BLOCK_TEXTURES[block];
    if (a === null)
        return null; // TODO avoid new here.
    if (typeof a === 'string') {
        return (_a = atlas.texturePositions[a]) !== null && _a !== void 0 ? _a : null;
    }
    const b = a[face];
    if (b === undefined)
        return null;
    return (_b = atlas.texturePositions[b]) !== null && _b !== void 0 ? _b : null;
}
function getTextureFor(block, face, atlas) {
    var _a;
    return (_a = _getTextureFor(block, face, atlas)) !== null && _a !== void 0 ? _a : new DOMRectReadOnly();
}
const block_colors = {
    [Block.AIR]: Color.fromRGBHex(0xFFFFFF),
    [Block.STONE]: Color.fromRGBHex(0x747474),
    [Block.GRASS]: Color.fromRGBHex(0x589258),
    [Block.DIRT]: Color.fromRGBHex(0x785539),
    [Block.COBBLESTONE]: Color.fromRGBHex(0x525252),
    [Block.BEDROCK]: Color.fromRGBHex(0x000000),
};
export class MCWorld {
    constructor(db) {
        this.renderDistance = 2;
        this.blockSelectBuf = null; // TODO handle this better
        // TODO should move player pos into world eventually, then this can be computed from that rather
        //      than passed in
        this.playerChunkX = 0;
        this.playerChunkZ = 0;
        this.unloadChunksJob = this.unloadChunksJobFunc();
        this.loadChunksJob = this.loadChunksJobFunc();
        this.focusedBlockPos = null;
        this.db = db;
        this.chunks = new Dict2D();
        this.noise = new PerlinNoise(5489);
    }
    static async openWorld(worldName) {
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
    static upgradeWorldDB(db, ev) {
        assert(ev.oldVersion === 0);
        // https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB#structuring_the_database
        const chunksStore = db.createObjectStore('chunks', { autoIncrement: false, keyPath: 'chunkPos' });
    }
    async loadChunk(chunkX, chunkZ) {
        // console.log(`loading chunk at ${chunkX},${chunkZ}`);
        const chunk = await this.dbGetOrCreateChunk(chunkX, chunkZ);
        this.chunks.set(chunkX, chunkZ, chunk);
        return chunk;
    }
    async unloadChunk(chunkX, chunkY) {
        const chunk = this.chunks.get(chunkX, chunkY);
        if (chunk === undefined)
            return;
        // console.log(`unloading chunk at ${chunkX},${chunkY}`);
        await this.dbSaveChunk(chunk);
        this.chunks.del(chunkX, chunkY);
    }
    async dbGetChunk(chunkX, chunkZ) {
        const chunkData = await idbRequest2Promise(this.db.transaction('chunks', 'readonly')
            .objectStore('chunks')
            .get([chunkX, chunkZ]));
        if (chunkData === undefined)
            return null;
        else
            return await Chunk.fromDB(chunkData);
    }
    async dbGetOrCreateChunk(chunkX, chunkZ) {
        const existingChunk = await this.dbGetChunk(chunkX, chunkZ);
        if (existingChunk !== null) {
            return existingChunk;
        }
        const newChunk = await Chunk.newChunk(chunkX, chunkZ, this.noise);
        // TODO do worldgen here (or maybe in newChunk)
        await idbRequest2Promise(this.db.transaction('chunks', 'readwrite')
            .objectStore('chunks')
            .put(newChunk.toDB()));
        return newChunk;
    }
    async dbSaveChunk(chunk) {
        // console.log(`saving chunk at ${chunk.chunkPos}`);
        await idbRequest2Promise(this.db.transaction('chunks', 'readwrite')
            .objectStore('chunks')
            .put(chunk.toDB()));
    }
    async close() {
        console.log('saving world');
        console.log('saving all loaded chunks');
        for (const [chunk, [x, y]] of this.chunks) {
            this.dbSaveChunk(chunk);
        }
    }
    rebuildMeshes(stuff) {
        for (const [chunk] of this.chunks) {
            chunk.rebuildMeshes(stuff);
        }
    }
    render(stuff) {
        const { gl, program: { attrib: { a_Position }, uniform: { u_BlockPos, u_Color } } } = stuff;
        if (u_Color !== null)
            gl.uniform4f(u_Color, 0, 0, 0, 0);
        for (const [chunk] of this.chunks) {
            chunk.render(stuff);
        }
        // TODO scissor section in a corner & draw a minimap?
        // TODO should do this stuff elsewhere
        if (this.blockSelectBuf === null) {
            this.blockSelectBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
            gl.bufferData(gl.ARRAY_BUFFER, MCWorld.BLOCKSELECT_CUBE_POINTS, gl.STATIC_DRAW);
        }
        if (this.focusedBlockPos !== null) {
            if (a_Position !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.blockSelectBuf);
                gl.enableVertexAttribArray(a_Position);
                gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
            }
            if (u_BlockPos !== null)
                gl.uniform3f(u_BlockPos, this.focusedBlockPos.x, this.focusedBlockPos.y, this.focusedBlockPos.z);
            if (u_Color !== null)
                gl.uniform4f(u_Color, 0, 1, 0, 1);
            gl.drawArrays(gl.LINES, 0, MCWorld.BLOCKSELECT_CUBE_POINTS.length / 3);
        }
    }
    updatePlayerPos(pos) {
        this.playerChunkX = Math.floor(pos.x / 16);
        this.playerChunkZ = Math.floor(pos.z / 16);
    }
    shouldBeLoaded(chunkX, chunkZ) {
        return Math.max(Math.abs(this.playerChunkX - chunkX), Math.abs(this.playerChunkZ - chunkZ)) <= this.renderDistance;
    }
    async *unloadChunksJobFunc() {
        while (true) {
            let didUnloadAny = false;
            for (const [chunk, [chunkX, chunkZ]] of this.chunks) {
                if (!this.shouldBeLoaded(chunkX, chunkZ)) {
                    await this.unloadChunk(chunkX, chunkZ);
                    yield;
                    didUnloadAny = true;
                }
            }
            // avoid infinite loop when there's no chunks to unload
            if (!didUnloadAny)
                yield;
        }
    }
    async *loadChunksJobFunc() {
        while (true) {
            let didLoadAny = false;
            // TODO should do the one closest to the player every time
            for (let ox = -this.renderDistance; ox <= this.renderDistance; ox++) {
                for (let oz = -this.renderDistance; oz <= this.renderDistance; oz++) {
                    const x = this.playerChunkX + ox;
                    const z = this.playerChunkZ + oz;
                    if (this.shouldBeLoaded(x, z) && !this.chunks.has(x, z)) {
                        await this.loadChunk(x, z);
                        yield;
                        didLoadAny = true;
                    }
                }
            }
            // avoid infinite loop when there's no chunks to load
            if (!didLoadAny)
                yield;
        }
    }
    async serverTick() {
        await this.unloadChunksJob.next();
        await this.loadChunksJob.next();
    }
    getBlock(x, y, z) {
        var _a, _b;
        if (y < 0 || y > 255)
            return Block.AIR;
        const cX = Math.floor(x / 16);
        const cZ = Math.floor(z / 16);
        return (_b = (_a = this.chunks.get(cX, cZ)) === null || _a === void 0 ? void 0 : _a.getBlock(x - (cX * 16), y, z - (cZ * 16))) !== null && _b !== void 0 ? _b : Block.AIR;
    }
    setBlock(x, y, z, block) {
        const cX = Math.floor(x / 16);
        const cZ = Math.floor(z / 16);
        const chunk = this.chunks.get(cX, cZ);
        assert(chunk !== undefined, 'tried to set block in unloaded chunk');
        chunk.setBlock(x - (cX * 16), y, z - (cZ * 16), block);
    }
    focusBlock(v) {
        this.focusedBlockPos = (v === null) ? null : v.clone();
    }
    // implementation of "A fast voxel traversal algorithm for ray tracing." by John Amanatides and Andrew Woo
    intersect(pos, dir, maxDistance) {
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
        if (Number.isNaN(maxT.x))
            maxT.x = Infinity;
        if (Number.isNaN(maxT.y))
            maxT.y = Infinity;
        if (Number.isNaN(maxT.z))
            maxT.z = Infinity;
        if (Number.isNaN(delta.x))
            delta.x = 0;
        if (Number.isNaN(delta.y))
            delta.y = 0;
        if (Number.isNaN(delta.z))
            delta.z = 0;
        // if(dir.x === 0 && dir.z === 0 && dir.y !== 0) {
        //     // console.log({dir, step, maxT, delta, curBlockPos: curBlockPos.clone()});
        //     console.log(curBlockPos.add(step), curBlockPos.add(step).subInPlace(pos), curBlockPos.add(step).subInPlace(pos).divInPlace(dir));
        // }
        // incremental phase
        // (i've modified the algorithm to use a maximum distance cutoff rather than preset bounds)
        let distanceSoFarPrev = null;
        let distanceSoFar = 0;
        while (true) {
            // console.log(distanceSoFar);
            // check current block
            const curBlock = this.getBlock(curBlockPos.x, curBlockPos.y, curBlockPos.z);
            if (curBlock !== Block.AIR) {
                // return [pos.add(dir.mul(distanceSoFar)), ] as const;
                return [curBlockPos, curBlock];
            }
            // do the next incremental phase
            if (maxT.x < maxT.y) {
                if (maxT.x < maxT.z) {
                    curBlockPos.x += step.x;
                    maxT.x += delta.x;
                    distanceSoFar += delta.x;
                }
                else {
                    curBlockPos.z += step.z;
                    maxT.z += delta.z;
                    distanceSoFar += delta.z;
                }
            }
            else {
                if (maxT.y < maxT.z) {
                    curBlockPos.y += step.y;
                    maxT.y += delta.y;
                    distanceSoFar += delta.y;
                }
                else {
                    curBlockPos.z += step.z;
                    maxT.z += delta.z;
                    distanceSoFar += delta.z;
                }
            }
            if (distanceSoFar > maxDistance || distanceSoFar === distanceSoFarPrev) {
                break;
            }
            distanceSoFarPrev = distanceSoFar;
        } // while(distanceSoFar <= maxDistance);
        return null;
    }
}
MCWorld.BLOCKSELECT_CUBE_POINTS = new Float32Array([
    0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 0, 0, 0,
    1, 0, 0, 1, 0, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 0,
    0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0,
].map(n => (n - 0.5) * 1.01 + 0.5));
export class Chunk {
    constructor(chunkX, chunkZ, vChunks) {
        this.chunkPos = [chunkX, chunkZ];
        this.vChunks = vChunks;
    }
    get chunkX() { return this.chunkPos[0]; }
    get chunkZ() { return this.chunkPos[1]; }
    getVChunk(vChunkY) {
        const vc = this.vChunks[vChunkY];
        assert(vc !== undefined, 'vchunk index out of range');
        return vc;
    }
    getOrCreateVChunk(vChunkY) {
        const existingVC = this.getVChunk(vChunkY);
        if (existingVC !== null)
            return existingVC;
        return this.vChunks[vChunkY] = VChunk.newVChunk();
    }
    static vcIdx(y) {
        return y >> 4; // floor(y / 16)
    }
    getBlock(x, y, z) {
        const vcY = Chunk.vcIdx(y);
        const vc = this.getVChunk(vcY);
        if (vc === null || vc === undefined)
            return Block.AIR;
        else
            return vc.getBlock(x, y - (vcY * 16), z);
    }
    setBlock(x, y, z, block) {
        const vcY = Chunk.vcIdx(y);
        const vc = this.getOrCreateVChunk(vcY);
        vc.setBlock(x, y - (vcY * 16), z, block);
    }
    fillArea(minX, minY, minZ, maxX, maxY, maxZ, block) {
        debugAssert(0 <= minX && minX < 16, 'fillArea() minX out of range');
        debugAssert(0 <= minY && minY < 256, 'fillArea() minY out of range');
        debugAssert(0 <= minZ && minZ < 16, 'fillArea() minZ out of range');
        debugAssert(0 <= maxX && maxX < 16, 'fillArea() maxX out of range');
        debugAssert(0 <= maxY && maxY < 256, 'fillArea() maxY out of range');
        debugAssert(0 <= maxZ && maxZ < 16, 'fillArea() maxZ out of range');
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    this.setBlock(x, y, z, block);
                }
            }
        }
    }
    async doWorldgen(noise) {
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
        for (let x = 0; x < 16; x++) {
            for (let z = 0; z < 16; z++) {
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
    static async newChunk(chunkX, chunkZ, noise) {
        const chunk = new Chunk(chunkX, chunkZ, new Array(16).fill(null));
        chunk.doWorldgen(noise);
        return chunk;
    }
    static fromDB(data) {
        return new Chunk(data.chunkPos[0], data.chunkPos[1], data.vChunks.map(vc => vc === null ? null : VChunk.fromDB(vc)));
    }
    toDB() {
        return {
            chunkPos: [...this.chunkPos],
            vChunks: this.vChunks.map(v => v === null ? null : v.toDB()),
        };
    }
    *iterVChunks() {
        for (let i = 0; i < 16; i++) {
            const vChunk = this.vChunks[i];
            debugAssert(vChunk !== undefined);
            yield [vChunk, i];
        }
    }
    rebuildMeshes(stuff) {
        for (const [vChunk] of this.iterVChunks()) {
            if (vChunk !== null)
                vChunk.rebuildMesh(stuff);
        }
    }
    render(stuff) {
        for (let i = 0; i < 16; i++) {
            const vChunk = this.vChunks[i];
            debugAssert(vChunk !== undefined);
            if (vChunk === null || vChunk === undefined)
                continue;
            vChunk.render(stuff, this.chunkPos[0] * 16, i * 16, this.chunkPos[1] * 16);
        }
    }
}
export class VChunk {
    constructor(blockData) {
        this.numIndices = 0;
        this.blockData = blockData;
        this.meshVerts = null;
        this.meshIndices = null;
        this.meshUVs = null;
        this.meshDirty = true;
    }
    static blockIdx(x, y, z) {
        debugAssert(0 <= x && x < 16, 'vchunk block index x out if range');
        debugAssert(0 <= y && y < 16, 'vchunk block index y out if range');
        debugAssert(0 <= z && z < 16, 'vchunk block index z out if range');
        return (x << 0) + (y << 8) + (z << 4);
    }
    getBlock(x, y, z) {
        return this.blockData[VChunk.blockIdx(x, y, z)];
    }
    hasBlockAt(x, y, z) {
        return (
        // must be a valid index
        (0 <= x && x < 16 && 0 <= y && y < 16 && 0 <= z && z < 16)
            // must not be air there
            && (this.getBlock(x, y, z) !== Block.AIR));
    }
    setBlock(x, y, z, block) {
        this.blockData[VChunk.blockIdx(x, y, z)] = block.valueOf();
        this.meshDirty = true;
    }
    static newVChunk() {
        return new VChunk(new Uint8Array(16 * 16 * 16));
    }
    static fromDB(data) {
        return new VChunk(data);
    }
    toDB() {
        return this.blockData;
    }
    rebuildMesh(stuff) {
        if (this.meshDirty)
            this.buildMesh(stuff);
    }
    buildMesh(stuff) {
        const meshVerts = [];
        const meshIndices = [];
        const meshUVs = [];
        let elemIdx = 0;
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 16; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = this.getBlock(x, y, z);
                    if (block === Block.AIR)
                        continue;
                    for (const face of [CubeFace.UP, CubeFace.DOWN, CubeFace.LEFT, CubeFace.RIGHT, CubeFace.FRONT, CubeFace.BACK]) {
                        const [ox, oy, oz] = VChunk.CUBE_FACE_OFFSETS[face];
                        if (this.hasBlockAt(x + ox, y + oy, z + oz))
                            continue;
                        const faceVerts = VChunk.CUBE_FACE_VERTS[face];
                        for (const [vx, vy, vz] of faceVerts) {
                            meshVerts.push(x + vx, y + vy, z + vz);
                        }
                        if (debugToggles.has('render_wireframe')) {
                            meshIndices.push(elemIdx + 0, elemIdx + 1, elemIdx + 1, elemIdx + 2, elemIdx + 2, elemIdx + 3, elemIdx + 3, elemIdx + 0);
                        }
                        else {
                            for (const tri of VChunk.CUBE_FACE_INDICES[face]) {
                                for (const idx of tri)
                                    meshIndices.push(elemIdx + idx);
                            }
                        }
                        elemIdx += faceVerts.length;
                        const tex = getTextureFor(block, face, stuff.atlas);
                        meshUVs.push(tex.left, tex.top, tex.right, tex.top, tex.right, tex.bottom, tex.left, tex.bottom);
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
        if (a_Position !== null) {
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
        this.meshDirty = false;
    }
    deleteMesh(stuff) {
        const { glStuff: { gl } } = stuff;
        if (this.meshVerts !== null) {
            gl.deleteBuffer(this.meshVerts);
            this.meshVerts = null;
        }
        if (this.meshIndices !== null) {
            gl.deleteBuffer(this.meshIndices);
            this.meshIndices = null;
        }
        if (this.meshUVs !== null) {
            gl.deleteBuffer(this.meshUVs);
            this.meshUVs = null;
        }
        // this.meshDirty = true;
    }
    cleanup(stuff) {
        this.deleteMesh(stuff);
    }
    render(stuff, chunkX, chunkY, chunkZ) {
        const { gl, program: { uniform: { u_BlockPos }, attrib: { a_Position, a_UV } } } = stuff;
        if (this.meshVerts !== null && this.meshIndices !== null && this.meshUVs !== null) {
            if (a_Position !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.meshVerts);
                gl.enableVertexAttribArray(a_Position);
                gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
            }
            if (a_UV !== null) {
                gl.bindBuffer(gl.ARRAY_BUFFER, this.meshUVs);
                gl.enableVertexAttribArray(a_UV);
                gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
            }
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.meshIndices);
            // TODO probably rename BlockPos to something more general like Offset or whatever
            // TODO should probably add helpers for setting these rather than doing the null check every single time
            // our overall pos
            if (u_BlockPos !== null)
                gl.uniform3f(u_BlockPos, chunkX, chunkY, chunkZ);
            // render
            if (debugToggles.has('render_wireframe')) {
                gl.drawElements(gl.LINES, this.numIndices, gl.UNSIGNED_SHORT, 0);
            }
            else {
                gl.drawElements(gl.TRIANGLES, this.numIndices, gl.UNSIGNED_SHORT, 0);
            }
        }
        else {
            warnRateLimited(`skipping render of vchunk ${chunkX},${chunkY},${chunkZ} as it has no mesh`);
        }
    }
}
VChunk.CUBE_FACE_OFFSETS = {
    [CubeFace.FRONT]: [0, 0, 1],
    [CubeFace.RIGHT]: [1, 0, 0],
    [CubeFace.UP]: [0, 1, 0],
    [CubeFace.LEFT]: [-1, 0, 0],
    [CubeFace.DOWN]: [0, -1, 0],
    [CubeFace.BACK]: [0, 0, -1],
};
VChunk.CUBE_FACE_VERTS = {
    [CubeFace.FRONT]: [[0, 1, 1], [1, 1, 1], [1, 0, 1], [0, 0, 1]],
    [CubeFace.RIGHT]: [[1, 1, 0], [1, 1, 1], [1, 0, 1], [1, 0, 0]],
    [CubeFace.UP]: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]],
    [CubeFace.LEFT]: [[0, 1, 0], [0, 1, 1], [0, 0, 1], [0, 0, 0]],
    [CubeFace.DOWN]: [[0, 0, 0], [0, 0, 1], [1, 0, 1], [1, 0, 0]],
    [CubeFace.BACK]: [[0, 1, 0], [1, 1, 0], [1, 0, 0], [0, 0, 0]],
};
VChunk.CUBE_FACE_INDICES = {
    [CubeFace.FRONT]: [[0, 2, 1], [0, 3, 2]],
    [CubeFace.RIGHT]: [[0, 1, 2], [0, 2, 3]],
    [CubeFace.UP]: [[0, 1, 2], [0, 2, 3]],
    [CubeFace.LEFT]: [[0, 2, 1], [0, 3, 2]],
    [CubeFace.DOWN]: [[0, 2, 1], [0, 3, 2]],
    [CubeFace.BACK]: [[0, 1, 2], [0, 2, 3]],
};
//# sourceMappingURL=mc.js.map