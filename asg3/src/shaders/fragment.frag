precision mediump float;

uniform vec4 u_FragColor;
varying vec3 v_TempDebugColor;

void main() {
    // gl_FragColor = u_FragColor;
    gl_FragColor = vec4(mod(v_TempDebugColor, 16.0) / 16.0, 1.0);
}
