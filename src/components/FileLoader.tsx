// =============================================================================
// components/FileLoader.tsx — Carga del archivo .txt de malla 3D
// =============================================================================

import { useRef, useState } from 'react';
import { parseMeshFile } from '../engine/parser';
import type { ParsedMesh } from '../engine/types';

interface FileLoaderProps {
  onMeshLoaded: (mesh: ParsedMesh, filename: string) => void;
  onError: (msg: string) => void;
  currentFile: string;
}

export function FileLoader({ onMeshLoaded, onError, currentFile }: FileLoaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.txt') && !file.name.endsWith('.obj')) {
      onError(`Formato no soportado: "${file.name}". Usa un archivo .txt.`);
      return;
    }

    setIsLoading(true);
    try {
      const content = await file.text();
      const result = parseMeshFile(content);

      if (result.errors.length > 0 && !result.mesh) {
        onError(`Error al parsear "${file.name}":\n${result.errors[0].message}`);
        return;
      }

      if (result.mesh) {
        if (result.warnings.length > 0) {
          console.warn(`[FileLoader] ${result.warnings.length} advertencias al parsear:`, result.warnings);
        }
        onMeshLoaded(result.mesh, file.name);
      }
    } catch (e) {
      onError(`No se pudo leer el archivo: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const loadFromRepo = async (fileName: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}${fileName}`);
      if (!response.ok) {
        throw new Error(`Error ${response.status} al descargar el modelo de la llanta desde el servidor.`);
      }
      const content = await response.text();
      const result = parseMeshFile(content);

      if (result.errors.length > 0 && !result.mesh) {
        onError(`Error al parsear "${fileName}":\n${result.errors[0].message}`);
        return;
      }

      if (result.mesh) {
        if (result.warnings.length > 0) {
          console.warn(`[FileLoader] ${result.warnings.length} advertencias al parsear:`, result.warnings);
        }
        onMeshLoaded(result.mesh, fileName);
      }
    } catch (e) {
      onError(`No se pudo cargar desde el repositorio: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="file-loader-section">
      <div className="section-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        Cargar Malla
      </div>

      <div
        className={`drop-zone ${dragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        id="file-drop-zone"
      >
        {isLoading ? (
          <div className="loading-spinner">
            <div className="spinner" />
            <span>Procesando...</span>
          </div>
        ) : (
          <>
            <svg className="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polyline points="16 16 12 12 8 16"/>
              <line x1="12" y1="12" x2="12" y2="21"/>
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            <p className="drop-text">
              {currentFile !== 'Demo' ? `📄 ${currentFile}` : 'Arrastra tu .txt aquí'}
            </p>
            <p className="drop-subtext">o haz clic para seleccionar</p>
          </>
        )}
      </div>

      <button
        type="button"
        className="repo-load-button"
        onClick={() => loadFromRepo('model_estructurado_limpio.txt')}
        disabled={isLoading}
        id="load-repo-model-btn"
      >
        📥 Cargar Llanta (2.5MB)
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        id="file-input"
      />

      {currentFile !== 'Demo' && (
        <p className="current-file-tag">✓ {currentFile}</p>
      )}
    </div>
  );
}
