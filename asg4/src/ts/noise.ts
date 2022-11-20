import { assert, debugAssert, lerp, NTupleOf } from "./util.js";

function nLowestBitsOf(numBits: number, val: number): number {
    let mask;
    if(0 < numBits && numBits < 32) mask = (1 << numBits) - 1;
    else if(numBits == 32)          mask = 0xFFFFFFFF;
    else assert(false);
    return val & mask;
}

const f32FromBits_buf = new ArrayBuffer(4);
const f32FromBits_f32 = new Float32Array(f32FromBits_buf);
const f32FromBits_u32 = new Uint32Array(f32FromBits_buf);
function float32FromBits(n: number): number {
    f32FromBits_u32[0] = n;
    return f32FromBits_f32[0]!;
}

// based on pseudocode from https://en.wikipedia.org/wiki/Mersenne_Twister
export class MT19937 {
    // MT19937 coefficients
    private static readonly w = 32;
    private static readonly n = 624;
    private static readonly m = 397;
    private static readonly r = 31;
    private static readonly a = 0x9908B0DF;
    private static readonly u = 11;
    private static readonly d = 0xFFFFFFFF;
    private static readonly s = 7;
    private static readonly b = 0x9D2C5680;
    private static readonly t = 15;
    private static readonly c = 0xEFC60000;
    private static readonly l = 18;

    private static readonly f = 1812433253;

    private static readonly lowerMask = (1 << MT19937.r) - 1;
    private static readonly upperMask = nLowestBitsOf(MT19937.w, ~MT19937.lowerMask);

    private readonly state: number[]; // array of n w-bit numbers
    private index: number;

    constructor(seed: number) {
        // TODO use a [U]Int[N]Array?
        this.state = new Array(MT19937.n);
        this.index = MT19937.n;
        this.state[0] = seed;
        for(let i = 1; i < MT19937.n; i++) {
            this.state[i] = nLowestBitsOf(
                MT19937.w,
                (MT19937.f * (this.state[i-1]! ^ (this.state[i-1]! >> (MT19937.w-2))) + i)
            );
        }
    }

    private twist() {
        for(let i = 0; i < MT19937.n; i++) {
            const x = (this.state[i]! & MT19937.upperMask) | (this.state[(i+1 % MT19937.n)]! & MT19937.lowerMask);
            let xA = x >> 1;
            if((x % 2) != 0) {
                xA |= MT19937.a;
            }
            this.state[i] = this.state[(i + MT19937.m) % MT19937.n]! ^ xA;
        }
        this.index = 0;
    }

    private extractNumber() {
        if(this.index >= MT19937.n) {
            this.twist();
        }
        let y = this.state[this.index]!;
        y ^= (y >> MT19937.u) & MT19937.d;
        y ^= (y << MT19937.s) & MT19937.b;
        y ^= (y << MT19937.t) & MT19937.c;
        y ^= y >> MT19937.l;
        this.index += 1;
        return nLowestBitsOf(MT19937.w, y);
    }

    /** generate a float in [0,1) */
    nextFloat01(): number {
        // https://stackoverflow.com/questions/19167844/proper-way-to-generate-a-random-float-given-a-binary-random-number-generator#comment69596191_38425898
        return float32FromBits((127 << 23) | nLowestBitsOf(23, this.extractNumber())) - 1.0;
    }
}


type Grad = readonly [number, number, number];
// based on https://rosettacode.org/wiki/Perlin_noise#Java, https://github.com/josephg/noisejs/blob/master/perlin.js
export class PerlinNoise {
    private static readonly permutation: number[] = [
        151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,
        10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,
        56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,
        122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,
        76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,
        226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,
        223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,
        98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,
        179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,
        121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,
        180
    ];
    private static readonly grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]] as const;

    private readonly p: number[];
    private readonly g: Grad[];

    // seed logic from noisejs (see above for link)
    constructor(seed: number) {
        this.p = new Array(512);
        this.g = new Array(512);
        for(let i = 0; i < 256; i++) {
            // const v = PerlinNoise.permutation[i]! ^ ((i % 1 == 0) ? ((seed>>8) & 255) : (seed & 255));
            let v;
            if(i & 1) v = PerlinNoise.permutation[i]! ^ (seed & 255);
            else      v = PerlinNoise.permutation[i]! ^ ((seed>>8) & 255);
            this.p[i] = this.p[i + 256] = v;
            this.g[i] = this.g[i + 256] = PerlinNoise.grad3[v % 12]!;
        }
    }

    private static fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }
    private static grad(hash: number, x: number, y: number, z: number) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h == 12 || h == 14 ? x : z;
        return ((h&1) == 0 ? u : -u) + ((h&2) == 0 ? v : -v);
    }

    sample(x: number, y: number): number {
        let X = Math.floor(x);
        let Y = Math.floor(y);
        x -= X;
        y -= Y;
        X &= 255;
        Y &= 255;
        const g00 = this.g[X   + this.p[Y  ]!]!;
        const g01 = this.g[X   + this.p[Y+1]!]!;
        const g10 = this.g[X+1 + this.p[Y  ]!]!;
        const g11 = this.g[X+1 + this.p[Y+1]!]!;
        const n00 = g00[0]*x + g00[1]*y;
        const n01 = g01[0]*x + g01[1]*(y-1);
        const n10 = g10[0]*(x-1) + g10[1]*y;
        const n11 = g11[0]*(x-1) + g11[1]*(y-1);
        const u = PerlinNoise.fade(x);
        const v = PerlinNoise.fade(y);
        return lerp(
            lerp(n00, n10, u),
            lerp(n01, n11, u),
            v
        )
    }

    // sample(x: number, y: number, z: number): number {
    //     const X = Math.floor(x) % 0xff;
    //     const Y = Math.floor(y) % 0xff;
    //     const Z = Math.floor(z) % 0xff;
    //     x -= Math.floor(x);
    //     y -= Math.floor(y);
    //     z -= Math.floor(z);
    //     const u = PerlinNoise.fade(x);
    //     const v = PerlinNoise.fade(y);
    //     const w = PerlinNoise.fade(z);
    //     const A  = this.permutation[    X]! + Y;
    //     const AA = this.permutation[    A]! + Z;
    //     const AB = this.permutation[(A+1)]! + Z;
    //     const B  = this.permutation[(X+1)]! + Y;
    //     const BA = this.permutation[    B]! + Z;
    //     const BB = this.permutation[(B+1)]! + Z;
    //     return lerp(
    //         lerp(
    //             lerp(PerlinNoise.grad(this.permutation[AA]!, x, y, z), PerlinNoise.grad(this.permutation[BA]!, x-1, y, z), u),
    //             lerp(PerlinNoise.grad(this.permutation[AB]!, x, y-1, z), PerlinNoise.grad(this.permutation[BB]!, x-1, y-1, z), u),
    //             v
    //         ),
    //         lerp(
    //             lerp(PerlinNoise.grad(this.permutation[AA+1]!, x, y, z-1), PerlinNoise.grad(this.permutation[BA+1]!, x-1, y, z-1), u),
    //             lerp(PerlinNoise.grad(this.permutation[AB+1]!, x, y-1, z-1), PerlinNoise.grad(this.permutation[BB+1]!, x-1, y-1, z-1 ), u),
    //             v
    //         ),
    //         w
    //     );
    // }
}

