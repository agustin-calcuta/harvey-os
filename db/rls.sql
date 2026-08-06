-- ─────────────────────────────────────────────────────────────
-- Harvey OS — seguridad
--
-- Se aplica DESPUÉS de habilitar la Data API: recién ahí Neon crea
-- el esquema `auth` (con auth.user_id()) y el rol `authenticated`.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Identidad y rol del usuario en curso ────────────────── */

-- Fila de `usuarios` que corresponde al JWT en curso.
create or replace function public.mi_usuario_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.usuarios where "authUserId" = auth.user_id() limit 1
$$;

create or replace function public.mi_rol() returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol from public.usuarios where "authUserId" = auth.user_id() limit 1),
    'miembro'
  )
$$;

create or replace function public.soy_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() = 'admin'
$$;

-- Admin u organizador: quienes arman la agenda y moderan.
create or replace function public.puedo_organizar() returns boolean
language sql stable security definer set search_path = public as $$
  select public.mi_rol() in ('admin', 'organizador')
$$;

/*
 * Nadie se auto-asciende. Al crear o modificar la propia fila, el rol
 * queda congelado salvo que quien escribe sea admin. La excepción es
 * la primera persona que entra: si la tabla está vacía, arranca admin.
 */
create or replace function public.proteger_rol() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  hay_usuarios boolean;
begin
  if public.soy_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select exists (select 1 from public.usuarios) into hay_usuarios;
    new.rol := case when hay_usuarios then 'miembro' else 'admin' end;
  else
    new.rol := old.rol;
  end if;

  return new;
end;
$$;

drop trigger if exists usuarios_proteger_rol on public.usuarios;
create trigger usuarios_proteger_rol
  before insert or update on public.usuarios
  for each row execute function public.proteger_rol();

/* ── Permisos del rol `authenticated` ────────────────────── */

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

grant execute on function public.mi_usuario_id, public.mi_rol,
                          public.soy_admin, public.puedo_organizar to authenticated;

/* ── RLS ─────────────────────────────────────────────────── */

alter table public.usuarios       enable row level security;
alter table public.reuniones      enable row level security;
alter table public.temas          enable row level security;
alter table public.compromisos    enable row level security;
alter table public.notificaciones enable row level security;
alter table public.config         enable row level security;

-- Equipo chico donde todos ven todo: la lectura es abierta a la
-- gente autenticada. Lo que se controla es quién escribe qué.

-- usuarios
drop policy if exists usuarios_leer      on public.usuarios;
drop policy if exists usuarios_alta      on public.usuarios;
drop policy if exists usuarios_editar    on public.usuarios;
drop policy if exists usuarios_borrar    on public.usuarios;

create policy usuarios_leer on public.usuarios
  for select to authenticated using (true);

-- Cada quien puede darse de alta a sí mismo (primer ingreso con Google);
-- los admin pueden dar de alta a cualquiera.
create policy usuarios_alta on public.usuarios
  for insert to authenticated
  with check ("authUserId" = auth.user_id() or public.soy_admin());

create policy usuarios_editar on public.usuarios
  for update to authenticated
  using ("authUserId" = auth.user_id() or public.soy_admin())
  with check ("authUserId" = auth.user_id() or public.soy_admin());

create policy usuarios_borrar on public.usuarios
  for delete to authenticated using (public.soy_admin());

-- reuniones
drop policy if exists reuniones_leer   on public.reuniones;
drop policy if exists reuniones_alta   on public.reuniones;
drop policy if exists reuniones_editar on public.reuniones;
drop policy if exists reuniones_borrar on public.reuniones;

create policy reuniones_leer on public.reuniones
  for select to authenticated using (true);

create policy reuniones_alta on public.reuniones
  for insert to authenticated with check (public.puedo_organizar());

-- Modera quien organiza, o quien esté designado como moderador.
create policy reuniones_editar on public.reuniones
  for update to authenticated
  using (public.puedo_organizar() or "moderadorId" = public.mi_usuario_id())
  with check (public.puedo_organizar() or "moderadorId" = public.mi_usuario_id());

create policy reuniones_borrar on public.reuniones
  for delete to authenticated using (public.puedo_organizar());

-- temas: cualquiera propone, el organizador dispone
drop policy if exists temas_leer   on public.temas;
drop policy if exists temas_alta   on public.temas;
drop policy if exists temas_editar on public.temas;
drop policy if exists temas_borrar on public.temas;

create policy temas_leer on public.temas
  for select to authenticated using (true);

create policy temas_alta on public.temas
  for insert to authenticated with check (true);

create policy temas_editar on public.temas
  for update to authenticated
  using (public.puedo_organizar() or "propuestoPor" = public.mi_usuario_id())
  with check (public.puedo_organizar() or "propuestoPor" = public.mi_usuario_id());

create policy temas_borrar on public.temas
  for delete to authenticated
  using (public.puedo_organizar() or "propuestoPor" = public.mi_usuario_id());

-- compromisos: el responsable actualiza su propio avance
drop policy if exists compromisos_leer   on public.compromisos;
drop policy if exists compromisos_alta   on public.compromisos;
drop policy if exists compromisos_editar on public.compromisos;
drop policy if exists compromisos_borrar on public.compromisos;

create policy compromisos_leer on public.compromisos
  for select to authenticated using (true);

create policy compromisos_alta on public.compromisos
  for insert to authenticated with check (true);

create policy compromisos_editar on public.compromisos
  for update to authenticated using (true) with check (true);

create policy compromisos_borrar on public.compromisos
  for delete to authenticated
  using (public.puedo_organizar() or "responsableId" = public.mi_usuario_id());

-- notificaciones: las emite la app al cerrar agenda y al cerrar reunión
drop policy if exists notif_leer   on public.notificaciones;
drop policy if exists notif_alta   on public.notificaciones;
drop policy if exists notif_editar on public.notificaciones;
drop policy if exists notif_borrar on public.notificaciones;

create policy notif_leer on public.notificaciones
  for select to authenticated using (true);

create policy notif_alta on public.notificaciones
  for insert to authenticated with check (true);

create policy notif_editar on public.notificaciones
  for update to authenticated using (true) with check (true);

create policy notif_borrar on public.notificaciones
  for delete to authenticated using (public.soy_admin());

-- config
drop policy if exists config_leer   on public.config;
drop policy if exists config_alta   on public.config;
drop policy if exists config_editar on public.config;

create policy config_leer on public.config
  for select to authenticated using (true);

create policy config_alta on public.config
  for insert to authenticated with check (public.soy_admin());

create policy config_editar on public.config
  for update to authenticated using (public.soy_admin()) with check (public.soy_admin());

commit;
