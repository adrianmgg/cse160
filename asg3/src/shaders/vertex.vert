
attribute vec3 a_Position;
uniform mat4 u_ModelMat;

void main(void) {
    gl_Position = u_ModelMat * vec4(a_Position, 1.0);
}
