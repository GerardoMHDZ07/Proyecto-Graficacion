// =============================================================================
// engine/shaders.ts — GLSL v3: Dual-material + Fresnel + detección robusta
// =============================================================================

export const VERTEX_SHADER_SRC = `
  precision highp float;

  attribute vec3 aPosition;
  attribute vec3 aNormal;

  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  uniform mat3 uNormalMatrix;

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vDepth;
  varying vec3  vLocalPos;

  void main() {
    vLocalPos = aPosition;

    vec4 worldPos    = uModelMatrix * vec4(aPosition, 1.0);
    vWorldPos        = worldPos.xyz;
    vNormal          = normalize(uNormalMatrix * aNormal);

    vec4 viewPos = uViewMatrix * worldPos;
    vDepth       = -viewPos.z;

    gl_Position  = uProjectionMatrix * viewPos;
  }
`;

// ---------------------------------------------------------------------------
// FRAGMENT SHADER — sin uniform uMaxRadius (el compilador lo elimina si no se usa)
// La detección de zona se hace con el radio local normalizado (0..1)
// uTireThreshold es ya el radio LOCAL absoluto donde empieza la llanta
// ---------------------------------------------------------------------------
export const FRAGMENT_SHADER_SRC = `
  precision highp float;

  // Iluminación
  uniform vec3  uLightDir;
  uniform vec3  uLightColor;
  uniform float uAmbientIntensity;
  uniform float uDiffuseIntensity;
  uniform float uSpecularIntensity;
  uniform vec3  uMeshColor;
  uniform vec3  uCameraPos;

  // Dual-material
  uniform vec3  uRimColor;
  uniform vec3  uTireColor;
  uniform float uTireThreshold;   // Radio local donde empieza la llanta
  uniform int   uUseDualMaterial; // 1 = activado, 0 = color único
  uniform int   uThinAxis;        // 0=X axle(use YZ), 1=Y axle(use XZ), 2=Z axle(use XY)

  varying vec3  vNormal;
  varying vec3  vWorldPos;
  varying float vDepth;
  varying vec3  vLocalPos;

  float fresnelSchlick(float cosTheta, float F0) {
    return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
  }

  void main() {
    vec3  N = normalize(vNormal);
    vec3  L = normalize(uLightDir);
    vec3  V = normalize(uCameraPos - vWorldPos);
    vec3  H = normalize(L + V);

    float NdotL = max(dot(N, L), 0.0);
    float NdotH = max(dot(N, H), 0.0);
    float NdotV = max(dot(N, V), 0.0);

    // ── Radio local según el eje fino ────────────────────────────────────
    float localRadius;
    if (uThinAxis == 0) {
      // Axle = X → rueda en plano YZ
      localRadius = sqrt(vLocalPos.y * vLocalPos.y + vLocalPos.z * vLocalPos.z);
    } else if (uThinAxis == 2) {
      // Axle = Z → rueda en plano XY
      localRadius = sqrt(vLocalPos.x * vLocalPos.x + vLocalPos.y * vLocalPos.y);
    } else {
      // Axle = Y (default) → rueda en plano XZ
      localRadius = sqrt(vLocalPos.x * vLocalPos.x + vLocalPos.z * vLocalPos.z);
    }

    // ── Material ──────────────────────────────────────────────────────────
    vec3  baseColor;
    float shininess;
    float fresnelF0;
    float specMult;

    if (uUseDualMaterial == 1 && uTireThreshold > 0.001) {
      float edge0    = uTireThreshold * 0.78;
      float edge1    = uTireThreshold * 0.96;
      float tireBlend = smoothstep(edge0, edge1, localRadius);

      baseColor  = mix(uRimColor,  uTireColor, tireBlend);
      shininess  = mix(128.0, 6.0,  tireBlend);
      fresnelF0  = mix(0.12,  0.02, tireBlend);
      specMult   = mix(1.0,   0.05, tireBlend);
    } else {
      baseColor  = uMeshColor;
      shininess  = 96.0;
      fresnelF0  = 0.06;
      specMult   = 1.0;
    }

    // ── Iluminación Blinn-Phong ───────────────────────────────────────────
    vec3 ambient  = uAmbientIntensity * baseColor;
    vec3 diffuse  = uDiffuseIntensity * NdotL * uLightColor * baseColor;
    vec3 specular = uSpecularIntensity * specMult * pow(NdotH, shininess) * uLightColor;

    // Fresnel (brillo cromado en los bordes)
    float fresnel     = fresnelSchlick(NdotV, fresnelF0);
    vec3 fresnelColor = fresnel * uLightColor * specMult * 0.6;

    // Luz de relleno (bounce)
    vec3 fillDir = normalize(vec3(-0.4, -0.6, -0.3));
    vec3 fill    = max(dot(N, fillDir), 0.0) * 0.15 * baseColor;

    // Backlight azulado (rim light)
    vec3  rimDir  = normalize(vec3(-1.0, 0.5, -0.8));
    float rimDot  = pow(max(dot(N, rimDir), 0.0), 3.0) * 0.3;
    vec3  rimLight = rimDot * vec3(0.4, 0.55, 1.0) * specMult;

    // ── Composición ───────────────────────────────────────────────────────
    vec3 color = ambient + diffuse + specular + fresnelColor + fill + rimLight;

    // Niebla
    float fog  = clamp((vDepth - 3.0) / 15.0, 0.0, 0.3);
    color = mix(color, vec3(0.04, 0.04, 0.08), fog);

    // Gamma
    color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

    gl_FragColor = vec4(color, 1.0);
  }
`;

export const MATERIAL_COLORS = {
  chrome:    [0.85, 0.87, 0.92] as [number, number, number],
  rubber:    [0.06, 0.06, 0.08] as [number, number, number],
  darkMetal: [0.25, 0.27, 0.30] as [number, number, number],
  steel:     [0.65, 0.68, 0.72] as [number, number, number],
  gold:      [0.83, 0.68, 0.21] as [number, number, number],
  electric:  [0.12, 0.45, 0.95] as [number, number, number],
} as const;
