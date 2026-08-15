# Estado del proyecto — Impor Bamas (ex Harvey)

**Última actualización:** 15 de agosto de 2026
**Plataforma en línea:** https://agustin-calcuta.github.io/harvey-os/
**Repositorio:** https://github.com/agustin-calcuta/harvey-os

---

## Dónde estamos

La plataforma está **funcionando y publicada**, con base de datos real y acceso
con Google. Ya se les mostró a los socios y volvió con cambios.

Nace de la reunión del 5 de agosto con Francisco Lebermann: son cuatro socios,
se reúnen seguido y las reuniones se dispersan. La respuesta es el ciclo de tres
fases que él mismo propuso —**temario → reunión → minuta**— con el temario
cargado con anticipación y cada tarea con responsable y fecha.

En la reunión del 7 de agosto con Francisco y Ariel el alcance creció: la
herramienta deja de ser el tablero de los socios y pasa a servir a **cualquier
equipo de la empresa**, cada uno con su espacio.

### Lo que cambió el 14 de agosto

Ariel la mostró a los cuatro socios y volvió con una lista larga, casi toda de
uso: *"tenemos que hacer sistemas acorde a lo que necesitan"*. Está aplicada
entera —salvo la grabación con IA y Google Calendar, que quedaron para después—
y el detalle punto por punto está en
**[PLAN-CAMBIOS-14-08.md](PLAN-CAMBIOS-14-08.md)**.

Lo que cambia de fondo, y no sólo de nombre:

- **El temario es personal.** Un tema anotado no pertenece a ninguna sala: sólo
  lo ve quien lo escribió, hasta que lo asigna a una reunión. Ahí toma la sala
  de esa reunión y pasa a ser del equipo.
- **Se fue el plazo de cierre del temario.** Cierra el organizador cuando
  quiere, y un tema de último momento entra igual.
- **Los temas que no se llegan a hablar vuelven** al temario de quien los
  propuso, y quedan disponibles para incluirlos en la próxima.
- **Toda reunión arranca por el seguimiento** de las tareas que quedaron de la
  vez pasada, con el estado editable ahí mismo.
- **La minuta se genera y después se manda**, y hay que recorrer los cuatro
  apartados antes de poder descargarla o enviarla.
- **Una reunión puede repetirse**: al cerrarse, la siguiente se crea sola.
- **Se puede sumar a alguien de afuera** a una reunión puntual sin darle acceso
  a la sala, y hay **reuniones privadas** que no se listan para el resto.
- **Abrir salas quedó en manos de los socios.** Crear reuniones, de cualquiera.
- **«Compromiso» pasó a llamarse «tarea»** en toda la interfaz, y quedan tres
  estados: pendiente, en curso, hecha.
- **Salió la solapa de Correos** de la vista del equipo.
- La marca pasa a **Impor Bamas**: la usan para todas sus sociedades.

---

## Antes de publicar: hay que migrar la base

El código de ahora espera columnas que la base todavía no tiene. **Primero la
migración, después el deploy**, o la aplicación publicada va a fallar al leer:

```bash
export PGURL='postgresql://...'                    # connection string de Neon
psql "$PGURL" -f db/migracion-2026-08-15.sql       # columnas nuevas y datos al día
psql "$PGURL" -f db/rls.sql                        # las políticas cambiaron con ellas
```

La migración es idempotente y no borra nada: agrega columnas, saca el estado
«borrador» y el «bloqueado», y manda al temario personal los temas que estaban
en el banco de cada sala. Deja marcados como habilitados para crear salas a los
organizadores de la sala de socios y a las cuentas de soporte.

---

## Salas: la unidad de trabajo

Una sala es un equipo con sus reuniones y sus tareas.

**El rol no es global: vive en cada sala.** La misma persona organiza la suya y
es miembro en otra, que es tal cual lo planteó Fran: *"en la reunión de socios es
un miembro más, pero si quiere armar la minuta con su equipo, ahí sí puede
aprobar"*.

| | Qué puede hacer en esa sala |
| --- | --- |
| **Organizador** | Arma la agenda, aprueba temas, asigna tiempos, modera, y decide quién entra a la sala y con qué rol. Ve las tareas de todo el equipo. |
| **Miembro** | Propone temas, participa y sigue sus propias tareas. |

**Abrir salas es de los socios.** Se marca persona por persona desde
Administración y lo cuida la base, igual que el alcance: nadie se lo da a sí
mismo. Crear reuniones, en cambio, puede cualquiera de la sala.

En la sala de socios los cuatro están a la par —todos proponen y todos
aprueban—; en la de cada equipo, el socio organiza y su gente propone.

**Cada quien ve sólo las salas de las que forma parte.** Eso lo garantizan las
políticas de la base, no la interfaz: las empleadas no llegan a las minutas de
gerencia ni manipulando la aplicación desde el navegador.

### Sumar gente

El organizador da de alta a alguien con nombre y correo sin salir de la
pantalla. Cuando esa persona entra con Google con ese correo, **se engancha sola
con la ficha que ya existía** — no hace falta código ni enlace de invitación.

### Pedir entrar, y salir

Al crear una sala, si el nombre **ya existe se avisa antes de crearla**, aunque
sea de un equipo del que no formás parte: dice cómo se llama, quién la organiza
y cuánta gente hay, y ofrece **pedir unirse** en vez de armar una segunda igual.
El organizador ve los pedidos al entrar a Salas y los acepta o rechaza; aceptar
suma a la persona en el acto. Si aun así se quiere una sala con el mismo nombre,
se puede, pero hay que confirmarlo.

Eso exige saber que una sala existe sin poder verla. Lo resuelve la vista
`directorio_salas`, que atraviesa las políticas pero **sólo expone nombre,
organizador y cantidad de integrantes** — nada de reuniones, temas ni tareas— y
es de sólo lectura.

### Sumarse a una reunión sin entrar a la sala

*"Si soy de diseño y me quiero sumar a una reunión de marketing, no me sumo a la
sala de marketing y tengo acceso a todas sus minutas: me sumo a esa reunión."*
Al crear o editar una reunión se puede sumar a alguien de afuera con nombre y
correo: entra a esa reunión, ve sus temas y sus tareas, y nada más del equipo.
Si esa persona todavía no existe, se da de alta y se engancha sola cuando entre
con Google.

### Reuniones privadas

Una reunión marcada como privada **no se lista para el resto de la sala**: la
ven quienes participan. Es el caso que trajo Fran —alguien que se junta con su
jefe a hablar de un aumento— y lo cuida la política de lectura, no la interfaz.

**Cualquiera puede salir de una sala** por su cuenta. Lo único que no se permite
es que se vaya el último organizador y la sala quede sin quien arme la agenda:
ahí avisa que primero hay que pasarle el rol a alguien. Lo cuida un disparador
de la base, no la interfaz.

---

## Lo que hace

### El temario, antes de la reunión

- **Mi temario** es un bloc de notas personal: se anota un tema sin que exista
  ninguna reunión y **sólo lo ve quien lo escribió**. Después se asigna a
  cualquiera de las próximas reuniones, de la sala que sea, y ahí sale del bloc.
- Cada tema lleva **importancia** (el semáforo rojo / amarillo / verde de Fran),
  **objetivo** (Decisión, Exploratoria, Comunicativa, Informativa) y quién lo
  propuso. El tiempo estimado no se pide al proponer: lo ajusta el organizador
  desde la agenda si quiere.
- Cualquiera de la sala propone temas; el organizador decide cuáles entran.
- **El temario cierra a mano**, cuando el organizador quiere. Cerrarlo es avisar
  de qué se va a hablar, con una casilla para elegir si sale el correo. Un tema
  de último momento entra igual, hasta que la reunión se cierra.
- Se ordena la agenda arrastrando y se ajusta el tiempo de cada tema.
- Arriba aparecen los **temas que no se llegaron a hablar** en reuniones
  anteriores de la sala, para incluirlos con un click.

### La reunión

- **Arranca por el seguimiento**: las tareas que quedaron de las reuniones
  anteriores, con su responsable, y el estado se cambia ahí mismo. Lo que queda
  hecho no vuelve a aparecer la próxima vez.
- Después, los temas: se salta al que se quiera, en el orden que salga.
- **El botón de tareas va antes que las conclusiones**: lo importante mientras
  se habla es registrar quién se lleva qué.
- El cronómetro quedó reducido a un reloj al costado, que cuenta sin mandar.
- **Lo que se pide anotar cambia según el objetivo**: si el tema era de Decisión
  pide qué se decidió; si era Informativa, qué se informó.

### La minuta

- Cerrar la reunión **genera el borrador**; mandarlo es otro paso.
- Antes de descargar o enviar hay que **recorrer los cuatro apartados**:
  conclusiones, temas, próximos pasos y observaciones.
- **Próximos pasos es una sola caja** con las tareas nuevas y las que venían de
  antes sin terminar.
- **PDF de la minuta**, eligiendo una por una qué tarea vieja se suma.
- Correo con conclusiones y tareas.
- Si la reunión se repite, **la siguiente se crea sola** al cerrarla, y los
  temas que no se llegaron a hablar vuelven al temario de quien los propuso.

### Las cinco secciones

**Panel** (accesos directos, la próxima reunión y lo propio) · **Reuniones**
(próximas e historial, con buscador dentro de las minutas) · **Temario** (el
bloc personal) · **Tareas** · **Salas**.

### Seguimiento

- **Tareas** en una sola sección con dos vistas: tablero (arrastrar entre
  estados) y lista (agrupable por responsable, reunión o vencimiento).
- Tres estados: pendiente, en curso y hecha. Lo trabado se cuenta en el avance.
- Un miembro ve sólo las suyas, **sin el filtro por responsable**; el
  organizador, las de todo el equipo.
- **PDF con las tareas de una persona**, con casillas para tildar, para mandarle
  a cada uno lo suyo por donde lo lea.
- Tareas sueltas, sin reunión asociada.

---

## Cómo está armado

**React + TypeScript + Vite + Tailwind**, publicado como sitio estático en
GitHub Pages. Cada push a `main` compila y publica solo.

**Base de datos: Neon Postgres**, con **Neon Auth** para el ingreso con Google y
la **Data API** (PostgREST) para hablar con la base desde el navegador, sin
servidor propio en el medio.

Los **permisos viven en la base**. Verificado contra la base real:

- Renata, miembro de Diseño, ve su sala y nada más, y no alcanza la sala de
  socios ni consultándola de frente.
- Lucas ve sus dos salas, con el rol que le toca en cada una.
- Quien pide para sí el alcance de soporte queda como usuario normal.
- El único organizador de una sala no puede salir y dejarla sin conducción.
- Un pedido de entrada lo ve quien lo hizo y quien organiza esa sala; nadie más.

**Lo que cambió el 14/08 y todavía no se probó contra la base real** —está
escrito y anda en la vista previa, pero hay que verificarlo con dos cuentas de
verdad después de correr la migración:

- El temario personal: que nadie vea los temas sueltos de otro.
- La reunión privada: que no aparezca para el resto de la sala.
- El invitado de afuera: que vea esa reunión y nada más del equipo.
- Que sólo quien está marcado pueda abrir una sala.

El esquema, las políticas y los datos de ejemplo están en `db/` y se pueden
volver a aplicar en cualquier momento.

**Identidad visual** tomada de la marca: fondo hueso, tinta casi negra, el rojo
de la tienda, Inter para el texto y Almarai para los titulares. **Responsive** en
móvil, tablet y escritorio.

---

## Accesos

### Soporte técnico

`superadmin` es una cuenta nuestra: ve todo y puede intervenir en cualquier sala.
Es lo único que se decide por fuera de las salas, y **nadie se lo puede dar a sí
mismo**: un disparador congela el alcance salvo que quien escribe ya sea
superadmin. **No pertenece a ningún equipo y queda fuera de toda lista donde se
elige gente.**

- agustin@calcutaconsulting.com
- aguducculi@gmail.com
- francisco@calcutaconsulting.com
- ariel@calcutaconsulting.com

### Equipo de la demostración

| Sala | Quiénes | Rol |
| --- | --- | --- |
| **Socios** | Matías, Tomás, Nicolás, Lucas | Organizadores, todos a la par |
| **Diseño** | Tomás | Organizador |
| | Renata, Julieta | Miembros |
| **Marketing** | Lucas | Organizador |
| | Pedro, Camila | Miembros |
| _sin sala_ | Sofía Ledesma | Pidió entrar a Socios, esperando respuesta |

En Marketing hay además una **reunión privada** de ejemplo, entre Lucas y Pedro:
sirve para mostrar que Camila, que también es de Marketing, no la ve.

> Los correos son **inventados** (`@harveywillys.com`). Cuando estén los reales,
> se cambian desde la sala y entran directo con su rol.

### Vistas por rol, sin iniciar sesión

La pantalla de acceso ofrece recorrer la plataforma como **organizador** o como
**miembro**, con datos de ejemplo y sin tocar la base. La vista de soporte no se
ofrece: es una cuenta nuestra, no algo que el equipo vaya a usar.

---

## Lo que queda pendiente

**Nada de esto bloquea la revisión del martes: la plataforma funciona entera.**
Son las cosas que faltan para que el equipo la use como herramienta propia, y
las tres primeras dependen de que ellos definan algo.

De la reunión del 14 quedaron afuera a propósito **la grabación con IA** y **la
invitación por Google Calendar**: las dos están explicadas, con sus caminos
posibles y lo que cuesta cada uno, en
[PLAN-CAMBIOS-14-08.md](PLAN-CAMBIOS-14-08.md).

> Para llevar a la reunión: **[PEDIDOS-A-HARVEY.md](PEDIDOS-A-HARVEY.md)** tiene
> esto convertido en preguntas concretas, y en `docs/` está la **guía de uso en
> PDF** para mostrarle al equipo.

**El orden después del lunes:** conectar la casilla de correo (1) es lo que más
cambia la experiencia, porque los dos avisos empiezan a salir solos y con eso se
puede resolver la invitación (4). El logo (2) es media hora en cuanto lo manden.
La pantalla de Google (3) conviene dejarla para cuando confirmen que la
herramienta les sirve.

### 1. Conectar la casilla de correo

Los dos correos automáticos se componen enteros y quedan registrados, pero
**todavía no salen solos**. Está todo el código listo; faltan tres valores de
[emailjs.com](https://www.emailjs.com):

1. **Email Services** → conectar la casilla. Anotar el **Service ID**.
2. **Email Templates** → plantilla con `To Email: {{to_email}}`,
   `Subject: {{subject}}`, `Content: {{{html}}}` (tres llaves: con dos, el
   correo llega como código a la vista). Anotar el **Template ID**.
3. **Account → General** → la **Public Key**.
4. Cargarlos como secrets: `VITE_EMAILJS_SERVICE_ID`,
   `VITE_EMAILJS_TEMPLATE_ID`, `VITE_EMAILJS_PUBLIC_KEY`.

Después, en **Administración → Estado técnico** hay un botón *Probar*.

**Falta definir desde qué dirección salen.**

### 2. El logo

Está el wordmark tipográfico, ya con el nombre nuevo. **Falta que manden el logo
de Impor Bamas** en SVG o PNG: va a la barra lateral, al favicon y al PDF. Y hay
que confirmar cómo se escribe —en la minuta aparece "Imporbamas" y "Impor
Bamas"—; por ahora quedó *Impor Bamas*, y se cambia desde Administración sin
tocar código.

### 3. La pantalla de Google dice "neon.tech"

Usa las credenciales compartidas de Neon. Para que diga Impor Bamas hay que
registrar una aplicación propia en Google Cloud: media hora. **Es la misma
aplicación que hace falta para mandar el invite por Google Calendar**, así que
conviene hacer las dos juntas.

### 4. Invitación por correo

Hoy se da de alta a alguien y hay que avisarle por otro medio que ya puede
entrar. Cuando esté la casilla conectada, ese aviso puede salir solo. Lo mismo
con los pedidos de entrada: hoy el organizador los ve al abrir Salas, y podría
además llegarle un correo.

### 5. Decisiones que dependen de ellos

No son trabajo pendiente nuestro, son datos que faltan:

- **Los correos de Google** de quienes organizan cada sala. Sin eso no entran.
- **Qué salas arrancan**, quién organiza cada una y **quiénes pueden abrir salas
  nuevas** —quedó definido que son los cuatro socios, falta saber cuáles son sus
  cuentas—.
- Si además de que un tema vuelva al temario usan el rechazo.
- Si cargamos las tareas que hoy tienen abiertas, para arrancar con su realidad
  y no con datos de ejemplo.
- **Cómo se escribe la marca**: en la minuta figura "Imporbamas" y "Impor
  Bamas". Quedó *Impor Bamas* y se cambia desde Administración.

---

## Cosas para tener en cuenta

- **Neon Auth está en beta.**
- **El refresco es por consulta cada 12 segundos**, y al volver a la pestaña.
  Alcanza para trabajar sobre la misma reunión sin pisarse, pero no es tiempo
  real estricto.
- **Al recrear tablas hay que refrescar el caché de la Data API**, o PostgREST
  sigue sirviendo el esquema viejo: `notify pgrst, 'reload schema';`.
- **GitHub Pages cachea el HTML 10 minutos.** Si después de publicar no ves los
  cambios, es eso.
- **No hay pruebas automatizadas.** Todo se verificó a mano contra la base real.
- **`psql` no está en el PATH.** Vive en
  `/opt/homebrew/Cellar/libpq/18.4/bin/psql`.
- **No se puede simular una sesión con `set local request.jwt.claims`.** El
  `auth.user_id()` de Neon no opera dentro de una función security definer en ese
  contexto y devuelve NULL, así que todo da vacío y parece que el permiso está
  mal cuando no lo está. Para probar permisos por rol hay que entrar de verdad
  con dos cuentas distintas, o evaluar las expresiones de las políticas con los
  ids puestos a mano.
- **`directorio_salas` tiene que quedar en sólo lectura.** Es una vista que
  atraviesa RLS y Postgres la considera actualizable: si se vuelve a correr un
  `grant ... on all tables` sin el `revoke` que está en `rls.sql`, se podría
  escribir sobre `salas` a través de ella.

---

## Los documentos del proyecto

| Archivo | Para qué |
| --- | --- |
| `ESTADO.md` | Este. El estado completo y lo que queda pendiente. |
| `PLAN-CAMBIOS-14-08.md` | Los 62 puntos que salieron de la reunión del 14, con qué se hizo y qué quedó afuera. |
| `db/migracion-2026-08-15.sql` | Lleva una base que ya está andando al esquema nuevo, sin perder lo cargado. |
| `PEDIDOS-A-HARVEY.md` | Lo que hay que preguntarle al cliente, ordenado por urgencia. Para llevar a la reunión. |
| `docs/Harvey - Guia de uso.pdf` | Manual de seis páginas para entregarle al cliente, con la identidad de **Calcuta**: Space Grotesk, la paleta del brandbook y el logotipo. |
| `docs/guia-de-uso.html` | La fuente de ese PDF. Cada página está maquetada a medida fija —`position: fixed` no se repite de forma confiable al imprimir— así que al editar hay que revisar que el contenido siga entrando. Se regenera con Chrome: `--headless --no-pdf-header-footer --print-to-pdf`. |
| `docs/marca/` | Logotipo e isotipo de Calcuta recortados al contenido y en los tres colores que usa el manual. Derivados de `CalcutaDesign/Logos`. |
| `docs/mensaje-para-fran.md` | Resumen de los cambios y lo que falta definir, listo para pegar en WhatsApp. |
| `db/` | Esquema, políticas y datos de ejemplo. Se pueden volver a aplicar en cualquier momento. |

---

## Volver a poner la base de cero

Esto **borra lo cargado y vuelve a los datos de ejemplo**. Para una base que ya
está andando, usar la migración de más arriba en vez de esto.

```bash
export PGURL='postgresql://...'   # connection string de Neon
psql "$PGURL" -f db/schema.sql    # tablas e índices
psql "$PGURL" -f db/rls.sql       # funciones de pertenencia y políticas
psql "$PGURL" -f db/seed.sql      # datos de ejemplo, se puede repetir
psql "$PGURL" -c "notify pgrst, 'reload schema';"
```

`db/seed.sql` es idempotente. Al recargarlo hay que volver a agregar las cuentas
de soporte, que no forman parte del conjunto de demostración:

```sql
insert into public.usuarios (id, nombre, email, alcance, "puedeCrearSalas", cargo, activo, "creadoEn") values
  ('u_sop_agu',  'Agustín Ducculi',    'agustin@calcutaconsulting.com',  'superadmin', true, 'Calcuta', true, now()),
  ('u_sop_agu2', 'Agustín Ducculi',    'aguducculi@gmail.com',           'superadmin', true, 'Calcuta', true, now()),
  ('u_sop_fran', 'Francisco Lebermann','francisco@calcutaconsulting.com','superadmin', true, 'Calcuta', true, now()),
  ('u_sop_ariel','Ariel',              'ariel@calcutaconsulting.com',    'superadmin', true, 'Calcuta', true, now())
on conflict (id) do update set alcance = 'superadmin', "puedeCrearSalas" = true;
```
