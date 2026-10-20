import type { Ruta } from '../router';

/**
 * MEJORAS DE LA PRODU
 * -------------------
 * Lo nuevo de la app, para que aparezca en la campanita de Novedades.
 * Cada vez que se publica algo nuevo, se suma una línea ARRIBA de todo.
 */

export interface Mejora {
  /** fecha y hora de publicación, ISO */
  cuando: string;
  autor: string;
  texto: string;
  /** a dónde lleva al tocarla */
  ir?: Ruta;
}

export const MEJORAS: Mejora[] = [
  {
    cuando: '2026-10-20T15:15:00-03:00',
    autor: 'Cou',
    texto: 'sumó la campanita de Novedades 🔔: ahora se ve quién hizo qué en cada fecha, y acá van a aparecer las mejoras de La Produ.',
    ir: { nombre: 'novedades' },
  },
  {
    cuando: '2026-10-20T10:30:00-03:00',
    autor: 'Cou',
    texto: 'sumó los avisos al celu: una vez por día te llegan los recordatorios importantes. Activalos desde el inicio, en “🔔 Avisos al celu”.',
    ir: { nombre: 'home' },
  },
  {
    cuando: '2026-10-20T09:40:00-03:00',
    autor: 'Cou',
    texto: 'sumó el “Update de la fecha para el grupo” 🟢 en Updates: se arma solo con el checklist y marca con 🆕 lo que cambió.',
  },
  {
    cuando: '2026-10-15T16:45:00-03:00',
    autor: 'Cou',
    texto: 'sumó el Quórum 🔴🔴🔴: desde cada idea se arma la encuesta para Cholas y se anota cómo salió.',
  },
  {
    cuando: '2026-10-15T13:20:00-03:00',
    autor: 'Cou',
    texto: 'ajustó el checklist: camarín ideal (luz, espejos, mesa y sillas), “cada una por su cuenta” para viajar y preguntas más claras en Artístico.',
  },
  {
    cuando: '2026-10-15T13:00:00-03:00',
    autor: 'Cou',
    texto: 'sumó el Calendario 📅 y el orden por fecha: lo próximo arriba, lo que ya pasó abajo. Desde el calendario se comparte la agenda.',
    ir: { nombre: 'calendario' },
  },
  {
    cuando: '2026-10-15T12:50:00-03:00',
    autor: 'Cou',
    texto: 'sumó las Ideas 💡: se anotan con el nombre y, cuando decidimos ir, pasan a producción.',
    ir: { nombre: 'nueva', idea: true },
  },
  {
    cuando: '2026-10-15T12:00:00-03:00',
    autor: 'Cou',
    texto: 'sumó el Integrador para WhatsApp y el instructivo “Cómo producimos”.',
    ir: { nombre: 'proceso' },
  },
];
