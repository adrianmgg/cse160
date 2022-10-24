// @ts-check
'use strict';

// import some types from our typescript file (can't declare typescript interface in jsdoc comments)
/** @typedef { import('./types').Renderable } Renderable */

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

    /** @returns {Mat4x4} */
    clone() {
        const newData = new Float32Array(16);
        newData.set(this.data);
        return new Mat4x4(newData);
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
     * @param  {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} a
     * @returns {Mat4x4}
     */
    static of(...a) {
        return new Mat4x4(new Float32Array([a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]]));
    }

    /**
     * construct new matrix from ROW-MAJOR values
     * @param  {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} a
     * @returns {Mat4x4}
     */
    setInPlace(...a) {
        this.data[0] = a[0];
        this.data[1] = a[4];
        this.data[2] = a[8];
        this.data[3] = a[12];
        this.data[4] = a[1];
        this.data[5] = a[5];
        this.data[6] = a[9];
        this.data[7] = a[13];
        this.data[8] = a[2];
        this.data[9] = a[6];
        this.data[10] = a[10];
        this.data[11] = a[14];
        this.data[12] = a[3];
        this.data[13] = a[7];
        this.data[14] = a[11];
        this.data[15] = a[15];
        return this;
    }

    /** @returns {Mat4x4} */
    identityInPlace() {
        return this.setInPlace(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        );
    }

    /**
     * @param {Mat4x4} other
     * @returns {Mat4x4}
     */
     matmulInPlace(other) {
        const a = this.data, b = other.data;
        return this.setInPlace(
            a[ 0]*b[ 0]+a[ 4]*b[ 1]+a[ 8]*b[ 2]+a[12]*b[ 3], a[ 0]*b[ 4]+a[ 4]*b[ 5]+a[ 8]*b[ 6]+a[12]*b[ 7], a[ 0]*b[ 8]+a[ 4]*b[ 9]+a[ 8]*b[10]+a[12]*b[11], a[ 0]*b[12]+a[ 4]*b[13]+a[ 8]*b[14]+a[12]*b[15],
            a[ 1]*b[ 0]+a[ 5]*b[ 1]+a[ 9]*b[ 2]+a[13]*b[ 3], a[ 1]*b[ 4]+a[ 5]*b[ 5]+a[ 9]*b[ 6]+a[13]*b[ 7], a[ 1]*b[ 8]+a[ 5]*b[ 9]+a[ 9]*b[10]+a[13]*b[11], a[ 1]*b[12]+a[ 5]*b[13]+a[ 9]*b[14]+a[13]*b[15],
            a[ 2]*b[ 0]+a[ 6]*b[ 1]+a[10]*b[ 2]+a[14]*b[ 3], a[ 2]*b[ 4]+a[ 6]*b[ 5]+a[10]*b[ 6]+a[14]*b[ 7], a[ 2]*b[ 8]+a[ 6]*b[ 9]+a[10]*b[10]+a[14]*b[11], a[ 2]*b[12]+a[ 6]*b[13]+a[10]*b[14]+a[14]*b[15],
            a[ 3]*b[ 0]+a[ 7]*b[ 1]+a[11]*b[ 2]+a[15]*b[ 3], a[ 3]*b[ 4]+a[ 7]*b[ 5]+a[11]*b[ 6]+a[15]*b[ 7], a[ 3]*b[ 8]+a[ 7]*b[ 9]+a[11]*b[10]+a[15]*b[11], a[ 3]*b[12]+a[ 7]*b[13]+a[11]*b[14]+a[15]*b[15],
        );
    }

    /**
     * @param {Mat4x4} other
     * @returns {Mat4x4}
     */
    matmul(other) {
        return this.clone().matmulInPlace(other);
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

    /** @param {number} x @param {number} y @param {number} z @returns {Mat4x4} */
    translate(x, y, z) { return this.matmul(Mat4x4.translate(x, y, z)); }
    /** @param {number} x @param {number} y @param {number} z @returns {Mat4x4} */
    translateInPlace(x, y, z) { return this.matmulInPlace(Mat4x4.translate(x, y, z)); }
    /** @param {number} x @param {number} y @param {number} z @returns {Mat4x4} */
    scale(x, y, z) { return this.matmul(Mat4x4.scale(x, y, z)); }
    /** @param {number} x @param {number} y @param {number} z @returns {Mat4x4} */
    scaleInPlace(x, y, z) { return this.matmulInPlace(Mat4x4.scale(x, y, z)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateX(theta) { return this.matmul(Mat4x4.rotateX(theta)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateXInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateX(theta)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateY(theta) { return this.matmul(Mat4x4.rotateY(theta)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateYInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateY(theta)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateZ(theta) { return this.matmul(Mat4x4.rotateZ(theta)); }
    /** @param {number} theta @returns {Mat4x4} */
    rotateZInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateZ(theta)); }

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

    /** @param {number} tx @param {number} ty @param {number} tz @returns {Mat4x4} */
    static rotateXYZ(tx, ty, tz) {
        // source: based on https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/blenlib/intern/math_rotation.c#L1648-L1686
        const ci = Math.cos(tx);
        const cj = Math.cos(ty);
        const ch = Math.cos(tz);
        const si = Math.sin(tx);
        const sj = Math.sin(ty);
        const sh = Math.sin(tz);
        const cc = ci * ch;
        const cs = ci * sh;
        const sc = si * ch;
        const ss = si * sh;
        return Mat4x4.of(
            cj * ch      , cj * sh     ,  -sj    ,  0,
            sj * sc - cs , sj * ss + cc,  cj * si,  0,
            sj * cc + ss , sj * cs - sc,  cj * ci,  0,
            0            , 0           ,  0      ,  1,
        );
    }

    /**
     * @param {number} posX
     * @param {number} posY
     * @param {number} posZ
     * @param {number} thetaX
     * @param {number} thetaY
     * @param {number} thetaZ
     * @param {number} scaleX
     * @param {number} scaleY
     * @param {number} scaleZ
     * @returns {Mat4x4}
     */
    static locRotScale(posX, posY, posZ, thetaX, thetaY, thetaZ, scaleX, scaleY, scaleZ) {
        // source: based on https://github.com/blender/blender/blob/blender-v3.0-release/source/blender/python/mathutils/mathutils_Matrix.c#L989-L1068
        const m = Mat4x4.rotateXYZ(thetaX, thetaY, thetaZ);
        // scale mat
        m.data[0 + (0 * 4)] *= scaleX;
        m.data[0 + (1 * 4)] *= scaleX;
        m.data[0 + (2 * 4)] *= scaleX;
        m.data[1 + (0 * 4)] *= scaleY;
        m.data[1 + (1 * 4)] *= scaleY;
        m.data[1 + (2 * 4)] *= scaleY;
        m.data[2 + (0 * 4)] *= scaleZ;
        m.data[2 + (1 * 4)] *= scaleZ;
        m.data[2 + (2 * 4)] *= scaleZ;
        // copy location into mat
        m.data[0 + (3 * 4)] = posX;
        m.data[1 + (3 * 4)] = posY;
        m.data[2 + (3 * 4)] = posZ;
        return m;
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
        /** @type {number} */
        this.x = x;
        /** @type {number} */
        this.y = y;
        /** @type {number} */
        this.z = z;
    }

    /** @returns {Vec} */
    clone() { return new Vec(this.x, this.y, this.z); }

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
    /** @param {number} r @param {number} theta @param {number} y @returns {Vec} */
    static fromCylindrical(r, theta, y = 0) {
        return Vec.of(r * Math.cos(theta), y, r * Math.sin(theta));
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
    transformInPlace(mat) {
        // TODO vecs should probably have a .w?
        this.x = mat.get(0, 0) * this.x + mat.get(0, 1) * this.y + mat.get(0, 2) * this.z + mat.get(0, 3) * /*this.w*/1;
        this.y = mat.get(1, 0) * this.x + mat.get(1, 1) * this.y + mat.get(1, 2) * this.z + mat.get(1, 3) * /*this.w*/1;
        this.z = mat.get(2, 0) * this.x + mat.get(2, 1) * this.y + mat.get(2, 2) * this.z + mat.get(2, 3) * /*this.w*/1;
        return this;
    }
    /** @param {Mat4x4} mat @returns {Vec} */
    transform(mat) { return this.clone().transformInPlace(mat); }

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
     * @param {number} length
     * @param {string} name
     */
    constructor(mat, length, name) {
        /** @type {Mat4x4} */
        this.mat = mat;
        /**
         * second matrix, for ease of animation
         * @type {Mat4x4 | null}
         */
        this.animMat = null;
        /** @type {number} */
        this.length = length;
        /**
         * children attached to the root of the bone
         * @type {Renderable[]}
         */
        this.headChildren = [];
        /**
         * children attached to the end of the bone
         * @type {Renderable[]}
         */
        this.tailChildren = [];
        /** @type {string} */
        this.name = name;
    }

    resetAnimMatsRecursive() {
        if(this.animMat !== null) this.animMat.identityInPlace();
        for(const child of this.headChildren) {
            if(child instanceof Bone) child.resetAnimMatsRecursive();
        }
        for(const child of this.tailChildren) {
            if(child instanceof Bone) child.resetAnimMatsRecursive();
        }
    }

    // TODO maybe add a LINES option for meshes? or smth like that
    static BONE_DISPLAY_POINTS = new Float32Array([
        // simple view, just a line:
        // 0, 0, 0,
        // 0, 1, 0,
        // more complex one, based on blender's "octahedral" armature viewport display option
        0, 0, 0,   .1, .1,  .1,     .1, .1,  .1,  0, 1, 0,
        0, 0, 0,  -.1, .1,  .1,    -.1, .1,  .1,  0, 1, 0,
        0, 0, 0,   .1, .1, -.1,     .1, .1, -.1,  0, 1, 0,
        0, 0, 0,  -.1, .1, -.1,    -.1, .1, -.1,  0, 1, 0,
         .1, .1,  .1,   -.1, .1,  .1,
        -.1, .1,  .1,   -.1, .1, -.1,
        -.1, .1, -.1,    .1, .1, -.1,
         .1, .1, -.1,    .1, .1,  .1,
    ]);

    /**
     * @param {WebGLRenderingContext} gl
     * @param {Mat4x4} mat
     */
    render(gl, mat) {
        let baseMat = this.mat;
        if(this.animMat !== null) baseMat = baseMat.matmul(this.animMat);
        if(showBones) {
            const showBoneMat = mat.matmul(baseMat.scale(this.length, this.length, this.length));
            gl.bufferData(gl.ARRAY_BUFFER, Bone.BONE_DISPLAY_POINTS, gl.STATIC_DRAW);
            gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_Position);
            gl.uniformMatrix4fv(u_ModelMat, false, showBoneMat.data);
            gl.uniform4f(u_FragColor, 1, 0, 0, 1);
            // adjust depth range so we render on top
            gl.depthRange(0, 0.01);
            gl.drawArrays(gl.LINE_STRIP, 0, Bone.BONE_DISPLAY_POINTS.length / 3);
            // TODO this depthRange fiddling stuff should probably move somewhere else
            gl.depthRange(0.01, 1.0);
        }
        if(this.headChildren.length > 0) {
            const headMat = mat.matmul(baseMat);
            for(const child of this.headChildren) child.render(gl, headMat);
        }
        if(this.tailChildren.length > 0) {
            const tailMat = mat.matmul(baseMat.translate(0, this.length, 0));
            for(const child of this.tailChildren) child.render(gl, tailMat);
        }
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

    // values from https://github.com/blender/blender/blob/594f47ecd2d5367ca936cf6fc6ec8168c2b360d0/source/blender/bmesh/operators/bmo_primitive.c#L36-L55
    static UNIT_ICOSPHERE = new Mesh([
        0.0      / 400,  0.0      / 400,  -200.0  / 400,
        144.72   / 400,  -105.144 / 400,  -89.443 / 400,
        -55.277  / 400,  -170.128 / 400,  -89.443 / 400,
        -178.885 / 400,  0.0      / 400,  -89.443 / 400,
        -55.277  / 400,  170.128  / 400,  -89.443 / 400,
        144.72   / 400,  105.144  / 400,  -89.443 / 400,
        55.277   / 400,  -170.128 / 400,  89.443  / 400,
        -144.72  / 400,  -105.144 / 400,  89.443  / 400,
        -144.72  / 400,  105.144  / 400,  89.443  / 400,
        55.277   / 400,  170.128  / 400,  89.443  / 400,
        178.885  / 400,  0.0      / 400,  89.443  / 400,
        0.0      / 400,  0.0      / 400,  200.0   / 400,
    ], [
        0, 1, 2,  1, 0, 5,   0, 2, 3,  0, 3, 4,  0, 4, 5,  1, 5, 10,  2, 1, 6,
        3, 2, 7,  4, 3, 8,   5, 4, 9,  1, 10, 6, 2, 6, 7,  3, 7, 8,   4, 8, 9,
        5, 9, 10, 6, 10, 11, 7, 6, 11, 8, 7, 11, 9, 8, 11, 10, 9, 11,
    ]);

    // noticing that i'm using these a lot so may as well put em here
    // TODO need a cleaner way of transforming meshes
    static UNIT_CUBE_TOUCHING_XY = new Mesh(
        Mesh.UNIT_CUBE.verts.map((v, i) => (i % 3 === 1) ? v + 0.5 : v),
        Mesh.UNIT_CUBE.indices,
    );
    static UNIT_ICOSPHERE_TOUCHING_XY = new Mesh(
        Mesh.UNIT_ICOSPHERE.verts.map((v, i) => (i % 3 === 1) ? v + 0.5 : v),
        Mesh.UNIT_ICOSPHERE.indices,
    );

    /** @param {number} divisions @param {Vec} center @param {number} radius @param {number} length @param {boolean} cap @returns {Mesh} */
    static cylinder(divisions, center, radius, length, cap) {
        const verts = new Float32Array(divisions * 2 * 3 + (cap ? 6 : 0)); // num divisions * 2 circles with that many divisions * 3 vals per vert
        for(let i = 0; i < divisions; i++) {
            const theta = (i / divisions) * Math.PI * 2;
            const v1 = Vec.fromCylindrical(radius, theta, length / -2);
            const v2 = Vec.fromCylindrical(radius, theta, length / 2);
            const idx1 = i * 3;
            const idx2 = idx1 + (divisions * 1 * 3);
            verts[idx1 + 0] = v1.x;
            verts[idx1 + 1] = v1.y;
            verts[idx1 + 2] = v1.z;
            verts[idx2 + 0] = v2.x;
            verts[idx2 + 1] = v2.y;
            verts[idx2 + 2] = v2.z;
        }
        if(cap) {
            const idx = verts.length - 6;
            verts[idx + 0] = 0;
            verts[idx + 1] = length / -2;
            verts[idx + 2] = 0;
            verts[idx + 3] = 0;
            verts[idx + 4] = length / 2;
            verts[idx + 5] = 0;
        }
        const indices = [];
        for(let i = 0; i < divisions; i++) {
            const v1 = i;
            const v2 = (i+1) % divisions;
            const v3 = i + divisions;
            const v4 = ((i+1) % divisions) + divisions;
            indices.push(v2, v1, v4);
            indices.push(v3, v4, v1);
            if(cap) {
                const v5 = divisions * 2;
                const v6 = divisions * 2 + 1;
                indices.push(v1, v2, v5, v3, v6, v4);
            }
        }
        return new Mesh(verts, indices);
    }
}

class Color {
    /** @param {number} r @param {number} g @param {number} b @param {number} a */
    constructor(r, g, b, a) {
        /** @type {number} */
        this.r = r;
        /** @type {number} */
        this.g = g;
        /** @type {number} */
        this.b = b;
        /** @type {number} */
        this.a = a;
    }

    /** @param {number} hex @returns {Color} */
    static fromRGBHex(hex) {
        return new Color((hex >> 16) / 255, ((hex >> 8) & 0xFF) / 255, (hex & 0xFF) / 255, 1.0);
    }
}

/**
 * @implements {Renderable}
 */
class Model {
    /** @param {Mesh} mesh @param {Mat4x4} [mat] @param {Color} [color] */
    constructor(mesh, mat, color) {
        /** @type {Mesh} */
        this.mesh = mesh;
        /** @type {Mat4x4} */
        this.mat = mat !== undefined ? mat : Mat4x4.identity();
        /** @type {Color} */
        this.color = color !== undefined ? color : new Color(0, 0, 0, 1);
    }

    /** @param {WebGLRenderingContext} gl @param {Mat4x4} mat */
    render(gl, mat) {
        const newMat = mat.matmul(this.mat);
        gl.bufferData(gl.ARRAY_BUFFER, this.mesh.verts, gl.STATIC_DRAW);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.mesh.indices, gl.STATIC_DRAW);
        gl.uniformMatrix4fv(u_ModelMat, false, newMat.data);
        // color
        gl.uniform4f(u_FragColor, this.color.r, this.color.g, this.color.b, this.color.a);
        // draw mesh
        gl.drawElements(gl.TRIANGLES, this.mesh.indices.length, gl.UNSIGNED_SHORT, 0);
        // // kinda janky (temporary) wireframe drawing
        // gl.uniform4f(u_FragColor, 0, 0, 1, 1);
        // for(let i = 0; i + 2 < this.mesh.verts.length; i += 3) {
        //     gl.drawElements(gl.LINE_LOOP, 3, gl.UNSIGNED_SHORT, i * 2);
        // }
    }
}



