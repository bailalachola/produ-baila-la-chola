# La Produ · Baila La Chola

**Producción de fechas y bitácora chola.**

La Produ es una herramienta para quien produce una fecha de Baila La Chola. Acompaña la producción como una compañera más: te recuerda qué preguntar, junta los pendientes, registra decisiones y plata, y después de la fecha compara lo acordado con lo que pasó. Con un botón sale la **Bitácora Chola** en PDF.

Flujo: **Nueva fecha → Checklist guiado → Pendientes → Updates → Economía → Retirada (cierre) → Bitácora Chola (PDF)**.

- Sitio 100 % estático (GitHub Pages). Sin backend, sin login.
- Mobile first: botones grandes, autoguardado, se opera con una mano.
- Funciona sin conexión una vez cargado (las tipografías vienen empaquetadas).
- Trae una fecha demo: **39° Encuentro Plurinacional – Córdoba**, para probar todo el flujo y el PDF.

---

## Nombres

- **La Produ**: la app.
- **Retirada**: la sección de cierre (como la canción con la que la murga se despide y hace balance).
- **Bitácora Chola**: el PDF que se genera al final.

## Qué hace

| Sección | Qué tiene |
|---|---|
| **Resumen** | “Antes de cerrar la fecha nos falta…”, estado, avance por sección, datos generales, riesgos, generar bitácora, borrar fecha |
| **Pendientes** | Vista transversal agrupada en *Urgente / A resolver / Resuelto*. Todo lo que respondés “A confirmar” en el checklist aparece solo |
| **Espacio, Técnica, Logística, Artístico, Vestuario, Difusión** | Checklist guiado: Sí / No / A confirmar / No aplica, con detalle, responsable, fecha límite y notas |
| **Economía** | Movimientos en ARS y USD. **Nunca se suman entre monedas**: un balance por moneda. Estados: confirmado / confirmar concepto / reintegro |
| **Updates** | Línea de tiempo (Decisión, Update, Pendiente, Resuelto, Cambio) con botón **Copiar para WhatsApp** |
| **Retirada** | Planificado/acordado vs. qué pasó realmente, preguntas de balance, sello Positivo/Mixto/Negativo, riesgos, **Cerrar fecha** |

### La bitácora en PDF

Sigue la estructura de cierre de Producción y saltea lo que esté vacío (la numeración se ajusta sola):

1. Datos generales · 2. Contexto y objetivo · 3. Condiciones iniciales y acuerdos · 4. Gestión técnica previa · 5. Logística general · 6. Camarín y base de preparación · 7. Articulación interna · 8. Plan operativo final · 9. Desarrollo real · 10. Técnica y sonido: resultado real · 11. Planificado vs. real (con balance por ítem) · 12. Qué funcionó · 13. Aprendizajes · 14. Balance de Producción · 15. Criterios que quedan como antecedente (con condición mínima / riesgo asumido / problema inesperado) · 16. Registro de hitos y decisiones · 17. Estado final y balance económico · Anexo: checklist completo.

Los textos de 2 a 8 se escriben en **Resumen → Relato de producción**; los de 9, 10, 13 y 15, en **Retirada**. Una idea por línea: `- algo` sale como viñeta y `1. algo` como paso numerado. Cada update puede llevar **tema** y **momento** ("Previo al viaje", "Domingo 11/10") para la tabla de hitos.

La fecha de ejemplo (39° Encuentro Plurinacional – Córdoba) está cargada completa y cerrada a partir de la bitácora real. Si se cambia la demo, subí `DEMO_VERSION` en `src/model/demo.ts` y se actualiza sola en los navegadores.

Detalles del checklist inteligente:

- Si respondés **No** a “¿Hay prueba de sonido?” aparece una advertencia (no bloqueante) y se despliegan preguntas de seguimiento. Lo mismo con el camarín.
- En técnica se distingue **Ideal / Mínimo necesario / Acordado**.
- Si decidimos tocar sin prueba, queda registrado solo como **Riesgo asumido** en la bitácora. Si lo acordado queda por debajo del mínimo, también.
- Riesgos en tres categorías: **Condición mínima**, **Riesgo asumido**, **Problema inesperado**.

---

## Instalar y correr

Necesitás [Node.js](https://nodejs.org/) 18 o superior.

```bash
npm install       # instala dependencias
npm run dev       # servidor local en http://localhost:5173
npm run build     # genera la versión publicable en dist/
npm run preview   # sirve dist/ tal como va a quedar en GitHub Pages
npm run deploy    # build + publica dist/ en la rama gh-pages
```

---

## Publicar en GitHub Pages

### 1. Nombre del repositorio / base path

GitHub Pages publica en `https://<usuario>.github.io/<nombre-del-repo>/`.
El nombre está en **`vite.config.ts`**:

```ts
const REPO_NAME = 'produ-baila-la-chola';
```

Cambialo por el nombre real del repo. También podés pisarlo sin tocar el código:

```bash
BASE_PATH=/otro-nombre/ npm run build
BASE_PATH=./ npm run build   # rutas relativas: sirve en cualquier subpath
```

Si usás un dominio propio (ej. `produ.bailalachola.ar`), usá `BASE_PATH=/`.

La app usa rutas con hash (`#/fecha/…/tecnica`), así que recargar cualquier pantalla funciona sin `404.html` ni redirecciones.

### 2a. Opción automática (recomendada): GitHub Action

El repo trae `.github/workflows/deploy.yml`. En GitHub:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. Hacé push a `main`. La Action compila y publica sola, y toma el nombre del repo automáticamente.

### 2b. Opción manual: `npm run deploy`

Publica `dist/` en la rama `gh-pages` con el paquete `gh-pages`.
En **Settings → Pages**, elegí **Source: Deploy from a branch → `gh-pages` / root**.

---

## Dónde se guardan los datos

### En la nube (Supabase), con login de Google

La app guarda todo en una base de datos **PostgreSQL en Supabase** (proyecto `la-produ`). Para entrar hay que tocar **Entrar con Google**, y solo pasan los mails cargados en la tabla `miembros`.

- **Se guarda solo.** Cada cambio sube a la base unos instantes después; arriba se ve "Guardado en la base".
- **Compartido.** Lo que carga una persona lo ven las demás. Al volver a la pestaña (o cada minuto) la app trae los cambios nuevos.
- **Sin señal.** Si no hay conexión, el cambio queda en el celular ("Sin señal · se sube al volver") y se sube solo cuando vuelve la señal.
- **Dos personas en la misma fecha a la vez:** gana el último cambio guardado. Para fechas grandes conviene que una persona cargue cada sección.
- **Primera vez en un dispositivo:** si había fechas guardadas solo en ese navegador, se suben a la base automáticamente.

#### Sumar o sacar personas

Hay que hacerlo en **dos lugares** (mientras la app de Google siga en modo "Prueba"):

1. **Supabase → Table Editor → `miembros`** → agregar fila con el mail (y nombre).
2. **Google Cloud → Google Auth Platform → Público → Usuarios de prueba** → agregar el mail.

Para que alcance con el paso 1, hay que **publicar la app de Google**: en *Información de la marca* poner como página principal `https://bailalachola.github.io/produ-baila-la-chola/` y como política de privacidad `https://bailalachola.github.io/produ-baila-la-chola/privacidad.html` (ya viene incluida), guardar y tocar **Publicar app** en *Público*.

#### Configuración

- La URL del proyecto y la clave pública están en **`src/config.ts`**. La clave *publishable* / *anon* es pública por diseño; **nunca** pongas ahí la `service_role` / `secret`.
- La estructura de la base (tablas, permisos, vistas tipo planilla) está en **`supabase/schema.sql`**.
- En Supabase → **Authentication → URL Configuration**, el *Site URL* y los *Redirect URLs* tienen que incluir la dirección de GitHub Pages (y `http://localhost:5173` para probar en local).
- Si se vacía la clave en `src/config.ts`, la app vuelve a funcionar solo con el navegador (sin login).
- **Plan gratuito:** si nadie usa la app durante una semana, Supabase pausa el proyecto. Se reactiva desde el panel con un clic, sin perder datos.

### Dentro del artifact de Claude

Ahí Google no permite loguearse, así que la app funciona en **modo local**: todo se guarda en ese navegador, como antes.

### Planilla y respaldo

En el inicio, sección **Datos**:

- **Planilla (Excel)** baja un `.xlsx` con hojas *Fechas*, *Movimientos*, *Pendientes*, *Updates* y *Checklist*. Sirve para mirar todo junto, filtrar o subir a Google Sheets. En *Movimientos* los egresos van en negativo, así se puede sumar por moneda (sin mezclar ARS y USD).
- **Respaldo (JSON)** baja todo en un archivo que se puede volver a cargar con **Restaurar respaldo** (sumando o reemplazando).
- Desde Supabase también se pueden bajar CSV de las vistas `planilla_fechas` y `planilla_movimientos`.

## Avisos al celu (notificaciones)

Una vez por día (9:00 de Buenos Aires) La Produ manda notificaciones a los dispositivos
de las Produs que las activaron desde el inicio (“🔔 Avisos al celu”):

- faltan 7 / 3 / 1 días para una fecha (y cuántos pendientes quedan), y el día mismo;
- pendientes con fecha límite que vence hoy o ya venció;
- quórum abierto hace 2 días o más;
- Retirada sin hacer a los 3 y 7 días de una fecha realizada.

Es gratis: usa notificaciones web (estándar del navegador) + una Edge Function y `pg_cron`
de Supabase, que entran en el plan gratuito. En iPhone hace falta tener La Produ instalada
en la pantalla de inicio (iOS 16.4 o más).

Piezas:

- `src/services/avisos.ts` y `src/components/BotonAvisos.tsx`: activar / apagar / probar.
- `public/sw.js`: muestra el aviso y, al tocarlo, abre la pantalla que corresponde.
- `supabase/functions/avisos/index.ts`: decide qué avisar y lo manda.
- `supabase/schema.sql`: tabla `suscripciones` y el `cron.schedule` (comentado).

Configuración (una sola vez, todo desde el panel de Supabase):

1. **SQL Editor**: crear la tabla `suscripciones`, activar `pg_cron` y `pg_net`, y programar el
   aviso diario (el bloque está al final de `supabase/schema.sql`).
2. **Edge Functions → Deploy a new function → Via editor**: nombre `avisos`, pegar
   `supabase/functions/avisos/index.ts` y desplegar. En la configuración de la función,
   apagar **Verify JWT** (la función se protege con su propio secreto).
3. **Edge Functions → Secrets**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `AVISOS_SECRETO`.
   La clave pública también está en `src/config.ts`; la privada y el secreto **nunca** van al repo.
   Si la función no encuentra `SUPABASE_SERVICE_ROLE_KEY`, sumar un secreto `SERVICE_KEY` con la
   secret key del proyecto.

Para generar claves VAPID nuevas: `npx web-push generate-vapid-keys` (y cambiar las dos).

## Estructura del código

```
src/
  model/            ← modelo de datos, sin UI
    types.ts          tipos: Fecha, Respuesta, Pendiente, Movimiento, Update, Riesgo, Cierre
    checklist.ts      TODAS las preguntas del checklist (editar acá para cambiar preguntas)
    logic.ts          progreso, pendientes automáticos, balances por moneda, planificado vs real
    factory.ts        creación y normalización de fechas
    demo.ts           fecha demo del Encuentro
  services/
    repository.ts     contrato de persistencia + implementación localStorage
    backup.ts         exportar / importar JSON
  pdf/
    bitacora.ts       generación del PDF con jsPDF (client-side)
  store.tsx         estado global + autoguardado (la UI solo habla con esto)
  router.ts         rutas por hash
  components/       piezas reutilizables (PreguntaCard, diálogos, toasts, riesgos…)
  views/            pantallas
  styles.css        identidad visual
```

Para **agregar o cambiar preguntas** del checklist, editá `src/model/checklist.ts`. Cada pregunta define su tipo, si es crítica, si aparece en el cierre como comparable, si tiene Ideal/Mínimo/Acordado y qué preguntas se despliegan ante un “No”.

---

## Limitaciones actuales

- No hay permisos por comisión: toda persona habilitada puede ver y editar todo.
- Si dos personas editan la misma fecha al mismo tiempo, gana el último cambio.
- No hay historial de cambios por campo (sí queda la línea de tiempo de updates y la fecha de última actualización).
- El PDF usa Helvetica (las fuentes estándar de PDF): los emojis se omiten en la bitácora.
- Los montos no se convierten entre monedas: ARS y USD siempre por separado, a propósito.

---

## Cómo está armada la persistencia

La UI nunca toca el almacenamiento directamente: todo pasa por la interfaz `FechasRepository` (`src/services/repository.ts`). Hay dos implementaciones:

- `LocalStorageRepository`: guarda en el navegador (modo local y caché).
- `SupabaseRepository` (`src/services/supabaseRepository.ts`): guarda en la tabla `fechas`, con copia local y cola de cambios sin subir.

`src/components/Acceso.tsx` maneja el login con Google, verifica el mail contra `miembros` y activa el repositorio de Supabase.
