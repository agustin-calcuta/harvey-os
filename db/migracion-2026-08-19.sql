-- ─────────────────────────────────────────────────────────────
-- 19/08/2026 — comentarios en las tareas, y clientes
--
-- Para bases que ya están andando. En una base nueva no hace falta:
-- `schema.sql` y `rls.sql` ya vienen con todo esto.
--
-- Se puede correr más de una vez sin romper nada.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Clientes ─────────────────────────────────────────────── */

-- Para quién es el trabajo. Transversal a las salas: Digital Lab y
-- Comercial pueden estar los dos sobre el mismo cliente.
create table if not exists public.clientes (
  id          text primary key,
  nombre      text not null,
  activo      boolean not null default true,
  "creadoEn"  timestamptz not null default now()
);

-- Un cliente por nombre, sin importar mayúsculas ni espacios de más:
-- si «Lucky Tours» y «lucky tours» conviven, filtrar por cliente deja
-- de servir, que es justamente para lo que existe la tabla.
create unique index if not exists clientes_nombre_unico
  on public.clientes (public.clave_nombre(nombre));

alter table public.compromisos
  add column if not exists "clienteId" text references public.clientes(id) on delete set null;

create index if not exists compromisos_cliente on public.compromisos ("clienteId");

/* ── Comentarios ──────────────────────────────────────────── */

create table if not exists public.comentarios (
  id             text primary key,
  "compromisoId" text not null references public.compromisos(id) on delete cascade,
  "autorId"      text not null references public.usuarios(id),
  texto          text not null,
  -- A quiénes se arrobó, ya resueltos a ids: si alguien cambia de
  -- nombre, la mención vieja sigue apuntando a la persona correcta.
  menciones      text[] not null default '{}',
  -- Quiénes ya lo vieron. Los avisos sin leer salen de acá y no de
  -- una tabla aparte: un aviso es un comentario que me menciona y que
  -- todavía no abrí.
  "leidoPor"     text[] not null default '{}',
  "creadoEn"     timestamptz not null default now(),
  "editadoEn"    timestamptz
);

create index if not exists comentarios_compromiso on public.comentarios ("compromisoId");
create index if not exists comentarios_menciones on public.comentarios using gin (menciones);

/* ── Seguridad ────────────────────────────────────────────── */

alter table public.clientes    enable row level security;
alter table public.comentarios enable row level security;

-- Los clientes los ve y los crea cualquiera del estudio: la lista es
-- común, y si sólo pudieran crearla los socios, el resto escribiría
-- el nombre a mano y volveríamos al problema que la tabla resuelve.
drop policy if exists clientes_leer   on public.clientes;
drop policy if exists clientes_alta   on public.clientes;
drop policy if exists clientes_editar on public.clientes;

create policy clientes_leer on public.clientes
  for select to authenticated using (true);

create policy clientes_alta on public.clientes
  for insert to authenticated with check (public.mi_usuario_id() is not null);

create policy clientes_editar on public.clientes
  for update to authenticated
  using (public.mi_usuario_id() is not null)
  with check (public.mi_usuario_id() is not null);

-- Un comentario se ve si se ve la tarea. Se apoya en la misma
-- condición que `compromisos_leer` para no tener dos definiciones de
-- «esta tarea es asunto mío» que puedan separarse con el tiempo.
drop policy if exists comentarios_leer   on public.comentarios;
drop policy if exists comentarios_alta   on public.comentarios;
drop policy if exists comentarios_editar on public.comentarios;
drop policy if exists comentarios_borrar on public.comentarios;

create policy comentarios_leer on public.comentarios
  for select to authenticated
  using (exists (select 1 from public.compromisos c where c.id = "compromisoId"));

create policy comentarios_alta on public.comentarios
  for insert to authenticated
  with check (
    "autorId" = public.mi_usuario_id()
    and exists (select 1 from public.compromisos c where c.id = "compromisoId")
  );

-- Editar es para marcar leído y para corregirse: por eso lo puede
-- hacer cualquiera que vea la tarea, y no sólo quien escribió.
-- Cambiar el texto ajeno lo impide la aplicación, no la política:
-- acá haría falta comparar contra la fila anterior.
create policy comentarios_editar on public.comentarios
  for update to authenticated
  using (exists (select 1 from public.compromisos c where c.id = "compromisoId"))
  with check (exists (select 1 from public.compromisos c where c.id = "compromisoId"));

-- Borrar, sólo lo propio.
create policy comentarios_borrar on public.comentarios
  for delete to authenticated
  using ("autorId" = public.mi_usuario_id());

grant select, insert, update on public.clientes to authenticated;
grant select, insert, update, delete on public.comentarios to authenticated;

commit;

notify pgrst, 'reload schema';

/* ── El cliente también en reuniones y temas ──────────────── */
--
-- Se agregó después: primero fue sólo en tareas, y quedó claro que
-- una reunión entera puede ser de un cliente —y sus temas también—.
-- Al filtrar, es lo que permite ver «todo lo de Lucky Tours» y no
-- sólo sus tareas sueltas.

begin;

alter table public.reuniones
  add column if not exists "clienteId" text references public.clientes(id) on delete set null;
alter table public.temas
  add column if not exists "clienteId" text references public.clientes(id) on delete set null;

create index if not exists reuniones_cliente on public.reuniones ("clienteId");
create index if not exists temas_cliente on public.temas ("clienteId");

commit;

notify pgrst, 'reload schema';
