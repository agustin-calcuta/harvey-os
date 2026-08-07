-- ─────────────────────────────────────────────────────────────
-- Harvey OS — esquema
--
-- La app es 100 % cliente: habla con la Data API de Neon
-- (PostgREST) usando el JWT de Neon Auth. Toda la seguridad vive
-- en las políticas RLS de rls.sql.
--
-- La unidad de trabajo es la **sala**: un espacio con su equipo,
-- sus reuniones y su banco de temas. El rol no es global, vive en
-- la membresía: la misma persona organiza una sala y es miembro
-- en otra.
--
-- Las columnas van en camelCase entre comillas a propósito: la
-- Data API devuelve los nombres tal cual y así el JSON coincide
-- 1 a 1 con los tipos de TypeScript, sin capa de mapeo.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Personas ────────────────────────────────────────────── */

create table if not exists public.usuarios (
  id           text primary key,
  -- `sub` del JWT de Neon Auth. Se vincula por correo la primera
  -- vez que la persona entra con Google.
  "authUserId" text unique,
  nombre       text not null,
  email        text not null unique,
  -- `superadmin` es soporte técnico: ve todo, no pertenece a
  -- ningún equipo y queda fuera de toda lista donde se elige gente.
  alcance      text not null default 'usuario' check (alcance in ('superadmin', 'usuario')),
  "avatarUrl"  text,
  cargo        text,
  activo       boolean not null default true,
  "creadoEn"   timestamptz not null default now()
);

/* ── Salas ───────────────────────────────────────────────── */

create table if not exists public.salas (
  id                          text primary key,
  nombre                      text not null,
  descripcion                 text,
  cadencia                    text,
  "horasCierreAgenda"         integer not null default 24,
  -- Sin cierre automático: el temario queda abierto hasta que el
  -- organizador lo cierra a mano.
  "cierreManual"              boolean not null default false,
  "duracionReunionDefaultMin" integer not null default 60,
  "duracionTemaDefaultMin"    integer not null default 15,
  "lugarHabitual"             text,
  "creadaPor"                 text not null,
  "creadaEn"                  timestamptz not null default now(),
  archivada                   boolean not null default false
);

create table if not exists public.membresias (
  id          text primary key,
  "salaId"    text not null references public.salas(id) on delete cascade,
  "usuarioId" text not null references public.usuarios(id) on delete cascade,
  rol         text not null default 'miembro' check (rol in ('organizador', 'miembro')),
  desde       timestamptz not null default now(),
  unique ("salaId", "usuarioId")
);

/* ── Reuniones ───────────────────────────────────────────── */

create table if not exists public.reuniones (
  id                     text primary key,
  "salaId"               text not null references public.salas(id) on delete cascade,
  titulo                 text not null,
  fecha                  timestamptz not null,
  "duracionPrevistaMin"  integer not null default 60,
  lugar                  text,
  "moderadorId"          text not null,
  "participantesIds"     text[] not null default '{}',
  estado                 text not null default 'agenda_abierta'
                           check (estado in ('borrador','agenda_abierta','agenda_cerrada','en_curso','cerrada')),
  "horasCierreAgenda"    integer not null default 24,
  "cierreManual"         boolean not null default false,
  "conclusionesGenerales" text,
  observaciones          text,
  "proximaReunionFecha"  timestamptz,
  "agendaCerradaEn"      timestamptz,
  "iniciadaEn"           timestamptz,
  "cerradaEn"            timestamptz,
  "creadoPor"            text,
  "creadoEn"             timestamptz not null default now()
);

/* ── Temas ───────────────────────────────────────────────── */

create table if not exists public.temas (
  id               text primary key,
  "salaId"         text not null references public.salas(id) on delete cascade,
  -- Sin reunión mientras vive en el banco de la sala: es el "banco
  -- de suplentes" para anotar un tema antes de que haya fecha.
  "reunionId"      text references public.reuniones(id) on delete cascade,
  titulo           text not null,
  detalle          text,
  importancia      text not null default 'media' check (importancia in ('alta','media','baja')),
  objetivo         text not null default 'decision'
                     check (objetivo in ('decision','exploratoria','comunicativa','informativa')),
  "propuestoPor"   text not null,
  "duracionMin"    integer not null default 15,
  "duracionRealSeg" integer,
  estado           text not null default 'propuesto'
                     check (estado in ('banco','propuesto','aprobado','rechazado','diferido','tratado')),
  orden            integer not null default 0,
  conclusiones     text,
  "motivoRechazo"  text,
  "creadoEn"       timestamptz not null default now(),
  -- Un tema del banco no tiene reunión; uno con reunión no está en el banco.
  constraint banco_sin_reunion check (
    (estado = 'banco' and "reunionId" is null) or (estado <> 'banco')
  )
);

/* ── Compromisos ─────────────────────────────────────────── */

create table if not exists public.compromisos (
  id              text primary key,
  "salaId"        text not null references public.salas(id) on delete cascade,
  -- Puede no venir de una reunión: se cargan sueltos también.
  "reunionId"     text references public.reuniones(id) on delete set null,
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

/* ── Notificaciones ──────────────────────────────────────── */

create table if not exists public.notificaciones (
  id             text primary key,
  "salaId"       text not null references public.salas(id) on delete cascade,
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

/* ── Configuración global ────────────────────────────────── */

create table if not exists public.config (
  id              text primary key default 'global',
  organizacion    text not null default 'Harvey',
  "emailsActivos" boolean not null default true
);

/* ── Índices ─────────────────────────────────────────────── */

create index if not exists membresias_usuario_idx  on public.membresias ("usuarioId");
create index if not exists membresias_sala_idx     on public.membresias ("salaId");
create index if not exists reuniones_sala_idx      on public.reuniones ("salaId");
create index if not exists reuniones_fecha_idx     on public.reuniones (fecha desc);
create index if not exists temas_reunion_idx       on public.temas ("reunionId");
create index if not exists temas_banco_idx         on public.temas ("salaId") where estado = 'banco';
create index if not exists compromisos_sala_idx    on public.compromisos ("salaId");
create index if not exists compromisos_resp_idx    on public.compromisos ("responsableId");
create index if not exists notif_sala_idx          on public.notificaciones ("salaId");

commit;
