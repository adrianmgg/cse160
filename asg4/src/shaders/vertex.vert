
#if __VERSION__ >= 300
    #define OUTVAR out
    #define INVAR in
#else
    #define OUTVAR varying
    #define INVAR attribute
#endif

uniform mat4 u_ModelMat;
uniform mat4 u_CameraMat;
uniform mat4 u_NormalMat;
uniform vec4 u_LightColor;
uniform vec3 u_LightPos;
INVAR vec3 a_Position;
INVAR vec2 a_UV;
INVAR vec3 a_Normal;
OUTVAR vec2 v_UV;
OUTVAR vec3 v_TempDebugColor;
OUTVAR vec3 v_Normal;
OUTVAR vec3 v_Light;

void main(void) {
    vec4 worldPos = u_ModelMat * vec4(a_Position, 1.0);
    gl_Position = u_CameraMat * worldPos;
    v_UV = a_UV;
    vec3 normal = normalize((u_NormalMat * vec4(a_Normal, 1.0)).xyz);
    #ifdef DEBUGTOGGLE_DISABLE_LIGHTING
        v_Light = vec3(1.0, 1.0, 1.0);
    #else
        vec3 light = vec3(.2, .2, .2); // ambient - TODO make configurable
        vec3 lightDirection = normalize(u_LightPos - worldPos.xyz);
        float nDotL = max(dot(lightDirection, normal), 0.0);
        light += u_LightColor.rgb * u_LightColor.a * nDotL;
        v_Light = light;
    #endif
    v_Normal = normal;
}
