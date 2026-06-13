// =============================================================================
// App.tsx — v2: Dual-material (rin+llanta) + mejores defaults de iluminación
// =============================================================================

import { useState, useCallback } from 'react';
import { EngineCanvas }  from './components/EngineCanvas';
import { ControlPanel }  from './components/ControlPanel';
import { FileLoader }    from './components/FileLoader';
import { StatsOverlay }  from './components/StatsOverlay';
import { generateWheelMesh } from './engine/geometry';
import { MATERIAL_COLORS }   from './engine/shaders';
import type {
  ParsedMesh, CameraParams, LightParams, AnimationState, RendererStats
} from './engine/types';

const DEMO_MESH = generateWheelMesh(1.0, 0.35, 0.45, 80, 28, 5);

const DEFAULT_CAMERA: CameraParams = {
  eyeX: 0, eyeY: 0.5, eyeZ: 4.5,
  targetX: 0, targetY: 0, targetZ: 0,
  upX: 0, upY: 1, upZ: 0,
  fov: 50, near: 0.1, far: 200,  // far=200 para evitar clipping con modelos grandes
};

// Iluminación con ambiente visible (0.25 garantiza objeto visible siempre)
const DEFAULT_LIGHT: LightParams = {
  dirX: 1.5, dirY: 2.0, dirZ: 1.2,
  ambientIntensity: 0.25,
  diffuseIntensity: 0.80,
  specularIntensity: 2.2,
  lightColor:  [1.0, 0.97, 0.93],
  rimColor:    MATERIAL_COLORS.chrome,
  tireColor:   MATERIAL_COLORS.rubber,
};

const DEFAULT_ANIM: AnimationState = {
  isPlaying: true,
  rotationSpeed: 45,
  currentAngle: 0,
};

export default function App() {
  const [mesh,             setMesh]             = useState<ParsedMesh>(DEMO_MESH);
  const [filename,         setFilename]         = useState('Demo');
  const [animState,        setAnimState]        = useState<AnimationState>(DEFAULT_ANIM);
  const [camera,           setCamera]           = useState<CameraParams>(DEFAULT_CAMERA);
  const [light,            setLight]            = useState<LightParams>(DEFAULT_LIGHT);
  const [meshColor,        setMeshColor]        = useState<[number, number, number]>(MATERIAL_COLORS.chrome);
  const [useDualMaterial,  setUseDualMaterial]  = useState(true);
  const [tireThresholdPct, setTireThresholdPct] = useState(0.78); // 78% del radio = borde rin/llanta
  const [stats,            setStats]            = useState<RendererStats>({ fps: 0, frameTime: 0, vertexCount: 0, faceCount: 0, drawCalls: 0 });
  const [error,            setError]            = useState<string | null>(null);

  const handleMeshLoaded = useCallback((newMesh: ParsedMesh, fname: string) => {
    setMesh(newMesh);
    setFilename(fname);
    setError(null);
    // La malla SIEMPRE se escala a ~1.8 unidades en el renderer.
    // La cámara debe estar a una distancia fija respecto al objeto escalado,
    // NO respecto al tamaño original del archivo.
    setCamera(prev => ({ ...prev, eyeX: 0, eyeY: 0.2, eyeZ: 4.5, targetX: 0, targetY: 0, targetZ: 0, far: 200 }));
    setUseDualMaterial(true);
  }, []);

  const handleAnimChange   = useCallback((p: Partial<AnimationState>) => setAnimState(prev => ({ ...prev, ...p })), []);
  const handleCameraChange = useCallback((p: Partial<CameraParams>)   => setCamera(prev  => ({ ...prev, ...p })), []);
  const handleLightChange  = useCallback((p: Partial<LightParams>)    => setLight(prev   => ({ ...prev, ...p })), []);
  const handleAngleUpdate  = useCallback((a: number) => setAnimState(prev => ({ ...prev, currentAngle: a })), []);
  const handleStatsUpdate  = useCallback((s: RendererStats) => setStats(s), []);

  return (
    <div className="app-layout" id="app-root">
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="top-bar" id="top-bar">
        <div className="top-bar-left">
          <div className="top-logo">
            <span className="top-logo-icon">⬡</span>
            <span className="top-logo-text">WheelEngine<span className="top-logo-ver">3D</span></span>
          </div>
          <div className="top-badges">
            <span className="badge">WebGL</span>
            <span className="badge">GLSL</span>
            <span className="badge">React 19</span>
          </div>
        </div>
        <div className="top-bar-right">
          <span className="top-file">{filename}</span>
          <span className={`top-status ${animState.isPlaying ? 'live' : 'paused'}`}>
            {animState.isPlaying ? '● LIVE' : '⏸ PAUSED'}
          </span>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="main-content" id="main-content">
        <div className="canvas-wrapper" id="canvas-wrapper">
          <EngineCanvas
            mesh={mesh}
            animState={animState}
            camera={camera}
            light={light}
            meshColor={meshColor}
            useDualMaterial={useDualMaterial}
            tireThresholdPct={tireThresholdPct}
            onStatsUpdate={handleStatsUpdate}
            onAngleUpdate={handleAngleUpdate}
          />
          <StatsOverlay stats={stats} />

          <div className="axis-label" id="axis-label">
            <span className="axis-badge">Z</span> Eje de Rotación
          </div>

          <div className="drag-hint" id="drag-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
            Arrastra para rotar · Doble clic para resetear
          </div>
        </div>

        <ControlPanel
          animState={animState}
          camera={camera}
          light={light}
          meshColor={meshColor}
          useDualMaterial={useDualMaterial}
          tireThresholdPct={tireThresholdPct}
          onAnimChange={handleAnimChange}
          onCameraChange={handleCameraChange}
          onLightChange={handleLightChange}
          onMeshColorChange={setMeshColor}
          onDualMaterialChange={setUseDualMaterial}
          onTireThresholdChange={setTireThresholdPct}
        />
      </main>

      {/* ── Bottom Bar ──────────────────────────────────────────────────── */}
      <footer className="bottom-bar" id="bottom-bar">
        <FileLoader
          currentFile={filename}
          onMeshLoaded={handleMeshLoaded}
          onError={(msg) => setError(msg)}
        />
        <div className="model-info">
          <div className="info-card">
            <span className="info-value">{mesh.vertexCount.toLocaleString()}</span>
            <span className="info-label">Vértices</span>
          </div>
          <div className="info-card">
            <span className="info-value">{mesh.faceCount.toLocaleString()}</span>
            <span className="info-label">Triángulos</span>
          </div>
          <div className="info-card">
            <span className="info-value">{stats.fps}</span>
            <span className="info-label">FPS</span>
          </div>
          <div className="info-card">
            <span className="info-value">{animState.rotationSpeed}°/s</span>
            <span className="info-label">Velocidad</span>
          </div>
        </div>
      </footer>

      {error && (
        <div className="error-toast" id="error-toast" onClick={() => setError(null)}>
          <div className="error-icon">⚠</div>
          <div className="error-msg">{error}</div>
          <button className="error-close">✕</button>
        </div>
      )}
    </div>
  );
}
