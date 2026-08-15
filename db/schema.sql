-- ─────────────────────────────────────────────────────────────
-- Harvey — esquema
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
  -- Crear salas es de los socios. Reuniones crea cualquiera.
  -- Se congela igual que el alcance: nadie se lo da a sí mismo.
  "puedeCrearSalas" boolean not null default false,
  "avatarUrl"  text,
  cargo        text,
  activo       boolean not null default true,
  "creadoEn"   timestamptz not null default now()
);

/* ── Salas ───────────────────────────────────────────────── */

/*
 * El alta de una sala pregunta lo mínimo: nombre, descripción,
 * cadencia y a quién sumar. Todo lo demás son valores por omisión
 * que se ajustan después desde la sala y que sólo sirven para
 * precargar el formulario de cada reunión.
 */
create table if not exists public.salas (
  id                          text primary key,
  nombre                      text not null,
  descripcion                 text,
  cadencia                    text,
  "horasCierreAgenda"         integer not null default 24,
  -- El temario lo cierra el organizador cuando quiere. El plazo
  -- automático quedó desactivado por defecto: la dinámica real de
  -- una pyme no aguanta un corte a las 24 h.
  "cierreManual"              boolean not null default true,
  "duracionReunionDefaultMin" integer not null default 60,
  "duracionTemaDefaultMin"    integer not null default 15,
  "lugarHabitual"             text,
  -- Los lugares que ofrece el desplegable al crear una reunión.
  -- Vacío: se ofrecen los que ya se hayan usado en la sala.
  lugares                     text[] not null default '{}',
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

/*
 * Pedidos de entrada a una sala.
 *
 * Aparecen cuando alguien intenta crear una sala que ya existe: en vez
 * de armar una segunda con el mismo nombre, pide sumarse a la que hay
 * y el organizador resuelve.
 */
create table if not exists public.solicitudes (
  id          text primary key,
  "salaId"    text not null references public.salas(id) on delete cascade,
  "usuarioId" text not null references public.usuarios(id) on delete cascade,
  mensaje     text,
  estado      text not null default 'pendiente'
                check (estado in ('pendiente', 'aceptada', 'rechazada')),
  "creadaEn"  timestamptz not null default now(),
  "resueltaEn" timestamptz
);

-- Una sola solicitud pendiente por persona y sala; las resueltas quedan
-- como historial y no estorban un pedido nuevo.
create unique index if not exists solicitudes_pendiente_idx
  on public.solicitudes ("salaId", "usuarioId") where estado = 'pendiente';

/* ── Reuniones ───────────────────────────────────────────── */

create table if not exists public.reuniones (
  id                     text primary key,
  "salaId"               text not null references public.salas(id) on delete cascade,
  titulo                 text not null,
  fecha                  timestamptz not null,
  "duracionPrevistaMin"  integer not null default 60,
  lugar                  text,
  "moderadorId"          text not null,
  -- Puede incluir a alguien que no es de la sala: se suma a esta
  -- reunión, no al equipo, y no ve el resto de las minutas.
  "participantesIds"     text[] not null default '{}',
  -- Sin 'borrador': si la reunión existe, se le pueden cargar temas.
  estado                 text not null default 'agenda_abierta'
                           check (estado in ('agenda_abierta','agenda_cerrada','en_curso','cerrada')),
  -- Una reunión sensible no se lista para el resto de la sala.
  privada                boolean not null default false,
  recurrencia            text not null default 'unica'
                           check (recurrencia in ('unica','semanal','quincenal','mensual')),
  -- Las de una misma serie recurrente comparten este id: en
  -- «Próximas» se muestra sólo la primera de cada serie.
  "serieId"              text,
  "horasCierreAgenda"    integer not null default 24,
  "cierreManual"         boolean not null default true,
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

/*
 * Un tema vive en dos lados distintos:
 *
 * · En el **temario**, que es el bloc de notas personal de cada uno:
 *   sin sala y sin reunión, y sólo lo ve quien lo escribió. Cuando
 *   lo asigna a una reunión, deja el bloc y toma la sala de esa
 *   reunión.
 * · En una **reunión**, donde ya es de la sala y lo ve el equipo.
 *
 * Un tema que se llevó a una reunión y no se llegó a hablar queda
 * `diferido`: pierde la reunión pero conserva la sala, así lo puede
 * volver a incluir el organizador y a la vez le aparece a quien lo
 * propuso en su temario.
 */
create table if not exists public.temas (
  id               text primary key,
  "salaId"         text references public.salas(id) on delete cascade,
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
  -- El tema del temario personal no tiene sala ni reunión; en
  -- cuanto sale del bloc, tiene sala sí o sí.
  constraint banco_sin_sala check (
    (estado = 'banco' and "reunionId" is null and "salaId" is null)
    or (estado <> 'banco' and "salaId" is not null)
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
  -- Tres estados y no más: o no la empecé, o la estoy haciendo, o
  -- está lista. Lo trabado se cuenta en el avance de la que está
  -- en curso.
  estado          text not null default 'pendiente'
                    check (estado in ('pendiente','en_curso','hecho')),
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
  organizacion    text not null default 'Imporbamas',
  "emailsActivos" boolean not null default true
);

/* ── Índices ─────────────────────────────────────────────── */

create index if not exists membresias_usuario_idx  on public.membresias ("usuarioId");
create index if not exists membresias_sala_idx     on public.membresias ("salaId");
create index if not exists solicitudes_sala_idx    on public.solicitudes ("salaId");
create index if not exists solicitudes_usuario_idx on public.solicitudes ("usuarioId");
create index if not exists reuniones_sala_idx      on public.reuniones ("salaId");
create index if not exists reuniones_fecha_idx     on public.reuniones (fecha desc);
create index if not exists reuniones_serie_idx     on public.reuniones ("serieId");
create index if not exists temas_reunion_idx       on public.temas ("reunionId");
create index if not exists temas_temario_idx       on public.temas ("propuestoPor") where estado = 'banco';
create index if not exists compromisos_sala_idx    on public.compromisos ("salaId");
create index if not exists compromisos_resp_idx    on public.compromisos ("responsableId");
create index if not exists notif_sala_idx          on public.notificaciones ("salaId");

commit;
