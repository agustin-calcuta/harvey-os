-- ─────────────────────────────────────────────────────────────
-- Harvey OS — esquema
--
-- La app es 100 % cliente: habla con la Data API de Neon
-- (PostgREST) usando el JWT de Neon Auth. Toda la seguridad vive
-- acá abajo, en las políticas RLS.
--
-- Las columnas van en camelCase entre comillas a propósito: la
-- Data API devuelve los nombres tal cual y así el JSON coincide
-- 1 a 1 con los tipos de TypeScript, sin capa de mapeo.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Tablas ──────────────────────────────────────────────── */

create table if not exists public.usuarios (
  id           text primary key,
  -- `sub` del JWT de Neon Auth. Se vincula por email la primera
  -- vez que la persona entra con Google.
  "authUserId" text unique,
  nombre       text not null,
  email        text not null unique,
  rol          text not null default 'miembro'
                 check (rol in ('admin', 'organizador', 'miembro', 'invitado')),
  "avatarUrl"  text,
  cargo        text,
  activo       boolean not null default true,
  "creadoEn"   timestamptz not null default now()
);

create table if not exists public.reuniones (
  id                     text primary key,
  titulo                 text not null,
  fecha                  timestamptz not null,
  "duracionPrevistaMin"  integer not null default 60,
  lugar                  text,
  "moderadorId"          text not null,
  "participantesIds"     text[] not null default '{}',
  estado                 text not null default 'agenda_abierta'
                           check (estado in ('borrador','agenda_abierta','agenda_cerrada','en_curso','cerrada')),
  "horasCierreAgenda"    integer not null default 24,
  "conclusionesGenerales" text,
  observaciones          text,
  "proximaReunionFecha"  timestamptz,
  "agendaCerradaEn"      timestamptz,
  "iniciadaEn"           timestamptz,
  "cerradaEn"            timestamptz,
  "creadoPor"            text,
  "creadoEn"             timestamptz not null default now()
);

create table if not exists public.temas (
  id               text primary key,
  "reunionId"      text not null references public.reuniones(id) on delete cascade,
  titulo           text not null,
  detalle          text,
  importancia      text not null default 'media' check (importancia in ('alta','media','baja')),
  objetivo         text not null default 'decision'
                     check (objetivo in ('decision','exploratoria','comunicativa','informativa')),
  "propuestoPor"   text not null,
  "duracionMin"    integer not null default 15,
  "duracionRealSeg" integer,
  estado           text not null default 'propuesto'
                     check (estado in ('propuesto','aprobado','rechazado','diferido','tratado')),
  orden            integer not null default 0,
  conclusiones     text,
  "motivoRechazo"  text,
  "creadoEn"       timestamptz not null default now()
);

create table if not exists public.compromisos (
  id              text primary key,
  "reunionId"     text not null references public.reuniones(id) on delete cascade,
  "temaId"        text,
  accion          text not null,
  detalle         text,
  "responsableId" text not null,
  "fechaLimite"   timestamptz,
  importancia     text not null default 'media' check (importancia in ('alta','media','baja')),
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente','en_curso','bloqueado','hecho')),
  avance          text,
  "completadoEn"  timestamptz,
  "creadoEn"      timestamptz not null default now()
);

create table if not exists public.notificaciones (
  id             text primary key,
  tipo           text not null check (tipo in ('agenda_cerrada','minuta','recordatorio','tema_aprobado')),
  "reunionId"    text not null references public.reuniones(id) on delete cascade,
  asunto         text not null,
  destinatarios  text[] not null default '{}',
  "cuerpoHtml"   text not null default '',
  "cuerpoTexto"  text not null default '',
  estado         text not null default 'simulado' check (estado in ('simulado','enviado','error')),
  error          text,
  "creadoEn"     timestamptz not null default now()
);

-- Fila única, id fijo 'global'.
create table if not exists public.config (
  id                          text primary key default 'global',
  organizacion                text not null default 'Harvey',
  "horasCierreAgendaDefault"  integer not null default 24,
  "duracionReunionDefaultMin" integer not null default 60,
  "duracionTemaDefaultMin"    integer not null default 15,
  cadencia                    text not null default 'Lunes 10:00',
  "emailsActivos"             boolean not null default true
);

create index if not exists temas_reunion_idx        on public.temas ("reunionId");
create index if not exists compromisos_reunion_idx  on public.compromisos ("reunionId");
create index if not exists compromisos_resp_idx     on public.compromisos ("responsableId");
create index if not exists notif_reunion_idx        on public.notificaciones ("reunionId");
create index if not exists reuniones_fecha_idx      on public.reuniones (fecha desc);

commit;
