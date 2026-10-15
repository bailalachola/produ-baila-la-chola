import { useEffect, useState } from 'react';
import { alCambiarInstalable, esIOS, instalar, puedeInstalar, yaInstalada } from '../pwa';
import { Icon } from './ui';
import { useToast } from './Toast';

/** "Instalar app" en Android/escritorio; instrucciones cortas en iPhone. */
export function BotonInstalar() {
  const [disponible, setDisponible] = useState(puedeInstalar());
  const [verAyudaIOS, setVerAyudaIOS] = useState(false);
  const toast = useToast();

  useEffect(() => alCambiarInstalable(() => setDisponible(puedeInstalar())), []);

  if (yaInstalada()) return null;

  if (disponible) {
    return (
      <button
        type="button"
        className="instalar"
        onClick={async () => {
          if (await instalar()) toast('¡Listo! La Produ quedó instalada.');
        }}
      >
        <Icon name="download" size={18} /> Instalar La Produ en este dispositivo
      </button>
    );
  }

  if (esIOS()) {
    return (
      <div className="instalar instalar--ios">
        <button type="button" className="link-btn" onClick={() => setVerAyudaIOS((v) => !v)}>
          <Icon name="download" size={16} /> ¿Cómo la instalo en el iPhone?
        </button>
        {verAyudaIOS && (
          <p>
            En Safari tocá <strong>Compartir</strong> (el cuadrado con la flecha) → <strong>Agregar a inicio</strong>.
          </p>
        )}
      </div>
    );
  }

  return null;
}
