# Poner en marcha la instancia de Calcuta

Todo lo que hay que hacer una vez, en orden. Cada paso dice **quién**
lo hace y **cómo se sabe que salió bien**.

Lo que ya está hecho vive en el repositorio: la marca, el estado
inicial con las cuatro salas y el equipo, el seed de la base y el
workflow de despliegue. Lo que falta son las credenciales, que no
pueden estar acá.

> **Las claves nunca van al chat ni a un archivo del repositorio.**
> Van a los secrets de GitHub o por `wrangler secret put`. Si una
> termina pegada en algún lado, hay que darla de baja y generar otra.

---

## 1. La base en Neon

**Quién:** Agustín, en la cuenta de Neon **de Calcuta**.

> El MCP de Neon que está conectado en esta máquina apunta a DI
> Digital (`org-bitter-scene-68117783`), que **no** es donde va esto.
> Hay que operar con la connection string de la cuenta de Calcuta.

Un proyecto **nuevo**, separado del de Imporbamas. No se comparte
base entre clientes: hoy las políticas aíslan por sala, no por
organización, y hacerlo multi-inquilino de verdad es rehacerlas
todas. Dos bases es más barato y más seguro.

Con la connection string en `$PGURL_CALCUTA`, en este orden:

```bash
psql "$PGURL_CALCUTA" -f db/schema.sql
```

```bash
psql "$PGURL_CALCUTA" -f db/rls.sql
```

```bash
psql "$PGURL_CALCUTA" -f db/seed-calcuta.sql
```

```bash
psql "$PGURL_CALCUTA" -c "notify pgrst, 'reload schema';"
```

**Antes de correr el seed**, confirmar los cinco correos contra el
Workspace. El acceso es con Google y compara por correo: uno mal
escrito es una persona que no puede entrar, y el error no se ve
hasta que lo intenta. Están todos juntos arriba de
`db/seed-calcuta.sql`.

Las migraciones de `db/migracion-*.sql` **no se corren**: son para
bases que ya venían andando. `schema.sql` ya las incluye.

`seed-calcuta.sql` no borra nada —cada `insert` lleva `on conflict
do nothing`—, así que se puede volver a correr sin miedo aunque el
equipo ya haya cargado reuniones de verdad.

**Sale bien si:** `select count(*) from public.salas;` devuelve 4 y
`select nombre, alcance from public.usuarios;` devuelve las cinco
personas, con Ariel y Denise en `superadmin`.

---

## 2. Neon Auth

**Quién:** Agustín, en el proyecto nuevo.

1. Habilitar Google como proveedor.
2. Agregar a los orígenes permitidos el dominio del despliegue
   —el de Cloudflare Pages— y `http://localhost:5174` para poder
   probar en local.

De ahí salen dos valores para los secrets del paso 4:
`VITE_NEON_AUTH_URL` y `VITE_NEON_DATA_API_URL`.

**Sale bien si:** al entrar con una cuenta del Workspace, la
aplicación muestra las salas de esa persona y no la pantalla de
acceso otra vez.

---

## 3. El proyecto en Cloudflare Pages

**Quién:** Agustín, en la cuenta de Cloudflare de Calcuta.

Crear un proyecto de Pages llamado **`calcuta-reuniones`** —el mismo
nombre que usa `deploy-calcuta.yml`; si se elige otro, cambiarlo
también ahí—. No hace falta conectarlo a GitHub: lo publica el
workflow.

Hace falta un token de API con permiso de **Cloudflare Pages ·
Edit** y el **Account ID** de la cuenta.

**Sale bien si:** el proyecto aparece en el panel de Cloudflare, aun
vacío.

---

## 4. Los secrets del repositorio

**Quién:** Agustín, en Ajustes → Secrets and variables → Actions.

Los de Calcuta van con prefijo `CALCUTA_` para no pisar los de
Imporbamas, que quedan como están:

| Secret | De dónde sale |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | paso 3 |
| `CLOUDFLARE_ACCOUNT_ID` | paso 3 |
| `CALCUTA_VITE_NEON_AUTH_URL` | paso 2 |
| `CALCUTA_VITE_NEON_DATA_API_URL` | paso 2 |
| `CALCUTA_VITE_GOOGLE_CLIENT_ID` | paso 5 |
| `CALCUTA_VITE_IA_ENDPOINT` | paso 6 |
| `CALCUTA_VITE_EMAILJS_SERVICE_ID` | la cuenta de EmailJS |
| `CALCUTA_VITE_EMAILJS_TEMPLATE_ID` | ídem |
| `CALCUTA_VITE_EMAILJS_PUBLIC_KEY` | ídem |

Sin los de Neon la aplicación arranca igual, en modo local: se ve y
se usa, pero nada se guarda fuera del navegador. Sirve para mirarla,
no para trabajar.

**Sale bien si:** el workflow «Deploy Calcuta a Cloudflare Pages»
termina en verde y el sitio abre con el logotipo de Calcuta.

---

## 5. Google Calendar

**Quién:** Agustín, en Google Cloud Console.

Un OAuth **client_id** de tipo aplicación web, con los orígenes
autorizados del despliegue y de `localhost:5174`. El client_id es
público por diseño: no es una clave secreta.

Es lo único que falta para que la aplicación cree el evento con su
enlace de Meet. El código ya está entero en `src/lib/calendar.ts`.

**Sale bien si:** al crear una reunión aparece el enlace de Meet y
el evento queda en el calendario de quien la creó.

---

## 6. El Worker de transcripción

**Quién:** Agustín. Ver `worker/README.md`.

```bash
npx wrangler deploy
```

```bash
npx wrangler secret put GEMINI_API_KEY
```

La clave se escribe en el prompt de `wrangler`, no en un archivo ni
en el chat.

> **Antes de mostrárselo a nadie:** el Worker responde bien en todo
> lo probado —CORS, validación, tamaño— pero la llamada real a
> Gemini devolvió un 502 en la única prueba que se hizo, con un
> audio AIFF generado con `say`. La causa no se llegó a
> diagnosticar; la sospecha es el formato del audio, no el código.
> Hay que probarlo con una grabación real del navegador.

**Sale bien si:** una grabación corta hecha desde la aplicación
vuelve con su transcripción.

---

## 7. Antes de que entre el equipo

- Entrar con una cuenta del Workspace y verificar que se ven las
  cuatro salas.
- Que Ariel o Denise entren y vean **Administración** en el menú:
  ahí es donde dan de alta gente nueva.
- Que alguien del equipo cree una reunión, cargue un tema y la
  cierre. El PDF y el correo son lo que más fácil se queda con
  configuración vieja, porque hay que generar una minuta para verlo.
- Revisar que en ningún lado diga «Imporbamas», «Harvey» ni aparezca
  el rojo `#C0392B`.

---

## Lo que queda pendiente y no bloquea

- **Apellidos** de Denise, Francisco y Lucas.
- **Importar la minuta de Gemini** y que arme las tareas solo. Está
  planificado, falta un ejemplo real de minuta para calibrarlo.
- **El nombre comercial.** Si la herramienta pasa a llamarse «Minit»
  o similar, es un archivo —`src/marca/calcuta.ts`— y un renombre de
  carpeta. No hay que rehacer nada.
