// =============================================================================
// components/StatsOverlay.tsx — FPS counter + info de malla
// =============================================================================

import type { RendererStats } from '../engine/types';

interface StatsOverlayProps {
  stats?: RendererStats;
}

export function StatsOverlay({ stats }: StatsOverlayProps) {
  const fps = stats?.fps || 0;
  const frameTime = stats?.frameTime || 0;
  const vertexCount = stats?.vertexCount || 0;
  const faceCount = stats?.faceCount || 0;

  const fpsClass = fps >= 55 ? 'good' : fps >= 30 ? 'mid' : 'bad';

  return (
    <div className="stats-overlay" id="stats-overlay">
      <div className={`stat-item fps ${fpsClass}`} id="stat-fps-container">
        <span className="stat-value" id="stat-fps">{fps}</span>
        <span className="stat-label">FPS</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value" id="stat-ms">{frameTime.toFixed(1)}</span>
        <span className="stat-label">ms</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value" id="stat-verts">{vertexCount.toLocaleString()}</span>
        <span className="stat-label">verts</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value" id="stat-tris">{faceCount.toLocaleString()}</span>
        <span className="stat-label">tris</span>
      </div>
    </div>
  );
}
