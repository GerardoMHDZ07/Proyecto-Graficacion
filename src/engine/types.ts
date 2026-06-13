// =============================================================================
// engine/types.ts — Tipos TypeScript del Motor Gráfico 3D
// =============================================================================

/** Resultado del parser: datos listos para WebGL buffers */
export interface ParsedMesh {
  /** Posiciones de vértices interleaved [x, y, z, x, y, z, ...] */
  vertices: Float32Array;
  /** Índices de triángulos [i0, i1, i2, ...] */
  indices: Uint32Array;
  /** Normales por vértice [nx, ny, nz, ...] */
  normals: Float32Array;
  /** Cantidad de vértices únicos */
  vertexCount: number;
  /** Cantidad de triángulos (faces) */
  faceCount: number;
  /** Bounding box para centrar el modelo */
  bounds: BoundingBox;
}

export interface BoundingBox {
  min: [number, number, number];
  max: [number, number, number];
  center: [number, number, number];
  size: [number, number, number];
}

/** Parámetros de cámara controlables desde la UI */
export interface CameraParams {
  eyeX: number;
  eyeY: number;
  eyeZ: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  upX: number;
  upY: number;
  upZ: number;
  fov: number;
  near: number;
  far: number;
}

/** Parámetros de iluminación */
export interface LightParams {
  dirX: number;
  dirY: number;
  dirZ: number;
  ambientIntensity: number;
  diffuseIntensity: number;
  specularIntensity: number;
  lightColor: [number, number, number];
  rimColor: [number, number, number];
  tireColor: [number, number, number];
}

/** Estado de la animación */
export interface AnimationState {
  isPlaying: boolean;
  rotationSpeed: number; // grados por segundo
  currentAngle?: number;  // ángulo actual en radianes
}

/** Estadísticas del renderer */
export interface RendererStats {
  fps: number;
  frameTime: number;
  vertexCount: number;
  faceCount: number;
  drawCalls: number;
}

/** Uniforms enviados al Vertex Shader cada frame */
export interface ShaderUniforms {
  modelMatrix: Float32Array;
  viewMatrix: Float32Array;
  projectionMatrix: Float32Array;
  normalMatrix: Float32Array;
  lightDir: [number, number, number];
  lightColor: [number, number, number];
  ambientIntensity: number;
  diffuseIntensity: number;
  specularIntensity: number;
  meshColor: [number, number, number];
  cameraPos: [number, number, number];
  // Dual-material
  rimColor: [number, number, number];
  tireColor: [number, number, number];
  tireThreshold: number;    // Radio local absoluto donde empieza la llanta
  useDualMaterial: number;  // 1 = activado, 0 = color único
  thinAxis: number;         // 0=X axle, 1=Y axle, 2=Z axle
}
