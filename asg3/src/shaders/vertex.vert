
attribute vec3 a_Position;
uniform mat4 u_ModelMat;
uniform vec3 u_BlockPos;

void main(void) {
    gl_Position = u_ModelMat * vec4(a_Position + u_BlockPos, 1.0);
}
