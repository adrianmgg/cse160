import { assert } from './util.js';

export async function loadProgramFromFiles(gl: WebGLRenderingContext, vetexShaderPath: string, fragmentShaderPath: string): Promise<WebGLProgram> {
    // start the fetch as early as we can, but delay actually awaiting them until right before we need them
    const vertPromise = loadShaderFromFile(gl, gl.VERTEX_SHADER, vetexShaderPath);
    const fragPromise = loadShaderFromFile(gl, gl.FRAGMENT_SHADER, fragmentShaderPath);
    const program = gl.createProgram();
    assert(program !== null);
    gl.attachShader(program, await vertPromise);
    gl.attachShader(program, await fragPromise);
    gl.linkProgram(program);
    const linkStatus: boolean = gl.getProgramParameter(program, gl.LINK_STATUS);
    if(!linkStatus) {
        const linkLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`shaders failed to link\n${linkLog}`);
    } else {
        const linkLog = gl.getProgramInfoLog(program);
        if(linkLog !== null && linkLog.length > 0) {
            console.info(`shader link log:\n${linkLog}`)
        }
    }
    return program;
}

export async function loadShaderFromFile(gl: WebGLRenderingContext, type: GLenum, sourcePath: string): Promise<WebGLShader> {
    const source = await fetch(sourcePath).then(r => r.text());
    const shader = gl.createShader(type);
    assert(shader !== null);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compileStatus: boolean = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if(!compileStatus) {
        const shaderLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        const shaderTypeStr = type === gl.VERTEX_SHADER ? 'vertex shader' : type === gl.FRAGMENT_SHADER ? 'fragment shader' : 'shader';
        let errMsg = `${shaderTypeStr} ${sourcePath} failed to compile.`;
        if(shaderLog !== null) errMsg += `\n${shaderLog}`;
        throw new Error(errMsg);
    } else {
        const shaderLog = gl.getShaderInfoLog(shader);
        if(shaderLog !== null && shaderLog.length > 0) {
            console.info(`shader compile log:\n${shaderLog}`); // TODO add shader path to message when available
        }
    }
    return shader;
}

export type ProgramVarLocations<
    Attribs extends string[],
    Uniforms extends string[],
> = {
    uniformLocations: {
        [K in Uniforms[number]]: WebGLUniformLocation | null;
    };
    attribLocations: {
        /** vanilla WebGL uses -1 to indicate errors, I transform those to nulls so failing to check them can be brought up by the type checker */
        [K in Attribs[number]]: GLint | null;
    };
}

export function getProgramVarLocations<
    Attribs extends string[],
    Uniforms extends string[],
>(gl: WebGLRenderingContext, program: WebGLProgram, attribNames: Attribs, uniformNames: Uniforms): ProgramVarLocations<Attribs, Uniforms> {
    const attribLocations: Record<string, GLint | null> = {};
    const uniformLocations: Record<string, WebGLUniformLocation | null> = {};
    for(const name of attribNames) {
        const loc = gl.getAttribLocation(program, name);
        if(loc === -1) {
            attribLocations[name] = null;
            console.warn(`shader attribute ${name} wasn't found. if this wasn't a typo, it was probably optimized out.`);
        } else {
            attribLocations[name] = loc;
        }
    }
    for(const name of uniformNames) {
        const loc = gl.getUniformLocation(program, name);
        if(loc === null) {
            uniformLocations[name] = null;
            console.warn(`shader uniform ${name} wasn't found. if this wasn't a typo, it was probably optimized out.`);
        } else {
            uniformLocations[name] = loc;
        }
    }
    return {attribLocations, uniformLocations} as ProgramVarLocations<Attribs, Uniforms>;
}

