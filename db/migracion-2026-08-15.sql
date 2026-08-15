-- ─────────────────────────────────────────────────────────────
-- Harvey — migración del 15 de agosto de 2026
--
-- Lleva una base que ya está andando al esquema que salió de la
-- reunión del 14/08, sin perder lo cargado. Es idempotente: se
-- puede correr dos veces.
--
--   psql "$PGURL" -f db/migracion-2026-08-15.sql
--   psql "$PGURL" -f db/rls.sql
--   psql "$PGURL" -c "notify pgrst, 'reload schema';"
--
-- El `rls.sql` de después no es opcional: las políticas cambiaron
-- junto con las columnas.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Personas: quién puede abrir salas ───────────────────── */

alter table public.usuarios
  add column if not exists "puedeCrearSalas" boolean not null default false;

-- Arrancan pudiendo los socios —quienes organizan la sala de socios—
-- y las cuentas de soporte. El resto se marca desde Administración.
update public.usuarios u
   set "puedeCrearSalas" = true
 where u.alcance = 'superadmin'
    or exists (
      select 1
        from public.membresias m
        join public.salas s on s.id = m."salaId"
       where m."usuarioId" = u.id
         and m.rol = 'organizador'
         and public.clave_nombre(s.nombre) = 'socios'
    );

/* ── Salas: lugares y cierre a mano ──────────────────────── */

alter table public.salas
  add column if not exists lugares text[] not null default '{}';

alter table public.salas
  alter column "cierreManual" set default true;

-- Se va el plazo automático: el temario lo cierra el organizador.
update public.salas set "cierreManual" = true where "cierreManual" = false;

-- Los lugares de Harvey, para que el desplegable arranque con algo.
update public.salas
   set lugares = array['Fábrica', 'Local Palermo', 'Meet']
 where cardinality(lugares) = 0;

/* ── Reuniones: privadas, recurrencia y sin borrador ─────── */

alter table public.reuniones
  add column if not exists privada     boolean not null default false,
  add column if not exists recurrencia text    not null default 'unica',
  add column if not exists "serieId"   text;

alter table public.reuniones
  drop constraint if exists reuniones_recurrencia_check;
alter table public.reuniones
  add constraint reuniones_recurrencia_check
  check (recurrencia in ('unica','semanal','quincenal','mensual'));

-- «Borrador» no le decía nada a nadie: si la reunión existe, se le
-- pueden cargar temas.
update public.reuniones set estado = 'agenda_abierta' where estado = 'borrador';

alter table public.reuniones drop constraint if exists reuniones_estado_check;
alter table public.reuniones
  add constraint reuniones_estado_check
  check (estado in ('agenda_abierta','agenda_cerrada','en_curso','cerrada'));

alter table public.reuniones alter column "cierreManual" set default true;
update public.reuniones
   set "cierreManual" = true
 where "cierreManual" = false and estado in ('agenda_abierta','agenda_cerrada');

/* ── Temas: el temario pasa a ser personal ───────────────── */

alter table public.temas drop constraint if exists banco_sin_reunion;
alter table public.temas alter column "salaId" drop not null;

-- Lo que estaba en el banco de una sala pasa al bloc de notas de
-- quien lo escribió. Nadie pierde temas; dejan de verse entre sí.
update public.temas set "salaId" = null where estado = 'banco';

alter table public.temas drop constraint if exists banco_sin_sala;
alter table public.temas
  add constraint banco_sin_sala check (
    (estado = 'banco' and "reunionId" is null and "salaId" is null)
    or (estado <> 'banco' and "salaId" is not null)
  );

drop index if exists temas_banco_idx;
create index if not exists temas_temario_idx
  on public.temas ("propuestoPor") where estado = 'banco';
create index if not exists reuniones_serie_idx on public.reuniones ("serieId");

/* ── Tareas: se va «bloqueado» ───────────────────────────── */

-- Lo trabado pasa a estar en curso y el motivo queda escrito en el
-- avance, que es donde se cuenta por qué no se pudo.
update public.compromisos
   set estado = 'en_curso',
       avance = case
         when coalesce(avance, '') = '' then 'Estaba marcada como bloqueada.'
         else avance || E'\n\nEstaba marcada como bloqueada.'
       end
 where estado = 'bloqueado';

alter table public.compromisos drop constraint if exists compromisos_estado_check;
alter table public.compromisos
  add constraint compromisos_estado_check
  check (estado in ('pendiente','en_curso','hecho'));

/* ── Marca ───────────────────────────────────────────────── */

alter table public.config alter column organizacion set default 'Impor Bamas';
update public.config set organizacion = 'Impor Bamas' where organizacion = 'Harvey';

commit;

-- PostgREST sigue sirviendo el esquema viejo hasta que se le avisa.
notify pgrst, 'reload schema';
