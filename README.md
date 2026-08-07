# Harvey OS

Plataforma de gestión de reuniones para **Harvey**, desarrollada por **Calcuta**.

> **[ESTADO.md](ESTADO.md)** — qué está hecho, qué falta y cómo se opera. Empezá por ahí.

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
cp .env.example .env   # completar con las URL de Neon
npm run dev
```

Abre en `http://localhost:5173`.

Sin credenciales la app arranca en **modo demo**: los datos viven en el
navegador y se entra con los perfiles de prueba de la pantalla de acceso.
Conviene probar con **Matías** (organizador) y con **Tomás** (miembro) para ver
la diferencia de permisos.

## Base de datos

Corre sobre **Neon Postgres**, con dos piezas:

- **Neon Auth** para el ingreso con Google. La identidad se vincula por correo
  con la ficha del equipo, así cada persona entra con el rol que ya tiene
  asignado. Quien entre con un correo desconocido queda como miembro.
- **Data API** (PostgREST) para hablar con la base desde el navegador, sin
  servidor propio en el medio.

Los permisos **viven en la base**, no en la interfaz: las políticas de Row Level
Security de `db/rls.sql` hacen que un miembro no pueda crear reuniones aunque
manipule la aplicación desde el navegador. Un trigger impide además que nadie se
auto-ascienda de rol.

### Poner la base de cero

```bash
export PGURL='postgresql://...'   # connection string de Neon
psql "$PGURL" -f db/schema.sql    # tablas e índices
psql "$PGURL" -f db/rls.sql       # funciones de rol y políticas (requiere Data API habilitada)
psql "$PGURL" -f db/seed.sql      # datos de demostración, idempotente
```

`db/seed.sql` se puede volver a correr en cualquier momento para restablecer la
demostración a su estado original.

### Variables

Copiar `.env.example` a `.env` y completar `VITE_NEON_AUTH_URL` y
`VITE_NEON_DATA_API_URL` (Consola de Neon → Auth y Data API). Las mismas van
como *secrets* del repositorio para que el deploy las tome.

Hay que agregar el dominio de la aplicación a los **trusted domains** de Neon
Auth, o el ingreso con Google devuelve `Invalid callbackURL`.

## Envío de correo

GitHub Pages sirve archivos estáticos, así que no hay proceso propio que pueda
mandar mails. El envío sale del navegador a través de **EmailJS**, que despacha
desde la casilla conectada en su panel.

Sin casilla conectada la aplicación sigue funcionando: los correos se componen
completos y quedan registrados en la sección Correos, desde donde se pueden ver,
copiar o abrir en el cliente de correo.

### Conectar la casilla

1. Crear cuenta en [emailjs.com](https://www.emailjs.com) (200 correos por mes
   en el plan gratuito).
2. **Email Services** → conectar la casilla desde la que van a salir los correos.
   Anotar el **Service ID**.
3. **Email Templates** → nueva plantilla con estos campos:

   | Campo      | Valor         |
   | ---------- | ------------- |
   | To Email   | `{{to_email}}`|
   | Subject    | `{{subject}}` |
   | Content    | `{{{html}}}`  |

   El contenido va con **tres llaves**: con dos, EmailJS escapa el HTML y el
   correo llega como código a la vista. Anotar el **Template ID**.
4. **Account → General** → copiar la **Public Key**.
5. Cargar los tres valores en `.env` y como *secrets* del repositorio
   (`VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`,
   `VITE_EMAILJS_PUBLIC_KEY`).

En **Administración → Estado técnico** hay un botón *Probar* que manda un correo
de prueba a quien esté con la sesión abierta, para confirmar que la casilla
responde antes de usarlo en una reunión real.

> La clave pública de EmailJS viaja al navegador: es su modelo de uso y por eso
> conviene restringir los dominios permitidos en el panel de EmailJS. Para
> producción, lo prolijo es mover el envío detrás de `VITE_EMAIL_ENDPOINT`, un
> endpoint propio que guarde la credencial del lado del servidor.

---

## Deploy

Cada push a `main` dispara el workflow de GitHub Actions que compila y publica
en GitHub Pages. En el repositorio hay que dejar **Settings → Pages → Source:
GitHub Actions**.

---

## Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · Neon Postgres (Auth + Data API)
· jsPDF · dnd-kit · React Router
