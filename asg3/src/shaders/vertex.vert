
#if __VERSION__ >= 300
    #define OUTVAR out
    #define INVAR in
#else
    #define OUTVAR varying
    #define INVAR attribute
#endif

uniform mat4 u_CameraMat;
uniform vec3 u_BlockPos;
INVAR vec3 a_Position;
INVAR vec2 a_UV;
OUTVAR vec2 v_UV;
OUTVAR vec3 v_TempDebugColor;

void main(void) {
    vec3 worldPos = a_Position + u_BlockPos;
    gl_Position = u_CameraMat * vec4(worldPos, 1.0);
    v_UV = a_UV;
}
