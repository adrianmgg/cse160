
// turn all the empty webgl interfaces into tagged types so we can get proper error checking on them
interface WebGLBuffer { __tag: 'WebGLBuffer'; }
interface WebGLFramebuffer { __tag: 'WebGLFramebuffer'; }
interface WebGLProgram { __tag: 'WebGLProgram'; }
interface WebGLQuery { __tag: 'WebGLQuery'; }
interface WebGLRenderbuffer { __tag: 'WebGLRenderbuffer'; }
interface WebGLSampler { __tag: 'WebGLSampler'; }
interface WebGLShader { __tag: 'WebGLShader'; }
interface WebGLSync { __tag: 'WebGLSync'; }
interface WebGLTexture { __tag: 'WebGLTexture'; }
interface WebGLTransformFeedback { __tag: 'WebGLTransformFeedback'; }
interface WebGLUniformLocation { __tag: 'WebGLUniformLocation'; }
interface WebGLVertexArrayObject { __tag: 'WebGLVertexArrayObject'; }
interface WebGLVertexArrayObjectOES { __tag: 'WebGLVertexArrayObjectOES'; }
