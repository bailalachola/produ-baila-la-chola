import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * BASE PATH PARA GITHUB PAGES
 * ---------------------------
 * GitHub Pages publica el sitio en https://<usuario>.github.io/<nombre-del-repo>/
 * Cambiá REPO_NAME por el nombre real del repositorio.
 *
 * También se puede pisar desde la línea de comandos / la GitHub Action:
 *   BASE_PATH=/otro-nombre/ npm run build
 *   BASE_PATH=./ npm run build     (rutas relativas: sirve en cualquier subpath)
 *
 * La app usa routing por hash (#/fecha/...), así que no hace falta 404.html
 * ni reescrituras: recargar cualquier pantalla funciona bajo el subpath.
 */
const REPO_NAME = 'produ-baila-la-chola';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base: process.env.BASE_PATH ?? (command === 'build' || isPreview ? `/${REPO_NAME}/` : '/'),
}));
