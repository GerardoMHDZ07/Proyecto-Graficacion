// =============================================================================
// components/EngineCanvas.tsx — v3: thinAxis auto-detect + camera fix
// =============================================================================

import { useRef, useEffect, useCallback } from 'react';
import { WebGLRenderer } from '../engine/renderer';
import * as Mat4 from '../engine/math/mat4';
import type { ParsedMesh, CameraParams, LightParams, AnimationState, RendererStats } from '../engine/types';

interface EngineCanvasProps {
  mesh: ParsedMesh | null;
  animState: AnimationState;
  camera: CameraParams;
  light: LightParams;
  meshColor: [number, number, number];
  useDualMaterial: boolean;
  tireThresholdPct: number;
  onStatsUpdate: (stats: RendererStats) => void;
  onAngleUpdate: (angle: number) => void;
}

interface DragState {
  isDragging: boolean;
  lastX: number; lastY: number;
  rotX: number;  rotY: number;
  velocityX: number; velocityY: number;
}

// Detecta el "eje fino" (dirección del axle) en espacio local a partir del bounding box
function detectThinAxis(bounds: ParsedMesh['bounds']): 0 | 1 | 2 {
  const [sx, sy, sz] = bounds.size;
  if (sx <= sy && sx <= sz) return 0;  // X es el más angosto → axle X, plano YZ
  if (sy <= sx && sy <= sz) return 1;  // Y es el más angosto → axle Y, plano XZ (default)
  return 2;                            // Z es el más angosto → axle Z, plano XY
}

// Calcula el radio máximo de la malla en el plano perpendicular al eje fino
function computeLocalMaxRadius(bounds: ParsedMesh['bounds'], thinAxis: 0 | 1 | 2): number {
  const [sx, sy, sz] = bounds.size;
  if (thinAxis === 0) return Math.sqrt((sy / 2) ** 2 + (sz / 2) ** 2);
  if (thinAxis === 2) return Math.sqrt((sx / 2) ** 2 + (sy / 2) ** 2);
  return Math.sqrt((sx / 2) ** 2 + (sz / 2) ** 2); // thinAxis === 1 (default)
}

export function EngineCanvas({
  mesh, animState, camera, light, meshColor,
  useDualMaterial, tireThresholdPct,
  onStatsUpdate, onAngleUpdate,
}: EngineCanvasProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const rafRef      = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const angleRef    = useRef<number>(animState.currentAngle);
  const fpsCountRef = useRef<{ frames: number; last: number }>({ frames: 0, last: 0 });
  const dragRef     = useRef<DragState>({
    isDragging: false, lastX: 0, lastY: 0,
    rotX: 0, rotY: 0, velocityX: 0, velocityY: 0,
  });

  useEffect(() => {
    if (!rendererRef.current || !mesh) return;
    rendererRef.current.loadMesh(mesh);
  }, [mesh]);

  const renderFrame = useCallback((timestamp: number) => {
    const renderer = rendererRef.current;
    if (!renderer || !mesh) {
      rafRef.current = requestAnimationFrame(renderFrame);
      return;
    }

    const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.1);
    lastTimeRef.current = timestamp;

    if (animState.isPlaying) {
      angleRef.current += animState.rotationSpeed * Mat4.DEG2RAD * dt;
      if (angleRef.current > Math.PI * 2) angleRef.current -= Math.PI * 2;
    }

    // Inercia del drag
    const drag = dragRef.current;
    if (!drag.isDragging) {
      drag.rotX += drag.velocityX; drag.rotY += drag.velocityY;
      drag.velocityX *= 0.88; drag.velocityY *= 0.88;
      if (Math.abs(drag.velocityX) < 0.0001) drag.velocityX = 0;
      if (Math.abs(drag.velocityY) < 0.0001) drag.velocityY = 0;
    }

    // FPS
    const f = fpsCountRef.current;
    f.frames++;
    if (timestamp - f.last >= 500) {
      onStatsUpdate({ fps: Math.round((f.frames * 1000) / (timestamp - f.last)), frameTime: dt * 1000, vertexCount: mesh.vertexCount, faceCount: mesh.faceCount, drawCalls: 1 });
      f.frames = 0; f.last = timestamp;
    }

    // ── Model matrix: T(-center) → R_autoSpin → R_user → S ─────────────────
    const bounds  = mesh.bounds;
    const maxSize = Math.max(...bounds.size, 0.001);
    const scaleF  = 1.8 / maxSize;

    // Detectar eje fino (axle) para auto-spin y zona de material
    const thinAxis = detectThinAxis(bounds);
    const localMaxRadius = computeLocalMaxRadius(bounds, thinAxis);
    const tireThreshold  = localMaxRadius * tireThresholdPct;

    // Paso 1: centrar en origen
    let m = Mat4.translate(Mat4.identity(), -bounds.center[0], -bounds.center[1], -bounds.center[2]);

    // Paso 2: auto-spin alrededor del eje de la rueda (eje fino)
    if (thinAxis === 0) {
      m = Mat4.rotateX(m, angleRef.current); // axle X
    } else if (thinAxis === 2) {
      m = Mat4.rotateZ(m, angleRef.current); // axle Z
    } else {
      m = Mat4.rotateY(m, angleRef.current); // axle Y (demo mesh)
    }

    // Paso 3: inclinar la rueda para que se vea de frente
    // Si el axle es Y (plano XZ), inclinar 90° en X para ver la cara
    if (thinAxis === 1) {
      m = Mat4.rotateX(m, -Math.PI * 0.5 + drag.rotX);
      m = Mat4.rotateY(m, drag.rotY);
    } else {
      // Para axle X o Z, solo aplicar drag del usuario
      m = Mat4.rotateX(m, drag.rotX);
      m = Mat4.rotateY(m, drag.rotY);
    }

    // Paso 4: escalar
    m = Mat4.scale(m, scaleF, scaleF, scaleF);
    const modelMatrix = m;

    // View + Projection
    const viewMatrix = Mat4.lookAt(
      [camera.eyeX, camera.eyeY, camera.eyeZ],
      [camera.targetX, camera.targetY, camera.targetZ],
      [camera.upX, camera.upY, camera.upZ]
    );
    const projMatrix = Mat4.perspective(
      camera.fov * Mat4.DEG2RAD, renderer.getAspect(), camera.near, camera.far
    );
    const normMat = renderer.computeNormalMatrix(modelMatrix);



    const lx = light.dirX, ly = light.dirY, lz = light.dirZ;
    const lLen = Math.sqrt(lx*lx + ly*ly + lz*lz) || 1;

    renderer.render({
      modelMatrix, viewMatrix, projectionMatrix: projMatrix, normalMatrix: normMat,
      lightDir:  [lx / lLen, ly / lLen, lz / lLen],
      lightColor: light.lightColor,
      ambientIntensity:  light.ambientIntensity,
      diffuseIntensity:  light.diffuseIntensity,
      specularIntensity: light.specularIntensity,
      meshColor,
      cameraPos: [camera.eyeX, camera.eyeY, camera.eyeZ],
      rimColor:   light.rimColor,
      tireColor:  light.tireColor,
      tireThreshold,
      useDualMaterial: useDualMaterial ? 1 : 0,
      thinAxis,
    });

    onAngleUpdate(angleRef.current);
    rafRef.current = requestAnimationFrame(renderFrame);
  }, [mesh, animState, camera, light, meshColor, useDualMaterial, tireThresholdPct, onStatsUpdate, onAngleUpdate]);

  // Mouse / Touch
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const SENS = 0.007;
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = { ...dragRef.current, isDragging: true, lastX: e.clientX, lastY: e.clientY, velocityX: 0, velocityY: 0 };
      canvas.style.cursor = 'grabbing';
    };
    const onMouseMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d.isDragging) return;
      const dx = e.clientX - d.lastX, dy = e.clientY - d.lastY;
      d.velocityX = dy * SENS; d.velocityY = dx * SENS;
      d.rotX += dy * SENS; d.rotY += dx * SENS;
      d.lastX = e.clientX; d.lastY = e.clientY;
    };
    const onMouseUp = () => { dragRef.current.isDragging = false; canvas.style.cursor = 'grab'; };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      dragRef.current = { ...dragRef.current, isDragging: true, lastX: t.clientX, lastY: t.clientY, velocityX: 0, velocityY: 0 };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 1) return; e.preventDefault();
      const d = dragRef.current; if (!d.isDragging) return;
      const t = e.touches[0];
      const dx = t.clientX - d.lastX, dy = t.clientY - d.lastY;
      d.velocityX = dy * SENS; d.velocityY = dx * SENS;
      d.rotX += dy * SENS; d.rotY += dx * SENS;
      d.lastX = t.clientX; d.lastY = t.clientY;
    };
    const onTouchEnd = () => { dragRef.current.isDragging = false; };
    const onDblClick = () => { dragRef.current.rotX = 0; dragRef.current.rotY = 0; dragRef.current.velocityX = 0; dragRef.current.velocityY = 0; };

    canvas.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove',  onMouseMove);
    window.addEventListener('mouseup',    onMouseUp);
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove',  onTouchMove,  { passive: false });
    canvas.addEventListener('touchend',   onTouchEnd);
    canvas.addEventListener('dblclick',   onDblClick);
    canvas.style.cursor = 'grab';

    return () => {
      canvas.removeEventListener('mousedown',  onMouseDown);
      window.removeEventListener('mousemove',  onMouseMove);
      window.removeEventListener('mouseup',    onMouseUp);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove',  onTouchMove);
      canvas.removeEventListener('touchend',   onTouchEnd);
      canvas.removeEventListener('dblclick',   onDblClick);
    };
  }, []);

  // Init
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = new WebGLRenderer();
    try {
      renderer.init(canvas);
      rendererRef.current = renderer;
      if (mesh) renderer.loadMesh(mesh);
    } catch (e) {
      console.error('[EngineCanvas] Error WebGL:', e);
      return;
    }
    lastTimeRef.current = performance.now();
    fpsCountRef.current = { frames: 0, last: performance.now() };
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => { cancelAnimationFrame(rafRef.current); renderer.destroy(); rendererRef.current = null; };
  }, []);

  useEffect(() => {
    cancelAnimationFrame(rafRef.current);
    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderFrame]);

  return (
    <canvas ref={canvasRef} id="webgl-canvas"
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '12px', cursor: 'grab', userSelect: 'none' }}
    />
  );
}
