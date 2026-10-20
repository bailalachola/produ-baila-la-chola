import { NUBE_ACTIVA, SUPABASE_KEY, SUPABASE_URL, VAPID_PUBLIC_KEY } from '../config';
import { supabase } from './supabase';

/**
 * AVISOS AL CELU
 * Cada dispositivo que activa los avisos se guarda en la tabla `suscripciones`.
 * Una función de Supabase (supabase/functions/avisos) revisa las fechas una vez
 * por día y manda las notificaciones. Gratis y sin WhatsApp.
 */

export type EstadoAvisos = 'no-soportado' | 'instalar-primero' | 'bloqueado' | 'apagado' | 'activo';

const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const instalada = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

function base64ABytes(b64: string): Uint8Array {
  const relleno = '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob((b64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function registro(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ?? null;
}

export async function estadoAvisos(): Promise<EstadoAvisos> {
  if (!NUBE_ACTIVA) return 'no-soportado';
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) {
    // en iPhone, los avisos solo existen con la app instalada en la pantalla de inicio
    return esIOS() && !instalada() ? 'instalar-primero' : 'no-soportado';
  }
  if (Notification.permission === 'denied') return 'bloqueado';
  const reg = await registro();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'activo' : 'apagado';
}

export async function activarAvisos(email?: string): Promise<void> {
  const permiso = await Notification.requestPermission();
  if (permiso !== 'granted') throw new Error('Sin permiso no podemos mandarte avisos. Se puede cambiar en la configuración del navegador.');
  const reg = (await registro()) ?? (await navigator.serviceWorker.ready);
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ABytes(VAPID_PUBLIC_KEY).buffer as ArrayBuffer }));
  const j = sub.toJSON();
  const db = supabase();
  if (!db) throw new Error('Los avisos necesitan la base de la murga.');
  const { error } = await db
    .from('suscripciones')
    .upsert({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, email: email ?? null }, { onConflict: 'endpoint' });
  if (error) {
    await sub.unsubscribe().catch(() => undefined);
    throw new Error(`No pudimos guardar el dispositivo: ${error.message}`);
  }
}

export async function desactivarAvisos(): Promise<void> {
  const reg = await registro();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase()?.from('suscripciones').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Manda un aviso de prueba a este dispositivo */
export async function probarAviso(): Promise<void> {
  const reg = await registro();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) throw new Error('Este dispositivo no tiene los avisos activados.');
  const { data } = (await supabase()?.auth.getSession()) ?? { data: { session: null } };
  const res = await fetch(`${SUPABASE_URL}/functions/v1/avisos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${data.session?.access_token ?? SUPABASE_KEY}`,
    },
    body: JSON.stringify({ prueba: sub.endpoint }),
  }).catch(() => null);
  if (!res) throw new Error('No pudimos llegar al servidor de avisos.');
  if (res.status === 404 && !(await res.clone().json().catch(() => null))?.error)
    throw new Error('Falta instalar la función de avisos en Supabase (ver README).');
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(j.error ?? `El servidor de avisos respondió ${res.status}.`);
  }
}
