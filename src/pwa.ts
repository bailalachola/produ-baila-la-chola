/**
 * APP INSTALABLE (PWA)
 * Registra el service worker y guarda el aviso de "instalar" que da Chrome/Edge
 * (Android y escritorio) para poder mostrar nuestro propio botón.
 */

interface EventoInstalar extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let aviso: EventoInstalar | null = null;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((f) => f());

export function iniciarPwa(): void {
  // dentro del artifact de Claude (iframe) los service workers no funcionan
  let enIframe = true;
  try {
    enIframe = window.self !== window.top;
  } catch {
    /* iframe de otro origen */
  }
  if (enIframe || !import.meta.env.PROD || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.warn('No se pudo registrar el service worker', e);
    });
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    aviso = e as EventoInstalar;
    avisar();
  });
  window.addEventListener('appinstalled', () => {
    aviso = null;
    avisar();
  });
}

export const puedeInstalar = (): boolean => aviso !== null;

export function yaInstalada(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** iPhone/iPad: no hay botón automático, se instala desde Compartir */
export const esIOS = (): boolean => /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function instalar(): Promise<boolean> {
  if (!aviso) return false;
  await aviso.prompt();
  const { outcome } = await aviso.userChoice;
  aviso = null;
  avisar();
  return outcome === 'accepted';
}

export function alCambiarInstalable(f: () => void): () => void {
  oyentes.add(f);
  return () => oyentes.delete(f);
}
