// =============================================================================
// components/StatsOverlay.tsx — FPS counter + info de malla
// =============================================================================

import type { RendererStats } from '../engine/types';

interface StatsOverlayProps {
  stats: RendererStats;
}

export function StatsOverlay({ stats }: StatsOverlayProps) {
  const fpsClass = stats.fps >= 55 ? 'good' : stats.fps >= 30 ? 'mid' : 'bad';

  return (
    <div className="stats-overlay" id="stats-overlay">
      <div className={`stat-item fps ${fpsClass}`}>
        <span className="stat-value">{stats.fps}</span>
        <span className="stat-label">FPS</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{stats.frameTime.toFixed(1)}</span>
        <span className="stat-label">ms</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{stats.vertexCount.toLocaleString()}</span>
        <span className="stat-label">verts</span>
      </div>
      <div className="stat-divider" />
      <div className="stat-item">
        <span className="stat-value">{stats.faceCount.toLocaleString()}</span>
        <span className="stat-label">tris</span>
      </div>
    </div>
  );
}
