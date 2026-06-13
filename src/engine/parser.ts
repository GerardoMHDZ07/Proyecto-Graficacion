// =============================================================================
// engine/parser.ts — Parser del archivo .txt de malla 3D
// =============================================================================
// Formato esperado:
//   <id> <x> <y> <z>          ← vértices (antes de "Faces:")
//   Faces:                     ← separador exacto
//   <i> <j> <k>.              ← índices de triángulos (terminan en '.')
// =============================================================================

import type { ParsedMesh, BoundingBox } from './types';

export interface ParseError {
  line: number;
  message: string;
}

export interface ParseResult {
  mesh: ParsedMesh | null;
  errors: ParseError[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Función principal de parseo
// ---------------------------------------------------------------------------
export function parseMeshFile(content: string): ParseResult {
  const errors: ParseError[] = [];
  const warnings: string[] = [];

  const lines = content.split(/\r?\n/);
  let facesLineIndex = -1;

  // Encontrar la línea separadora "Faces:"
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === 'Faces:') {
      facesLineIndex = i;
      break;
    }
  }

  if (facesLineIndex === -1) {
    errors.push({ line: -1, message: 'No se encontró la línea separadora "Faces:" en el archivo.' });
    return { mesh: null, errors, warnings };
  }

  // --- Fase 1: Parsear vértices ---
  const rawVertices: number[] = [];
  for (let i = 0; i < facesLineIndex; i++) {
    const line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    const parts = line.split(/\s+/);
    if (parts.length < 4) {
      warnings.push(`Línea ${i + 1}: formato de vértice inválido, se esperaban 4 tokens (id x y z), se encontraron ${parts.length}.`);
      continue;
    }

    const x = parseFloat(parts[1]);
    const y = parseFloat(parts[2]);
    const z = parseFloat(parts[3]);

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      errors.push({ line: i + 1, message: `Coordenadas no numéricas: "${line}"` });
      continue;
    }

    rawVertices.push(x, y, z);
  }

  if (rawVertices.length === 0) {
    errors.push({ line: 0, message: 'No se encontraron vértices válidos en el archivo.' });
    return { mesh: null, errors, warnings };
  }

  const vertexCount = rawVertices.length / 3;

  // --- Fase 2: Parsear índices de caras ---
  const rawIndices: number[] = [];
  for (let i = facesLineIndex + 1; i < lines.length; i++) {
    let line = lines[i].trim();
    if (line === '' || line.startsWith('#')) continue;

    // Quitar el punto final según el formato especificado
    if (line.endsWith('.')) {
      line = line.slice(0, -1).trim();
    }

    const parts = line.split(/\s+/);
    if (parts.length < 3) {
      warnings.push(`Línea ${i + 1}: cara con menos de 3 índices, se omite.`);
      continue;
    }

    // Parsear como índices 1-based (convertir a 0-based)
    const indices: number[] = [];
    let valid = true;
    for (const part of parts) {
      const idx = parseInt(part, 10);
      if (isNaN(idx)) { valid = false; break; }
      const zeroIdx = idx - 1; // Convertir a 0-based
      if (zeroIdx < 0 || zeroIdx >= vertexCount) {
        warnings.push(`Línea ${i + 1}: índice ${idx} fuera de rango (max: ${vertexCount}), se omite cara.`);
        valid = false;
        break;
      }
      indices.push(zeroIdx);
    }

    if (!valid) continue;

    // Triangulación por fan (para polígonos con más de 3 vértices)
    for (let t = 1; t < indices.length - 1; t++) {
      rawIndices.push(indices[0], indices[t], indices[t + 1]);
    }
  }

  if (rawIndices.length === 0) {
    errors.push({ line: facesLineIndex + 1, message: 'No se encontraron índices de caras válidos.' });
    return { mesh: null, errors, warnings };
  }

  // --- Fase 3: Calcular normales por vértice ---
  const vertexArray = new Float32Array(rawVertices);
  const normals = computeNormals(vertexArray, rawIndices, vertexCount);

  // --- Fase 4: Calcular bounding box ---
  const bounds = computeBounds(vertexArray, vertexCount);

  // Usar Uint32Array para soportar mallas con más de 65535 vértices
  const indexArray = new Uint32Array(rawIndices);

  const mesh: ParsedMesh = {
    vertices: vertexArray,
    indices: indexArray,
    normals,
    vertexCount,
    faceCount: rawIndices.length / 3,
    bounds,
  };

  console.log(
    `[Parser] Malla cargada: ${vertexCount} vértices, ${mesh.faceCount} triángulos, ` +
    `${errors.length} errores, ${warnings.length} advertencias.`
  );

  return { mesh, errors, warnings };
}

// ---------------------------------------------------------------------------
// Calcular normales por vértice (promedio de normales de caras adyacentes)
// ---------------------------------------------------------------------------
function computeNormals(vertices: Float32Array, indices: number[], vertexCount: number): Float32Array {
  const normals = new Float32Array(vertexCount * 3);
  const counts = new Uint32Array(vertexCount);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i], ib = indices[i + 1], ic = indices[i + 2];

    const ax = vertices[ia * 3], ay = vertices[ia * 3 + 1], az = vertices[ia * 3 + 2];
    const bx = vertices[ib * 3], by = vertices[ib * 3 + 1], bz = vertices[ib * 3 + 2];
    const cx = vertices[ic * 3], cy = vertices[ic * 3 + 1], cz = vertices[ic * 3 + 2];

    // Vectores de la cara
    const ux = bx - ax, uy = by - ay, uz = bz - az;
    const vx = cx - ax, vy = cy - ay, vz = cz - az;

    // Normal = cross(u, v)
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;

    for (const idx of [ia, ib, ic]) {
      normals[idx * 3]     += nx;
      normals[idx * 3 + 1] += ny;
      normals[idx * 3 + 2] += nz;
      counts[idx]++;
    }
  }

  // Normalizar
  for (let i = 0; i < vertexCount; i++) {
    if (counts[i] === 0) continue;
    const nx = normals[i * 3], ny = normals[i * 3 + 1], nz = normals[i * 3 + 2];
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0) {
      normals[i * 3]     = nx / len;
      normals[i * 3 + 1] = ny / len;
      normals[i * 3 + 2] = nz / len;
    }
  }

  return normals;
}

// ---------------------------------------------------------------------------
// Calcular bounding box
// ---------------------------------------------------------------------------
function computeBounds(vertices: Float32Array, vertexCount: number): BoundingBox {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const x = vertices[i * 3], y = vertices[i * 3 + 1], z = vertices[i * 3 + 2];
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
    if (z < minZ) minZ = z; if (z > maxZ) maxZ = z;
  }

  return {
    min: [minX, minY, minZ],
    max: [maxX, maxY, maxZ],
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [maxX - minX, maxY - minY, maxZ - minZ],
  };
}
