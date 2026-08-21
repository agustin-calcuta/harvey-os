-- ─────────────────────────────────────────────────────────────
-- Imporbamas — estado inicial
--
-- Esto ya NO es una demostración. Hasta acá el archivo cargaba
-- cuatro apellidos Harvey, dos equipos con su gente y una agenda
-- armada: servían para mostrar la herramienta antes de que
-- existiera el equipo. Ahora el equipo existe, y esos datos
-- estorban —nadie sabe cuál de las tareas que ve es suya—.
--
-- Queda lo único que no tiene sentido pedirle a nadie que tipee la
-- primera vez: las cuatro personas y la sala donde se reúnen.
--
-- ⚠️ ARRANCA CON `truncate`: borra TODO lo que haya en la base,
-- incluido lo que el equipo haya cargado. Es a propósito —esta
-- corrida es justamente para sacar los datos de muestra—, pero
-- correrlo de nuevo dentro de un mes borra el trabajo de un mes.
-- Después de esta vez, para tocar algo va un `update` a mano.
--
-- ── Los correos ───────────────────────────────────────────────
-- Van vacíos. El acceso con Google está apagado en esta instancia
-- (`usaCorreo` y `accesoGoogle` en `src/marca/imporbamas.ts`), y un
-- correo inventado no es un dato incompleto sino uno equivocado: el
-- día que se encienda el acceso deja afuera justo a la persona que
-- figura con él. Se completan desde Administración, o con un
-- `update public.usuarios set email = ... where id = ...`.
-- ─────────────────────────────────────────────────────────────

begin;

truncate table public.comentarios, public.notificaciones, public.compromisos,
               public.temas, public.reuniones, public.solicitudes,
               public.membresias, public.salas, public.clientes,
               public.usuarios, public.config restart identity cascade;

/* ── Personas ─────────────────────────────────────────────── */

-- Los cuatro a la par: todos abren salas, moderan y administran el
-- equipo. `superadmin` es lo que deja dar de alta y de baja gente
-- sin depender de nosotros; también les hace ver todas las salas,
-- que con cuatro personas y una sala no molesta.
insert into public.usuarios (id, nombre, email, alcance, "puedeCrearSalas", cargo, activo, "creadoEn") values
  ('u_nico',   'Nicolas Kroitor',    '', 'superadmin', true, 'Socio', true, now()),
  ('u_matias', 'Matias Kroitor',     '', 'superadmin', true, 'Socio', true, now()),
  ('u_lucas',  'Lucas Finkelstein',  '', 'superadmin', true, 'Socio', true, now()),
  ('u_hernan', 'Hernan Finkelstein', '', 'superadmin', true, 'Socio', true, now());

/* ── Salas ────────────────────────────────────────────────── */

insert into public.salas
  (id, nombre, descripcion, cadencia, "horasCierreAgenda", "cierreManual",
   "duracionReunionDefaultMin", "duracionTemaDefaultMin",
   "creadaPor", "creadaEn", archivada)
values
  ('sala_socios', 'Socios', 'La reunión de los cuatro. Acá están todos a la par.',
   'Lunes 10:00', 24, true, 60, 15, 'u_nico', now(), false);

/* ── Membresías ───────────────────────────────────────────── */

insert into public.membresias (id, "salaId", "usuarioId", rol, desde) values
  ('mb_s_nico',   'sala_socios', 'u_nico',   'organizador', now()),
  ('mb_s_matias', 'sala_socios', 'u_matias', 'organizador', now()),
  ('mb_s_lucas',  'sala_socios', 'u_lucas',  'organizador', now()),
  ('mb_s_hernan', 'sala_socios', 'u_hernan', 'organizador', now());

/* ── Configuración ────────────────────────────────────────── */

-- Sin casilla propia todavía: los avisos automáticos van apagados.
insert into public.config (id, organizacion, "emailsActivos")
values ('global', 'Imporbamas', false);

commit;
