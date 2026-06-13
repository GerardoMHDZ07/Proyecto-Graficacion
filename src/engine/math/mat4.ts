// =============================================================================
// engine/math/mat4.ts — Matemáticas de Matriz 4x4 (sin dependencias externas)
// Almacenamiento column-major como Float32Array(16) compatible con WebGL
// =============================================================================

export type Mat4 = Float32Array;
export type Vec3 = [number, number, number];

/** Crea una matriz identidad 4x4 */
export function identity(): Mat4 {
  const m = new Float32Array(16);
  m[0] = 1; m[5] = 1; m[10] = 1; m[15] = 1;
  return m;
}

/** Crea una copia de una matriz */
export function clone(m: Mat4): Mat4 {
  return new Float32Array(m);
}

/** Multiplica dos matrices 4x4: result = a * b */
export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) {
        sum += a[row + k * 4] * b[k + col * 4];
      }
      out[row + col * 4] = sum;
    }
  }
  return out;
}

/** Matriz de perspectiva (column-major) */
export function perspective(fovRad: number, aspect: number, near: number, far: number): Mat4 {
  const m = new Float32Array(16);
  const f = 1.0 / Math.tan(fovRad / 2);
  const rangeInv = 1.0 / (near - far);

  m[0]  = f / aspect;
  m[5]  = f;
  m[10] = (near + far) * rangeInv;
  m[11] = -1;
  m[14] = near * far * rangeInv * 2;
  m[15] = 0;
  return m;
}

/** Matriz lookAt (posición cámara → punto objetivo) */
export function lookAt(eye: Vec3, center: Vec3, up: Vec3): Mat4 {
  const fx = center[0] - eye[0];
  const fy = center[1] - eye[1];
  const fz = center[2] - eye[2];
  const fLen = Math.sqrt(fx * fx + fy * fy + fz * fz);

  const fnx = fx / fLen, fny = fy / fLen, fnz = fz / fLen;

  const sx = fny * up[2] - fnz * up[1];
  const sy = fnz * up[0] - fnx * up[2];
  const sz = fnx * up[1] - fny * up[0];
  const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz);
  const snx = sx / sLen, sny = sy / sLen, snz = sz / sLen;

  const ux = sny * fnz - snz * fny;
  const uy = snz * fnx - snx * fnz;
  const uz = snx * fny - sny * fnx;

  const m = new Float32Array(16);
  m[0] = snx; m[4] = sny; m[8]  = snz; m[12] = -(snx * eye[0] + sny * eye[1] + snz * eye[2]);
  m[1] = ux;  m[5] = uy;  m[9]  = uz;  m[13] = -(ux  * eye[0] + uy  * eye[1] + uz  * eye[2]);
  m[2] = -fnx; m[6] = -fny; m[10] = -fnz; m[14] = fnx * eye[0] + fny * eye[1] + fnz * eye[2];
  m[3] = 0;   m[7] = 0;   m[11] = 0;   m[15] = 1;
  return m;
}

/** Traslación */
export function translate(m: Mat4, tx: number, ty: number, tz: number): Mat4 {
  const t = new Float32Array(16);
  t[0] = 1; t[5] = 1; t[10] = 1; t[15] = 1;
  t[12] = tx; t[13] = ty; t[14] = tz;
  return multiply(m, t);
}

/** Rotación sobre el eje Y (para girar la rueda sobre su eje horizontal) */
export function rotateY(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const r = new Float32Array(16);
  r[0]  =  c; r[8]  = s;
  r[5]  =  1;
  r[2]  = -s; r[10] = c;
  r[15] =  1;
  return multiply(m, r);
}

/** Rotación sobre el eje X */
export function rotateX(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const r = new Float32Array(16);
  r[0]  =  1;
  r[5]  =  c; r[9]  = -s;
  r[6]  =  s; r[10] =  c;
  r[15] =  1;
  return multiply(m, r);
}

/** Rotación sobre el eje Z */
export function rotateZ(m: Mat4, angle: number): Mat4 {
  const c = Math.cos(angle), s = Math.sin(angle);
  const r = new Float32Array(16);
  r[0]  =  c; r[4] = -s;
  r[1]  =  s; r[5] =  c;
  r[10] =  1;
  r[15] =  1;
  return multiply(m, r);
}

/** Escala uniforme */
export function scale(m: Mat4, sx: number, sy: number, sz: number): Mat4 {
  const s = new Float32Array(16);
  s[0] = sx; s[5] = sy; s[10] = sz; s[15] = 1;
  return multiply(m, s);
}

/** Calcula la matriz normal (transpuesta de la inversa de la upper-left 3x3) */
export function normalMatrix(m: Mat4): Float32Array {
  // Extraemos la upper-left 3x3 e invertimos
  const a00 = m[0], a01 = m[1], a02 = m[2];
  const a10 = m[4], a11 = m[5], a12 = m[6];
  const a20 = m[8], a21 = m[9], a22 = m[10];

  const det = a00 * (a11 * a22 - a12 * a21)
            - a10 * (a01 * a22 - a21 * a02)
            + a20 * (a01 * a12 - a11 * a02);

  const invDet = det !== 0 ? 1 / det : 0;
  const nm = new Float32Array(9);
  // Transpuesta de la inversa
  nm[0] = (a11 * a22 - a12 * a21) * invDet;
  nm[1] = (a12 * a20 - a10 * a22) * invDet;
  nm[2] = (a10 * a21 - a11 * a20) * invDet;
  nm[3] = (a02 * a21 - a01 * a22) * invDet;
  nm[4] = (a00 * a22 - a02 * a20) * invDet;
  nm[5] = (a01 * a20 - a00 * a21) * invDet;
  nm[6] = (a01 * a12 - a02 * a11) * invDet;
  nm[7] = (a02 * a10 - a00 * a12) * invDet;
  nm[8] = (a00 * a11 - a01 * a10) * invDet;
  return nm;
}

export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;
