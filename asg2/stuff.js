// @ts-check

// import some types from our typescript file (can't declare typescript interface in jsdoc comments)
/** @typedef { import('./types').Renderable } Renderable */

class Mat4x4 {
    /** @private */
    static _IDENTITY = new Mat4x4([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1,
    ]);

    /**
     * @param {Float32Array | [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number]} source
     * @private
     */
    constructor(source) {
        /** @type {Float32Array} */
        this.data = new Float32Array(source);
    }
    /**
     * @param {Mat4x4} other
     * @returns {Mat4x4}
     */
    multiply(other) {
        const a = this.data, b = other.data;
        return new Mat4x4([
            a[ 1]*b[1]+a[ 2]*b[5]+a[ 3]*b[9]+a[ 4]*b[13], a[ 1]*b[2]+a[ 2]*b[6]+a[ 3]*b[10]+a[ 4]*b[14], a[ 1]*b[3]+a[ 2]*b[7]+a[ 3]*b[11]+a[ 4]*b[15], a[ 1]*b[4]+a[ 2]*b[8]+a[ 3]*b[12]+a[ 4]*b[16],
            a[ 5]*b[1]+a[ 6]*b[5]+a[ 7]*b[9]+a[ 8]*b[13], a[ 5]*b[2]+a[ 6]*b[6]+a[ 7]*b[10]+a[ 8]*b[14], a[ 5]*b[3]+a[ 6]*b[7]+a[ 7]*b[11]+a[ 8]*b[15], a[ 5]*b[4]+a[ 6]*b[8]+a[ 7]*b[12]+a[ 8]*b[16],
            a[ 9]*b[1]+a[10]*b[5]+a[11]*b[9]+a[12]*b[13], a[ 9]*b[2]+a[10]*b[6]+a[11]*b[10]+a[12]*b[14], a[ 9]*b[3]+a[10]*b[7]+a[11]*b[11]+a[12]*b[15], a[ 9]*b[4]+a[10]*b[8]+a[11]*b[12]+a[12]*b[16],
            a[13]*b[1]+a[14]*b[5]+a[15]*b[9]+a[16]*b[13], a[13]*b[2]+a[14]*b[6]+a[15]*b[10]+a[16]*b[14], a[13]*b[3]+a[14]*b[7]+a[15]*b[11]+a[16]*b[15], a[13]*b[4]+a[14]*b[8]+a[15]*b[12]+a[16]*b[16],
        ]);
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
        return new Mat4x4([
            1, 0, 0, x,
            0, 1, 0, y,
            0, 0, 1, z,
            0, 0, 0, 1,
        ]);
    }
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} z
     * @returns {Mat4x4}
     */
    static scale(x, y, z) {
        return new Mat4x4([
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1,
        ]);
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateX(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return new Mat4x4([
            1, 0, 0, 0,
            0, cos, -sin, 0,
            0, sin, cos, 0,
            0, 0, 0, 1,
        ]);
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateY(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return new Mat4x4([
            cos, 0, sin, 0,
            0, 1, 0, 0,
            -sin, 0, cos, 0,
            0, 0, 0, 1,
        ]);
    }
    /**
     * @param {number} theta
     * @returns {Mat4x4}
     */
    static rotateZ(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return new Mat4x4([
            cos, -sin, 0, 0,
            sin, cos, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
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
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 0]), gl.DYNAMIC_DRAW);
        gl.drawArrays(gl.POINTS, 0, 1);
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
