// =============================================================================
// engine/renderer.ts — WebGLRenderer v3: sin uMaxRadius, con uThinAxis
// =============================================================================

import { VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC } from './shaders';
import { normalMatrix } from './math/mat4';
import type { ParsedMesh, ShaderUniforms } from './types';

export class WebGLRenderer {
  private gl!: WebGLRenderingContext;
  private program!: WebGLProgram;
  private canvas!: HTMLCanvasElement;
  private resizeObserver!: ResizeObserver;

  // Attributes
  private aPosition!: number;
  private aNormal!: number;

  // Uniform locations — matrices
  private uModelMatrix!: WebGLUniformLocation | null;
  private uViewMatrix!: WebGLUniformLocation | null;
  private uProjectionMatrix!: WebGLUniformLocation | null;
  private uNormalMatrix!: WebGLUniformLocation | null;
  // Uniforms — lighting
  private uLightDir!: WebGLUniformLocation | null;
  private uLightColor!: WebGLUniformLocation | null;
  private uAmbientIntensity!: WebGLUniformLocation | null;
  private uDiffuseIntensity!: WebGLUniformLocation | null;
  private uSpecularIntensity!: WebGLUniformLocation | null;
  private uMeshColor!: WebGLUniformLocation | null;
  private uCameraPos!: WebGLUniformLocation | null;
  // Uniforms — dual material
  private uRimColor!: WebGLUniformLocation | null;
  private uTireColor!: WebGLUniformLocation | null;
  private uTireThreshold!: WebGLUniformLocation | null;
  private uUseDualMaterial!: WebGLUniformLocation | null;
  private uThinAxis!: WebGLUniformLocation | null;

  // Buffers
  private vertexBuffer: WebGLBuffer | null = null;
  private normalBuffer: WebGLBuffer | null = null;
  private indexBuffer:  WebGLBuffer | null = null;
  private indexCount  = 0;
  private useUint32   = false;
  private ext: OES_element_index_uint | null = null;

  // ---------------------------------------------------------------------------
  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl', {
      antialias: true, depth: true, alpha: false, powerPreference: 'high-performance',
    }) as WebGLRenderingContext | null;
    if (!gl) throw new Error('WebGL no disponible.');
    this.gl = gl;

    this.ext = gl.getExtension('OES_element_index_uint');
    this.program = this.createProgram(VERTEX_SHADER_SRC, FRAGMENT_SHADER_SRC);
    gl.useProgram(this.program);

    // Atributos
    this.aPosition = gl.getAttribLocation(this.program, 'aPosition');
    this.aNormal   = gl.getAttribLocation(this.program, 'aNormal');

    // Uniforms — usamos null nativo (NO reemplazamos con {})
    this.uModelMatrix      = gl.getUniformLocation(this.program, 'uModelMatrix');
    this.uViewMatrix       = gl.getUniformLocation(this.program, 'uViewMatrix');
    this.uProjectionMatrix = gl.getUniformLocation(this.program, 'uProjectionMatrix');
    this.uNormalMatrix     = gl.getUniformLocation(this.program, 'uNormalMatrix');
    this.uLightDir         = gl.getUniformLocation(this.program, 'uLightDir');
    this.uLightColor       = gl.getUniformLocation(this.program, 'uLightColor');
    this.uAmbientIntensity = gl.getUniformLocation(this.program, 'uAmbientIntensity');
    this.uDiffuseIntensity = gl.getUniformLocation(this.program, 'uDiffuseIntensity');
    this.uSpecularIntensity = gl.getUniformLocation(this.program, 'uSpecularIntensity');
    this.uMeshColor        = gl.getUniformLocation(this.program, 'uMeshColor');
    this.uCameraPos        = gl.getUniformLocation(this.program, 'uCameraPos');
    this.uRimColor         = gl.getUniformLocation(this.program, 'uRimColor');
    this.uTireColor        = gl.getUniformLocation(this.program, 'uTireColor');
    this.uTireThreshold    = gl.getUniformLocation(this.program, 'uTireThreshold');
    this.uUseDualMaterial  = gl.getUniformLocation(this.program, 'uUseDualMaterial');
    this.uThinAxis         = gl.getUniformLocation(this.program, 'uThinAxis');

    // Reportar si algún uniform no se encontró
    const checks: [string, WebGLUniformLocation | null][] = [
      ['uModelMatrix', this.uModelMatrix],
      ['uViewMatrix', this.uViewMatrix],
      ['uProjectionMatrix', this.uProjectionMatrix],
      ['uNormalMatrix', this.uNormalMatrix],
      ['uTireThreshold', this.uTireThreshold],
      ['uUseDualMaterial', this.uUseDualMaterial],
      ['uThinAxis', this.uThinAxis],
    ];
    for (const [name, loc] of checks) {
      if (loc === null) console.warn(`[Renderer] Uniform "${name}" no encontrado (puede estar optimizado).`);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.04, 0.04, 0.08, 1.0);

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(canvas);
    this.handleResize();
  }

  // ---------------------------------------------------------------------------
  loadMesh(mesh: ParsedMesh): void {
    const gl = this.gl;
    if (!gl) return;

    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.normalBuffer)  gl.deleteBuffer(this.normalBuffer);
    if (this.indexBuffer)   gl.deleteBuffer(this.indexBuffer);

    this.vertexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.normals, gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.useUint32 = mesh.vertexCount > 65535 && this.ext !== null;
    if (this.useUint32) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    } else {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(mesh.indices), gl.STATIC_DRAW);
    }

    this.indexCount = mesh.indices.length;
    console.log(`[Renderer] GPU: ${mesh.vertexCount}v ${mesh.faceCount}t ${this.useUint32 ? 'Uint32' : 'Uint16'}`);
  }

  // ---------------------------------------------------------------------------
  render(uniforms: ShaderUniforms): void {
    const gl = this.gl;
    if (!gl || this.indexCount === 0) return;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Matrices (null-safe — WebGL ignora llamadas con location null)
    gl.uniformMatrix4fv(this.uModelMatrix,      false, uniforms.modelMatrix);
    gl.uniformMatrix4fv(this.uViewMatrix,       false, uniforms.viewMatrix);
    gl.uniformMatrix4fv(this.uProjectionMatrix, false, uniforms.projectionMatrix);
    gl.uniformMatrix3fv(this.uNormalMatrix,     false, uniforms.normalMatrix);

    // Lighting
    gl.uniform3fv(this.uLightDir,          uniforms.lightDir);
    gl.uniform3fv(this.uLightColor,        uniforms.lightColor);
    gl.uniform1f(this.uAmbientIntensity,   uniforms.ambientIntensity);
    gl.uniform1f(this.uDiffuseIntensity,   uniforms.diffuseIntensity);
    gl.uniform1f(this.uSpecularIntensity,  uniforms.specularIntensity);
    gl.uniform3fv(this.uMeshColor,         uniforms.meshColor);
    gl.uniform3fv(this.uCameraPos,         uniforms.cameraPos);

    // Dual material
    gl.uniform3fv(this.uRimColor,         uniforms.rimColor);
    gl.uniform3fv(this.uTireColor,        uniforms.tireColor);
    gl.uniform1f(this.uTireThreshold,     uniforms.tireThreshold);
    gl.uniform1i(this.uUseDualMaterial,   uniforms.useDualMaterial);
    gl.uniform1i(this.uThinAxis,          uniforms.thinAxis);

    // Bind vertex position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.enableVertexAttribArray(this.aPosition);
    gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

    // Bind normal buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.enableVertexAttribArray(this.aNormal);
    gl.vertexAttribPointer(this.aNormal, 3, gl.FLOAT, false, 0, 0);

    // Draw call
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    const indexType = this.useUint32 ? 0x1405 : gl.UNSIGNED_SHORT;
    gl.drawElements(gl.TRIANGLES, this.indexCount, indexType, 0);
  }

  getAspect(): number { return this.canvas.width / (this.canvas.height || 1); }

  destroy(): void {
    const gl = this.gl;
    if (!gl) return;
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.normalBuffer)  gl.deleteBuffer(this.normalBuffer);
    if (this.indexBuffer)   gl.deleteBuffer(this.indexBuffer);
    gl.deleteProgram(this.program);
    this.resizeObserver?.disconnect();
  }

  computeNormalMatrix(modelMatrix: Float32Array): Float32Array {
    return normalMatrix(modelMatrix);
  }

  private handleResize(): void {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.floor(this.canvas.clientWidth  * dpr);
    const h = Math.floor(this.canvas.clientHeight * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w; this.canvas.height = h;
      this.gl?.viewport(0, 0, w, h);
    }
  }

  private compileShader(src: string, type: number): WebGLShader {
    const gl = this.gl;
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader error (${type === gl.VERTEX_SHADER ? 'VERT' : 'FRAG'}):\n${info}`);
    }
    return shader;
  }

  private createProgram(vert: string, frag: string): WebGLProgram {
    const gl = this.gl;
    const vs = this.compileShader(vert, gl.VERTEX_SHADER);
    const fs = this.compileShader(frag, gl.FRAGMENT_SHADER);
    const p  = gl.createProgram()!;
    gl.attachShader(p, vs); gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(p);
      gl.deleteProgram(p);
      throw new Error(`Link error:\n${info}`);
    }
    gl.deleteShader(vs); gl.deleteShader(fs);
    return p;
  }
}
