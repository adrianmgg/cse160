// @ts-check
'use strict';

// import some types from our typescript file (can't declare typescript interface in jsdoc comments)
/** @typedef { import('./types').Renderable } Renderable */

/** @typedef {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} ArrayOf16Numbers */

class Mat4x4 {
    /** @private */
    static _IDENTITY = Mat4x4.of(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    );

    /**
     * @param {Float32Array} data matrix's data, IN COLUMN-MAJOR ORDER
     * @private
     */
    constructor(data) {
        /** @type {Float32Array} */
        this.data = data;
        // this.data = new Float32Array(source);
    }

    /**
     * @param {number} row
     * @param {number} col
     * @returns {number}
     */
    get(row, col) {
        return this.data[row + (col * 4)];
    }

    /**
     * @param {(value: number, row: number, col: number, mat: Mat4x4) => number} f
     * @returns {Mat4x4}
     */
     map(f) {
        return new Mat4x4(this.data.map((value, i) => {
            const row = i % 4;
            const col = (i - row) >> 2; // equivalent to floor((i - row) / 4)
            return f(value, row, col, this);
        }));
    }

    /**
     * construct new matrix from ROW-MAJOR values
     * @param  {ArrayOf16Numbers} a
     * @returns {Mat4x4}
     */
    static of(...a) {
        return new Mat4x4(new Float32Array([a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]]));
    }

    /**
     * @param {Mat4x4} other
     * @returns {Mat4x4}
     */
    matmul(other) {
        // const a = this.data, b = other.data;
        // return Mat4x4.of(
        //     a[ 0]*b[ 0]+a[ 4]*b[ 1]+a[ 8]*b[ 2]+a[12]*b[ 3], a[ 0]*b[ 4]+a[ 4]*b[ 5]+a[ 8]*b[ 6]+a[12]*b[ 7], a[ 0]*b[ 8]+a[ 4]*b[ 9]+a[ 8]*b[10]+a[12]*b[11], a[ 0]*b[12]+a[ 4]*b[13]+a[ 8]*b[14]+a[12]*b[15],
        //     a[ 1]*b[ 0]+a[ 5]*b[ 1]+a[ 9]*b[ 2]+a[13]*b[ 3], a[ 1]*b[ 4]+a[ 5]*b[ 5]+a[ 9]*b[ 6]+a[13]*b[ 7], a[ 1]*b[ 8]+a[ 5]*b[ 9]+a[ 9]*b[10]+a[13]*b[11], a[ 1]*b[12]+a[ 5]*b[13]+a[ 9]*b[14]+a[13]*b[15],
        //     a[ 2]*b[ 0]+a[ 6]*b[ 1]+a[10]*b[ 2]+a[14]*b[ 3], a[ 2]*b[ 4]+a[ 6]*b[ 5]+a[10]*b[ 6]+a[14]*b[ 7], a[ 2]*b[ 8]+a[ 6]*b[ 9]+a[10]*b[10]+a[14]*b[11], a[ 2]*b[12]+a[ 6]*b[13]+a[10]*b[14]+a[14]*b[15],
        //     a[ 3]*b[ 0]+a[ 7]*b[ 1]+a[11]*b[ 2]+a[15]*b[ 3], a[ 3]*b[ 4]+a[ 7]*b[ 5]+a[11]*b[ 6]+a[15]*b[ 7], a[ 3]*b[ 8]+a[ 7]*b[ 9]+a[11]*b[10]+a[15]*b[11], a[ 3]*b[12]+a[ 7]*b[13]+a[11]*b[14]+a[15]*b[15],
        // );
        return this.clone().matmulInPlace(other);
    }
    /** @param {Mat4x4} other @returns {Mat4x4} */
    matmulInPlace(other) {
        this.data.set([
            this.data[ 0]*other.data[ 0] + this.data[ 4]*other.data[ 1] + this.data[ 8]*other.data[ 2] + this.data[12]*other.data[ 3], this.data[ 1]*other.data[ 0] + this.data[ 5]*other.data[ 1] + this.data[ 9]*other.data[ 2] + this.data[13]*other.data[ 3], this.data[ 2]*other.data[ 0] + this.data[ 6]*other.data[ 1] + this.data[10]*other.data[ 2] + this.data[14]*other.data[ 3], this.data[ 3]*other.data[ 0] + this.data[ 7]*other.data[ 1] + this.data[11]*other.data[ 2] + this.data[15]*other.data[ 3],
            this.data[ 0]*other.data[ 4] + this.data[ 4]*other.data[ 5] + this.data[ 8]*other.data[ 6] + this.data[12]*other.data[ 7], this.data[ 1]*other.data[ 4] + this.data[ 5]*other.data[ 5] + this.data[ 9]*other.data[ 6] + this.data[13]*other.data[ 7], this.data[ 2]*other.data[ 4] + this.data[ 6]*other.data[ 5] + this.data[10]*other.data[ 6] + this.data[14]*other.data[ 7], this.data[ 3]*other.data[ 4] + this.data[ 7]*other.data[ 5] + this.data[11]*other.data[ 6] + this.data[15]*other.data[ 7],
            this.data[ 0]*other.data[ 8] + this.data[ 4]*other.data[ 9] + this.data[ 8]*other.data[10] + this.data[12]*other.data[11], this.data[ 1]*other.data[ 8] + this.data[ 5]*other.data[ 9] + this.data[ 9]*other.data[10] + this.data[13]*other.data[11], this.data[ 2]*other.data[ 8] + this.data[ 6]*other.data[ 9] + this.data[10]*other.data[10] + this.data[14]*other.data[11], this.data[ 3]*other.data[ 8] + this.data[ 7]*other.data[ 9] + this.data[11]*other.data[10] + this.data[15]*other.data[11],
            this.data[ 0]*other.data[12] + this.data[ 4]*other.data[13] + this.data[ 8]*other.data[14] + this.data[12]*other.data[15], this.data[ 1]*other.data[12] + this.data[ 5]*other.data[13] + this.data[ 9]*other.data[14] + this.data[13]*other.data[15], this.data[ 2]*other.data[12] + this.data[ 6]*other.data[13] + this.data[10]*other.data[14] + this.data[14]*other.data[15], this.data[ 3]*other.data[12] + this.data[ 7]*other.data[13] + this.data[11]*other.data[14] + this.data[15]*other.data[15]
        ]);
        return this;
    }

    /** @param {Mat4x4} other @returns {Mat4x4} */
    set(other) {
        this.data.set(other.data);
        return this;
    }

    /** @returns {Mat4x4} */
    clone() {
        return new Mat4x4(new Float32Array(this.data))
    }

    /** @param {number} a @returns {Mat4x4} */
    componentwiseAdd(a) {
        return new Mat4x4(this.data.map(v => v + a));
    }
    /** @param {number} a @returns {Mat4x4} */
    componentwiseSub(a) {
        return new Mat4x4(this.data.map(v => v - a));
    }
    /** @param {number} a @returns {Mat4x4} */
    componentwiseMul(a) {
        return new Mat4x4(this.data.map(v => v * a));
    }
    /** @param {number} a @returns {Mat4x4} */
    componentwiseDiv(a) {
        return new Mat4x4(this.data.map(v => v / a));
    }

    /** @returns {Mat4x4} */
    cofactorMatrix() {
        // "Each element of a square matrix has a cofactor which is the
        //  determinant of a matrix with one fewer row and column possibly
        //  multiplied by minus one."
        // "The sign of a cofactor is positive if the sum of the row and column
        //  indices is even and negative otherwise"
        const d = this.data;
        return Mat4x4.of(
            d[ 5]*(d[10]*d[15]-d[14]*d[11])-d[ 9]*d[ 6]*d[15]+d[ 9]*d[14]*d[ 7]+d[13]*(d[ 6]*d[11]-d[10]*d[ 7]), d[ 1]*(d[14]*d[11]-d[10]*d[15])+d[ 9]*d[ 2]*d[15]-d[ 9]*d[14]*d[ 3]+d[13]*(d[10]*d[ 3]-d[ 2]*d[11]), d[ 1]*(d[ 6]*d[15]-d[14]*d[ 7])-d[ 5]*d[ 2]*d[15]+d[ 5]*d[14]*d[ 3]+d[13]*(d[ 2]*d[ 7]-d[ 6]*d[ 3]), d[ 1]*(d[10]*d[ 7]-d[ 6]*d[11])+d[ 5]*d[ 2]*d[11]-d[ 5]*d[10]*d[ 3]+d[ 9]*(d[ 6]*d[ 3]-d[ 2]*d[ 7]),
            d[ 4]*(d[14]*d[11]-d[10]*d[15])+d[ 8]*d[ 6]*d[15]-d[ 8]*d[14]*d[ 7]+d[12]*(d[10]*d[ 7]-d[ 6]*d[11]), d[ 0]*(d[10]*d[15]-d[14]*d[11])-d[ 8]*d[ 2]*d[15]+d[ 8]*d[14]*d[ 3]+d[12]*(d[ 2]*d[11]-d[10]*d[ 3]), d[ 0]*(d[14]*d[ 7]-d[ 6]*d[15])+d[ 4]*d[ 2]*d[15]-d[ 4]*d[14]*d[ 3]+d[12]*(d[ 6]*d[ 3]-d[ 2]*d[ 7]), d[ 0]*(d[ 6]*d[11]-d[10]*d[ 7])-d[ 4]*d[ 2]*d[11]+d[ 4]*d[10]*d[ 3]+d[ 8]*(d[ 2]*d[ 7]-d[ 6]*d[ 3]),
            d[ 4]*(d[ 9]*d[15]-d[13]*d[11])-d[ 8]*d[ 5]*d[15]+d[ 8]*d[13]*d[ 7]+d[12]*(d[ 5]*d[11]-d[ 9]*d[ 7]), d[ 0]*(d[13]*d[11]-d[ 9]*d[15])+d[ 8]*d[ 1]*d[15]-d[ 8]*d[13]*d[ 3]+d[12]*(d[ 9]*d[ 3]-d[ 1]*d[11]), d[ 0]*(d[ 5]*d[15]-d[13]*d[ 7])-d[ 4]*d[ 1]*d[15]+d[ 4]*d[13]*d[ 3]+d[12]*(d[ 1]*d[ 7]-d[ 5]*d[ 3]), d[ 0]*(d[ 9]*d[ 7]-d[ 5]*d[11])+d[ 4]*d[ 1]*d[11]-d[ 4]*d[ 9]*d[ 3]+d[ 8]*(d[ 5]*d[ 3]-d[ 1]*d[ 7]),
            d[ 4]*(d[13]*d[10]-d[ 9]*d[14])+d[ 8]*d[ 5]*d[14]-d[ 8]*d[13]*d[ 6]+d[12]*(d[ 9]*d[ 6]-d[ 5]*d[10]), d[ 0]*(d[ 9]*d[14]-d[13]*d[10])-d[ 8]*d[ 1]*d[14]+d[ 8]*d[13]*d[ 2]+d[12]*(d[ 1]*d[10]-d[ 9]*d[ 2]), d[ 0]*(d[13]*d[ 6]-d[ 5]*d[14])+d[ 4]*d[ 1]*d[14]-d[ 4]*d[13]*d[ 2]+d[12]*(d[ 5]*d[ 2]-d[ 1]*d[ 6]), d[ 0]*(d[ 5]*d[10]-d[ 9]*d[ 6])-d[ 4]*d[ 1]*d[10]+d[ 4]*d[ 9]*d[ 2]+d[ 8]*(d[ 1]*d[ 6]-d[ 5]*d[ 2])
        );
    }

    /** @returns {Mat4x4} */
    transpose() {
        // "The transpose AT of a matrix A has the same numbers but the rows are switched with the columns."
        return Mat4x4.of(
            this.get(0,0), this.get(1,0), this.get(2,0), this.get(3,0),
            this.get(0,1), this.get(1,1), this.get(2,1), this.get(3,1),
            this.get(0,2), this.get(1,2), this.get(2,2), this.get(3,2),
            this.get(0,3), this.get(1,3), this.get(2,3), this.get(3,3)
        );
    }

    /** @returns {Mat4x4} */
    inverse() {
        const cofactors = this.cofactorMatrix();
        const adjoint = cofactors.transpose();
        // "The determinant of a matrix is found by taking the sum of products
        //  of the elements of any row or column with their cofactors."
        const determinant = this.get(0, 0)*cofactors.get(0, 0) + this.get(0, 1)*cofactors.get(0, 1) + this.get(0, 2)*cofactors.get(0, 2) + this.get(0, 3)*cofactors.get(0, 3);
        // "For any matrix, the inverse is the adjoint matrix
        //  divided by the determinant of the matrix being inverted"
        return adjoint.componentwiseDiv(determinant);
    }

    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    translate(x, y, z) {
        return this.matmul(Mat4x4.translate(x, y, z));
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    scale (x, y, z) {
        return this.matmul(Mat4x4.scale(x, y, z));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateX(theta) {
        return this.matmul(Mat4x4.rotateX(theta));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateY(theta) {
        return this.matmul(Mat4x4.rotateY(theta));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateZ(theta) {
        return this.matmul(Mat4x4.rotateZ(theta));
    }

    /** @returns {Mat4x4} */
    static identity() {
        return Mat4x4._IDENTITY;
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    static translate(x, y, z) {
        return Mat4x4.of(
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1,
        );
    }
    /**
     * @param {[number] | [number, number, number]} args
     * @returns {Mat4x4}
     */
    static scale(...args) {
        let x, y, z;
        if(args.length === 3) {
            [x, y, z] = args;
        } else {
            x = y = z = args[0];
        }
        return Mat4x4.of(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1,
        );
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateX(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(
            1, 0, 0, 0,
            0, cos, -sin, 0,
            0, sin, cos, 0,
            0, 0, 0, 1,
        );
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateY(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(
            cos, 0, sin, 0,
            0, 1, 0, 0,
            -sin, 0, cos, 0,
            0, 0, 0, 1,
        );
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateZ(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(
            cos, -sin, 0, 0,
            sin, cos, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
    }
}




class Vec {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @private
     */
    constructor(x, y, z) {
        /** @readonly @type {number} */
        this.x = x;
        /** @readonly @type {number} */
        this.y = y;
        /** @readonly @type {number} */
        this.z = z;
    }

    // tbh this doesn't really need the private ctor + public static .of() split, but might as well be consistent with the others like Mat4 i guess
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     */
    static of(x, y, z) {
        return new Vec(x, y, z);
    }

    /** @param {number} r @param {number} theta @param {number} phi @returns {Vec} */
    static fromSpherical(r, theta, phi) {
        const sinTheta = Math.sin(theta);
        return Vec.of(r * sinTheta * Math.cos(phi), r * sinTheta * Math.sin(phi), r * Math.cos(theta));
    }
    /** @param {number} r @param {number} theta @returns {Vec} */
    static fromPolar(r, theta) {
        return Vec.of(r * Math.cos(theta), 0, r * Math.sin(theta));
    }

    magnitude() {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
    }

    /** @param {Vec | number} a @returns {Vec} */
    add(a) {
        if(typeof a === 'number') return Vec.of(this.x + a, this.y + a, this.z + a);
        else return Vec.of(this.x + a.x, this.y + a.y, this.z + a.z);
    }
    /** @param {Vec} a @param {Vec | number} b @returns {Vec} */
    static add(a, b) { return a.add(b); }
    /** @param {Vec | number} a @returns {Vec} */
    sub(a) {
        if(typeof a === 'number') return Vec.of(this.x - a, this.y - a, this.z - a);
        else return Vec.of(this.x - a.x, this.y - a.y, this.z - a.z);
    }
    /** @param {Vec} a @param {Vec | number} b @returns {Vec} */
    static sub(a, b) { return a.sub(b); }
    /** @param {Vec | number} a @returns {Vec} */
    mul(a) {
        if(typeof a === 'number') return Vec.of(this.x * a, this.y * a, this.z * a);
        else return Vec.of(this.x * a.x, this.y * a.y, this.z * a.z);
    }
    /** @param {Vec} a @param {Vec | number} b @returns {Vec} */
    static mul(a, b) { return a.mul(b); }
    /** @param {Vec | number} a @returns {Vec} */
    div(a) {
        if(typeof a === 'number') return Vec.of(this.x / a, this.y / a, this.z / a);
        else return Vec.of(this.x / a.x, this.y / a.y, this.z / a.z);
    }
    /** @param {Vec} a @param {Vec | number} b @returns {Vec} */
    static div(a, b) { return a.div(b); }

    /** @param {Vec} a @param {Vec} b @returns {Vec} */
    static cross(a, b) { return Vec.of(-a.z*b.y + a.y*b.z, a.z*b.x - a.x*b.z, -a.y*b.x + a.x*b.y); }
    /** @param {Vec} a @returns {Vec} */
    cross(a) { return Vec.cross(this, a); }

    /** @returns {[number, number, number]} */
    xyz() {
        return [this.x, this.y, this.z];
    }

    /** @param {Mat4x4} mat @returns {Vec} */
    transform(mat) {
        // TODO vecs should probably have a .w?
        return Vec.of(
            mat.get(0, 0) * this.x + mat.get(0, 1) * this.y + mat.get(0, 2) * this.z + mat.get(0, 3) * /*this.w*/1,
            mat.get(1, 0) * this.x + mat.get(1, 1) * this.y + mat.get(1, 2) * this.z + mat.get(1, 3) * /*this.w*/1,
            mat.get(2, 0) * this.x + mat.get(2, 1) * this.y + mat.get(2, 2) * this.z + mat.get(2, 3) * /*this.w*/1,
        );
    }

    static ZERO = Vec.of(0, 0, 0);
    static ONE = Vec.of(1, 1, 1);
    static UP = Vec.of(0, 1, 0);
    static DOWN = Vec.of(0, -1, 0);
    static RIGHT = Vec.of(1, 0, 0);
    static LEFT = Vec.of(-1, 0, 0);
    static BACKWARDS = Vec.of(0, 0, 1);
    static FORWARDS = Vec.of(0, 0, -1);
}



class Camera {
    constructor() {
        /** @type {Vec} */
        this.pos = Vec.ZERO;
        /** @type {Vec} */
        this.gaze = Vec.FORWARDS;
        /** @type {Vec} */
        this.up = Vec.UP;

        /** @type {number} */
        this.nearPlane = 1e-2;
        /** @type {number} */
        this.farPlane = 1e4;
        this.fov = Math.PI / 2;
    }

    /**
     * point {@link Camera.gaze} towards the specified point
     * @param {Vec} v 
     */
    gazeTowards(v) {
        this.gaze = v.sub(this.pos);
    }

    /** @private @returns {Mat4x4} */
    cameraMat() {
        const w = this.gaze.div(this.gaze.magnitude()).mul(-1);
        const up_cross_w = this.up.cross(w);
        const u = up_cross_w.div(up_cross_w.magnitude());
        const v = w.cross(u);
        return Mat4x4.of(
            u.x, u.y, u.z, 0,
            v.x, v.y, v.z, 0,
            w.x, w.y, w.z, 0,
            0, 0, 0, 1
        ).translate(-this.pos.x, -this.pos.y, -this.pos.z);
    }

    /** @private @returns {Mat4x4} */
    perspectiveMat() {
        const abs_n = Math.abs(this.nearPlane);
        const abs_f = Math.abs(this.farPlane);
        const topPlane = Math.tan(this.fov / 2) * abs_n;
        const bottomPlane = -topPlane;
        // TODO hardcoding canvas dimensions for now, should be dynamic
        const canvasWidth = 400, canvasHeight = 400;
        const rightPlane = canvasWidth / canvasHeight * topPlane;
        const leftPlane = -rightPlane;
        // pg. 153
        return Mat4x4.of(
            (2*abs_n)/(rightPlane-leftPlane), 0, (leftPlane+rightPlane)/(rightPlane-leftPlane), 0,
            0, (2*abs_n)/(topPlane-bottomPlane), (bottomPlane+topPlane)/(topPlane-bottomPlane), 0,
            0, 0, (abs_f+abs_n)/(abs_n-abs_f), (2*abs_f*abs_n)/(abs_n-abs_f),
            0, 0, -1, 0
        );
    }
    
    /** @private @returns {Mat4x4} */
    viewportMat() {
        // TODO hardcoding canvas dimensions for now, should be dynamic
        const canvasWidth = 400, canvasHeight = 400;
        // eqn 7.2
        return Mat4x4.of(
            canvasWidth / 2, 0, 0, (canvasWidth - 1) / 2,
            0, canvasHeight / 2, 0, (canvasHeight - 1) / 2,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    }

    // 7.1.3 - The Camera Transformation
    world2viewMat() {
        // viewport mat not needed i guess?
        return this.perspectiveMat().matmul(this.cameraMat());
    }
}


/**
 * @implements {Renderable}
 */
class Bone {
    /**
     * @param {Mat4x4} mat
     */
    constructor(mat) {
        /** @type {Mat4x4} */
        this.mat = mat;
        /** @type {number} */
        this.length = 1.0;
        /** @type {Renderable[]} */
        this.children = [];

        /** @private @type {Mat4x4} */
        this.tmpMat = Mat4x4.identity().clone();
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {Mat4x4} mat
     */
    render(gl, mat) {
        /** @type {[number, number, number][]} */
<<<<<<< Updated upstream
        const points = [
            [0, 0, 0],
            Vec.UP.mul(this.length).xyz(), // TODO should do this with a matrix & a global mesh for bones instead

            // [ .1,  .1, -.1],
            // [ .1,  .1, -.1],
            // [ .1, -.1, -.1],
            // [-.1, -.1, -.1],

            // [-.1, -.1, .1],
            // [-.1,  .1, .1],
            // [ .1,  .1, .1],
            // [ .1, -.1, .1],
            // [-.1, -.1, .1],
        ];
        const newMat = mat.matmul(this.mat);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points.flat()), gl.DYNAMIC_DRAW);
=======
        // const points = [
        //     [0, 0, 0],
        //     Vec.UP.mul(this.length).xyz(), // TODO should do this with a matrix & a global mesh for bones instead
        // ];
        // const newMat = mat.matmul(this.mat);
        this.tmpMat.set(mat).matmulInPlace(this.mat);
        gl.bufferData(gl.ARRAY_BUFFER, Bone.BONE_DISPLAY_POINTS, gl.DYNAMIC_DRAW);
>>>>>>> Stashed changes
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniformMatrix4fv(u_ModelMat, false, this.tmpMat.data);
        gl.uniform4f(u_FragColor, 1, 0, 0, 1);
<<<<<<< Updated upstream
        gl.drawArrays(gl.POINTS, 0, points.length);
        gl.drawArrays(gl.LINE_STRIP, 0, points.length);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        for(const child of this.children) child.render(gl, newMat);
=======
        gl.drawArrays(gl.POINTS, 0, Bone.BONE_DISPLAY_POINTS.length / 3);
        gl.drawArrays(gl.LINE_STRIP, 0, Bone.BONE_DISPLAY_POINTS.length / 3);
        for(const child of this.children) child.render(gl, this.tmpMat);
>>>>>>> Stashed changes
    }
}



class Mesh {
    /** @param {Float32Array | number[]} verts @param {Uint16Array | number[]} indices */
    constructor(verts, indices) {
        // these shouldn't be constructed very often so i'm not too worried about any minor performance hits from the instanceof stuff
        /** @type {Float32Array} */
        this.verts = verts instanceof Float32Array ? verts : new Float32Array(verts);
        /** @type {Uint16Array} */
        this.indices = indices instanceof Uint16Array ? indices : new Uint16Array(indices);
    }
    
    // https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/bmesh/operators/bmo_primitive.c
    
    // numbers from webgl textbook (but modified to be unit cube)
    static UNIT_CUBE = new Mesh([
        .5, .5, .5,
        -.5, .5, .5,
        -.5, -.5, .5,
        .5, -.5, .5,
        .5, -.5, -.5,
        .5, .5, -.5,
        -.5, .5, -.5,
        -.5, -.5, -.5,
    ],[
        0, 1, 2, 0, 2, 3, // front
        0, 3, 4, 0, 4, 5, // right
        0, 5, 6, 0, 6, 1, // up
        1, 6, 7, 1, 7, 2, // left
        7, 4, 3, 7, 3, 2, // down
        4, 7, 6, 4, 6, 5, // back
    ]);
}

/**
 * @implements {Renderable}
 */
class Model {
    /** @param {Mesh} mesh @param {Mat4x4} [mat] */
    constructor(mesh, mat) {
        /** @type {Mesh} */
        this.mesh = mesh;
        /** @type {Mat4x4} */
        this.mat = mat !== undefined ? mat : Mat4x4.identity();
    }

    /** @param {WebGLRenderingContext} gl @param {Mat4x4} mat */
    render(gl, mat) {
        const newMat = mat.matmul(this.mat);
        // TODO maybe shouldn't be creating these buffers every frame lol
        const vertBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
        gl.bufferData(gl.ARRAY_BUFFER, this.mesh.verts, gl.DYNAMIC_DRAW);
        const idxBuf = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.DYNAMIC_DRAW); // TODO - STATIC_DRAW?
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniformMatrix4fv(u_ModelMat, false, newMat.data);
        // temp blend test stuff // TODO at least move this elsewhere
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        // color
        gl.uniform4f(u_FragColor, 0, 1, 0, .25);
        // draw mesh
        gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        // kinda janky (temporary) wireframe drawing
        gl.uniform4f(u_FragColor, 0, 0, 1, 1);
        for(let i = 0; i + 2 < this.mesh.verts.length; i += 3) {
            gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, i * 2);
        }
        // free buffers (see above TODO)
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
}



