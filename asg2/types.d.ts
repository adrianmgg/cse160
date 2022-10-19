
export interface Renderable {
    render(gl: WebGLRenderingContext, mat: Mat4x4): void;
}
