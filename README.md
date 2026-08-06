# Harvey OS

Plataforma de gestión de reuniones para **Harvey**, desarrollada por **Calcuta**.

Nace del diagnóstico del equipo: son cuatro socios que se reúnen seguido y las
reuniones se dispersan. La respuesta es un ciclo de tres fases —
**pre-reunión → reunión → post-reunión** — donde cada tema llega cargado con
anticipación, cada minuto está asignado y cada compromiso queda con responsable
y fecha.

---

## Qué resuelve

### 01 · Pre-reunión

- Cualquiera propone temas; el **organizador** decide cuáles entran.
- Cada tema lleva **importancia** (semáforo rojo / amarillo / verde) y
  **objetivo** (Decisión, Exploratoria, Comunicativa, Informativa), más el
  nombre de quien lo propuso.
- La carga **cierra 24 h antes** (configurable por reunión). Hay cuenta
  regresiva a la vista.
- El organizador ordena la agenda arrastrando y ajusta el tiempo de cada tema.
  La plataforma avisa si la suma se pasa de la duración prevista.
- Al cerrar el temario sale un **correo automático** a todos los participantes
  con los temas definitivos.

### 02 · Reunión

- Vista de moderador con **cronómetro por tema**: tiempo asignado contra tiempo
  real, con alerta al pasarse.
- Notas y conclusiones por tema, con guardado automático.
- Alta de **compromisos en el momento**: acción, responsable, fecha límite e
  importancia.
- Panel de **pendientes de reuniones anteriores** a un click, para repasarlos al
  arrancar sin inflar la minuta del día.

### 03 · Post-reunión

- Minuta editable con el formato exacto del documento que ya usaba el equipo.
- **Exportación a PDF** con la identidad de la marca, lista para llevar impresa.
- Segundo **correo automático** con conclusiones y compromisos.

### Seguimiento continuo

- **Tablero kanban** de compromisos (Pendiente / En curso / Bloqueado / Hecho)
  con arrastrar y soltar, filtros por responsable, importancia y vencimiento.
- **Repositorio de pendientes** agrupable por responsable, reunión o
  vencimiento. Ahí viven las decisiones largas que cruzan varias reuniones.
- Registro de todos los correos emitidos, con vista previa del contenido.

---

## Roles

| Rol              | Qué puede hacer                                                     |
| ---------------- | ------------------------------------------------------------------- |
| **Admin**        | Todo, más la gestión de usuarios, roles y configuración.             |
| **Organizador**  | Arma la agenda, aprueba temas, asigna tiempos y modera la reunión.   |
| **Miembro**      | Propone temas, participa y gestiona sus compromisos.                 |
| **Invitado**     | Sólo lectura de agendas y minutas.                                   |

---

## Cómo correrlo

```bash
npm install
npm run dev
```

Abre en `http://localhost:5173`.

Sin credenciales la app arranca en **modo demo**: los datos viven en el
navegador y se entra con los perfiles de prueba de la pantalla de acceso.
Conviene probar con **Matías** (organizador) y con **Tomás** (miembro) para ver
la diferencia de permisos.

### Conectar Firebase

1. Crear un proyecto en la [consola de Firebase](https://console.firebase.google.com).
2. Habilitar **Authentication → Google** y agregar el dominio de GitHub Pages a
   los dominios autorizados.
3. Crear una base **Firestore**.
4. Copiar `.env.example` a `.env` y completar las claves.

Con eso el acceso con Google y la base compartida se activan solos: no hace
falta tocar código. Las mismas claves van como *secrets* del repositorio para
que el deploy las tome.

### Envío de correo

GitHub Pages sirve archivos estáticos, así que no hay proceso propio que pueda
mandar mails. Los correos se **componen completos y quedan registrados** en la
sección Correos, desde donde se pueden ver, copiar o abrir en el cliente de
correo.

Para que salgan solos hay que apuntar `VITE_EMAIL_ENDPOINT` a un endpoint que
reciba `{ destinatarios, asunto, html, texto }` por POST — una Cloud Function
con Resend, EmailJS o similar.

---

## Deploy

Cada push a `main` dispara el workflow de GitHub Actions que compila y publica
en GitHub Pages. En el repositorio hay que dejar **Settings → Pages → Source:
GitHub Actions**.

---

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Firebase (Auth + Firestore) ·
jsPDF · dnd-kit · React Router
