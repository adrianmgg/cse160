import { assert } from './util.js';
function buildPreprocessorDefineSegment(defines) {
    return defines.map(define => {
        if (typeof define === 'string')
            return `#define ${define}`;
        else
            return `#define ${define[0]} ${define[1]}`;
    });
}
export async function loadProgramFromFiles(gl, vertexShaderPath, fragmentShaderPath, glslVersion, preprocessorDefines) {
    const prependPart = [
        `#version ${glslVersion}`,
        ...buildPreprocessorDefineSegment(preprocessorDefines),
    ].join('\n');
    // start the fetch as early as we can, but delay actually awaiting them until right before we need them
    const vertPromise = loadShaderFromFile(gl, gl.VERTEX_SHADER, vertexShaderPath, prependPart);
    const fragPromise = loadShaderFromFile(gl, gl.FRAGMENT_SHADER, fragmentShaderPath, prependPart);
    const program = gl.createProgram();
    assert(program !== null);
    gl.attachShader(program, await vertPromise);
    gl.attachShader(program, await fragPromise);
    gl.linkProgram(program);
    const linkStatus = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linkStatus) {
        const linkLog = gl.getProgramInfoLog(program);
        gl.deleteProgram(program);
        throw new Error(`shaders failed to link\n${linkLog}`);
    }
    else {
        const linkLog = gl.getProgramInfoLog(program);
        if (linkLog !== null && linkLog.length > 0) {
            console.info(`shader link log:\n${linkLog}`);
        }
    }
    return program;
}
export async function loadShaderFromFile(gl, type, sourcePath, prependWith) {
    let source = await fetch(sourcePath).then(r => r.text());
    if (prependWith !== undefined && prependWith.length > 0) {
        source = `${prependWith}\n${source}`;
    }
    // console.log(sourcePath);
    // console.log(source);
    const shader = gl.createShader(type);
    assert(shader !== null);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compileStatus = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compileStatus) {
        const shaderLog = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        const shaderTypeStr = type === gl.VERTEX_SHADER ? 'vertex shader' : type === gl.FRAGMENT_SHADER ? 'fragment shader' : 'shader';
        let errMsg = `${shaderTypeStr} ${sourcePath} failed to compile.`;
        if (shaderLog !== null)
            errMsg += `\n${shaderLog}`;
        throw new Error(errMsg);
    }
    else {
        const shaderLog = gl.getShaderInfoLog(shader);
        if (shaderLog !== null && shaderLog.length > 0) {
            console.info(`shader compile log:\n${shaderLog}`); // TODO add shader path to message when available
        }
    }
    return shader;
}
/**
 * helper for getting multiple attribute/uniform locations from a program
 *
 * note that while WebGL uses `-1` to indicate when an attribute wasn't found, this function instead
 * represents them with null. (this both to stay consistent with how the uniforms behave, as well as
 * to facilitate better type checking)
 *
 * if you're using this from typescript, consider adding a const assertion to the attribute name and
 * uniform name lists
 * ```typescript
 * // with no const assertion,
 * getProgramVarLocations(gl, program, ['foo', 'bar'], ['baz']);
 * // the return type will be this
 * {
 *     uniformLocations: Record<string, WebGLUniformLocation | null>;
 *     attribLocations: Record<string, number | null>;
 * }
 * ```
 * ```typescript
 * // but with const assertions,
 * getProgramVarLocations(gl, program, ['foo', 'bar'] as const, ['baz'] as const);
 * // the return type will be this
 * {
 *     uniformLocations: Record<"baz", WebGLUniformLocation | null>;
 *     attribLocations: Record<"foo" | "bar", number | null>;
 * }
 * ```
 */
export function getProgramVarLocations(gl, program, attribNames, uniformNames) {
    const attribLocations = {};
    const uniformLocations = {};
    for (const name of attribNames) {
        const loc = gl.getAttribLocation(program, name);
        if (loc === -1) {
            attribLocations[name] = null;
            console.warn(`shader attribute ${name} wasn't found. if this wasn't a typo, it was probably optimized out.`);
        }
        else {
            attribLocations[name] = loc;
        }
    }
    for (const name of uniformNames) {
        const loc = gl.getUniformLocation(program, name);
        if (loc === null) {
            uniformLocations[name] = null;
            console.warn(`shader uniform ${name} wasn't found. if this wasn't a typo, it was probably optimized out.`);
        }
        else {
            uniformLocations[name] = loc;
        }
    }
    return { attrib: attribLocations, uniform: uniformLocations };
}
//# sourceMappingURL=gl.js.map