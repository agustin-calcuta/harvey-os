# Estado del proyecto — Harvey OS

**Última actualización:** 7 de agosto de 2026
**Plataforma en línea:** https://agustin-calcuta.github.io/harvey-os/
**Repositorio:** https://github.com/agustin-calcuta/harvey-os

---

## Dónde estamos

La plataforma está **funcionando y publicada**, con base de datos real y acceso
con Google. Se armó para la reunión de presentación con los socios de Harvey.

Nace de la reunión del 5 de agosto con Francisco Lebermann y de la minuta que él
venía llevando a mano. El diagnóstico era concreto: son cuatro socios, se reúnen
seguido y las reuniones se dispersan. La respuesta es el ciclo de tres fases que
él mismo propuso — **pre-reunión → reunión → post-reunión** — con cada tema
cargado con anticipación, cada minuto asignado y cada compromiso con responsable
y fecha.

---

## Lo que está hecho

### Pre-reunión

- Cualquiera propone temas; el organizador decide cuáles entran.
- Cada tema lleva **importancia** (el semáforo rojo / amarillo / verde que pidió
  Fran), **objetivo** (Decisión, Exploratoria, Comunicativa, Informativa) y el
  nombre de quien lo propuso.
- La carga **cierra 24 h antes**, configurable por reunión, con cuenta regresiva
  a la vista.
- El organizador ordena la agenda arrastrando y ajusta el tiempo de cada tema.
  Avisa si la suma se pasa de la duración prevista.
- Al cerrar el temario se emite el correo con los temas definitivos.

### Reunión

- **Modo foco**: mientras la reunión corre, en pantalla quedan sólo el tema, el
  cronómetro y las notas. Es la pantalla que se mira mientras se discute.
- Cronómetro por tema: tiempo asignado contra tiempo real, con alerta al pasarse.
- Notas por tema, con guardado automático.
- Alta de compromisos en el momento, desde la misma tarjeta de notas.
- Panel de **pendientes de reuniones anteriores** a un click. Era el pedido de
  Fran: repasarlos al arrancar sin que inflen la minuta del día.

### Post-reunión

- Minuta editable con el formato exacto del documento que el equipo ya usaba.
- **Exportación a PDF** con la identidad de la marca: barras de color por
  importancia, tabla de compromisos, opción de sumar los pendientes viejos.
- Correo con conclusiones y compromisos.

### Seguimiento

- **Compromisos** en una sola sección con dos vistas intercambiables:
  - **Tablero** (Pendiente / En curso / Bloqueado / Hecho) con arrastrar y soltar.
  - **Lista** agrupable por responsable, reunión o vencimiento.
- Filtros comunes a las dos vistas: búsqueda, responsable, importancia, vencidos,
  vencen esta semana, propios.
- Las cifras del panel llevan al listado ya filtrado por eso que muestran.
- Registro de todos los correos emitidos, con vista previa del contenido.

### Roles

| Rol | Qué puede hacer |
| --- | --- |
| **Admin** | Todo, más usuarios, roles y configuración. |
| **Organizador** | Arma la agenda, aprueba temas, asigna tiempos y modera. |
| **Miembro** | Propone temas, participa y gestiona sus compromisos. |
| **Invitado** | Sólo lectura. |

---

## Cómo está armado

**React + TypeScript + Vite + Tailwind**, publicado como sitio estático en
GitHub Pages. Cada push a `main` compila y publica solo.

**Base de datos: Neon Postgres**, con dos piezas:

- **Neon Auth** para el ingreso con Google.
- **Data API** (PostgREST) para hablar con la base desde el navegador, sin
  servidor propio en el medio.

Los **permisos viven en la base**, no en la pantalla. Las políticas de Row Level
Security hacen que un miembro no pueda crear reuniones aunque manipule la
aplicación desde el navegador — está verificado: la base devuelve 403. Un trigger
impide además que nadie se ascienda de rol: si alguien pide alta como
administrador, la base lo deja como miembro.

Hay 23 políticas sobre 6 tablas. El esquema, las políticas y los datos de ejemplo
están en `db/` y se pueden volver a aplicar en cualquier momento.

**Identidad visual** tomada de la marca: fondo hueso, tinta casi negra, el rojo
de la tienda, y las mismas dos tipografías que usa harveywillys.com (Inter para
el texto, Almarai para los titulares).

**Responsive** en móvil, tablet y escritorio. En pantallas chicas el tablero usa
botones en lugar de arrastre, porque arrastrar entre columnas apiladas no es
viable con el dedo.

---

## Accesos

### Quién puede entrar

Cargados en la base con su rol. Entran con Google, cada uno con su correo.

**Equipo de Harvey** — visibles en toda la aplicación:

| Nombre | Correo | Rol |
| --- | --- | --- |
| Matías Harvey | matias@harveywillys.com | Organizador |
| Nicolás Harvey | nicolas@harveywillys.com | Admin |
| Tomás Harvey | tomas@harveywillys.com | Miembro |
| Lucas Harvey | lucas@harveywillys.com | Miembro |

**Calcuta** — administradores, pero **inactivos**: entran y administran, y no
aparecen en ningún desplegable donde se elige gente. Para ellos el equipo son los
cuatro socios y nadie más.

- agustin@calcutaconsulting.com
- aguducculi@gmail.com
- francisco@calcutaconsulting.com
- ariel@calcutaconsulting.com

> Los correos de los socios son **inventados**. Cuando estén los reales, se
> cambian desde Administración → Equipo y entran directo con su rol.

### Vistas por rol, sin iniciar sesión

La pantalla de acceso ofrece recorrer la plataforma como Admin, Organizador o
Miembro con datos de ejemplo, sin tocar la base del equipo. Es lo que conviene
usar para mostrar la herramienta.

---

## Lo que queda pendiente

### 1. Conectar la casilla de correo

**Es lo único que falta para que la plataforma esté completa.**

Los dos correos automáticos —temario cerrado y minuta— se componen enteros y
quedan registrados en la sección Correos, desde donde se pueden ver, copiar o
abrir en el cliente de correo. Pero **todavía no salen solos**.

Está todo el código listo; faltan tres valores:

1. Crear cuenta en [emailjs.com](https://www.emailjs.com) — 200 correos por mes
   gratis.
2. **Email Services** → conectar la casilla desde la que van a salir los correos.
   Anotar el **Service ID**.
3. **Email Templates** → nueva plantilla con estos campos exactos:

   | Campo | Valor |
   | --- | --- |
   | To Email | `{{to_email}}` |
   | Subject | `{{subject}}` |
   | Content | `{{{html}}}` |

   El contenido va con **tres llaves**. Con dos, EmailJS escapa el HTML y el
   correo llega como código a la vista. Anotar el **Template ID**.
4. **Account → General** → copiar la **Public Key**.
5. Cargar los tres como secrets del repositorio:
   `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID`,
   `VITE_EMAILJS_PUBLIC_KEY`.

Después, en **Administración → Estado técnico** hay un botón *Probar* que manda
un correo de prueba a quien tenga la sesión abierta.

**Falta definir desde qué dirección salen.** Quedó pendiente preguntárselo a
ellos en la reunión.

### 2. El logo

Está el wordmark tipográfico. El monograma real —el que usan como foto de perfil
en Instagram— no se pudo descargar porque Instagram lo bloquea. Con el SVG o PNG
oficial va a la barra lateral, al favicon y a la cabecera del PDF.

### 3. La pantalla de Google dice "neon.tech"

El ingreso usa las credenciales OAuth compartidas de Neon, que funcionan
perfecto pero muestran "Ir a neon.tech" en la pantalla de Google. Para que diga
Harvey hay que registrar una aplicación propia en Google Cloud y cargar el client
ID en Neon. Media hora de trabajo. Conviene hacerlo recién cuando se confirme que
la herramienta les sirve.

### 4. Ajustes de la reunión

Lo que salga de la presentación.

---

## Cosas para tener en cuenta

- **Neon Auth está en beta.** Funciona bien, pero es información a tener presente
  si esto pasa a ser crítico para ellos.
- **El refresco es por consulta cada 12 segundos**, y también al volver a la
  pestaña. Alcanza de sobra para que varias personas trabajen sobre la misma
  reunión sin pisarse, pero no es tiempo real estricto.
- **La clave pública de EmailJS viaja al navegador**: es su modelo de uso. Para
  producción, lo prolijo es mover el envío detrás de un endpoint propio con la
  credencial resguardada. El código ya contempla esa alternativa
  (`VITE_EMAIL_ENDPOINT` tiene prioridad si está definido).
- **No hay pruebas automatizadas.** Todo se verificó a mano contra la base real:
  el ciclo completo de una reunión, las políticas de seguridad, los tres roles y
  el PDF.
- **GitHub Pages cachea el HTML 10 minutos.** Después de publicar, si no ves los
  cambios, es eso: recarga forzada y listo.

---

## Volver a poner la base de cero

```bash
export PGURL='postgresql://...'   # connection string de Neon
psql "$PGURL" -f db/schema.sql    # tablas e índices
psql "$PGURL" -f db/rls.sql       # roles y políticas de seguridad
psql "$PGURL" -f db/seed.sql      # datos de ejemplo, se puede repetir
```

`db/seed.sql` es idempotente: cada vez que se corre, deja la base como estaba al
principio, con las fechas recalculadas para que siempre haya una reunión próxima
con la agenda abierta.

Al recargar el seed, las cuentas de Calcuta hay que volver a agregarlas como
inactivas — el seed sólo carga a los cuatro socios.
