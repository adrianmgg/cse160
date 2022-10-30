precision mediump float;

uniform vec4 u_FragColor;
varying vec3 v_TempDebugColor;
varying vec2 v_UV;
uniform sampler2D u_TextureAtlas;

// mip stuff
//   https://stackoverflow.com/a/24390149/8762161
//   https://www.opengl.org/discussion_boards/showthread.php/177520-Mipmap-level-calculation-using-dFdx-dFdy?p=1236952&viewfull=1#post1236952
//   https://stackoverflow.com/a/24531164/8762161

void main() {
    // gl_FragColor = u_FragColor;
    vec2 uv = v_UV;

    // sample
    gl_FragColor = texture2D(u_TextureAtlas, uv);
}
