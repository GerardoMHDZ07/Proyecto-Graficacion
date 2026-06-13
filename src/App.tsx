// =============================================================================
// App.tsx — v2: Dual-material (rin+llanta) + mejores defaults de iluminación
// =============================================================================

import { useState, useCallback, useEffect } from 'react';
import { EngineCanvas }  from './components/EngineCanvas';
import { ControlPanel }  from './components/ControlPanel';
import { FileLoader }    from './components/FileLoader';
import { StatsOverlay }  from './components/StatsOverlay';
import { generateWheelMesh } from './engine/geometry';
import { MATERIAL_COLORS }   from './engine/shaders';
import { parseMeshFile }     from './engine/parser';
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
  const [error,            setError]            = useState<string | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Cargar de forma automática el modelo estructurado de la llanta desde el repo al iniciar la aplicación
  useEffect(() => {
    const loadDefaultModel = async () => {
      setIsInitialLoading(true);
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}model_estructurado_limpio.txt`);
        if (!response.ok) {
          throw new Error(`Error ${response.status} al descargar el modelo por defecto.`);
        }
        const content = await response.text();
        const result = parseMeshFile(content);

        if (result.errors.length > 0 && !result.mesh) {
          console.error('[App] Error al parsear el modelo de inicio:', result.errors[0].message);
          return;
        }

        if (result.mesh) {
          setMesh(result.mesh);
          setFilename('model_estructurado_limpio.txt');
        }
      } catch (err) {
        console.warn('[App] No se pudo cargar el modelo por defecto desde el servidor, se mantiene el modelo de demostración procedural:', err);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadDefaultModel();
  }, []);

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
  const handleStatsUpdate = useCallback((s: RendererStats) => {
    const fpsEl = document.getElementById('stat-fps');
    if (fpsEl) fpsEl.textContent = s.fps.toString();
    const msEl = document.getElementById('stat-ms');
    if (msEl) msEl.textContent = s.frameTime.toFixed(1);
    const vertsEl = document.getElementById('stat-verts');
    if (vertsEl) vertsEl.textContent = s.vertexCount.toLocaleString();
    const trisEl = document.getElementById('stat-tris');
    if (trisEl) trisEl.textContent = s.faceCount.toLocaleString();

    const fpsContainer = document.getElementById('stat-fps-container');
    if (fpsContainer) {
      fpsContainer.className = `stat-item fps ${s.fps >= 55 ? 'good' : s.fps >= 30 ? 'mid' : 'bad'}`;
    }

    const infoFpsEl = document.getElementById('info-fps');
    if (infoFpsEl) infoFpsEl.textContent = s.fps.toString();
  }, []);

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
          />
          <StatsOverlay />

          {isInitialLoading && (
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(5, 5, 8, 0.95)',
              backdropFilter: 'blur(16px)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              zIndex: 100,
              color: '#38bdf8'
            }}>
              <div className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
              <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '11px', letterSpacing: '0.15em' }}>
                DESCARGANDO Y PROCESANDO MODELO 3D DE LA LLANTA...
              </span>
            </div>
          )}

          <div className="axis-label" id="axis-label">
            <span className="axis-badge">Z</span> Eje de Rotación
          </div>

          <div className="drag-hint" id="drag-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2-2v0"/>
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
            <span className="info-value" id="info-fps">0</span>
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
