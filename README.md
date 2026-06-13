# ⬡ WheelEngine 3D — Motor Gráfico WebGL

Motor gráfico web interactivo en 3D desarrollado en **React, TypeScript y WebGL puro (sin librerías externas)** para la visualización y animación de modelos de alta densidad poligonal.

🚀 **[VER APLICACIÓN EN VIVO (LIVE DEMO)](https://gerardomhdz07.github.io/Proyecto-Graficacion/)**

---

## 🛠️ Características Principales

- **Renderizador WebGL Puro**: Implementado utilizando la API nativa de WebGL 1.0 con shaders personalizados escritos en GLSL.
- **Shader de Material Dual**: Detección inteligente del eje de rotación (axle) y delimitación de zonas en tiempo real para aplicar diferentes propiedades físicas (Rin cromado con alta especularidad y Fresnel + Llanta de goma oscura mate).
- **Iluminación Phong**: Luces ambiente, difusa (Lambertiana) y especular (Blinn-Phong) con controles de dirección, color e intensidad en tiempo real.
- **Animación e Interacción**: Simulación del giro del modelo con velocidad ajustable e inercia física suave al arrastrar la cámara y el modelo con el ratón.
- **Cargador de Modelos**:
  - Generador procedural de ruedas integrado para demostración inicial.
  - Parser robusto de archivos de texto `.txt` (soporta mallas de alta densidad con más de 65,535 vértices).
  - **Botón de Carga Rápida**: Descarga el archivo `model_estructurado_limpio.txt` directamente desde los archivos del repositorio alojados en la nube con un solo clic.

---

## 💻 Ejecución Local

1. Instala las dependencias:
   ```bash
   npm install
   ```
2. Ejecuta el servidor de desarrollo local:
   ```bash
   npm run dev
   ```
3. Abre [http://localhost:5173/](http://localhost:5173/) en tu navegador.

---

## 🚀 Despliegue en GitHub Pages

Para publicar cualquier nuevo cambio que realices en el código a la web en vivo:
```bash
npm run deploy
```
Esto compilará y actualizará de manera automática la rama `gh-pages` de tu repositorio de GitHub.
