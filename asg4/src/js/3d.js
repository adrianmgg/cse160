import { debugToggles } from "./debug_toggles.js";
import { assert, warnRateLimited } from "./util.js";
export class Mat4x4 {
    /** @param data matrix's data, IN COLUMN-MAJOR ORDER */
    constructor(data) {
        this.data = data;
    }
    get(row, col) {
        // just cast away the index check. probably shouldn't do that
        return this.data[row + (col * 4)];
    }
    clone() {
        const newData = new Float32Array(16);
        newData.set(this.data);
        return new Mat4x4(newData);
    }
    map(f) {
        return new Mat4x4(this.data.map((value, i) => {
            const row = i % 4;
            const col = (i - row) >> 2; // equivalent to floor((i - row) / 4)
            return f(value, row, col, this);
        }));
    }
    /** construct new matrix from ROW-MAJOR values */
    static of(...a) {
        return new Mat4x4(new Float32Array([a[0], a[4], a[8], a[12], a[1], a[5], a[9], a[13], a[2], a[6], a[10], a[14], a[3], a[7], a[11], a[15]]));
    }
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
    identityInPlace() {
        return this.setInPlace(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    matmulInPlace(other) {
        const a = this.data, b = other.data;
        return this.setInPlace(a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3], a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7], a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11], a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15], a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3], a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7], a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11], a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15], a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3], a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7], a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11], a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15], a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3], a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7], a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11], a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]);
    }
    matmul(other) {
        return this.clone().matmulInPlace(other);
    }
    // TODO probably shouldn't do these with map
    componentwiseAdd(a) {
        return new Mat4x4(this.data.map(v => v + a));
    }
    componentwiseSub(a) {
        return new Mat4x4(this.data.map(v => v - a));
    }
    componentwiseMul(a) {
        return new Mat4x4(this.data.map(v => v * a));
    }
    componentwiseDiv(a) {
        return new Mat4x4(this.data.map(v => v / a));
    }
    cofactorMatrix() {
        // "Each element of a square matrix has a cofactor which is the
        //  determinant of a matrix with one fewer row and column possibly
        //  multiplied by minus one."
        // "The sign of a cofactor is positive if the sum of the row and column
        //  indices is even and negative otherwise"
        const d = this.data;
        return Mat4x4.of(d[5] * (d[10] * d[15] - d[14] * d[11]) - d[9] * d[6] * d[15] + d[9] * d[14] * d[7] + d[13] * (d[6] * d[11] - d[10] * d[7]), d[1] * (d[14] * d[11] - d[10] * d[15]) + d[9] * d[2] * d[15] - d[9] * d[14] * d[3] + d[13] * (d[10] * d[3] - d[2] * d[11]), d[1] * (d[6] * d[15] - d[14] * d[7]) - d[5] * d[2] * d[15] + d[5] * d[14] * d[3] + d[13] * (d[2] * d[7] - d[6] * d[3]), d[1] * (d[10] * d[7] - d[6] * d[11]) + d[5] * d[2] * d[11] - d[5] * d[10] * d[3] + d[9] * (d[6] * d[3] - d[2] * d[7]), d[4] * (d[14] * d[11] - d[10] * d[15]) + d[8] * d[6] * d[15] - d[8] * d[14] * d[7] + d[12] * (d[10] * d[7] - d[6] * d[11]), d[0] * (d[10] * d[15] - d[14] * d[11]) - d[8] * d[2] * d[15] + d[8] * d[14] * d[3] + d[12] * (d[2] * d[11] - d[10] * d[3]), d[0] * (d[14] * d[7] - d[6] * d[15]) + d[4] * d[2] * d[15] - d[4] * d[14] * d[3] + d[12] * (d[6] * d[3] - d[2] * d[7]), d[0] * (d[6] * d[11] - d[10] * d[7]) - d[4] * d[2] * d[11] + d[4] * d[10] * d[3] + d[8] * (d[2] * d[7] - d[6] * d[3]), d[4] * (d[9] * d[15] - d[13] * d[11]) - d[8] * d[5] * d[15] + d[8] * d[13] * d[7] + d[12] * (d[5] * d[11] - d[9] * d[7]), d[0] * (d[13] * d[11] - d[9] * d[15]) + d[8] * d[1] * d[15] - d[8] * d[13] * d[3] + d[12] * (d[9] * d[3] - d[1] * d[11]), d[0] * (d[5] * d[15] - d[13] * d[7]) - d[4] * d[1] * d[15] + d[4] * d[13] * d[3] + d[12] * (d[1] * d[7] - d[5] * d[3]), d[0] * (d[9] * d[7] - d[5] * d[11]) + d[4] * d[1] * d[11] - d[4] * d[9] * d[3] + d[8] * (d[5] * d[3] - d[1] * d[7]), d[4] * (d[13] * d[10] - d[9] * d[14]) + d[8] * d[5] * d[14] - d[8] * d[13] * d[6] + d[12] * (d[9] * d[6] - d[5] * d[10]), d[0] * (d[9] * d[14] - d[13] * d[10]) - d[8] * d[1] * d[14] + d[8] * d[13] * d[2] + d[12] * (d[1] * d[10] - d[9] * d[2]), d[0] * (d[13] * d[6] - d[5] * d[14]) + d[4] * d[1] * d[14] - d[4] * d[13] * d[2] + d[12] * (d[5] * d[2] - d[1] * d[6]), d[0] * (d[5] * d[10] - d[9] * d[6]) - d[4] * d[1] * d[10] + d[4] * d[9] * d[2] + d[8] * (d[1] * d[6] - d[5] * d[2]));
    }
    transpose() {
        // "The transpose AT of a matrix A has the same numbers but the rows are switched with the columns."
        return Mat4x4.of(this.get(0, 0), this.get(1, 0), this.get(2, 0), this.get(3, 0), this.get(0, 1), this.get(1, 1), this.get(2, 1), this.get(3, 1), this.get(0, 2), this.get(1, 2), this.get(2, 2), this.get(3, 2), this.get(0, 3), this.get(1, 3), this.get(2, 3), this.get(3, 3));
    }
    inverse() {
        const cofactors = this.cofactorMatrix();
        const adjoint = cofactors.transpose();
        // "The determinant of a matrix is found by taking the sum of products
        //  of the elements of any row or column with their cofactors."
        const determinant = this.get(0, 0) * cofactors.get(0, 0) + this.get(0, 1) * cofactors.get(0, 1) + this.get(0, 2) * cofactors.get(0, 2) + this.get(0, 3) * cofactors.get(0, 3);
        // "For any matrix, the inverse is the adjoint matrix
        //  divided by the determinant of the matrix being inverted"
        return adjoint.componentwiseDiv(determinant);
    }
    translate(x, y, z) { return this.matmul(Mat4x4.translate(x, y, z)); }
    translateInPlace(x, y, z) { return this.matmulInPlace(Mat4x4.translate(x, y, z)); }
    scale(x, y, z) { return this.matmul(Mat4x4.scale(x, y, z)); }
    scaleInPlace(x, y, z) { return this.matmulInPlace(Mat4x4.scale(x, y, z)); }
    rotateX(theta) { return this.matmul(Mat4x4.rotateX(theta)); }
    rotateXInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateX(theta)); }
    rotateY(theta) { return this.matmul(Mat4x4.rotateY(theta)); }
    rotateYInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateY(theta)); }
    rotateZ(theta) { return this.matmul(Mat4x4.rotateZ(theta)); }
    rotateZInPlace(theta) { return this.matmulInPlace(Mat4x4.rotateZ(theta)); }
    static identity() {
        return Mat4x4.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    static translate(...args) {
        let x, y, z;
        if (args.length === 1) {
            ({ x, y, z } = args[0]);
        }
        else {
            [x, y, z] = args;
        }
        return Mat4x4.of(1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1);
    }
    static scale(...args) {
        let x, y, z;
        if (args.length === 3) {
            [x, y, z] = args;
        }
        else {
            x = y = z = args[0];
        }
        return Mat4x4.of(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1);
    }
    static rotateX(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(1, 0, 0, 0, 0, cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1);
    }
    static rotateY(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(cos, 0, sin, 0, 0, 1, 0, 0, -sin, 0, cos, 0, 0, 0, 0, 1);
    }
    static rotateZ(theta) {
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        return Mat4x4.of(cos, -sin, 0, 0, sin, cos, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    // https://en.wikipedia.org/wiki/Rotation_matrix#Rotation_matrix_from_axis_and_angle
    static rotate(theta, u) {
        const c = Math.cos(theta);
        const s = Math.sin(theta);
        const nc = 1 - c;
        return Mat4x4.of(c + (u.x * u.x) * nc, u.x * u.y * nc - u.z - s, u.x * u.z * nc + u.y * s, 0, u.y * u.x * nc + u.z * s, c + (u.x * u.x) * nc, u.y * u.z * nc - u.x * s, 0, u.z * u.x * nc - u.y * s, u.z * u.y * nc + u.x * s, c + (u.z * u.z) * nc, 0, 0, 0, 0, 1);
    }
    rotateXYZInPlace(tx, ty, tz) {
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
        return this.setInPlace(cj * ch, cj * sh, -sj, 0, sj * sc - cs, sj * ss + cc, cj * si, 0, sj * cc + ss, sj * cs - sc, cj * ci, 0, 0, 0, 0, 1);
    }
    static rotateXYZ(tx, ty, tz) {
        return Mat4x4.identity().rotateXYZInPlace(tx, ty, tz);
    }
    locRotScaleInPlace(...args) {
        let posX, posY, posZ, thetaX, thetaY, thetaZ, scaleX, scaleY, scaleZ;
        if (args.length === 3) {
            posX = args[0].x;
            posY = args[0].y;
            posZ = args[0].z;
            thetaX = args[1].x;
            thetaY = args[1].y;
            thetaZ = args[1].z;
            scaleX = args[2].x;
            scaleY = args[2].y;
            scaleZ = args[2].z;
        }
        else {
            [posX, posY, posZ, thetaX, thetaY, thetaZ, scaleX, scaleY, scaleZ] = args;
        }
        // source: based on https://github.com/blender/blender/blob/blender-v3.0-release/source/blender/python/mathutils/mathutils_Matrix.c#L989-L1068
        this.rotateXYZInPlace(thetaX, thetaY, thetaZ);
        // scale mat
        this.data[0 + (0 * 4)] *= scaleX;
        this.data[0 + (1 * 4)] *= scaleX;
        this.data[0 + (2 * 4)] *= scaleX;
        this.data[1 + (0 * 4)] *= scaleY;
        this.data[1 + (1 * 4)] *= scaleY;
        this.data[1 + (2 * 4)] *= scaleY;
        this.data[2 + (0 * 4)] *= scaleZ;
        this.data[2 + (1 * 4)] *= scaleZ;
        this.data[2 + (2 * 4)] *= scaleZ;
        // copy location into mat
        this.data[0 + (3 * 4)] = posX;
        this.data[1 + (3 * 4)] = posY;
        this.data[2 + (3 * 4)] = posZ;
        return this;
    }
    static locRotScale(...args) {
        return Mat4x4.prototype.locRotScaleInPlace.apply(Mat4x4.identity(), args); // TODO avoid any cast here
    }
}
export class Vec {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    clone() {
        return new Vec(this.x, this.y, this.z);
    }
    // tbh this doesn't really need the private ctor + public static .of() split, but might as well be consistent with the others like Mat4 i guess
    static of(x, y, z) {
        return new Vec(x, y, z);
    }
    static fromSpherical(r, theta, phi) {
        theta += Math.PI / 2;
        const sinTheta = Math.sin(theta);
        return Vec.of(r * sinTheta * Math.cos(phi), r * Math.cos(theta), r * sinTheta * Math.sin(phi));
    }
    static fromCylindrical(r, theta, y = 0) {
        return Vec.of(r * Math.cos(theta), y, r * Math.sin(theta));
    }
    static fromPolarXZ(r, theta) {
        return Vec.of(r * Math.cos(theta), 0, r * Math.sin(theta));
    }
    magnitude() {
        return Math.hypot(this.x, this.y, this.z);
    }
    normalizeInPlace() {
        const m = this.magnitude();
        this.x /= m;
        this.y /= m;
        this.z /= m;
        return this;
    }
    normalized() {
        return this.clone().normalizeInPlace();
    }
    addInPlace(a) {
        if (typeof a === 'number') {
            this.x += a;
            this.y += a;
            this.z += a;
        }
        else {
            this.x += a.x;
            this.y += a.y;
            this.z += a.z;
        }
        return this;
    }
    add(a) {
        return this.clone().addInPlace(a);
    }
    subInPlace(a) {
        if (typeof a === 'number') {
            this.x -= a;
            this.y -= a;
            this.z -= a;
        }
        else {
            this.x -= a.x;
            this.y -= a.y;
            this.z -= a.z;
        }
        return this;
    }
    sub(a) {
        return this.clone().subInPlace(a);
    }
    mulInPlace(a) {
        if (typeof a === 'number') {
            this.x *= a;
            this.y *= a;
            this.z *= a;
        }
        else {
            this.x *= a.x;
            this.y *= a.y;
            this.z *= a.z;
        }
        return this;
    }
    mul(a) {
        return this.clone().mulInPlace(a);
    }
    divInPlace(a) {
        if (typeof a === 'number') {
            this.x /= a;
            this.y /= a;
            this.z /= a;
        }
        else {
            this.x /= a.x;
            this.y /= a.y;
            this.z /= a.z;
        }
        return this;
    }
    div(a) {
        return this.clone().divInPlace(a);
    }
    crossInPlace(v) {
        const x = -this.z * v.y + this.y * v.z;
        const y = this.z * v.x - this.x * v.z;
        const z = -this.y * v.x + this.x * v.y;
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    cross(v) {
        return this.clone().crossInPlace(v);
    }
    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }
    xyz() {
        return [this.x, this.y, this.z];
    }
    // TODO again, static instances or in-place modification. can't have both
    transformInPlace(mat) {
        // TODO vecs should probably have a .w?
        this.x = mat.get(0, 0) * this.x + mat.get(0, 1) * this.y + mat.get(0, 2) * this.z + mat.get(0, 3) * /*this.w*/ 1;
        this.y = mat.get(1, 0) * this.x + mat.get(1, 1) * this.y + mat.get(1, 2) * this.z + mat.get(1, 3) * /*this.w*/ 1;
        this.z = mat.get(2, 0) * this.x + mat.get(2, 1) * this.y + mat.get(2, 2) * this.z + mat.get(2, 3) * /*this.w*/ 1;
        return this;
    }
    transform(mat) { return this.clone().transformInPlace(mat); }
    floorInPlace() {
        this.x = Math.floor(this.x);
        this.y = Math.floor(this.y);
        this.z = Math.floor(this.z);
        return this;
    }
    floor() {
        return this.clone().floorInPlace();
    }
    signInPlace() {
        this.x = Math.sign(this.x);
        this.y = Math.sign(this.y);
        this.z = Math.sign(this.z);
        return this;
    }
    sign() {
        return this.clone().signInPlace();
    }
    static zero() { return Vec.of(0, 0, 0); }
    static one() { return Vec.of(1, 1, 1); }
    static up() { return Vec.of(0, 1, 0); }
    static down() { return Vec.of(0, -1, 0); }
    static right() { return Vec.of(1, 0, 0); }
    static left() { return Vec.of(-1, 0, 0); }
    static backwards() { return Vec.of(0, 0, 1); }
    static forwards() { return Vec.of(0, 0, -1); }
}
export class Camera {
    constructor() {
        this.pos = Vec.zero();
        this.up = Vec.up();
        this.nearPlane = 1e-2;
        this.farPlane = 1e4;
        this.fov = Math.PI / 2;
        this._rotX = Math.PI / 2;
        this._rotY = 0;
        this._gaze = null;
    }
    get rotX() { return this._rotX; }
    get rotY() { return this._rotY; }
    set rotX(v) { this._rotX = v; this._gaze = null; }
    set rotY(v) { this._rotY = v; this._gaze = null; }
    get gaze() {
        if (this._gaze === null) {
            // const bar = Mat4x4.rotateY(this.rotX);
            // // const foo = Mat4x4.rotateX(this.rotY);
            // const foo = Mat4x4.identity().matmulInPlace(bar).rotateX(this.rotY).matmulInPlace(bar.inverse());
            // const abc = bar.matmulInPlace(foo);
            // this._gaze = Vec.forwards().transform(abc);
            // const xGazeMat = Mat4x4.rotateY(this.rotX);
            // const xGaze = Vec.forwards().transformInPlace(xGazeMat);
            // const yGazeMat = Mat4x4.rotate(this.rotY, Vec.right().transformInPlace(xGazeMat));
            // // xGaze.transformInPlace(yGazeMat);
            // const gazeMat = xGazeMat.matmul(yGazeMat);
            // this._gaze = Vec.forwards().transform(gazeMat);
            // this._gaze = Vec.forwards().transformInPlace(
            //     Mat4x4.locRotScale(0, 0, 0,  0, -this.rotX, 0,  1, 1, 1).matmulInPlace(Mat4x4.locRotScale(0, 0, 0,  -this.rotY, 0, 0,  1, 1, 1))
            // );
            // this._gaze = Vec.fromCylindrical(1, this.rotX, this.rotY);
            // this.up = Vec.fromCylindrical(1, this.rotX, this.rotY + Math.PI / 2);
            this._gaze = Vec.fromSpherical(1, this.rotY, this.rotX);
            // this.up = Vec.fromCylindrical(1, this.rotX, this.rotY + Math.PI / 2);
        }
        return this._gaze;
    }
    // TODO we can cache this if nothing changes
    // TODO avoid the new mat creation every recompute
    cameraMat() {
        // const abc = Mat4x4.rotateXYZ(-this.rotY, -this.rotX, 0);
        // // const up_ = this.up.transform(abc);
        const w = this.gaze.div(this.gaze.magnitude()).mul(-1);
        const up_cross_w = this.up.cross(w);
        const u = up_cross_w.div(up_cross_w.magnitude());
        const v = w.cross(u);
        const mat = Mat4x4.of(u.x, u.y, u.z, 0, v.x, v.y, v.z, 0, w.x, w.y, w.z, 0, 0, 0, 0, 1).translate(-this.pos.x, -this.pos.y, -this.pos.z);
        // mat.rotateYInPlace(-this.rotX);
        // mat.rotateXInPlace(this.rotY);
        // mat.translateInPlace(-this.pos.x, -this.pos.y, -this.pos.z);
        return mat;
        // const z = this.pos.sub(this.gaze).normalizeInPlace();
        // const x = z.cross(this.up).normalizeInPlace();
        // const y = x.cross(z);
        // // z.mulInPlace(-1);
        // // build mat
        // return Mat4x4.of(
        //     x.x, x.y, x.z, -x.dot(this.gaze),
        //     y.x, y.y, y.z, -y.dot(this.gaze),
        //     z.x, z.y, z.z, -z.dot(this.gaze),
        //     0, 0, 0, 1,
        // ).translateInPlace(-this.pos.x, -this.pos.y, -this.pos.z);
    }
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
        return Mat4x4.of((2 * abs_n) / (rightPlane - leftPlane), 0, (leftPlane + rightPlane) / (rightPlane - leftPlane), 0, 0, (2 * abs_n) / (topPlane - bottomPlane), (bottomPlane + topPlane) / (topPlane - bottomPlane), 0, 0, 0, (abs_f + abs_n) / (abs_n - abs_f), (2 * abs_f * abs_n) / (abs_n - abs_f), 0, 0, -1, 0);
    }
    viewportMat() {
        // TODO hardcoding canvas dimensions for now, should be dynamic
        const canvasWidth = 400, canvasHeight = 400;
        // eqn 7.2
        return Mat4x4.of(canvasWidth / 2, 0, 0, (canvasWidth - 1) / 2, 0, canvasHeight / 2, 0, (canvasHeight - 1) / 2, 0, 0, 1, 0, 0, 0, 0, 1);
    }
    // 7.1.3 - The Camera Transformation
    world2viewMat() {
        // viewport mat not needed i guess?
        return this.perspectiveMat().matmul(this.cameraMat());
    }
}
// export class Bone implements Renderable {
//     mat: Mat4x4;
//     /** second matrix, for ease of animation */
//     animMat: Mat4x4 | null;
//     length: number;
//     /** children attached to the root of the bone */
//     headChildren: Renderable[];
//     /** children attached to the end of the bone */
//     tailChildren: Renderable[];
//     name: string;
//     constructor(mat: Mat4x4, length: number, name: string) {
//         this.mat = mat;
//         this.animMat = null;
//         this.length = length;
//         this.headChildren = [];
//         this.tailChildren = [];
//         this.name = name;
//     }
//     resetAnimMatsRecursive() {
//         if(this.animMat !== null) this.animMat.identityInPlace();
//         for(const child of this.headChildren) {
//             if(child instanceof Bone) child.resetAnimMatsRecursive();
//         }
//         for(const child of this.tailChildren) {
//             if(child instanceof Bone) child.resetAnimMatsRecursive();
//         }
//     }
//     // TODO maybe add a LINES option for meshes? or smth like that
//     private static BONE_DISPLAY_POINTS = new Float32Array([
//         // simple view, just a line:
//         // 0, 0, 0,
//         // 0, 1, 0,
//         // more complex one, based on blender's "octahedral" armature viewport display option
//         0, 0, 0,   .1, .1,  .1,     .1, .1,  .1,  0, 1, 0,
//         0, 0, 0,  -.1, .1,  .1,    -.1, .1,  .1,  0, 1, 0,
//         0, 0, 0,   .1, .1, -.1,     .1, .1, -.1,  0, 1, 0,
//         0, 0, 0,  -.1, .1, -.1,    -.1, .1, -.1,  0, 1, 0,
//          .1, .1,  .1,   -.1, .1,  .1,
//         -.1, .1,  .1,   -.1, .1, -.1,
//         -.1, .1, -.1,    .1, .1, -.1,
//          .1, .1, -.1,    .1, .1,  .1,
//     ]);
//     // TODO finish porting
//     render(stuff: MyGlStuff, mat: Mat4x4) {
//         const { gl, programInfo: { vars: { uniformLocations: { u_FragColor, u_ModelMat }, attribLocations: { a_Position } } } } = stuff;
//         let baseMat = this.mat;
//         if(this.animMat !== null) baseMat = baseMat.matmul(this.animMat);
//         // TODO show bones toggle
//         // if(showBones) {
//         //     const showBoneMat = mat.matmul(baseMat.scale(this.length, this.length, this.length));
//         //     gl.bufferData(gl.ARRAY_BUFFER, Bone.BONE_DISPLAY_POINTS, gl.STATIC_DRAW);
//         //     if(a_Position !== null) {
//         //         gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
//         //         gl.enableVertexAttribArray(a_Position);
//         //     }
//         //     gl.uniformMatrix4fv(u_ModelMat, false, showBoneMat.data);
//         //     if(u_FragColor !== null) gl.uniform4f(u_FragColor, 1, 0, 0, 1);
//         //     // adjust depth range so we render on top
//         //     gl.depthRange(0, 0.01);
//         //     gl.drawArrays(gl.LINE_STRIP, 0, Bone.BONE_DISPLAY_POINTS.length / 3);
//         //     // TODO this depthRange fiddling stuff should probably move somewhere else
//         //     gl.depthRange(0.01, 1.0);
//         // }
//         if(this.headChildren.length > 0) {
//             const headMat = mat.matmul(baseMat);
//             for(const child of this.headChildren) child.render(stuff, headMat);
//         }
//         if(this.tailChildren.length > 0) {
//             const tailMat = mat.matmul(baseMat.translate(0, this.length, 0));
//             for(const child of this.tailChildren) child.render(stuff, tailMat);
//         }
//     }
// }
export class Mesh {
    constructor(autoWireframe = false) {
        this.vertsBuf = null;
        this.indicesBuf = null;
        this.uvsBuf = null;
        this.normalsBuf = null;
        this.numIndices = 0;
        this.actualMode = null;
        this.mode = null; // TODO proper default value or make it null
        this.verts = [];
        this.indices = [];
        this.uvs = [];
        this.normals = [];
        this.dirty = true;
        this.autoWireframe = autoWireframe;
    }
    get isCompiled() {
        return this.vertsBuf !== null && this.indicesBuf !== null && this.uvsBuf !== null && this.normalsBuf !== null;
    }
    get needsCompile() {
        return this.dirty || !this.isCompiled;
    }
    compile({ gl }) {
        let indices = this.indices;
        if (this.autoWireframe && debugToggles.has('render_wireframe')) {
            assert(this.mode === gl.TRIANGLES, 'auto wireframe only supported for TRIANGLES');
            indices = [];
            for (let i = 0; i < this.indices.length; i += 3) {
                indices.push(this.indices[i + 0], this.indices[i + 1], this.indices[i + 1], this.indices[i + 2], this.indices[i + 2], this.indices[i + 0]);
            }
            this.actualMode = gl.LINES;
        }
        else {
            this.actualMode = this.mode;
        }
        // compile verts
        if (this.vertsBuf !== null)
            gl.deleteBuffer(this.vertsBuf);
        this.vertsBuf = gl.createBuffer();
        assert(this.vertsBuf !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertsBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STATIC_DRAW);
        // compile indices
        if (this.indicesBuf !== null)
            gl.deleteBuffer(this.indicesBuf);
        this.indicesBuf = gl.createBuffer();
        assert(this.indicesBuf !== null);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuf);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        // compile uvs
        if (this.uvsBuf !== null)
            gl.deleteBuffer(this.uvsBuf);
        this.uvsBuf = gl.createBuffer();
        assert(this.uvsBuf !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.uvsBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.STATIC_DRAW);
        // compile normals
        if (this.normalsBuf !== null)
            gl.deleteBuffer(this.normalsBuf);
        this.normalsBuf = gl.createBuffer();
        assert(this.normalsBuf !== null);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        // clear dirty flag
        this.dirty = false;
        //
        this.numIndices = indices.length;
    }
    render(glStuff) {
        if (this.vertsBuf === null || this.uvsBuf === null || this.indicesBuf === null || this.normalsBuf === null) {
            warnRateLimited('tried to render mesh before it was compiled');
            return;
        }
        if (this.actualMode === null) {
            warnRateLimited('tried to render mesh with no mode set');
            return;
        }
        const { gl, program: { attrib: { a_Normal, a_Position, a_UV } } } = glStuff;
        if (a_Position !== null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertsBuf);
            gl.enableVertexAttribArray(a_Position);
            gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        }
        if (a_UV !== null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvsBuf);
            gl.enableVertexAttribArray(a_UV);
            gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        }
        if (a_Normal !== null) {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalsBuf);
            gl.enableVertexAttribArray(a_Normal);
            gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        }
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indicesBuf);
        gl.drawElements(this.actualMode, this.numIndices, gl.UNSIGNED_SHORT, 0);
    }
    freeCompiled({ gl }) {
        if (this.vertsBuf !== null) {
            gl.deleteBuffer(this.vertsBuf);
            this.vertsBuf = null;
        }
        if (this.uvsBuf !== null) {
            gl.deleteBuffer(this.uvsBuf);
            this.uvsBuf = null;
        }
        if (this.indicesBuf !== null) {
            gl.deleteBuffer(this.indicesBuf);
            this.indicesBuf = null;
        }
        if (this.normalsBuf !== null) {
            gl.deleteBuffer(this.normalsBuf);
            this.normalsBuf = null;
        }
    }
    static uvSphere(radius, longitudeSplits, latitudeSplits) {
        if (latitudeSplits === undefined)
            latitudeSplits = longitudeSplits * 2;
        const ret = new Mesh(true); // enable auto wireframe
        ret.mode = WebGLRenderingContext.TRIANGLES;
        for (let long = 0; long < longitudeSplits; long++) {
            const longt0 = ((long + 0) / longitudeSplits - 0.5) * Math.PI;
            const longt1 = ((long + 1) / longitudeSplits - 0.5) * Math.PI;
            for (let lat = 0; lat < latitudeSplits; lat++) {
                const latt0 = (lat + 0) / latitudeSplits * Math.PI * 2;
                const latt1 = (lat + 1) / latitudeSplits * Math.PI * 2;
                const a = Vec.fromSpherical(radius, longt0, latt0);
                const b = Vec.fromSpherical(radius, longt1, latt0);
                const c = Vec.fromSpherical(radius, longt0, latt1);
                const d = Vec.fromSpherical(radius, longt1, latt1);
                const baseIdx = ret.verts.length / 3;
                if (long === 0) {
                    ret.verts.push(a.x, a.y, a.z, b.x, b.y, b.z, d.x, d.y, d.z);
                    ret.normals.push(...a.normalized().xyz(), ...b.normalized().xyz(), ...d.normalized().xyz());
                    ret.uvs.push(0, 0, 0, 0, 0, 0, 0, 0); // TODO
                    ret.indices.push(baseIdx + 0, baseIdx + 2, baseIdx + 1);
                }
                else if (long + 1 === longitudeSplits) {
                    ret.verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
                    ret.normals.push(...a.normalized().xyz(), ...b.normalized().xyz(), ...c.normalized().xyz());
                    ret.uvs.push(0, 0, 0, 0, 0, 0, 0, 0); // TODO
                    ret.indices.push(baseIdx + 0, baseIdx + 2, baseIdx + 1);
                }
                else {
                    ret.verts.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, d.x, d.y, d.z);
                    ret.normals.push(...a.normalized().xyz(), ...b.normalized().xyz(), ...c.normalized().xyz(), ...d.normalized().xyz());
                    ret.uvs.push(0, 0, 0, 0, 0, 0, 0, 0); // TODO
                    ret.indices.push(baseIdx + 3, baseIdx + 1, baseIdx + 0, baseIdx + 2, baseIdx + 3, baseIdx + 0);
                }
            }
        }
        return ret;
    }
}
export class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    static fromRGBHex(hex) {
        return new Color((hex >> 16) / 255, ((hex >> 8) & 0xFF) / 255, (hex & 0xFF) / 255, 1.0);
    }
}
export class Transform {
    constructor() {
        this.pos = Vec.zero();
        this.rot = Vec.zero();
        this.scale = Vec.one();
    }
    // TODO cache/track when dirty (would require changes to vec i think)
    get mat() {
        // const m = Mat4x4.identity();
        // m.translateInPlace(this.pos.x, this.pos.y, this.pos.z);
        // return m;
        return Mat4x4.locRotScale(this.pos, this.rot, this.scale);
    }
}
export class Model {
    constructor(mesh, color) {
        this.transform = new Transform();
        this.mesh = mesh;
        this.transform = new Transform();
        this.color = color !== undefined ? color : new Color(0, 0, 0, 1);
    }
    render(glStuff, mat) {
        const { gl, program: { uniform: { u_Color, u_ModelMat, u_NormalMat } } } = glStuff;
        // matrix stuff
        let curMat = this.transform.mat;
        if (mat !== undefined)
            curMat = mat.matmul(curMat);
        if (u_ModelMat !== null)
            gl.uniformMatrix4fv(u_ModelMat, false, curMat.data);
        if (u_NormalMat !== null)
            gl.uniformMatrix4fv(u_NormalMat, false, curMat.inverse().transpose().data); // TODO gotta add transposeInPlace
        // mesh
        if (this.mesh.needsCompile)
            this.mesh.compile(glStuff);
        // color
        if (u_Color !== null)
            gl.uniform4f(u_Color, this.color.r, this.color.g, this.color.b, this.color.a);
        // render
        this.mesh.render(glStuff);
    }
}
export class Quaternion {
    constructor(v, s) {
        this.v = v !== null && v !== void 0 ? v : Vec.of(0, 0, 0);
        this.w = s !== null && s !== void 0 ? s : 0.0;
    }
    clone() {
        return new Quaternion(this.v.clone(), this.w);
    }
    addInPlace(q) {
        this.v.add;
        this.w += q.w;
        return this;
    }
    add(q) {
        return this.clone().addInPlace(q);
    }
    mulInPlace(a) {
        if (typeof a === 'number') {
            // scalar mul
            this.v.mulInPlace(a);
            this.w *= a;
        }
        else {
            // quaternion mul
            const w = this.w * a.w - this.v.dot(a.v);
            const v = a.v.clone().mulInPlace(this.w).addInPlace(this.v.mul(a.w)).addInPlace(this.v.cross(a.v));
            this.w = w;
            this.v = v;
        }
        return this;
    }
    mul(a) {
        return this.clone().mulInPlace(a);
    }
    norm() {
        return Math.hypot(this.v.x, this.v.y, this.v.z, this.w);
    }
    normalizeInPlace() {
        return this.mulInPlace(1 / this.norm());
    }
    normalized() {
        return this.clone().normalizeInPlace();
    }
    inverseInPlace() {
        const n = this.norm();
        this.v.mulInPlace(-1).divInPlace(n);
        this.w /= n;
        return this;
    }
    inverse() {
        return this.clone().inverseInPlace();
    }
}
export class PointLight {
    constructor() {
        this.color = new Color(1, 1, 1, 1);
        this.pos = Vec.zero();
    }
    render(glStuff) {
        PointLight.LIGHT_PREVIEW_MODEL.transform.pos = this.pos;
        PointLight.LIGHT_PREVIEW_MODEL.render(glStuff);
    }
}
PointLight.LIGHT_PREVIEW_MODEL = new Model(Mesh.uvSphere(.25, 8), Color.fromRGBHex(0xffffff));
//# sourceMappingURL=3d.js.map