// =============================================================================
// engine/geometry.ts — Generador de Malla Procedural (Rueda = Rin + Llanta)
// Se usa como modelo de demostración cuando no hay archivo .txt cargado
// =============================================================================

import type { ParsedMesh } from './types';

// ---------------------------------------------------------------------------
// Generador principal: crea un rin (spokes + llanta) proceduralmente
// ---------------------------------------------------------------------------
export function generateWheelMesh(
  rimRadius = 1.0,
  tireThickness = 0.35,
  tireWidth = 0.45,
  segments = 80,
  tubeSegments = 28,
  spokeCount = 5
): ParsedMesh {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // --- 1. Llanta (toro) ---
  buildTorus(positions, normals, indices, rimRadius, tireThickness, segments, tubeSegments);

  // --- 2. Aro del rin (cilindro fino al radio del aro interno) ---
  const rimOffset = positions.length / 3;
  buildRingDisc(positions, normals, indices, rimOffset, rimRadius - tireThickness * 0.9, 0.04, segments);

  // --- 3. Radios (spokes) ---
  for (let s = 0; s < spokeCount; s++) {
    const angle = (s / spokeCount) * Math.PI * 2;
    const spokeOffset = positions.length / 3;
    buildSpoke(positions, normals, indices, spokeOffset, rimRadius - tireThickness * 0.9, angle, tireWidth * 0.85);
  }

  // --- 4. Centro del rin (cubo/cilindro central) ---
  const hubOffset = positions.length / 3;
  buildHub(positions, normals, indices, hubOffset, 0.12, tireWidth * 0.85, 16);

  // Construir arrays tipados
  const vertexArray = new Float32Array(positions);
  const normalArray = new Float32Array(normals);
  const indexArray  = new Uint32Array(indices);
  const vertexCount = positions.length / 3;

  // Bounding box
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  return {
    vertices: vertexArray,
    normals: normalArray,
    indices: indexArray,
    vertexCount,
    faceCount: indices.length / 3,
    bounds: {
      min: [minX, minY, minZ],
      max: [maxX, maxY, maxZ],
      center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
      size: [maxX - minX, maxY - minY, maxZ - minZ],
    },
  };
}

// ---------------------------------------------------------------------------
// Toro (llanta de goma)
// ---------------------------------------------------------------------------
function buildTorus(
  pos: number[], nor: number[], idx: number[],
  R: number, r: number, segs: number, tubeSegs: number
) {
  const base = pos.length / 3;
  for (let i = 0; i <= segs; i++) {
    const theta = (i / segs) * Math.PI * 2;
    const cosT = Math.cos(theta), sinT = Math.sin(theta);

    for (let j = 0; j <= tubeSegs; j++) {
      const phi = (j / tubeSegs) * Math.PI * 2;
      const cosP = Math.cos(phi), sinP = Math.sin(phi);

      const x = (R + r * cosP) * cosT;
      const y = r * sinP;
      const z = (R + r * cosP) * sinT;

      const nx = cosP * cosT;
      const ny = sinP;
      const nz = cosP * sinT;

      pos.push(x, y, z);
      nor.push(nx, ny, nz);
    }
  }

  for (let i = 0; i < segs; i++) {
    for (let j = 0; j < tubeSegs; j++) {
      const a = base + i * (tubeSegs + 1) + j;
      const b = a + tubeSegs + 1;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
}

// ---------------------------------------------------------------------------
// Disco/Aro del rin (anillo plano como borde del rin)
// ---------------------------------------------------------------------------
function buildRingDisc(
  pos: number[], nor: number[], idx: number[],
  base: number, radius: number, halfWidth: number, segs: number
) {
  const innerR = radius * 0.2;

  for (let side = 0; side < 2; side++) {
    const z = side === 0 ? -halfWidth : halfWidth;
    const ny = 0, nz = side === 0 ? -1 : 1;
    const sideBase = base + side * (segs + 1) * 2;

    for (let i = 0; i <= segs; i++) {
      const angle = (i / segs) * Math.PI * 2;
      const cx = Math.cos(angle), cz_dir = Math.sin(angle);
      pos.push(innerR * cx, innerR * cz_dir, z);
      nor.push(0, ny, nz);
      pos.push(radius * cx, radius * cz_dir, z);
      nor.push(0, ny, nz);
    }

    for (let i = 0; i < segs; i++) {
      const i0 = sideBase + i * 2;
      idx.push(i0, i0 + 1, i0 + 2, i0 + 1, i0 + 3, i0 + 2);
    }
  }
}

// ---------------------------------------------------------------------------
// Radios del rin
// ---------------------------------------------------------------------------
function buildSpoke(
  pos: number[], nor: number[], idx: number[],
  base: number, outerR: number, angle: number, halfWidth: number
) {
  const innerR = 0.13;
  const w = 0.04; // grosor del radio
  const cosA = Math.cos(angle), sinA = Math.sin(angle);

  const pts: [number, number, number][] = [
    [innerR * cosA - w * sinA, -halfWidth, innerR * sinA + w * cosA],
    [innerR * cosA + w * sinA, -halfWidth, innerR * sinA - w * cosA],
    [outerR * cosA + w * sinA, -halfWidth, outerR * sinA - w * cosA],
    [outerR * cosA - w * sinA, -halfWidth, outerR * sinA + w * cosA],
    [innerR * cosA - w * sinA,  halfWidth, innerR * sinA + w * cosA],
    [innerR * cosA + w * sinA,  halfWidth, innerR * sinA - w * cosA],
    [outerR * cosA + w * sinA,  halfWidth, outerR * sinA - w * cosA],
    [outerR * cosA - w * sinA,  halfWidth, outerR * sinA + w * cosA],
  ];

  for (const p of pts) { pos.push(...p); nor.push(0, 1, 0); }

  const b = base;
  // Bottom, Top, Front, Back, Left, Right faces
  const faces = [
    [0,1,2, 0,2,3], [4,6,5, 4,7,6],
    [0,4,1, 1,4,5], [2,6,3, 3,6,7],
    [1,5,2, 2,5,6], [0,3,4, 3,7,4],
  ];
  for (const face of faces) {
    for (const fi of face) idx.push(b + fi);
  }
}

// ---------------------------------------------------------------------------
// Centro del rin (hub cilíndrico)
// ---------------------------------------------------------------------------
function buildHub(
  pos: number[], nor: number[], idx: number[],
  base: number, radius: number, halfWidth: number, segs: number
) {
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    const cx = Math.cos(angle), cz = Math.sin(angle);
    pos.push(radius * cx, -halfWidth, radius * cz); nor.push(cx, 0, cz);
    pos.push(radius * cx,  halfWidth, radius * cz); nor.push(cx, 0, cz);
  }

  for (let i = 0; i < segs; i++) {
    const a = base + i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  // Tapas
  const capBase1 = pos.length / 3;
  pos.push(0, -halfWidth, 0); nor.push(0, -1, 0);
  const c1 = capBase1;
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    pos.push(radius * Math.cos(angle), -halfWidth, radius * Math.sin(angle));
    nor.push(0, -1, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(c1, c1 + i + 1, c1 + i + 2);

  const capBase2 = pos.length / 3;
  pos.push(0, halfWidth, 0); nor.push(0, 1, 0);
  const c2 = capBase2;
  for (let i = 0; i <= segs; i++) {
    const angle = (i / segs) * Math.PI * 2;
    pos.push(radius * Math.cos(angle), halfWidth, radius * Math.sin(angle));
    nor.push(0, 1, 0);
  }
  for (let i = 0; i < segs; i++) idx.push(c2, c2 + i + 2, c2 + i + 1);
}
