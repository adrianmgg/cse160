
#if !defined(HAS_WEBGL2)
    #define APPLY_MAX_LOD_IN_SHADER
#endif

// https://developer.mozilla.org/en-US/docs/Web/API/EXT_shader_texture_lod
// https://registry.khronos.org/webgl/extensions/EXT_shader_texture_lod/
// https://registry.khronos.org/OpenGL/extensions/EXT/EXT_shader_texture_lod.txt
// adds sample functions with explicit LOD control
#if defined(HAS_EXT_OES_standard_derivatives)
    #extension GL_OES_standard_derivatives : require
#endif
#if defined(HAS_EXT_EXT_shader_texture_lod)
    #extension GL_EXT_shader_texture_lod : require
#endif

#if __VERSION__ >= 300
    #define INVAR in
    #define DECLARE_OUTCOLOR layout(location = 0) out vec4 diffuseColor;
    #define OUTCOLOR diffuseColor
    #define SAMPLE_TEXTURE_2D(tex, uv) (texture((tex), (uv)))
#else
    #define INVAR varying
    #define DECLARE_OUTCOLOR
    #define OUTCOLOR gl_FragColor
    #define SAMPLE_TEXTURE_2D(tex, uv) (texture2D((tex), (uv)))
#endif

precision mediump float;

uniform sampler2D u_TextureAtlas;
#if defined(APPLY_MAX_LOD_IN_SHADER)
    uniform float u_MaxTextureAtlasLOD;
    uniform vec2 u_TextureAtlasDimensions;
#endif
uniform vec4 u_Color;
INVAR vec3 v_TempDebugColor;
INVAR vec2 v_UV;
DECLARE_OUTCOLOR

vec4 sampleTextureAtlas(vec2 textureCoord);

#if defined(APPLY_MAX_LOD_IN_SHADER)
    // if we have these extensions we can use them to do it
    #if defined(HAS_EXT_OES_standard_derivatives) && defined(HAS_EXT_EXT_shader_texture_lod)
        // =================================================================================================
        // sources:
        //   original is from here:
        //     https://community.khronos.org/t/mipmap-level-calculation-using-dfdx-dfdy/67480#post1236952
        //   i'm using a modified version of that from here:
        //     https://stackoverflow.com/a/24531164/8762161
        // =================================================================================================
        float calculateMipmapLevel(vec2 texture_coordinate) {
            vec2  dx_vtc        = dFdx(texture_coordinate);
            vec2  dy_vtc        = dFdy(texture_coordinate);
            float delta_max_sqr = max(dot(dx_vtc, dx_vtc), dot(dy_vtc, dy_vtc));
            float mml = 0.5 * log2(delta_max_sqr);
            return max(0.0, mml);
        }
        // =================================================================================================

        vec4 sampleWithMaxLOD(sampler2D sampler, vec2 textureCoord, float maxLOD) {
            float lod = calculateMipmapLevel(textureCoord * u_TextureAtlasDimensions);
            return texture2DLodEXT(sampler, textureCoord, min(lod, maxLOD));
        }

        vec4 sampleTextureAtlas(vec2 textureCoord) {
            return sampleWithMaxLOD(u_TextureAtlas, textureCoord, u_MaxTextureAtlasLOD);
        }
    #else
        vec4 sampleTextureAtlas(vec2 textureCoord) {
            return SAMPLE_TEXTURE_2D(u_TextureAtlas, textureCoord);
        }
    #endif
#else
// if the max LOD is being applied some other way we don't need to do anything special here
vec4 sampleTextureAtlas(vec2 textureCoord) {
    return SAMPLE_TEXTURE_2D(u_TextureAtlas, textureCoord);
}
#endif



void main() {
    OUTCOLOR = mix(sampleTextureAtlas(v_UV), u_Color, u_Color.a);
}
