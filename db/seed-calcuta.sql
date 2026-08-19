-- ─────────────────────────────────────────────────────────────
-- Calcuta — estado inicial
--
-- Esto NO es una demostración: es la instancia con la que el equipo
-- empieza a trabajar. Por eso carga sólo lo que no tiene sentido
-- pedirle a nadie que tipee la primera vez —las cuatro salas y
-- quién es quién— y ninguna reunión, tema ni tarea de ejemplo.
--
-- ── Diferencia importante con seed-imporbamas.sql ─────────────
-- Aquel arranca con `truncate`: es de demostración y volver a
-- correrlo restablece los datos de muestra. Éste NO borra nada.
--
-- Cada `insert` lleva `on conflict (id) do nothing`, así que se
-- puede correr de nuevo sin riesgo: si el equipo ya cargó reuniones
-- de verdad, siguen ahí. Un `truncate` acá sería una forma muy
-- rápida de perder el trabajo de un mes.
--
-- ── Quién puede qué ───────────────────────────────────────────
-- Todos abren salas, crean reuniones, proponen temas y se asignan
-- tareas. Ariel y Denise además administran: dan de alta y de baja
-- cuentas. Eso es `alcance = 'superadmin'`, que también les deja
-- ver todas las salas.
--
-- ⚠️ ANTES DE CORRER: confirmar los cinco correos contra el
-- Workspace. El acceso es con Google y compara por correo, así que
-- uno mal escrito es una persona que no puede entrar —y el error
-- recién se ve cuando lo intenta—.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Personas ─────────────────────────────────────────────── */

insert into public.usuarios (id, nombre, email, alcance, "puedeCrearSalas", cargo, activo, "creadoEn") values
  ('u_ariel',     'Ariel Berinstein',     'ariel@calcutaconsulting.com',      'superadmin', true, 'Socio',       true, now()),
  ('u_denise',    'Denise Zaga',    'denise@calcutaconsulting.com',     'superadmin', true, 'Socia',       true, now()),
  ('u_agustin',   'Agustín Ducculi',   'agustin@calcutaconsulting.com',    'usuario',    true, 'Digital Lab', true, now()),
  ('u_francisco', 'Francisco Lebermann', 'francisco@calcutaconsulting.com',  'usuario',    true, 'Digital Lab', true, now()),
  -- Casilla del área, no personal: es la que dieron para Lucas.
  ('u_lucas',     'Lucas',     'digitallab@calcutaconsulting.com', 'usuario',    true, 'Digital Lab', true, now())
on conflict (id) do nothing;

/* ── Salas ────────────────────────────────────────────────── */

insert into public.salas
  (id, nombre, descripcion, cadencia, "horasCierreAgenda", "cierreManual",
   "duracionReunionDefaultMin", "duracionTemaDefaultMin", "lugarHabitual", lugares,
   "creadaPor", "creadaEn", archivada)
values
  ('sala_digital_lab','Digital Lab','El equipo de producto y desarrollo.',
   'Lunes 10:00', 24, true, 60, 15, 'Meet',
   array['Meet','Oficina'], 'u_ariel', now(), false),

  ('sala_general','General','Todo el estudio: novedades, calendario y lo que cruza a los equipos.',
   'Primer lunes de cada mes', 48, true, 45, 10, 'Oficina',
   array['Oficina','Meet'], 'u_ariel', now(), false),

  ('sala_comercial','Comercial','Pipeline, propuestas en curso y renovaciones.',
   'Miércoles 09:30', 24, true, 45, 15, 'Meet',
   array['Meet','Oficina'], 'u_denise', now(), false),

  ('sala_socios','Socios','La reunión de dirección. Acá están todos a la par.',
   'Viernes 16:00', 24, true, 90, 20, 'Oficina',
   array['Oficina','Meet'], 'u_ariel', now(), false)
on conflict (id) do nothing;

/* ── Membresías ───────────────────────────────────────────── */

-- Todos entran como `organizador` a las salas donde trabajan.
--
-- Si el equipo entrara como `miembro`, cada tema que propusieran
-- quedaría esperando aprobación de un socio antes de entrar al
-- temario. No es lo que se pidió: la única diferencia de Ariel y
-- Denise es el alta de cuentas, no el temario de los demás.
insert into public.membresias (id, "salaId", "usuarioId", rol, desde) values
  -- Digital Lab: el equipo entero.
  ('mb_lab_ariel',     'sala_digital_lab', 'u_ariel',     'organizador', now()),
  ('mb_lab_denise',    'sala_digital_lab', 'u_denise',    'organizador', now()),
  ('mb_lab_agustin',   'sala_digital_lab', 'u_agustin',   'organizador', now()),
  ('mb_lab_francisco', 'sala_digital_lab', 'u_francisco', 'organizador', now()),
  ('mb_lab_lucas',     'sala_digital_lab', 'u_lucas',     'organizador', now()),

  -- General: está todo el estudio.
  ('mb_gen_ariel',     'sala_general', 'u_ariel',     'organizador', now()),
  ('mb_gen_denise',    'sala_general', 'u_denise',    'organizador', now()),
  ('mb_gen_agustin',   'sala_general', 'u_agustin',   'organizador', now()),
  ('mb_gen_francisco', 'sala_general', 'u_francisco', 'organizador', now()),
  ('mb_gen_lucas',     'sala_general', 'u_lucas',     'organizador', now()),

  -- Comercial y Socios arrancan sólo con Ariel y Denise.
  ('mb_com_ariel',  'sala_comercial', 'u_ariel',  'organizador', now()),
  ('mb_com_denise', 'sala_comercial', 'u_denise', 'organizador', now()),
  ('mb_soc_ariel',  'sala_socios',    'u_ariel',  'organizador', now()),
  ('mb_soc_denise', 'sala_socios',    'u_denise', 'organizador', now())
on conflict (id) do nothing;

/* ── Configuración ────────────────────────────────────────── */

insert into public.config (id, organizacion) values ('global', 'Calcuta')
on conflict (id) do nothing;

commit;
