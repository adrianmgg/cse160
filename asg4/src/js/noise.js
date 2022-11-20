import { assert, lerp } from "./util.js";
function nLowestBitsOf(numBits, val) {
    let mask;
    if (0 < numBits && numBits < 32)
        mask = (1 << numBits) - 1;
    else if (numBits == 32)
        mask = 0xFFFFFFFF;
    else
        assert(false);
    return val & mask;
}
const f32FromBits_buf = new ArrayBuffer(4);
const f32FromBits_f32 = new Float32Array(f32FromBits_buf);
const f32FromBits_u32 = new Uint32Array(f32FromBits_buf);
function float32FromBits(n) {
    f32FromBits_u32[0] = n;
    return f32FromBits_f32[0];
}
// based on pseudocode from https://en.wikipedia.org/wiki/Mersenne_Twister
export class MT19937 {
    constructor(seed) {
        // TODO use a [U]Int[N]Array?
        this.state = new Array(MT19937.n);
        this.index = MT19937.n;
        this.state[0] = seed;
        for (let i = 1; i < MT19937.n; i++) {
            this.state[i] = nLowestBitsOf(MT19937.w, (MT19937.f * (this.state[i - 1] ^ (this.state[i - 1] >> (MT19937.w - 2))) + i));
        }
    }
    twist() {
        for (let i = 0; i < MT19937.n; i++) {
            const x = (this.state[i] & MT19937.upperMask) | (this.state[(i + 1 % MT19937.n)] & MT19937.lowerMask);
            let xA = x >> 1;
            if ((x % 2) != 0) {
                xA |= MT19937.a;
            }
            this.state[i] = this.state[(i + MT19937.m) % MT19937.n] ^ xA;
        }
        this.index = 0;
    }
    extractNumber() {
        if (this.index >= MT19937.n) {
            this.twist();
        }
        let y = this.state[this.index];
        y ^= (y >> MT19937.u) & MT19937.d;
        y ^= (y << MT19937.s) & MT19937.b;
        y ^= (y << MT19937.t) & MT19937.c;
        y ^= y >> MT19937.l;
        this.index += 1;
        return nLowestBitsOf(MT19937.w, y);
    }
    /** generate a float in [0,1) */
    nextFloat01() {
        // https://stackoverflow.com/questions/19167844/proper-way-to-generate-a-random-float-given-a-binary-random-number-generator#comment69596191_38425898
        return float32FromBits((127 << 23) | nLowestBitsOf(23, this.extractNumber())) - 1.0;
    }
}
// MT19937 coefficients
MT19937.w = 32;
MT19937.n = 624;
MT19937.m = 397;
MT19937.r = 31;
MT19937.a = 0x9908B0DF;
MT19937.u = 11;
MT19937.d = 0xFFFFFFFF;
MT19937.s = 7;
MT19937.b = 0x9D2C5680;
MT19937.t = 15;
MT19937.c = 0xEFC60000;
MT19937.l = 18;
MT19937.f = 1812433253;
MT19937.lowerMask = (1 << MT19937.r) - 1;
MT19937.upperMask = nLowestBitsOf(MT19937.w, ~MT19937.lowerMask);
// based on https://rosettacode.org/wiki/Perlin_noise#Java, https://github.com/josephg/noisejs/blob/master/perlin.js
export class PerlinNoise {
    // seed logic from noisejs (see above for link)
    constructor(seed) {
        this.p = new Array(512);
        this.g = new Array(512);
        for (let i = 0; i < 256; i++) {
            // const v = PerlinNoise.permutation[i]! ^ ((i % 1 == 0) ? ((seed>>8) & 255) : (seed & 255));
            let v;
            if (i & 1)
                v = PerlinNoise.permutation[i] ^ (seed & 255);
            else
                v = PerlinNoise.permutation[i] ^ ((seed >> 8) & 255);
            this.p[i] = this.p[i + 256] = v;
            this.g[i] = this.g[i + 256] = PerlinNoise.grad3[v % 12];
        }
    }
    static fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    static grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
    }
    sample(x, y) {
        let X = Math.floor(x);
        let Y = Math.floor(y);
        x -= X;
        y -= Y;
        X &= 255;
        Y &= 255;
        const g00 = this.g[X + this.p[Y]];
        const g01 = this.g[X + this.p[Y + 1]];
        const g10 = this.g[X + 1 + this.p[Y]];
        const g11 = this.g[X + 1 + this.p[Y + 1]];
        const n00 = g00[0] * x + g00[1] * y;
        const n01 = g01[0] * x + g01[1] * (y - 1);
        const n10 = g10[0] * (x - 1) + g10[1] * y;
        const n11 = g11[0] * (x - 1) + g11[1] * (y - 1);
        const u = PerlinNoise.fade(x);
        const v = PerlinNoise.fade(y);
        return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
    }
}
PerlinNoise.permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36, 103, 30, 69, 142, 8, 99, 37, 240, 21,
    10, 23, 190, 6, 148, 247, 120, 234, 75, 0, 26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149,
    56, 87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77, 146, 158, 231, 83, 111, 229,
    122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46, 245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209,
    76, 132, 187, 208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173, 186, 3, 64, 52, 217,
    226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85, 212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42,
    223, 183, 170, 213, 119, 248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39, 253, 19,
    98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228, 251, 34, 242, 193, 238, 210, 144, 12, 191,
    179, 162, 241, 81, 51, 145, 235, 249, 14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115,
    121, 50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141, 128, 195, 78, 66, 215, 61, 156,
    180
];
PerlinNoise.grad3 = [[1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0], [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1], [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]];
//# sourceMappingURL=noise.js.map