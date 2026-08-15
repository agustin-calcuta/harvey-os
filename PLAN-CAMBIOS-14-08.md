# Los cambios que salieron de la reunión del 14 de agosto

> **Estado al 15/08: hecho, migrado y publicado.** Está todo salvo los puntos
> **19 (Google Calendar)** y **40 (grabación con IA)**, que quedaron para después
> de la revisión del martes. La base se migró y la plataforma está en línea.
>
> Sobre las cuatro dudas de más abajo: **(a)** el tiempo estimado salió del
> formulario de proponer y quedó en la agenda, para el socio; **(b)** el temario
> personal se hizo completo; **(c)** y **(d)** siguen pendientes.
>
> Después de aplicarlo salieron tres ajustes más, ya aplicados: los perfiles
> pasaron a llamarse **socio** y **miembro**, con el borrado reservado al socio;
> **Tareas abre siempre con las propias**; y se bajó el ruido visual de las
> pantallas de reunión. La cuenta nuestra figura como **Superadmin**.

**Reunión:** viernes 14/08/2026, con Ariel Berinstein, Denise Zaga y Francisco
Lebermann. Ariel venía de mostrarle la plataforma a los cuatro socios de Harvey,
así que buena parte de esto son pedidos de ellos, no nuestros.

**El calendario que se acordó ahí:**

| Cuándo | Qué |
| --- | --- |
| **Martes 18, 11:00** | Repaso interno con Ariel, Denise y Fran sobre lo ya cambiado. *(Denise iba a confirmar si se corre a 12:00/12:30 por Safira.)* |
| **Jueves 20 o viernes 21** | Presentación a Mati y Nanu. Fran la agenda por el grupo. |

**La frase que ordena todo lo demás**, de Ariel: *"tenemos que hacer sistemas
acorde a lo que necesitan"*. Nada de alertas, plazos ni estados de más. Todo lo
que se pueda sacar, se saca.

Son **62 puntos**. La enorme mayoría es interfaz y nombres; hay ocho que tocan el
modelo de datos y las políticas de la base, y tres que dependen de algo de
afuera. Están numerados para poder decir "el 34" el martes.

---

## Lo que hay que resolver antes de programarlo

Cuatro cosas quedaron con dos respuestas distintas en la misma reunión. Las
resuelvo como digo acá salvo que se indique otra cosa, pero conviene confirmarlas
el martes temprano porque tres de ellas cambian el trabajo de fondo.

**a) El tiempo estimado por tema.** En los próximos pasos quedó *"eliminar el
tiempo asignado estimado durante la propuesta de temas"*, pero en el cuerpo de la
charla Denise defendió que ayuda a estructurar y Ariel aceptó que quedara como
recurso. **Lo hago así:** desaparece del formulario con que cualquiera propone un
tema (punto 27), el organizador puede asignarlo desde la agenda si quiere, y el
cronómetro en vivo queda igual. Nadie pierde nada y el que propone carga dos
campos menos.

**b) El temario personal (puntos 21-23).** Que el temario sea *"un bloc de notas
que ni siquiera está dentro de socios, está dentro de mi perfil"* significa que
un tema deja de pertenecer a una sala hasta que se asigna a una reunión. Es el
único cambio de modelo grande de la lista: toca la tabla, la restricción que hoy
obliga a que todo tema tenga sala, y cuatro políticas de seguridad. **Vale la
pena hacerlo** —es lo que pidieron Ariel y Fran juntos— pero es medio día, no una
tarde de retoques.

**c) La grabación con IA (punto 40).** Hoy la aplicación no tiene servidor: habla
directo con la base desde el navegador. Transcribir audio necesita una clave de
un servicio de transcripción, y una clave en el navegador es una clave pública.
**Hay que elegir entre tres caminos** y ninguno es gratis en tiempo:

1. **Subir la transcripción de Meet** (lo que propuso el propio Ariel). El
   organizador pega el texto y la IA arma conclusiones y tareas. Es lo único
   que se puede tener para el jueves.
2. **Grabar en el navegador y transcribir después**, con una función chica
   nuestra en el medio para no exponer la clave. Dos o tres días.
3. **Grabación en vivo con transcripción continua.** Semanas, y hay que hablar
   de costo por hora de audio y de dónde queda guardado ese audio.

Recomiendo mostrar el **1** el jueves y ofrecer el **2** como el paso siguiente.

**d) Google Calendar (punto 19).** Requiere registrar una aplicación propia en
Google Cloud, que es lo mismo que hace falta para que la pantalla de acceso deje
de decir "neon.tech". Se hacen las dos de una o ninguna. No llega para el martes.

---

## 1. Panel de inicio

> *"Yo veo esta home y tiene mucha información... no sé a dónde tienen que mirar
> mis ojos."* — Ariel

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 1 | Sacar el bloque **Pendientes de otras reuniones**: son tareas de otra gente y ensucian. | `src/pages/Panel.tsx` |
| 2 | Sacar **Últimas reuniones** del panel; eso vive en el historial. | `src/pages/Panel.tsx` |
| 3 | Arreglar la jerarquía: hoy "Próxima reunión" y "Lo que viene" tienen el mismo peso y dicen lo mismo. Un solo título grande y el resto en segundo plano. | `src/pages/Panel.tsx` |
| 4 | Sumar arriba de todo una fila de **accesos directos**: Proponer tema · Crear reunión · Ver minutas · Descargar minuta. | `src/pages/Panel.tsx` |
| 5 | Dejar sólo tres datos: mi próxima reunión, cuántos temas tengo yo cargados, cuántos tiene mi equipo. | `src/pages/Panel.tsx` |

*Denise propuso indicadores clicables de tareas (vencidas, vencen esta semana).
Ariel lo bajó en el momento: la herramienta es de reuniones, no de tareas. Queda
anotado por si vuelve.*

---

## 2. Reuniones: próximas e historial

> *"Imaginate que cuando pasen 52 semanas, ¿qué van a tener acá? 52 reuniones
> listadas. Es una locura."* — Ariel

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 6 | Partir la sección en dos: **Próximas reuniones** e **Historial**. Se van los filtros por estado como forma principal de navegar. | `src/pages/Reuniones.tsx` |
| 7 | En Próximas, mostrar **sólo la próxima de cada sala**. Si la de socios es semanal, se ve la 17, no la 18 a la 22. | `src/pages/Reuniones.tsx` |
| 8 | Historial: lista cronológica completa —"como un extracto bancario"— filtrable por sala. | `src/pages/Reuniones.tsx` |
| 9 | **Buscador con lupa en el historial**: una palabra clave y trae todas las minutas que la contienen. Pedido explícito de los socios. Busca en título, temas, conclusiones y tareas. | `src/pages/Reuniones.tsx`, `src/store/repoNeon.ts` |
| 10 | Achicar las tarjetas: *"está muy grande, me grita"*. | `src/pages/Reuniones.tsx` |
| 11 | Sacar el estado **Borrador**. Si la reunión existe, la agenda está abierta. Cinco estados es demasiado. | `src/types.ts`, `db/schema.sql` |
| 12 | **Sacar el cierre obligatorio del temario por plazo.** Cierra el organizador cuando quiere, y se puede sumar un tema de último momento aunque ya esté cerrado. *"No puedo ser tan burocrático."* | `src/components/reunion/FasePre.tsx`, `src/store/AppContext.tsx` |

---

## 3. Crear una reunión

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 13 | **Participantes desmarcados por defecto.** Ariel cargó una reunión creyendo que marcaba y terminó con cero participantes. | `src/pages/Reuniones.tsx` |
| 14 | Un **+ para sumar a alguien que no es de la sala**. Pedido de Denise: *"nunca lo dejo tan estricto"*. Toca las políticas de la base: hoy sólo ve la reunión quien es miembro de la sala. | `src/pages/Reuniones.tsx`, `db/rls.sql` |
| 15 | **Lugar como desplegable**: Fábrica · Local Palermo · Meet · **Otro**, y Otro abre un campo de texto. Los valores salen de la sala. | `src/pages/Reuniones.tsx`, `src/types.ts` |
| 16 | Renombrar el botón **"Crear y abrir agenda" → "Crear reunión"**. | `src/pages/Reuniones.tsx` |
| 17 | Preguntar si la reunión es **recurrente o por única vez** (esto sale de la sala y pasa acá). | `src/pages/Reuniones.tsx`, `db/schema.sql` |
| 18 | **Reunión privada**, que no aparezca en el listado de la sala. El caso que trajo Fran: alguien de comunicación se junta con Lucas a pedir un aumento. Hoy `salaId` es obligatorio. | `db/schema.sql`, `db/rls.sql` |
| 19 | **Invitación por Google Calendar.** Depende de registrar la aplicación en Google Cloud — ver la advertencia (d) más arriba. | nuevo |

---

## 4. Temario: el bloc de notas personal

> *"Que el temario sea algo que ni siquiera está dentro de socios, está dentro de
> mi perfil, y yo veo si este tema lo llevo a diseño, a socios o a marketing."*
> — Ariel

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 20 | El temario pasa a ser **personal**: cada uno ve solamente los temas que cargó. *"A vos no te interesa ver el temario que yo quiero cargar"* (Fran). | `src/pages/Temario.tsx`, `db/rls.sql` |
| 21 | Un tema del temario **no pertenece a ninguna sala** hasta que se asigna. Desde el bloc elijo a cuál de mis próximas reuniones lo mando, sea de la sala que sea. | `src/types.ts`, `db/schema.sql`, `src/store/AppContext.tsx` |
| 22 | Al asignarlo, **desaparece del temario**. *"Si no, esto va a ser eterno, va a tener 10 millones de notas."* | `src/store/AppContext.tsx` |
| 23 | Renombrar **"Banco de socios" / "banco"** por **"Temas pendientes"**. Banco es palabra nuestra. | todos los `.tsx` |
| 24 | Separar dos cosas que hoy se mezclan: los temas que anoté sin fecha, y los **temas que quedaron sin tratar** en una reunión. Son dos listas distintas con dos nombres distintos. | `src/pages/Temario.tsx`, `src/components/reunion/FasePre.tsx` |
| 25 | Los temas que no se llegaron a hablar **vuelven al temario de quien los propuso**, no a un pozo común (pedido de Fran, dos veces). | `src/store/AppContext.tsx` |
| 26 | Cambiar **"Traer" por "Incluir"** al bajar un tema a una reunión. | `src/components/reunion/FasePre.tsx` |
| 27 | **Sacar el tiempo estimado del formulario de proponer tema.** Ver la advertencia (a). | `src/components/reunion/ModalTema.tsx` |
| 28 | Renombrar el campo **"Contexto" → "Detalle"**, en todos los formularios. | `src/components/reunion/ModalTema.tsx` |
| 29 | **No bloquear la carga de un tema** porque no entra en la duración prevista. *"Después es un tema del líder de la reunión."* | `src/components/reunion/ModalTema.tsx` |

---

## 5. Antes de la reunión

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 30 | **"Cerrar temario y notificar" flotante**, siempre visible. *"Tiene que estar flotante siempre, es el típico submit"* (Denise). | `src/components/reunion/FasePre.tsx`, `src/components/ui.tsx` |
| 31 | Al cerrar, una **casilla para elegir si se notifica o no**. | `src/components/reunion/FasePre.tsx` |
| 32 | Hacer evidente que la agenda **se reordena arrastrando**: está hecho y Ariel no lo vio. | `src/components/reunion/FasePre.tsx` |

---

## 6. Durante la reunión

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 33 | **Seguimiento como primer bloque de toda reunión**: las tareas que quedaron de reuniones anteriores, con su responsable, y se cambia el estado ahí mismo. *"Debería ser el primer tema de la reunión."* Es el pedido más de fondo de esta sección. | `src/components/reunion/FaseVivo.tsx` |
| 34 | Renombrar **"Pendientes anteriores" → "Seguimiento"**, y adentro separar **tareas** de **temas que no se hablaron**: hoy están mezclados y confunden. | `src/components/reunion/FaseVivo.tsx` |
| 35 | Todos los temas visibles como tarjetas para **saltar al que se quiera**, sin orden impuesto. | `src/components/reunion/FaseVivo.tsx` |
| 36 | El botón de **tareas con mucho más protagonismo** que "¿Qué se decidió?". *"Lo más importante es ir poniendo compromisos."* | `src/components/reunion/FaseVivo.tsx` |
| 37 | El cronómetro pasa a ser **un relojito al costado**; hoy se come el encabezado (Denise). | `src/components/reunion/FaseVivo.tsx` |
| 38 | Renombrar **"Arrancar" → "Iniciar"**. | `src/components/reunion/FaseVivo.tsx` |
| 39 | Dejar claro que Iniciar arranca **el cronómetro del tema**, no una grabación: Denise preguntó justo eso. | `src/components/reunion/FaseVivo.tsx` |
| 40 | **Grabación y IA**: conclusiones y tareas autocompletadas, que el organizador valida y edita. Ver la advertencia (c) — hay que elegir camino. | nuevo |

---

## 7. Estados de las tareas

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 41 | **Sacar "Bloqueado".** Quedan Pendiente · En curso · Hecho. *"O lo tengo pendiente y no lo pude hacer, o ya lo terminé."* Lo bloqueado se cuenta en el avance de la tarea en curso. Hay que migrar lo que hoy está bloqueado. | `src/types.ts`, `db/schema.sql`, `src/pages/Compromisos.tsx` |

---

## 8. La minuta

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 42 | Renombrar **"Cerrar reunión y enviar minuta" → "Cerrar y generar minuta"**. Ariel lo apretó creyendo que la minuta ya estaba escrita. | `src/components/reunion/FasePost.tsx` |
| 43 | El título de la pantalla tiene que decir **"Generación de minuta"**, para que se entienda que es un paso de trabajo. | `src/components/reunion/FasePost.tsx` |
| 44 | **Sacar de la minuta el bloque "Pendientes de reuniones anteriores"** como sección propia: *"esto tiene que volar todo, confunde"*. Si un tema viejo se habló, entra como un tema más. | `src/components/reunion/FasePost.tsx`, `src/lib/pdf.ts` |
| 45 | Una sola caja final, **"Próximos pasos"**, con las tareas nuevas y las que venían de antes sin terminar; se pueden diferenciar adentro, pero es una sola sección. | `src/components/reunion/FasePost.tsx`, `src/lib/pdf.ts` |
| 46 | **"Cerrar minuta y enviar" flotante** o al final del recorrido. | `src/components/reunion/FasePost.tsx` |
| 47 | **Obligar a pasar por todos los apartados antes de habilitar descargar o enviar.** *"Como un supermercado que te obliga a pasar por todo."* | `src/components/reunion/FasePost.tsx` |

---

## 9. Tareas (hoy "Compromisos")

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 48 | **Reemplazar "compromiso" por "tarea" en toda la plataforma**: menú, títulos, formularios, correos y PDF. Son 284 apariciones en el código. | todo `src/` |
| 49 | Un miembro **no ve el filtro "todos los responsables"**: ve sólo lo suyo. El filtro queda para quien organiza. | `src/pages/Compromisos.tsx` |
| 50 | Limpiar la vista, que también tiene demasiada información. | `src/pages/Compromisos.tsx` |
| 51 | Integrar con el gestor de tareas que ya usan. **No es trabajo para ahora**: Ariel primero se reúne con ellos para verlo. Su lectura es que si esto queda bien, dejan el otro. | — |

---

## 10. Salas

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 52 | **Sólo los cuatro socios crean salas.** Todos pueden crear reuniones. El botón "Nueva sala" no aparece para el resto. | `src/pages/Salas.tsx`, `db/rls.sql` |
| 53 | Dentro de una sala sin reuniones tiene que aparecer **"Crear reunión"**. | `src/pages/Salas.tsx` |
| 54 | **Simplificar el alta de sala**: nombre, descripción breve, cadencia y a quién sumar. Se van duración de reunión, duración de tema, cierre de temario y lugar —eso se define al crear cada reunión—. | `src/pages/Salas.tsx`, `src/types.ts` |
| 55 | Renombrar **"Solicitudes" → "Pendientes de autorización"**: *"pedidos no se entiende"*. | `src/pages/Salas.tsx` |
| 56 | **Sumarse a una reunión suelta, no a la sala.** *"Si me sumo a la sala de marketing tengo acceso a todas sus minutas."* Hoy el flujo pide entrar a la sala entera; hay que separarlo. | `src/pages/Salas.tsx`, `db/rls.sql` |
| 57 | **Perfil de super administrador** que vea todas las salas y pueda cerrarlas y configurarlas. Hoy existe para nosotros; mañana Mati tiene que poder entrar con su usuario normal y además pasar a super admin, sin mezclar las dos vistas. | `src/pages/Admin.tsx`, `db/rls.sql` |

---

## 11. Correos

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 58 | **Sacar la solapa Correos de producción.** *"La vi en modo organizador y me volvió loco."* Se saca del menú, no del código: los correos se siguen registrando y quedan visibles en Administración. | `src/components/Layout.tsx`, `src/App.tsx` |

---

## 12. Marca

| # | Qué hay que hacer | Dónde |
| --- | --- | --- |
| 59 | **Reemplazar Harvey por Imporbamas en toda la plataforma**: barra lateral, pestaña del navegador, pantalla de acceso, PDF y correos. Van a usarla para todas sus sociedades, no sólo para Harvey. | `src/components/Layout.tsx`, `index.html`, `src/lib/pdf.ts`, `src/lib/email.ts` |
| 60 | **Falta que manden el logo** en SVG o PNG. Sin eso queda el wordmark tipográfico con el nombre nuevo. Y confirmar la grafía: en la minuta aparece "Imporbamas" y "Imporbamas". | — |

---

## 13. Accesibilidad y sentido común

No lo pidieron con ese nombre, pero es la mitad de lo que dijeron. Lo hago junto
con cada pantalla, no como tarea aparte.

| # | Qué hay que hacer |
| --- | --- |
| 61 | **Jerarquía real de títulos.** Hoy todo compite: hay que usar niveles de encabezado de verdad, no sólo tamaños distintos, para que se entienda de un vistazo y para que un lector de pantalla lo recorra bien. Es literal lo que describió Ariel: *"los títulos están todos con la misma jerarquía de lectura"*. |
| 62 | **Botones flotantes accesibles** (puntos 30 y 46): que no tapen contenido en el teléfono, que se alcancen con el teclado y que digan qué hacen. Lo mismo para la lupa del buscador, que necesita un texto que la nombre. Y los nombres de estado tienen que decir qué son —"Borrador" no le dijo nada a nadie—. |

---

## Plan de trabajo

### Bloque 1 — hasta el martes 18 a la mañana

Todo lo que se ve y se toca. Es lo que se muestra en el repaso interno.

**Sábado 15 y domingo 16**

1. **Nombres y limpieza** (puntos 16, 23, 26, 28, 38, 42, 43, 48, 55, 58, 59).
   Es mecánico, es lo que más se nota y saca de encima la mitad de la lista.
2. **Panel** (1 a 5).
3. **Reuniones: próximas / historial + buscador** (6 a 12).

**Domingo 16 y lunes 17**

4. **Crear reunión** (13, 15, 16, 17) — el invitado externo (14) y la reunión
   privada (18) van con el bloque de base.
5. **Temario personal** (20 a 22, 24, 25, 27, 29). Acá va el cambio de tabla y
   de políticas.
6. **Reunión en vivo** (33 a 39), con el seguimiento como primer bloque.
7. **Minuta** (44 a 47).
8. **Tareas y salas** (41, 49, 50, 52, 53, 54).

**Lunes 17 a la tarde**

9. Base y políticas: los estados de tarea (41), el invitado externo (14), la
   reunión privada (18), sumarse a una reunión (56), quién crea salas (52).
10. Probar de verdad con dos cuentas distintas —las políticas no se pueden
    simular con `set local`, está anotado en ESTADO.md— y publicar.

**Martes 18, 11:00** — repaso con Ariel, Denise y Fran. Llevar anotado qué quedó
afuera y por qué.

### Bloque 2 — miércoles 19 y jueves 20

11. Lo que salga del repaso del martes, que va a salir.
12. **Grabación e IA** (40), por el camino que se elija el martes.
13. **Super admin** (57).
14. **Google Calendar** (19) junto con la aplicación propia de Google Cloud, si
    hay lugar. Si no, se muestra el jueves como lo que viene.
15. El logo (59, 60) en cuanto llegue: media hora.

### Después de la presentación

16. Integración con el gestor de tareas del cliente (51), después de que Ariel se
    reúna con ellos.
17. Chat con IA sobre las minutas: lo pidieron y Ariel mismo lo postergó.
18. Conectar la casilla de correo, que sigue pendiente de ESTADO.md y no salió en
    esta reunión.

---

## Lo que no depende de nosotros

- **Ariel** coordina la reunión con los socios para ver su gestor de tareas.
- **Fran** escribe al grupo para agendar con Mati y Nanu el jueves 20 o viernes 21.
- **Ellos** tienen que mandar el logo de Imporbamas y confirmar cómo se escribe.
- **Denise** confirmaba el horario del martes por si se corría por Safira.

---

## Una cosa para tener presente

Ariel cerró diciendo que esto lo ve más allá de Harvey: que le serviría a Safira
y a Pink, y que se podría comercializar. Vale para decidir: cada vez que haya que
elegir entre resolverlo a medida de Harvey o resolverlo bien, conviene lo
segundo. El lugar como desplegable (15), el temario personal (21) y el super
admin (57) son justo esos casos.
