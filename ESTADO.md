# Estado del proyecto — Harvey

**Última actualización:** 7 de agosto de 2026
**Plataforma en línea:** https://agustin-calcuta.github.io/harvey-os/
**Repositorio:** https://github.com/agustin-calcuta/harvey-os

---

## Dónde estamos

La plataforma está **funcionando y publicada**, con base de datos real y acceso
con Google. Se presenta a los socios de Harvey el lunes 10 a las 10:00.

Nace de la reunión del 5 de agosto con Francisco Lebermann: son cuatro socios,
se reúnen seguido y las reuniones se dispersan. La respuesta es el ciclo de tres
fases que él mismo propuso —**pre-reunión → reunión → post-reunión**— con el
temario cargado con anticipación, cada minuto asignado y cada compromiso con
responsable y fecha.

En la reunión del 7 de agosto con Francisco y Ariel el alcance creció: la
herramienta deja de ser el tablero de los socios y pasa a servir a **cualquier
equipo de la empresa**, cada uno con su espacio.

---

## Salas: la unidad de trabajo

Una sala es un equipo con sus reuniones, su banco de temas y sus compromisos.

**El rol no es global: vive en cada sala.** La misma persona organiza la suya y
es miembro en otra, que es tal cual lo planteó Fran: *"en la reunión de socios es
un miembro más, pero si quiere armar la minuta con su equipo, ahí sí puede
aprobar"*.

| | Qué puede hacer en esa sala |
| --- | --- |
| **Organizador** | Arma la agenda, aprueba temas, asigna tiempos, modera, y decide quién entra a la sala y con qué rol. Ve los compromisos de todo el equipo. |
| **Miembro** | Propone temas, participa y sigue sus propios compromisos. |

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
organizador y cantidad de integrantes** — nada de reuniones, temas ni
compromisos— y es de sólo lectura.

**Cualquiera puede salir de una sala** por su cuenta. Lo único que no se permite
es que se vaya el último organizador y la sala quede sin quien arme la agenda:
ahí avisa que primero hay que pasarle el rol a alguien. Lo cuida un disparador
de la base, no la interfaz.

---

## Lo que hace

### Pre-reunión

- Cualquiera de la sala propone temas; el organizador decide cuáles entran.
- Cada tema lleva **importancia** (el semáforo rojo / amarillo / verde de Fran),
  **objetivo** (Decisión, Exploratoria, Comunicativa, Informativa) y quién lo
  propuso. El organizador puede cargarlo a nombre de otra persona.
- **Banco de temas**: el *"banco de suplentes"* que pidió Fran, con sección
  propia (**Temario**) en el menú. Se anota un tema sin que exista ninguna
  reunión —no hace falta que haya una armada— y queda ahí, sin fecha, hasta que
  el organizador lo baja a la agenda de la que elija.
- El temario cierra por plazo (24 h antes, configurable) **o a mano**, cuando el
  organizador quiera.
- Se ordena la agenda arrastrando y se ajusta el tiempo de cada tema. Avisa si la
  suma se pasa de lo previsto.
- Al cerrar el temario se emite el correo con los temas definitivos.

### Reunión

- **Modo foco**: en pantalla quedan sólo el tema, el cronómetro y las notas.
- Las pestañas muestran el **título de cada tema**, y se salta al que se quiera:
  los temas se tocan en el orden que salga.
- Cronómetro por tema, con alerta al pasarse.
- **Lo que se pide anotar cambia según el objetivo**: si el tema era de Decisión
  pide qué se decidió; si era Informativa, qué se informó.
- Alta de compromisos en el momento.
- Panel de **pendientes de reuniones anteriores** a un click.

### Post-reunión

- Minuta editable con el formato del documento que el equipo ya usaba.
- **PDF de la minuta**, eligiendo uno por uno qué pendiente viejo se suma.
- Correo con conclusiones y compromisos.

### Seguimiento

- **Compromisos** en una sola sección con dos vistas: tablero (arrastrar entre
  estados) y lista (agrupable por responsable, reunión o vencimiento).
- Un miembro ve sólo los suyos; el organizador, los de todo el equipo.
- **PDF con los pendientes de una persona**, con casillas para tildar, para
  mandarle a cada uno lo suyo por donde lo lea.
- Compromisos sueltos, sin reunión asociada.
- Registro de los correos emitidos, con vista previa.

---

## Cómo está armado

**React + TypeScript + Vite + Tailwind**, publicado como sitio estático en
GitHub Pages. Cada push a `main` compila y publica solo.

**Base de datos: Neon Postgres**, con **Neon Auth** para el ingreso con Google y
la **Data API** (PostgREST) para hablar con la base desde el navegador, sin
servidor propio en el medio.

Los **permisos viven en la base**. Está verificado contra la base real:

- Renata, miembro de Diseño, ve su sala y nada más. No puede crear reuniones
  (403) y no alcanza la sala de socios ni consultándola de frente.
- Lucas ve sus dos salas, con el rol que le toca en cada una.
- Quien pide para sí el alcance de soporte queda como usuario normal.
- El único organizador de una sala no puede salir y dejarla sin conducción.
- Un pedido de entrada lo ve quien lo hizo y quien organiza esa sala; nadie más.
  Sólo el organizador lo resuelve, y nadie puede pedir en nombre de otro.

Hay 35 políticas sobre 9 tablas. El esquema, las políticas y los datos de ejemplo
están en `db/` y se pueden volver a aplicar en cualquier momento.

**Identidad visual** tomada de la marca: fondo hueso, tinta casi negra, el rojo
de la tienda, y las mismas dos tipografías que usa harveywillys.com (Inter para
el texto, Almarai para los titulares). **Responsive** en móvil, tablet y
escritorio.

---

## Accesos

### Soporte técnico

`superadmin` es una cuenta nuestra: ve todo, puede intervenir en cualquier sala y
es el único que puede dar de baja a un administrador. **No pertenece a ningún
equipo y queda fuera de toda lista donde se elige gente.**

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

> Los correos son **inventados** (`@harveywillys.com`). Cuando estén los reales,
> se cambian desde la sala y entran directo con su rol.

### Vistas por rol, sin iniciar sesión

La pantalla de acceso ofrece recorrer la plataforma como **organizador** o como
**miembro**, con datos de ejemplo y sin tocar la base. La vista de soporte no se
ofrece: es una cuenta nuestra, no algo que el equipo vaya a usar.

---

## Lo que queda pendiente

> Para llevar a la reunión: **[PEDIDOS-A-HARVEY.md](PEDIDOS-A-HARVEY.md)** tiene
> esto convertido en preguntas concretas.

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

Está el wordmark tipográfico. El monograma que usan en Instagram no se pudo
descargar. Con el SVG o PNG oficial va a la barra lateral, al favicon y al PDF.

### 3. La pantalla de Google dice "neon.tech"

Usa las credenciales compartidas de Neon. Para que diga Harvey hay que registrar
una aplicación propia en Google Cloud: media hora, mejor cuando confirmen que la
herramienta les sirve.

### 4. Invitación por correo

Hoy se da de alta a alguien y hay que avisarle por otro medio que ya puede
entrar. Cuando esté la casilla conectada, ese aviso puede salir solo.

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

---

## Volver a poner la base de cero

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
insert into public.usuarios (id, nombre, email, alcance, cargo, activo, "creadoEn") values
  ('u_sop_agu',  'Agustín Ducculi',    'agustin@calcutaconsulting.com',  'superadmin','Calcuta', true, now()),
  ('u_sop_agu2', 'Agustín Ducculi',    'aguducculi@gmail.com',           'superadmin','Calcuta', true, now()),
  ('u_sop_fran', 'Francisco Lebermann','francisco@calcutaconsulting.com','superadmin','Calcuta', true, now()),
  ('u_sop_ariel','Ariel',              'ariel@calcutaconsulting.com',    'superadmin','Calcuta', true, now())
on conflict (id) do update set alcance = 'superadmin';
```
