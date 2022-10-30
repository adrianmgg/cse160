precision mediump float;

uniform vec4 u_FragColor;
varying vec3 v_TempDebugColor;
varying vec3 v_UV_camdist;
uniform sampler2D u_TextureAtlas;

#define DO_MIPMAP

#ifdef DO_MIPMAP
    #define MIP_LEVEL1_START ( 16.0)
    #define MIP_LEVEL2_START ( 32.0)
    #define MIP_LEVEL3_START ( 64.0)
    #define MIP_LEVEL4_START (128.0)
#endif

void main() {
    // gl_FragColor = u_FragColor;
    vec2 uv = v_UV_camdist.xy;
    float dist = v_UV_camdist.z;
    // calculate mip level
    // TODO just some random values for now, what should we actually be doing here

    #if defined(DO_MIPMAP)
    float mipFac = 1.;
    if      (dist < MIP_LEVEL1_START) mipFac =  1.;
    else if (dist < MIP_LEVEL2_START) mipFac =  2.;
    else                              mipFac =  4.;
    uv /= mipFac;
    #endif

    // sample
    gl_FragColor = texture2D(u_TextureAtlas, uv);
    // gl_FragColor = vec4(dist < 8., 0., 0., 1.);
    // gl_FragColor.z = dist / 100.;
    // gl_FragColor = vec4(1., 0., 0., 1.);
    // gl_FragColor = vec4(mod(v_TempDebugColor, 16.0) / 16.0, 1.0);
}
