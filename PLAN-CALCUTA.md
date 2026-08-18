# Llevar la plataforma a Calcuta

Documento de traspaso. Está escrito para que otra sesión pueda ejecutarlo sin
haber estado en la conversación donde salió.

---

## 1. Qué es esto

La plataforma existe y funciona: es la herramienta de reuniones que Calcuta hizo
para **Imporbamas** (la marca de ropa, ex «Harvey»). Tres fases —temario,
reunión, minuta— con tareas que quedan con nombre y fecha.

- **Repo:** `agustin-calcuta/harvey-os`, público, deploy automático a GitHub
  Pages por Actions.
- **En línea:** https://agustin-calcuta.github.io/harvey-os/
- **Base:** Neon Postgres, cuenta **de Calcuta** (no la de DI Digital).
  Neon Auth con Google + Data API sobre PostgREST, con RLS.
- **Stack:** React 19 + Vite + Tailwind 4. Sólo frontend: no hay servidor
  propio, y eso condiciona varias cosas más abajo.

Ahora Calcuta la quiere **para sí misma**: Ariel pidió una versión configurada
para el equipo interno —empezando por Digital Lab— como piloto. En la misma
conversación quedó abierto el nombre comercial de la herramienta (Denise propuso
«Minit»), lo que significa que esto no termina en Calcuta: va camino a ser un
producto que se le instala a más de un cliente.

**Esa frase de arriba es la que decide toda la arquitectura.** Si fuera una vez,
se copia el repo y listo. Si van a ser tres, copiar el repo es la decisión que
después no se puede deshacer.

---

## 2. La decisión que hay que tomar primero

### Opción A — Fork

Copiar el repo, cambiarle la marca, desplegar aparte.

- Se hace en un día.
- A partir del segundo commit, son dos codebases distintos. Cada arreglo hay que
  hacerlo dos veces, y a los tres meses ya no son el mismo producto.

### Opción B — Una sola base de código, la marca como configuración ← **recomendada**

Un repo, dos (o cinco) despliegues. Lo que cambia entre clientes —nombre,
colores, tipografía, logo— sale de un archivo de marca elegido en tiempo de
build por una variable de entorno.

- Un arreglo, todos los clientes.
- Cuesta un par de días más al principio, casi todo en sacar los colores que hoy
  están escritos a mano en tres lugares.
- Es lo que hace posible que exista «Minit» como producto.

**Recomendación: B.** El resto del documento la asume. Si se elige A, saltear a
la sección 4 y aplicar los cambios directo sobre la copia.

---

## 3. Qué está atado a Imporbamas hoy, y dónde

Inventario real, verificado sobre el código.

### Ya es configurable

`estado.config.organizacion` — el nombre de la organización, editable desde
Administración. Lo usan `Layout.tsx`, los PDF y los correos. **Esto ya funciona
y no hay que tocarlo.**

### Está escrito a mano y hay que sacar

| Qué | Dónde |
| --- | --- |
| Paleta completa | `src/index.css`, bloque `@theme` |
| Tipografías | `src/index.css` (`--font-display`, `--font-sans`) y el `<link>` de Google Fonts en `index.html` |
| Escala tipográfica | `src/index.css`, las variables `--text-*` |
| Colores de los correos | `src/lib/email.ts:12-17`, seis constantes hex |
| Colores de los PDF | `src/lib/pdf.ts:23-26`, cuatro constantes RGB |
| «Imporbamas» literal | `src/App.tsx:68` (pantalla de carga), `src/pages/Login.tsx:67` y `:71`, `index.html` (título y meta) |
| Datos de demostración | `src/lib/seed.ts` entero — 727 líneas de gente, salas y reuniones de Harvey |
| La palabra «Harvey» | En comentarios de casi todos los archivos |

### No está atado a nadie

El modelo de datos, las políticas RLS, la lógica de las tres fases, los roles y
todo el flujo. **Eso no se toca.**

---

## 4. El design system de Calcuta

### Lo que hay en el repo

`docs/marca/` tiene los seis SVG oficiales:

```
calcuta-isotipo-azul.svg    calcuta-logotipo-azul.svg
calcuta-isotipo-blanco.svg  calcuta-logotipo-blanco.svg
calcuta-isotipo-negro.svg   calcuta-logotipo-negro.svg
```

**El azul de Calcuta es `#1D37E0`**, sacado de los propios SVG. Es un azul
saturado y eléctrico, muy distinto del rojo ladrillo `#C0392B` de Imporbamas:
donde el de Harvey es cálido y de taller, éste es frío y digital.

### Lo que falta y hay que pedir antes de decidir colores

Esto **no está en el repo** y no se puede inventar:

1. **Tipografías de Calcuta.** Cuál para titulares y cuál para texto. Hoy
   Imporbamas usa Almarai + Inter porque son las de `harveywillys.com`.
2. **Paleta secundaria.** Fondo, tinta, grises, y los colores de estado
   (vencido, en curso, hecho). Del azul solo no se deduce un fondo.
3. **Si el azul aguanta ser el color de acción.** `#1D37E0` sobre blanco tiene
   contraste de sobra para texto grande y botones, pero hay que mirarlo aplicado
   antes de comprarlo: el rojo de Imporbamas se usa para *alertar* además de
   para *actuar*, y un azul no alerta igual. Puede hacer falta un color aparte
   para lo vencido.

**Con esas tres respuestas se arma la paleta. Sin ellas, el trabajo se hace
igual pero con valores provisorios que después hay que revisar.**

---

## 5. Plan de trabajo

### Fase 1 · Sacar la marca del código

El grueso del trabajo, y lo único que no es mecánico.

**1.1** Crear `src/marca/` con un archivo por cliente:

```
src/marca/tipos.ts        La forma que tiene una marca
src/marca/imporbamas.ts   Lo que hoy está en index.css, email.ts y pdf.ts
src/marca/calcuta.ts      El nuevo
src/marca/index.ts        Elige por VITE_MARCA, con imporbamas por defecto
```

Cada marca define: nombre, colores (los mismos nombres semánticos que ya usa el
`@theme`: fondo, panel, hueco, tinta, suave, tenue, borde, borde2, signal, rust,
amber, acid, cold, noche…), las dos familias tipográficas, la URL de Google
Fonts, y las rutas de los logos.

**1.2** Hacer que `index.css` lea de ahí. Tailwind 4 define el tema en CSS, así
que la vía limpia es que el archivo de marca emita variables CSS y el `@theme`
las consuma. Alternativa: un `<style>` inyectado al arrancar. **Lo importante es
que nadie tenga que tocar `index.css` para dar de alta un cliente.**

**1.3** `src/lib/email.ts` y `src/lib/pdf.ts` importan los colores de la marca en
vez de tener las constantes propias. Ojo: el PDF los quiere en RGB `[n,n,n]` y
el correo en hex — conviene que el archivo de marca exponga las dos formas y no
que cada uno convierta por su lado.

**1.4** Los literales de `App.tsx`, `Login.tsx` e `index.html`. Los dos primeros
salen de la marca. El `index.html` es estático: se resuelve con
`vite-plugin-html` o con un `%VITE_TITULO%` reemplazado en build.

**1.5** Poner los SVG de `docs/marca/` en `public/marca/` para que se sirvan, y
que el Layout y el Login usen el logo de la marca activa en vez del texto.

### Fase 2 · La marca de Calcuta

Con las respuestas de la sección 4, escribir `src/marca/calcuta.ts` y mirarlo
aplicado antes de darlo por bueno: **el volumen visual se hizo pensando en el
rojo de Imporbamas**, y hay decisiones —el rojo reservado para la acción
principal y para lo vencido— que con un azul pueden no funcionar igual.

Correr las dos marcas en paralelo y comparar pantalla por pantalla:

```bash
VITE_MARCA=imporbamas npm run dev
VITE_MARCA=calcuta npm run dev
```

### Fase 3 · Datos de demostración propios

`src/lib/seed.ts` son 727 líneas de Harvey: cuatro socios de una marca de ropa,
salas de Diseño y Marketing, reuniones sobre denim y estampas.

Para el piloto de Calcuta hace falta un seed con **las salas reales del equipo**
—Digital Lab para empezar— y reuniones que se parezcan a las de ellos. No es
sólo cambiar nombres: los temas de ejemplo son lo que le muestra a alguien qué
va en cada campo, y «Definir proveedor de denim» no le dice nada a Calcuta.

Conviene partirlo: `seed/comun.ts` con la estructura, `seed/imporbamas.ts` y
`seed/calcuta.ts` con los datos.

### Fase 4 · Infraestructura

**4.1 Base.** Un proyecto de Neon **nuevo** para Calcuta, en la cuenta de
Calcuta. No compartir base entre clientes: hoy el RLS aísla por sala, no por
organización, y hacerlo multi-tenant de verdad es rehacer todas las políticas.
Dos bases separadas es más barato y más seguro.

Sobre la base nueva correr, en este orden:

```bash
psql "$PGURL_CALCUTA" -f db/schema.sql
psql "$PGURL_CALCUTA" -f db/rls.sql
psql "$PGURL_CALCUTA" -c "notify pgrst, 'reload schema';"
```

El `schema.sql` ya tiene todo lo del 18 de agosto —rol externo, columnas de
Calendar, sala tentativa—, así que en una base nueva **no hace falta correr las
migraciones**: son para bases que ya venían andando.

**4.2 Neon Auth.** Habilitar Google en el proyecto nuevo y agregar el dominio
del despliegue a los orígenes permitidos.

**4.3 Despliegue.** Dos opciones:

- **Otro repo** que consuma el mismo código como submódulo o dependencia. Más
  prolijo, más setup.
- **El mismo repo, dos workflows** de GitHub Actions con distinto `VITE_MARCA` y
  distintos secrets, publicando a dos destinos. Más simple. GitHub Pages sólo
  permite un sitio por repo, así que el segundo destino tendría que ser Cloudflare
  Pages o Vercel — los dos gratis y los dos toman un repo público sin fricción.

**4.4 Superadmin.** La cuenta de soporte se llama `Superadmin` y hoy está
cableada a un correo de Imporbamas. Revisar `db/rls.sql` y el seed para que en
la instancia de Calcuta apunte a la cuenta que corresponda.

### Fase 5 · Lo que quedó pendiente y conviene enchufar acá

Dos cosas están **desarrolladas y apagadas** en el repo, esperando credenciales.
Si el piloto de Calcuta las va a usar, es el momento:

- **Grabación con IA.** `worker/` es un Cloudflare Worker que recibe el audio y
  devuelve transcripción y minuta con Gemini. Falta desplegarlo y cargarle la
  clave. Ver `worker/README.md`.
  **Nota honesta:** el Worker responde bien en todo lo probado —CORS, validación,
  tamaño— pero la llamada real a Gemini devolvió un 502 en la única prueba que se
  hizo, con un audio AIFF generado con `say`. La causa no se llegó a diagnosticar:
  la sospecha es el formato del audio, no el código. **Probarlo con una grabación
  real del navegador antes de mostrárselo a nadie.**
- **Google Calendar.** Todo el código está en `src/lib/calendar.ts`. Falta un
  `client_id` de Google Cloud con los orígenes del despliegue.

---

## 6. Qué hay que definir antes de arrancar

Sin estas respuestas el trabajo se hace igual, pero con supuestos que después
hay que revisar:

1. **¿Fork o base de código única?** (sección 2). Es la única que no se puede
   posponer: cambia todo lo demás.
2. **Las tres cosas del design system** (sección 4): tipografías, paleta
   secundaria, y si el azul sirve también para alertar.
3. **¿Cómo se llama?** ¿«Calcuta» o el nombre comercial nuevo? Si va a ser
   «Minit» o similar, conviene que la marca de Calcuta ya nazca con ese nombre en
   vez de renombrar dos veces.
4. **¿Qué salas arrancan?** Digital Lab quedó nombrada; si hay más, entran en el
   seed.
5. **¿Dónde se despliega?** (4.3).

---

## 7. Verificación

No hay suite de tests en el repo. Lo que sí hay y hay que respetar:

```bash
npm run build     # tsc -b && vite build, tiene que quedar en verde
npx oxlint        # los únicos avisos aceptables son los de fast-refresh
```

Y a mano, en el navegador, con las dos marcas levantadas en paralelo:

- **Que no quede nada de Imporbamas en la de Calcuta:** buscar «Imporbamas»,
  «Harvey» y el rojo `#C0392B` en lo que se sirve, no sólo en el código.
- **Las tres fases completas**, de punta a punta: crear reunión → cargar temas →
  iniciar → cerrar → generar minuta → descargar el PDF. El PDF y el correo son
  los que más fácil se quedan con los colores viejos, porque tienen los suyos
  propios.
- **Los cuatro perfiles** desde la pantalla de acceso (socio, miembro, externo,
  superadmin): cada uno ve lo suyo y nada más.
- **Con dos salas o más**, que el filtro compartido se traslade entre secciones.

---

## 8. Trampas conocidas

Cosas que ya costaron una vez y no hace falta que cuesten dos:

- **El PDF y el correo tienen sus propios colores.** Es lo primero que se olvida
  y lo último que se nota, porque hay que generar una minuta para verlo.
- **`index.html` es estático.** El título y las meta no salen de React; si se
  cambian sólo en la app, el navegador sigue diciendo «Imporbamas».
- **Las claves nunca van al chat ni a un archivo del repo.** Van por
  `wrangler secret put` o por los secrets del repositorio. En esta sesión una
  clave de Gemini terminó pegada en el chat y hubo que darla de baja.
- **La cuenta de Neon de Calcuta no es la de DI Digital.** El MCP de Neon
  conectado en la máquina de Agustín apunta a DI Digital
  (`org-bitter-scene-68117783`), que **no** es donde va esto. Para la cuenta de
  Calcuta hay que operar con la connection string que provea él.
- **El volumen visual está calibrado para el rojo.** Un rojo por pantalla para la
  acción principal, y el mismo rojo para lo vencido. Con un azul de acción, lo
  vencido probablemente necesite un color propio, o deja de leerse como alerta.
