# Los cambios que salieron de la reunión del 18 de agosto

> **Estado al 18/08: los 47 puntos están aplicados.** Falta enchufar dos cosas,
> que son cuentas y no código: la clave de Gemini en el Worker (bloque 8) y el
> `client_id` de Google Calendar (bloque 9). Mientras no estén, la app funciona
> igual: el botón de grabar no aparece y las reuniones no se agendan solas.
>
> **Antes de que esto llegue a los socios hay que correr la migración:**
>
> ```
> psql "$PGURL" -f db/migracion-2026-08-18.sql
> psql "$PGURL" -f db/rls.sql
> psql "$PGURL" -c "notify pgrst, 'reload schema';"
> ```
>
> El `rls.sql` no es opcional: el rol externo cambió las políticas de reuniones,
> temas, tareas y correos.

**Reunión:** martes 18/08/2026, 11:00, con Ariel Berinstein, Denise Zaga y
Francisco Lebermann. Era el repaso interno de lo que se había aplicado del 14, y
volvió con una tanda nueva. Safira no estuvo.

**Lo que ordena esta tanda:** la plataforma dejó de tener problemas de qué hace y
pasó a tenerlos de **cómo se lee**. Dos quejas de fondo, las dos de Ariel:

1. *"Entro y veo una sola sala"* — la información está encerrada por sala y
   obliga a andar cambiando de contexto para saber qué tenés.
2. *"Sigue gritando"* — todos los títulos pesan lo mismo, no hay jerarquía y la
   pantalla no dice a dónde mirar.

Son **47 puntos**. Están numerados corrido para poder decir "el 34". La mayoría
es interfaz; **el 15 toca el motor de visibilidad**, el **25 al 27** tocan
permisos y base, y los bloques **8 y 9** (grabación con IA y Google Calendar) son
desarrollo nuevo con una dependencia de afuera cada uno.

**Decisiones ya tomadas** (las pregunté y están cerradas):

| | Se decidió |
| --- | --- |
| Nombre de la columna del medio en el bloc | **Pendientes** |
| Selector de sala del sidebar | **Se saca.** Vive en el filtro de cada sección |
| Temas ya asignados | Se pueden **sacar de la reunión y volver a borrador** |
| Cerrar reunión que nunca se inició | **No.** Primero se inicia |
| Externos que proponen temas | **Sí**, en sus salas y con aprobación como ahora |
| El rol de externo, que toca la base | **Va en esta tanda** |
| Dónde vive la clave de la IA | **Cloudflare Workers** |
| Con qué se transcribe y resume | **Gemini**, que hace las dos cosas de una |

---

## 1 · El panel

**1. Sacar el atajo "Última minuta".** Ariel lo pidió por redundante: si querés
la última, entrás por Reuniones. Quedan tres y el grid pasa de cuatro columnas a
tres. → `src/pages/Panel.tsx:114`

**2. "Crear reunión" en rojo.** De los tres atajos, ése es el que hace algo: que
se lea como el botón especial y los otros dos como accesos. Es una variante nueva
del componente `Atajo`, no un color puesto a mano. → `src/components/ui.tsx:425`

**3. La próxima reunión, de todas las salas y en orden cronológico.** Hoy el
panel muestra sólo las de la sala activa. Pasa a mostrar lo que viene, venga de
donde venga, con el nombre de la sala a la vista. → `src/pages/Panel.tsx:49`

## 2 · El bloc de notas

El temario deja de llamarse temario. Ariel: es un bloc de notas y hay que
llamarlo así.

**4. Renombrar en toda la app.** Menú, título de pantalla, textos de ayuda, y la
ruta `/temario` pasa a `/bloc` con redirect para no romper links viejos.
→ `src/components/Layout.tsx:34`, `src/App.tsx:40`, `src/pages/Temario.tsx`

**5. Toggle columnas / lista**, con la elección recordada, igual que en Tareas.
Se reusa el patrón que ya existe en `src/pages/Compromisos.tsx:59` en vez de
inventar otro.

**6. Tres columnas.**

| Columna | Qué tiene |
| --- | --- |
| **Borradores** | Anotados y sin reunión. Lo que tirás al pasar |
| **Pendientes** | Fueron a una reunión y no se llegaron a hablar |
| **Asignados** | Ya están en la agenda de una reunión |

**7. Traer de vuelta los temas asignados.** Hoy, cuando asignás un tema,
desaparece del temario y no lo ves más desde ahí. La columna *Asignados* no
existe: hay que traer los temas propios que ya están en una agenda, cada uno
diciendo a qué reunión fue y cuándo es. → `src/pages/Temario.tsx:37`

**8. Distinguir los Pendientes a la vista.** Lo pidió Fran: que no se confundan
con las ideas nuevas aunque estén en columnas separadas. Un tratamiento distinto
—color de borde, o el motivo por el que volvieron siempre visible— para que la
diferencia se lea sin leer el encabezado de la columna.

**9. Asignar sin salir del bloc.** Hoy asignás un tema y la app te lleva a la
reunión. Se acordó que te quedes donde estabas: el tema se mueve a la columna
*Asignados* y listo, para poder despachar varios de una sentada.
→ `src/pages/Temario.tsx:198`

**10. Sacar un tema de la reunión y devolverlo a borrador,** desde la columna
*Asignados*. La acción ya existe para los que volvieron sin tratar
(`devolverAlTemario`), hay que exponerla también acá.

## 3 · Todas las salas, por defecto

Es el cambio de fondo de la tanda. Hoy la plataforma es *una sala por vez*; pasa
a ser *todo lo tuyo, y si querés filtrás*.

**11. Vista consolidada por defecto** en Panel, Reuniones, Tareas y Bloc: todo lo
de todas las salas de las que sos parte.

**12. Cada tarjeta dice de qué sala es.** Sin esto el punto 11 es un amontonadero.

**13. Filtro por sala en cada sección,** con "Todas" como opción por defecto.
Reuniones ya tiene un toggle parcial que arranca al revés (`soloEstaSala` en
`true`) y pasa a ser este selector. → `src/pages/Reuniones.tsx:42`

**14. El buscador de minutas busca en todas las salas** y cada resultado dice de
cuál viene. Lo pidió Denise. Hoy hereda el mismo filtro de sala que el resto.
→ `src/pages/Reuniones.tsx:56`

**15. El motor de visibilidad.** `compromisosVisibles` filtra hoy por una sola
sala; pasa a resolver todas mis salas y a exponer el filtro como estado de vista.
Es el punto del que dependen el 11, el 12 y el 13, y el que hay que hacer con
cuidado porque decide **quién ve qué**: las reglas de rol por sala no cambian,
sólo deja de haber una sala activa que recorta todo.
→ `src/store/AppContext.tsx:387`

**16. Sacar el selector de sala del sidebar.** Si ninguna vista depende de la
sala activa, el selector deja de tener sentido y sólo confunde. Lo que hoy usa la
sala activa como contexto para crear cosas —reunión nueva, tarea nueva— pasa a
preguntarlo en el formulario. → `src/components/Layout.tsx:111`

## 4 · Filtro de fechas

**17. Un filtro de fechas en Reuniones, Tareas y Bloc:** última semana, último
mes, próximo mes, y un rango a mano. Al lado del de sala, con el mismo aspecto en
las tres pantallas.

**18. Por defecto, de hoy en adelante.** El caso de uso es *abro la plataforma y
quiero ver lo que tengo por delante*, no la historia entera.

**19. Absorber los filtros de plazo que ya tiene Tareas** (*vencidos*, *esta
semana*) para no terminar con dos controles que hacen lo mismo.
→ `src/pages/Compromisos.tsx:272`

## 5 · El temario de la reunión

**20. Secciones colapsables:** *No se llegaron a hablar*, *De mi bloc de notas*,
*Esperando aprobación*, *Agenda* y *Rechazados*. Es mucha información de golpe y
casi siempre querés una sola. → `src/components/reunion/FasePre.tsx:154`

**21. Abre la agenda, el resto cerrado,** con el contador de cada bloque siempre
visible para saber si vale la pena abrirlo.

## 6 · Cierre y minuta

**22. "Cerrar y generar minuta" disponible durante toda la reunión en curso,** no
sólo al final del recorrido. Una reunión que nunca se inició no se cierra: para
eso está iniciarla. → `src/components/reunion/FaseVivo.tsx:120`

**23. Después de cerrar, un paso explícito de revisión.** Conclusiones y próximos
pasos se editan antes de que la minuta sea la definitiva. La edición ya existe;
lo que falta es que se lea como un paso y no como un campo más.
→ `src/components/reunion/FasePost.tsx:203`

**24. "Generar minuta" primero, descargar o enviar después.** Ariel lo comparó
con un comprobante del banco: primero lo generás, después decidís qué hacer con
él. Hoy descargar y enviar están al mismo nivel y compiten.

## 7 · Miembros y accesos

**25. El alta de personas sale del Superadmin.** Cada socio tiene que poder
cargar a los suyos —cada uno maneja proveedores distintos— sin depender de
nosotros. Hoy está en Admin y bloqueado por `esSuperadmin`; en Salas ya existe un
alta por correo que sirve de base. → `src/pages/Admin.tsx:76`, `src/pages/Salas.tsx:824`

**26. Rol de externo.** Ariel no lo quiso de sólo lectura: un proveedor recurrente
tiene que poder **proponer temas** en las salas donde está —con la misma
aprobación del organizador que rige hoy— y **ver las tareas que tiene a su
nombre**. Nada más: ni el resto de las tareas, ni las otras salas.

**27. Sumar a alguien de afuera del directorio al crear una sala,** y que el
directorio se actualice solo. Hoy la creación sólo elige entre gente ya cargada.
→ `src/pages/Salas.tsx:375`

**28. Login sólo con Google.** Denise propuso sumar usuario y contraseña; Ariel
argumentó en contra por el soporte que trae —recuperaciones, olvidos— y quedó
así. **No hay nada que hacer:** se anota para no reabrirlo.

## 8 · Grabación y resumen con IA

> **Lo que hay que saber antes:** la plataforma es sólo frontend y se publica en
> GitHub Pages. No hay servidor propio. Una clave de API puesta en el navegador
> queda a la vista de cualquiera que abra el bundle, así que **esto necesita un
> endpoint afuera**. Es el mismo patrón que ya está previsto para el correo con
> `VITE_EMAIL_ENDPOINT`, y se resuelve igual: se escribe la función, se deja en
> el repo y queda enchufar la clave.

**29. Un Cloudflare Worker en el repo,** que recibe el audio y devuelve
transcripción y resumen. Se despliega aparte —gratis en este volumen— y es lo
único que ve la clave. Gemini procesa audio directamente, así que transcribir y
resumir son una sola llamada.

**30. Grabar desde el navegador** con `MediaRecorder`, con un botón de grabación
en la reunión en curso y el estado siempre visible mientras corre. Captura el
micrófono del dispositivo: sirve para reunión presencial. Para una reunión por
Meet hay que grabar desde Meet, que es otro camino y depende del punto 9.

**31. Avisar que se está grabando,** a la vista de todos y registrado en la
minuta. No es un detalle de cortesía: grabar a alguien sin decírselo es un
problema, y la minuta sale por correo.

**32. Del audio a la minuta.** La transcripción alimenta un resumen que **propone**
—no impone— conclusión por tema y próximos pasos con responsable. Todo queda
editable antes de generar la minuta, que es el punto 23. La IA rellena el
borrador; la minuta la sigue firmando una persona.

**33. El audio no se guarda.** Se transcribe y se descarta. Quedan la
transcripción y el resumen, que son texto y entran en la base sin costo de
almacenamiento ni problema de privacidad.

**34. Apagado si no está configurado.** Sin la variable de entorno, el botón de
grabar no aparece y el resto de la app funciona igual, como pasa hoy con el
correo.

**A verificar cuando lo encaremos:** cuánto audio entra por pedido —una reunión
de una hora es un archivo grande y puede tener que subirse aparte antes de
procesarlo— y cuánto tiempo de ejecución tolera el Worker.

## 9 · Google Calendar

**35. Autorización desde el navegador.** Hay que verificar si el login de Google
que ya usa Neon Auth puede pedir también el permiso de calendario y darnos el
token; si no lo expone, se hace un consentimiento aparte con Google Identity
Services. Cualquiera de los dos funciona sin servidor propio: sólo hace falta un
`client_id` y declarar el dominio.

**36. Crear la reunión en Google Calendar** cuando se crea en la plataforma, con
título, fecha, duración, lugar y los participantes invitados.

**37. Mantenerlo sincronizado:** si se cambia la fecha o se cancela, el evento
acompaña. Sin esto la integración es peor que no tenerla.

**38. Link de Meet en el evento,** y visible desde la reunión en la plataforma.

**39. Apagado si no está configurado,** igual que el 34.

## 10 · Jerarquía visual

Ariel lo volvió a mencionar y tiene razón. El diagnóstico, mirando el código:

- **71 usos de `uppercase`.** Títulos, botones, chips, etiquetas: casi todo el
  texto de interfaz está en mayúsculas y con el tracking abierto. Las mayúsculas
  se leen más lento y, puestas en todos lados, dejan de destacar y sólo cansan.
- **Dos niveles de título y nada en el medio.** Está `.display` —Almarai 800,
  mayúsculas, 30 px— y está `.subtitulo`, que es texto de 14 px con una línea
  abajo. Un título de sección y un párrafo pesan casi lo mismo.
- **`.display` se usa para el título de pantalla y también para cada sección
  interior.** El comentario del código ya avisa que puesto cinco veces "deja de
  ordenar y grita", pero el componente `Seccion` lo usa igual.
- **El rojo perdió significado.** Es el color de todos los botones sólidos, así
  que ya no distingue lo importante de lo común.

La propuesta, para discutir:

**40. `.display` sólo para el título de pantalla.** Uno por página.

**41. Un nivel de sección nuevo,** en caja mixta —no mayúsculas—, con peso pero
sin el tamaño del titular. Es el escalón que hoy no existe.

**42. Botones en caja mixta.** Mantienen el peso y pierden las mayúsculas y el
tracking abierto. Es el cambio que más baja el volumen general.

**43. Una escala tipográfica explícita** de cinco pasos, del titular a la
etiqueta, y que nadie ponga tamaños a mano fuera de ella.

**44. Usar el gris.** Están definidos `suave` y `tenue` y casi todo se dibuja en
tinta plena. Fechas, autores, contadores y metadatos van en gris: sin tocar un
tamaño, la pantalla se ordena sola.

**45. Reservar el rojo** para la acción principal de cada pantalla —una— y para
lo vencido. El resto de los botones sólidos pasan a tinta.

**46. Más aire y menos borde.** Hoy cada tarjeta tiene su marco de 1 px y el
conjunto se lee como una grilla de casillas. Más espacio entre bloques y borde
sólo donde separa de verdad.

**47. Mantener las mayúsculas donde sí funcionan:** el `[ KICKER ]` de la marca y
los chips de estado, que son de dos palabras y ahí sí ordenan.

---

## Lo que queda para después

- **Calcuta.** Una vez que esto esté cerrado en Imporbamas, se adapta. Ariel la
  quiere andando para el equipo interno (Digital Lab) como piloto.
- **El nombre.** Denise tiró "Minit". Siguen las propuestas por el grupo de
  WhatsApp.
- **Lucky Tours.** La página para la verificación no es de esta plataforma.

## Orden sugerido

1. **Panel y bloc de notas** (1 a 10). Es lo que más se ve y no depende de nada.
2. **Todas las salas y fechas** (11 a 19), empezando por el 15, que es el que
   habilita al resto.
3. **Reunión, cierre y minuta** (20 a 24).
4. **Miembros y accesos** (25 a 27). Toca permisos: va sobre base ya migrada.
5. **Jerarquía visual** (40 a 47), al final y de una sola pasada, para no
   rehacerlo sobre pantallas que todavía están cambiando.
6. **IA y Calendar** (29 a 39), en paralelo a lo anterior: son piezas nuevas y no
   se pisan con el resto.
