-- ─────────────────────────────────────────────────────────────
-- Harvey — migración del 18 de agosto de 2026
--
-- Dos cosas: el rol **externo** en las membresías y las columnas del
-- evento de Google Calendar en las reuniones.
--
-- El rol externo sale de la reunión del
-- 18/08: Ariel no quiso al proveedor de sólo lectura —*"si es un
-- proveedor con el que trabajamos siempre, que pueda proponer temas
-- o ver las tareas que le asignaron"*—, pero tampoco adentro del
-- equipo. Es un tercer rol, no un permiso más del miembro.
--
-- Es idempotente: se puede correr dos veces.
--
--   psql "$PGURL" -f db/migracion-2026-08-18.sql
--   psql "$PGURL" -f db/rls.sql
--   psql "$PGURL" -c "notify pgrst, 'reload schema';"
--
-- El `rls.sql` de después no es opcional: las políticas de temas,
-- reuniones y compromisos cambiaron junto con el rol.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── El rol nuevo ─────────────────────────────────────────── */

alter table public.membresias
  drop constraint if exists membresias_rol_check;

alter table public.membresias
  add constraint membresias_rol_check
  check (rol in ('organizador', 'miembro', 'externo'));

/*
 * Un externo no cuenta como equipo. El trigger que impide dejar una
 * sala sin organizador ya mira sólo `rol = 'organizador'`, así que no
 * hay que tocarlo: una sala de un socio y tres proveedores sigue
 * teniendo su organizador.
 */

comment on column public.membresias.rol is
  'organizador (socio) · miembro · externo (proveedor: propone temas y ve sólo sus tareas)';

/* ── Google Calendar ──────────────────────────────────────── */

/*
 * Tres columnas para el evento del calendario. Quedan vacías mientras
 * la integración no esté enchufada: la app las escribe sólo si hay un
 * `VITE_GOOGLE_CLIENT_ID` configurado.
 */
alter table public.reuniones add column if not exists "calendarEventoId" text;
alter table public.reuniones add column if not exists "calendarUrl"      text;
alter table public.reuniones add column if not exists "meetUrl"          text;

commit;
