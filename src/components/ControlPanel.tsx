// =============================================================================
// components/ControlPanel.tsx — Panel de controles (v2: dual-material)
// =============================================================================

import type { CameraParams, LightParams, AnimationState } from '../engine/types';
import { MATERIAL_COLORS } from '../engine/shaders';

interface ControlPanelProps {
  animState: AnimationState;
  camera: CameraParams;
  light: LightParams;
  meshColor: [number, number, number];
  useDualMaterial: boolean;
  tireThresholdPct: number;
  onAnimChange: (state: Partial<AnimationState>) => void;
  onCameraChange: (cam: Partial<CameraParams>) => void;
  onLightChange: (light: Partial<LightParams>) => void;
  onMeshColorChange: (color: [number, number, number]) => void;
  onDualMaterialChange: (enabled: boolean) => void;
  onTireThresholdChange: (pct: number) => void;
}

function rgbToHex(rgb: [number, number, number]): string {
  return '#' + rgb.map(c => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
}
function hexToRgb(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b];
}

interface SliderProps {
  id: string; label: string; min: number; max: number; step: number;
  value: number; unit?: string; onChange: (v: number) => void;
}
function Slider({ id, label, min, max, step, value, unit = '', onChange }: SliderProps) {
  return (
    <div className="slider-row">
      <label htmlFor={id} className="slider-label">
        <span>{label}</span>
        <span className="slider-value">{value.toFixed(step < 0.1 ? 2 : 1)}{unit}</span>
      </label>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} className="slider" />
    </div>
  );
}

export function ControlPanel({
  animState, camera, light, meshColor,
  useDualMaterial, tireThresholdPct,
  onAnimChange, onCameraChange, onLightChange, onMeshColorChange,
  onDualMaterialChange, onTireThresholdChange,
}: ControlPanelProps) {
  return (
    <aside className="control-panel" id="control-panel">
      {/* Logo */}
      <div className="panel-logo">
        <div className="logo-icon">⬡</div>
        <div>
          <div className="logo-title">WheelEngine</div>
          <div className="logo-sub">WebGL · GLSL</div>
        </div>
      </div>

      {/* Animación */}
      <section className="control-section" id="section-animation">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Animación
        </div>
        <button id="btn-play-stop"
          className={`play-btn ${animState.isPlaying ? 'playing' : 'paused'}`}
          onClick={() => onAnimChange({ isPlaying: !animState.isPlaying })}>
          {animState.isPlaying ? (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
            </svg>Detener</>
          ) : (
            <><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>Iniciar</>
          )}
        </button>
        <Slider id="slider-speed" label="Velocidad" min={5} max={360} step={5}
          value={animState.rotationSpeed} unit="°/s"
          onChange={v => onAnimChange({ rotationSpeed: v })} />
      </section>

      {/* Cámara */}
      <section className="control-section" id="section-camera">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
            <circle cx="12" cy="13" r="4"/>
          </svg>
          Cámara — View Matrix
        </div>
        <div className="subsection-label">Posición del Ojo</div>
        <Slider id="cam-eye-x" label="Eye X" min={-10} max={10} step={0.1} value={camera.eyeX} onChange={v => onCameraChange({ eyeX: v })} />
        <Slider id="cam-eye-y" label="Eye Y" min={-10} max={10} step={0.1} value={camera.eyeY} onChange={v => onCameraChange({ eyeY: v })} />
        <Slider id="cam-eye-z" label="Eye Z" min={1}  max={15} step={0.1} value={camera.eyeZ} onChange={v => onCameraChange({ eyeZ: v })} />
        <div className="subsection-label">Punto de Mira</div>
        <Slider id="cam-tgt-x" label="Target X" min={-5} max={5} step={0.1} value={camera.targetX} onChange={v => onCameraChange({ targetX: v })} />
        <Slider id="cam-tgt-y" label="Target Y" min={-5} max={5} step={0.1} value={camera.targetY} onChange={v => onCameraChange({ targetY: v })} />
        <Slider id="cam-tgt-z" label="Target Z" min={-5} max={5} step={0.1} value={camera.targetZ} onChange={v => onCameraChange({ targetZ: v })} />
        <div className="subsection-label">Proyección</div>
        <Slider id="cam-fov" label="FOV" min={20} max={120} step={1} value={camera.fov} unit="°" onChange={v => onCameraChange({ fov: v })} />
      </section>

      {/* Iluminación */}
      <section className="control-section" id="section-lighting">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
          </svg>
          Iluminación
        </div>
        <Slider id="light-dir-x" label="Luz Dir X" min={-2} max={2} step={0.05} value={light.dirX} onChange={v => onLightChange({ dirX: v })} />
        <Slider id="light-dir-y" label="Luz Dir Y" min={-2} max={2} step={0.05} value={light.dirY} onChange={v => onLightChange({ dirY: v })} />
        <Slider id="light-dir-z" label="Luz Dir Z" min={-2} max={2} step={0.05} value={light.dirZ} onChange={v => onLightChange({ dirZ: v })} />
        <Slider id="light-ambient"  label="Ambiente"  min={0} max={1} step={0.01} value={light.ambientIntensity}  onChange={v => onLightChange({ ambientIntensity: v })}  />
        <Slider id="light-diffuse"  label="Difusa"    min={0} max={2} step={0.01} value={light.diffuseIntensity}  onChange={v => onLightChange({ diffuseIntensity: v })}  />
        <Slider id="light-specular" label="Especular" min={0} max={4} step={0.01} value={light.specularIntensity} onChange={v => onLightChange({ specularIntensity: v })} />
        <div className="color-row">
          <label htmlFor="light-color" className="slider-label"><span>Color Luz</span></label>
          <input id="light-color" type="color" value={rgbToHex(light.lightColor)}
            onChange={e => onLightChange({ lightColor: hexToRgb(e.target.value) })} className="color-picker" />
        </div>
      </section>

      {/* ── Material Dual ───────────────────────────────────────────────── */}
      <section className="control-section" id="section-material">
        <div className="section-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="17" r="2"/><circle cx="6" cy="17" r="2"/>
            <path d="M3 3l4 14M20.5 3L17 17"/>
          </svg>
          Material
        </div>

        {/* Toggle Dual Material */}
        <div className="toggle-row" id="toggle-dual-material">
          <span className="slider-label"><span>Rin + Llanta (auto)</span></span>
          <button
            className={`toggle-btn ${useDualMaterial ? 'on' : 'off'}`}
            onClick={() => onDualMaterialChange(!useDualMaterial)}
            id="btn-dual-material"
          >
            {useDualMaterial ? 'ON' : 'OFF'}
          </button>
        </div>

        {useDualMaterial ? (
          <>
            {/* Slider umbral rin/llanta */}
            <Slider
              id="slider-tire-threshold"
              label="Límite Llanta"
              min={0.5} max={0.99} step={0.01}
              value={tireThresholdPct}
              unit="%"
              onChange={onTireThresholdChange}
            />

            {/* Color del rin */}
            <div className="color-row">
              <label htmlFor="rim-color" className="slider-label"><span>Color Rin (metal)</span></label>
              <input id="rim-color" type="color" value={rgbToHex(light.rimColor)}
                onChange={e => onLightChange({ rimColor: hexToRgb(e.target.value) })} className="color-picker" />
            </div>

            {/* Presets del rin */}
            <div className="dual-preset-row">
              <span className="preset-label">Rin:</span>
              <div className="material-presets">
                {([
                  ['chrome',    MATERIAL_COLORS.chrome],
                  ['steel',     MATERIAL_COLORS.steel],
                  ['gold',      MATERIAL_COLORS.gold],
                  ['electric',  MATERIAL_COLORS.electric],
                  ['darkMetal', MATERIAL_COLORS.darkMetal],
                ] as [string, [number, number, number]][]).map(([name, color]) => (
                  <button key={name} id={`rim-preset-${name}`} className="preset-btn"
                    style={{ backgroundColor: rgbToHex(color) }}
                    onClick={() => onLightChange({ rimColor: color })}
                    title={name} />
                ))}
              </div>
            </div>

            {/* Color de la llanta */}
            <div className="color-row">
              <label htmlFor="tire-color" className="slider-label"><span>Color Llanta (goma)</span></label>
              <input id="tire-color" type="color" value={rgbToHex(light.tireColor)}
                onChange={e => onLightChange({ tireColor: hexToRgb(e.target.value) })} className="color-picker" />
            </div>
            <div className="dual-preset-row">
              <span className="preset-label">Llanta:</span>
              <div className="material-presets">
                {([
                  ['rubber',   MATERIAL_COLORS.rubber],
                  ['darkMetal',MATERIAL_COLORS.darkMetal],
                  ['electric', MATERIAL_COLORS.electric],
                ] as [string, [number, number, number]][]).map(([name, color]) => (
                  <button key={name} id={`tire-preset-${name}`} className="preset-btn"
                    style={{ backgroundColor: rgbToHex(color) }}
                    onClick={() => onLightChange({ tireColor: color })}
                    title={name} />
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Modo color único */
          <>
            <div className="color-row">
              <label htmlFor="mesh-color" className="slider-label"><span>Color Malla</span></label>
              <input id="mesh-color" type="color" value={rgbToHex(meshColor)}
                onChange={e => onMeshColorChange(hexToRgb(e.target.value))} className="color-picker" />
            </div>
            <div className="material-presets">
              {(Object.entries(MATERIAL_COLORS) as [string, [number, number, number]][]).map(([name, color]) => (
                <button key={name} id={`preset-${name}`} className="preset-btn"
                  style={{ backgroundColor: rgbToHex(color) }}
                  onClick={() => onMeshColorChange(color)} title={name} />
              ))}
            </div>
          </>
        )}
      </section>
    </aside>
  );
}
