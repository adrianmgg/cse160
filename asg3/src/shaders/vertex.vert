
attribute vec3 a_Position;
uniform mat4 u_CameraMat;
// uniform mat4 u_ModelMat;
uniform vec3 u_BlockPos;
varying vec3 v_TempDebugColor;
attribute vec2 a_UV;
varying vec2 v_UV;
uniform vec3 u_CameraPos;

void main(void) {
    vec3 worldPos = a_Position + u_BlockPos;
    gl_Position = u_CameraMat * vec4(worldPos, 1.0);
    // float dist = distance(worldPos, u_CameraPos);
    v_UV = a_UV;
    // v_TempDebugColor = a_Position + u_BlockPos;
    // v_TempDebugColor = vec3(distance(worldPos, u_CameraPos), 0., 0.);
}
