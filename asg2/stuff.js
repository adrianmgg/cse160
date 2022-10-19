// @ts-check

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

    /**
     * construct new matrix from ROW-MAJOR values
     * @param  {[number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} a
     * @returns {Mat4x4}
     */
    static of(...a) {
        return new Mat4x4(new Float32Array([a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]]));
    }

    /**
     * @param {Mat4x4} other
     * @returns {Mat4x4}
     */
    multiply(other) {
        const a = this.data, b = other.data;
        return Mat4x4.of(
            a[ 0]*b[ 0]+a[ 4]*b[ 1]+a[ 8]*b[ 2]+a[12]*b[ 3], a[ 0]*b[ 4]+a[ 4]*b[ 5]+a[ 8]*b[ 6]+a[12]*b[ 7], a[ 0]*b[ 8]+a[ 4]*b[ 9]+a[ 8]*b[10]+a[12]*b[11], a[ 0]*b[12]+a[ 4]*b[13]+a[ 8]*b[14]+a[12]*b[15],
            a[ 1]*b[ 0]+a[ 5]*b[ 1]+a[ 9]*b[ 2]+a[13]*b[ 3], a[ 1]*b[ 4]+a[ 5]*b[ 5]+a[ 9]*b[ 6]+a[13]*b[ 7], a[ 1]*b[ 8]+a[ 5]*b[ 9]+a[ 9]*b[10]+a[13]*b[11], a[ 1]*b[12]+a[ 5]*b[13]+a[ 9]*b[14]+a[13]*b[15],
            a[ 2]*b[ 0]+a[ 6]*b[ 1]+a[10]*b[ 2]+a[14]*b[ 3], a[ 2]*b[ 4]+a[ 6]*b[ 5]+a[10]*b[ 6]+a[14]*b[ 7], a[ 2]*b[ 8]+a[ 6]*b[ 9]+a[10]*b[10]+a[14]*b[11], a[ 2]*b[12]+a[ 6]*b[13]+a[10]*b[14]+a[14]*b[15],
            a[ 3]*b[ 0]+a[ 7]*b[ 1]+a[11]*b[ 2]+a[15]*b[ 3], a[ 3]*b[ 4]+a[ 7]*b[ 5]+a[11]*b[ 6]+a[15]*b[ 7], a[ 3]*b[ 8]+a[ 7]*b[ 9]+a[11]*b[10]+a[15]*b[11], a[ 3]*b[12]+a[ 7]*b[13]+a[11]*b[14]+a[15]*b[15],
        );
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    translate(x, y, z) {
        return this.multiply(Mat4x4.translate(x, y, z));
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    scale (x, y, z) {
        return this.multiply(Mat4x4.scale(x, y, z));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateX(theta) {
        return this.multiply(Mat4x4.rotateX(theta));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateY(theta) {
        return this.multiply(Mat4x4.rotateY(theta));
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    rotateZ(theta) {
        return this.multiply(Mat4x4.rotateZ(theta));
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
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    static scale(x, y, z) {
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

    /** @private */ static _ZERO = Vec.of(0, 0, 0);
    /** @returns {Vec} */ static zero() { return Vec._ZERO; }
    /** @private */ static _ONE = Vec.of(1, 1, 1);
    /** @returns {Vec} */ static one() { return Vec._ONE; }
    /** @private */ static _UP = Vec.of(0, 1, 0);
    /** @returns {Vec} */ static up() { return Vec._UP; }
    /** @private */ static _DOWN = Vec.of(0, -1, 0);
    /** @returns {Vec} */ static down() { return Vec._DOWN; }
    /** @private */ static _RIGHT = Vec.of(1, 0, 0);
    /** @returns {Vec} */ static right() { return Vec._RIGHT; }
    /** @private */ static _LEFT = Vec.of(-1, 0, 0);
    /** @returns {Vec} */ static left() { return Vec._LEFT; }
    /** @private */ static _BACKWARDS = Vec.of(0, 0, 1);
    /** @returns {Vec} */ static backwards() { return Vec._BACKWARDS; }
    /** @private */ static _FORWARDS = Vec.of(0, 0, -1);
    /** @returns {Vec} */ static forwards() { return Vec._FORWARDS; }

}



class Camera {
    constructor() {
        /** @type {Vec} */
        this.pos = Vec.zero();
        /** @type {Vec} */
        this.gaze = Vec.forwards();
        /** @type {Vec} */
        this.up = Vec.up();
    }

    cameraMat() {
        const w = this.gaze.div(this.gaze.magnitude()).mul(-1);
        const up_cross_w = this.up.cross(w);
        const u = up_cross_w.div(up_cross_w.magnitude());
        const v = w.cross(u);
        // return Mat4x4.of(
        // );
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
    }

    /**
     * @param {WebGLRenderingContext} gl
     * @param {Mat4x4} mat
     */
    render(gl, mat) {
        /** @type {[number, number, number][]} */
        const points = [
            [-.1, -.1, -.1],
            [-.1,  .1, -.1],
            [ .1,  .1, -.1],
            [ .1, -.1, -.1],
            [-.1, -.1, -.1],

            [-.1, -.1, .1],
            [-.1,  .1, .1],
            [ .1,  .1, .1],
            [ .1, -.1, .1],
            [-.1, -.1, .1],
        ];
        // console.log(this.mat.data);
        // debugger;
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points.flat()), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);
        gl.uniformMatrix4fv(u_ModelMat, false, mat.multiply(this.mat).data);
        gl.drawArrays(gl.POINTS, 0, points.length);
        gl.drawArrays(gl.LINE_STRIP, 0, points.length);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    }
}






// /** 
//  * @typedef {Object} SceneInitData
//  * @property {Record<string, BoneInitData>} bones
//  * 
//  * @typedef {[number, number, number]} Vec3InitData
//  * 
//  * @typedef {Object} BoneInitData
//  * @property {Vec3InitData} 
//  */

// class Bone {
// }
