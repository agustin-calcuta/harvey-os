# La plantilla de EmailJS

Cinco minutos, una sola vez. Lo que sigue es exactamente lo que hay
que cargar en [dashboard.emailjs.com](https://dashboard.emailjs.com).

---

## Por qué la plantilla es de una sola línea

La aplicación **arma el correo entero** —con los colores, la
tipografía y el logotipo de la marca que se esté compilando— y se lo
pasa a EmailJS ya listo, en la variable `html`.

Si el diseño viviera en EmailJS habría dos lugares donde cambiar los
colores, y el de EmailJS sería el que nadie se acuerda de actualizar:
Imporbamas y Calcuta mandarían correos idénticos aunque las
aplicaciones se vean distintas. Así, la plantilla sólo transporta.

---

## 1. Crear la plantilla

**Email Templates → Create New Template.**

En la solapa **Content**, apretar `{ }` (Code Editor) y **borrar todo
lo que venga de ejemplo**. Dejar exactamente esto:

```
{{{html}}}
```

> Son **tres** llaves, no dos. Con dos, EmailJS escapa el contenido y
> el correo llega con las etiquetas HTML a la vista, ilegible. Con
> tres lo inserta tal cual.

---

## 2. Los campos de arriba

| Campo | Qué poner |
| --- | --- |
| **Subject** | `{{subject}}` |
| **To Email** | `{{to_email}}` |
| **To Name** | `{{to_name}}` |
| **From Name** | `Calcuta` |
| **Reply To** | la casilla que quieran que conteste la gente |

El asunto lo compone la aplicación —«Minuta de reunión · Digital Lab
· #12»—, así que no hay que escribir nada ahí.

---

## 3. El Template ID

Guardar y copiar el **Template ID** que queda arriba (algo como
`template_a1b2c3d`). Ese valor va como secret del repositorio:

```bash
gh secret set CALCUTA_VITE_EMAILJS_TEMPLATE_ID --repo agustin-calcuta/harvey-os
```

Los otros dos ya están cargados: el `service_7mncc5y` y la clave
pública.

---

## 4. Probar sin cerrar una reunión de verdad

Entrando como Ariel o Denise —los que ven **Administración**— hay un
botón de **prueba de envío** que manda un correo a la casilla propia.
Es la forma de saber si quedó bien conectado sin tener que armar una
reunión entera.

Si llega con las etiquetas `<div style=…>` a la vista, es que la
plantilla quedó con dos llaves en vez de tres.

---

## Lo que va a recibir cada uno

Un correo por persona, con el saludo por su nombre:

> **Hola Denise:** cerramos *Digital Lab · #12* en *Digital Lab* del
> lunes 24 de agosto.
>
> **[ Ver la minuta completa ]**
>
> Las conclusiones, el desarrollo tema por tema y las tareas con
> responsable y fecha.

El botón está arriba y no al final, para no obligar a bajar ocho
pantallas de tabla en el teléfono. Y la minuta completa va igual en
el cuerpo: mucha gente lee el correo y no entra a la aplicación, y
eso es lo que hace que la reunión quede registrada aunque no abran
nada.
