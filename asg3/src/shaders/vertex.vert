
attribute vec3 a_Position;
uniform mat4 u_CameraMat;
// uniform mat4 u_ModelMat;
uniform vec3 u_BlockPos;
varying vec3 v_TempDebugColor;
attribute vec2 a_UV;
varying vec3 v_UV_camdist;
uniform vec3 u_CameraPos;

void main(void) {
    vec3 worldPos = a_Position + u_BlockPos;
    gl_Position = u_CameraMat * vec4(worldPos, 1.0);
    // float dist = distance(worldPos, u_CameraPos);
    v_UV_camdist.xy = a_UV;
    // v_UV_camdist.z = dist;
    v_UV_camdist.z = gl_Position.z;
    // v_TempDebugColor = a_Position + u_BlockPos;
    // v_TempDebugColor = vec3(distance(worldPos, u_CameraPos), 0., 0.);
}
