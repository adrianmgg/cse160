
#if __VERSION__ >= 300
    #define OUTVAR out
    #define INVAR in
#else
    #define OUTVAR varying
    #define INVAR attribute
#endif

uniform mat4 u_ModelMat;
uniform mat4 u_CameraMat;
INVAR vec3 a_Position;
INVAR vec2 a_UV;
INVAR vec3 a_Normal;
OUTVAR vec2 v_UV;
OUTVAR vec3 v_TempDebugColor;
OUTVAR vec3 v_Normal;

void main(void) {
    vec4 worldPos = u_ModelMat * vec4(a_Position, 1.0);
    gl_Position = u_CameraMat * worldPos;
    v_UV = a_UV;
    v_Normal = a_Normal; // TODO gotta split view & model mats so i can apply model stuff to the normals i think
}
