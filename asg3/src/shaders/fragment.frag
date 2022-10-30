precision mediump float;

uniform vec4 u_FragColor;
varying vec3 v_TempDebugColor;
varying vec3 v_UV_camdist;
uniform sampler2D u_TextureAtlas;

void main() {
    // gl_FragColor = u_FragColor;
    vec2 uv = v_UV_camdist.xy;
    float dist = v_UV_camdist.z;

    // sample
    gl_FragColor = texture2D(u_TextureAtlas, uv);
    // gl_FragColor = vec4(dist < 8., 0., 0., 1.);
    // gl_FragColor.z = dist / 100.;
    // gl_FragColor = vec4(1., 0., 0., 1.);
    // gl_FragColor = vec4(mod(v_TempDebugColor, 16.0) / 16.0, 1.0);
}
