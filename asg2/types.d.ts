
export interface Renderable {
    render(gl: WebGLRenderingContext, mat: Mat4x4): void;
}

export type EasingFunction = (t: number) => number;

export type AnimatorOptions = {
    ease?: EasingFunction;
    easeUp?: EasingFunction;
    easeBack?: EasingFunction;
    period?: number;
    offset?: number;
    // TODO give this a better name probably
    peakAt?: number;
    min?: number;
    max?: number;
};

export type TransformAnimatorOptions = {
    posX?: AnimatorOptions | number;
    posY?: AnimatorOptions | number;
    posZ?: AnimatorOptions | number;
    rotX?: AnimatorOptions | number;
    rotY?: AnimatorOptions | number;
    rotZ?: AnimatorOptions | number;
    sclX?: AnimatorOptions | number;
    sclY?: AnimatorOptions | number;
    sclZ?: AnimatorOptions | number;
}

export type HasKeyOfType<K extends string, T> = {
    [k in K]: T2;
};

export interface Animator {
    exec(t: number): void;
    onActivate(): void;
}
