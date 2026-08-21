-- ─────────────────────────────────────────────────────────────
-- Harvey — seguridad
--
-- Se aplica DESPUÉS de habilitar la Data API: recién ahí Neon crea
-- el esquema `auth` (con auth.user_id()) y el rol `authenticated`.
--
-- Regla de oro: **sólo se ve lo de las salas a las que pertenecés**.
-- Dentro de una sala, el organizador arma la agenda y el miembro
-- propone. El externo pertenece pero no es del equipo: propone temas
-- —los aprueba el socio— y ve sólo las tareas a su nombre y las
-- reuniones a las que lo convocan. El superadmin atraviesa todo, y es
-- lo único que se decide fuera de las salas.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Identidad ───────────────────────────────────────────── */

/**
 * Correo del token en curso.
 *
 * Es la llave de la primera vinculación: el organizador da de alta a
 * alguien con su correo y, cuando esa persona entra con Google, se
 * reconoce por ahí y se engancha con la ficha que ya existía.
 */
create or replace function public.mi_email() returns text
language sql stable as $$
  select lower(nullif(current_setting('request.jwt.claims', true), '')::json->>'email')
$$;

/**
 * Mi ficha: por vínculo ya hecho, o por correo si todavía no se hizo.
 */
create or replace function public.mi_usuario_id() returns text
language sql stable security definer set search_path = public as $$
  select id from public.usuarios
  where "authUserId" = auth.user_id()
     or ("authUserId" is null and lower(email) = public.mi_email())
  order by ("authUserId" is not null) desc
  limit 1
$$;

create or replace function public.soy_superadmin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select alcance = 'superadmin' from public.usuarios where id = public.mi_usuario_id()),
    false
  )
$$;

/**
 * Quién puede abrir una sala nueva.
 *
 * Se decidió que sean sólo los socios: el resto crea reuniones dentro
 * de las salas que ya existen. Se marca persona por persona desde
 * Administración y el trigger de abajo impide que alguien se lo dé a
 * sí mismo.
 */
create or replace function public.puedo_crear_salas() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select "puedeCrearSalas" from public.usuarios where id = public.mi_usuario_id()),
    false
  ) or public.soy_superadmin()
$$;

/* ── Pertenencia a salas ─────────────────────────────────── */

create or replace function public.soy_de_la_sala(sala text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.soy_superadmin() or exists (
    select 1 from public.membresias m
    where m."salaId" = sala and m."usuarioId" = public.mi_usuario_id()
  )
$$;

/**
 * ¿Soy del equipo de esta sala?
 *
 * El externo pertenece a la sala —para que lo puedan convocar y para
 * seguir sus tareas— pero no es del equipo: *"si es un proveedor con
 * el que trabajamos siempre, que pueda proponer temas o ver las tareas
 * que le asignaron"*, y nada más. Todo lo que antes preguntaba
 * `soy_de_la_sala` y significaba "soy del equipo" pregunta esto.
 */
create or replace function public.soy_del_equipo(sala text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.soy_superadmin() or exists (
    select 1 from public.membresias m
    where m."salaId" = sala and m."usuarioId" = public.mi_usuario_id()
      and m.rol <> 'externo'
  )
$$;

create or replace function public.organizo_la_sala(sala text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.soy_superadmin() or exists (
    select 1 from public.membresias m
    where m."salaId" = sala and m."usuarioId" = public.mi_usuario_id()
      and m.rol = 'organizador'
  )
$$;

/**
 * ¿Me sumaron a esta reunión?
 *
 * Es lo que hace posible sumarse a una reunión sin entrar a la sala:
 * *"si soy de diseño y me quiero sumar a una reunión de marketing, no
 * me sumo a la sala de marketing y tengo acceso a todas sus minutas;
 * me sumo a esa reunión"*. Da acceso a esa reunión y a lo que cuelga
 * de ella, nada más.
 */
create or replace function public.participo_de_la_reunion(reunion text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.reuniones r
    where r.id = reunion
      and (
        public.mi_usuario_id() = any (r."participantesIds")
        or r."moderadorId" = public.mi_usuario_id()
      )
  )
$$;

/** Salas donde tengo algo que ver. Usada por las políticas de lectura. */
create or replace function public.mis_salas() returns setof text
language sql stable security definer set search_path = public as $$
  select case
    when public.soy_superadmin() then (select id from public.salas)
  end
  union
  select m."salaId" from public.membresias m where m."usuarioId" = public.mi_usuario_id()
$$;

/* ── Directorio de salas ─────────────────────────────────── */

/**
 * Nombre reducido a lo comparable: sin mayúsculas, tildes ni signos.
 * «Marketing», «marketing» y «Márketing » son el mismo nombre.
 */
create or replace function public.clave_nombre(t text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(lower(coalesce(t, '')), 'áéíóúüñàèìòùç', 'aeiouunaeiouc'),
    '[^a-z0-9]+', '', 'g')
$$;

/**
 * Qué salas existen, para no crear dos veces la misma.
 *
 * Corre con los permisos del dueño (`security_invoker = false`), así que
 * atraviesa el RLS de `salas`: es la única manera de avisar «esto ya
 * existe» sobre una sala a la que todavía no pertenecés.
 *
 * Expone lo mínimo para decidir: cómo se llama, a quién pedirle entrar y
 * cuánta gente hay. Nada de reuniones, temas ni compromisos.
 */
drop view if exists public.directorio_salas;
create view public.directorio_salas
with (security_invoker = false) as
select
  s.id,
  s.nombre,
  public.clave_nombre(s.nombre) as clave,
  coalesce(
    (select u.nombre
       from public.membresias m
       join public.usuarios u on u.id = m."usuarioId"
      where m."salaId" = s.id and m.rol = 'organizador'
      order by m.desde limit 1),
    '—') as organizador,
  (select count(*)::int from public.membresias m where m."salaId" = s.id) as integrantes
from public.salas s
where not s.archivada;

/*
 * Nadie se auto-asciende ni se vuelve superadmin solo. Al crear o
 * modificar la propia ficha, el alcance queda congelado salvo que
 * quien escribe ya sea superadmin. Lo mismo con el permiso de crear
 * salas: se otorga, no se toma.
 *
 * El trigger sólo actúa sobre escrituras con JWT, es decir las que
 * llegan por la Data API. Una carga administrativa por SQL directo
 * (el seed, una migración) no trae token y pasa sin tocar: si no,
 * sembrar el equipo sería imposible.
 */
create or replace function public.proteger_alcance() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quien text;
begin
  begin
    quien := auth.user_id();
  exception when others then
    quien := null;
  end;

  if quien is null or public.soy_superadmin() then
    return new;
  end if;

  new.alcance := case when tg_op = 'INSERT' then 'usuario' else old.alcance end;
  new."puedeCrearSalas" :=
    case when tg_op = 'INSERT' then false else old."puedeCrearSalas" end;
  return new;
end;
$$;

drop trigger if exists usuarios_proteger_alcance on public.usuarios;
create trigger usuarios_proteger_alcance
  before insert or update on public.usuarios
  for each row execute function public.proteger_alcance();

/*
 * Quien crea una sala queda como su organizador. Sin esto, crearía
 * una sala a la que después no podría entrar.
 */
create or replace function public.alta_sala() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  yo text := public.mi_usuario_id();
begin
  if yo is not null then
    insert into public.membresias (id, "salaId", "usuarioId", rol)
    values ('m_' || substr(md5(random()::text || new.id), 1, 12), new.id, yo, 'organizador')
    on conflict ("salaId", "usuarioId") do update set rol = 'organizador';
  end if;
  return new;
end;
$$;

/*
 * Una sala sin organizador queda sin nadie que arme la agenda ni
 * gestione quién entra. Antes de que se vaya el último, se corta.
 */
create or replace function public.cuidar_ultimo_organizador() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.rol = 'organizador' and not exists (
    select 1 from public.membresias m
    where m."salaId" = old."salaId" and m.rol = 'organizador' and m.id <> old.id
  ) then
    raise exception 'La sala quedaría sin organizador. Pasale el rol a alguien antes de salir.'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

drop trigger if exists membresias_ultimo_organizador on public.membresias;
create trigger membresias_ultimo_organizador
  before delete on public.membresias
  for each row execute function public.cuidar_ultimo_organizador();

/*
 * Aceptar una solicitud es sumar a la persona: la membresía la crea el
 * mismo movimiento, para que no queden pedidos aceptados sin efecto.
 */
create or replace function public.aplicar_solicitud() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.estado = 'aceptada' and coalesce(old.estado, '') <> 'aceptada' then
    insert into public.membresias (id, "salaId", "usuarioId", rol)
    values ('m_' || substr(md5(random()::text || new.id), 1, 12),
            new."salaId", new."usuarioId", 'miembro')
    on conflict ("salaId", "usuarioId") do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists solicitudes_aplicar on public.solicitudes;
create trigger solicitudes_aplicar
  after update on public.solicitudes
  for each row execute function public.aplicar_solicitud();

drop trigger if exists salas_alta on public.salas;
create trigger salas_alta
  after insert on public.salas
  for each row execute function public.alta_sala();

/* ── Permisos del rol `authenticated` ────────────────────── */

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

grant execute on function public.mi_usuario_id, public.mi_email, public.soy_superadmin,
                          public.soy_de_la_sala, public.soy_del_equipo, public.organizo_la_sala,
                          public.puedo_crear_salas, public.participo_de_la_reunion,
                          public.mis_salas, public.clave_nombre to authenticated;

-- El directorio es de sólo lectura. El `grant on all tables` de arriba lo
-- alcanza también a él, y sobre una vista que atraviesa RLS eso no va.
revoke all on public.directorio_salas from authenticated;
grant select on public.directorio_salas to authenticated;

/* ── RLS ─────────────────────────────────────────────────── */

alter table public.usuarios       enable row level security;
alter table public.salas          enable row level security;
alter table public.membresias     enable row level security;
alter table public.solicitudes    enable row level security;
alter table public.reuniones      enable row level security;
alter table public.temas          enable row level security;
alter table public.compromisos    enable row level security;
alter table public.notificaciones enable row level security;
alter table public.config         enable row level security;

/* usuarios ─ la ficha de alguien se ve si compartimos alguna sala */

drop policy if exists usuarios_leer   on public.usuarios;
drop policy if exists usuarios_alta   on public.usuarios;
drop policy if exists usuarios_editar on public.usuarios;
drop policy if exists usuarios_borrar on public.usuarios;

create policy usuarios_leer on public.usuarios
  for select to authenticated
  using (
    public.soy_superadmin()
    or id = public.mi_usuario_id()
    or exists (
      select 1 from public.membresias mios, public.membresias suyas
      where mios."usuarioId" = public.mi_usuario_id()
        and suyas."usuarioId" = public.usuarios.id
        and mios."salaId" = suyas."salaId"
    )
    -- Un invitado de afuera tiene que poder ver con quiénes se reúne,
    -- y el equipo tiene que poder verlo a él.
    or exists (
      select 1 from public.reuniones r
      where public.mi_usuario_id() = any (r."participantesIds")
        and public.usuarios.id = any (r."participantesIds")
    )
  );

-- Alta: uno mismo en el primer ingreso, o el organizador dando de
-- alta a alguien de su equipo con el correo con el que va a entrar.
create policy usuarios_alta on public.usuarios
  for insert to authenticated
  with check (
    "authUserId" = auth.user_id()
    or public.soy_superadmin()
    or exists (
      select 1 from public.membresias m
      where m."usuarioId" = public.mi_usuario_id() and m.rol = 'organizador'
    )
  );

/*
 * Se puede editar la ficha propia, y también reclamar una que todavía
 * no tiene dueño si el correo coincide con el del token: así se cierra
 * el vínculo del primer ingreso. El organizador edita a los suyos.
 */
create policy usuarios_editar on public.usuarios
  for update to authenticated
  using (
    public.soy_superadmin()
    or id = public.mi_usuario_id()
    or ("authUserId" is null and lower(email) = public.mi_email())
    or exists (
      select 1 from public.membresias mia, public.membresias suya
      where mia."usuarioId" = public.mi_usuario_id() and mia.rol = 'organizador'
        and suya."usuarioId" = public.usuarios.id
        and suya."salaId" = mia."salaId"
    )
  )
  with check (
    public.soy_superadmin()
    or id = public.mi_usuario_id()
    or ("authUserId" is null and lower(email) = public.mi_email())
    or exists (
      select 1 from public.membresias mia, public.membresias suya
      where mia."usuarioId" = public.mi_usuario_id() and mia.rol = 'organizador'
        and suya."usuarioId" = public.usuarios.id
        and suya."salaId" = mia."salaId"
    )
  );

create policy usuarios_borrar on public.usuarios
  for delete to authenticated using (public.soy_superadmin());

/* salas ─ sólo las propias */

drop policy if exists salas_leer   on public.salas;
drop policy if exists salas_alta   on public.salas;
drop policy if exists salas_editar on public.salas;
drop policy if exists salas_borrar on public.salas;

create policy salas_leer on public.salas
  for select to authenticated using (public.soy_de_la_sala(id));

-- Abrir una sala es de los socios. Quien la crea queda como su
-- organizador. Todos los demás crean reuniones dentro de las que hay.
create policy salas_alta on public.salas
  for insert to authenticated with check (public.puedo_crear_salas());

create policy salas_editar on public.salas
  for update to authenticated
  using (public.organizo_la_sala(id)) with check (public.organizo_la_sala(id));

create policy salas_borrar on public.salas
  for delete to authenticated using (public.organizo_la_sala(id));

/* membresias ─ el organizador arma su equipo */

drop policy if exists membresias_leer   on public.membresias;
drop policy if exists membresias_alta   on public.membresias;
drop policy if exists membresias_editar on public.membresias;
drop policy if exists membresias_borrar on public.membresias;

create policy membresias_leer on public.membresias
  for select to authenticated using (public.soy_de_la_sala("salaId"));

create policy membresias_alta on public.membresias
  for insert to authenticated with check (public.organizo_la_sala("salaId"));

create policy membresias_editar on public.membresias
  for update to authenticated
  using (public.organizo_la_sala("salaId")) with check (public.organizo_la_sala("salaId"));

-- El organizador saca a alguien; cualquiera puede irse por su cuenta.
-- Que no quede sin organizador lo cuida el trigger.
create policy membresias_borrar on public.membresias
  for delete to authenticated
  using (public.organizo_la_sala("salaId") or "usuarioId" = public.mi_usuario_id());

/* solicitudes ─ la pido yo, la resuelve quien organiza */

drop policy if exists solicitudes_leer   on public.solicitudes;
drop policy if exists solicitudes_alta   on public.solicitudes;
drop policy if exists solicitudes_editar on public.solicitudes;
drop policy if exists solicitudes_borrar on public.solicitudes;

-- Veo las mías y las que me toca resolver. Nadie más.
create policy solicitudes_leer on public.solicitudes
  for select to authenticated
  using (
    "usuarioId" = public.mi_usuario_id()
    or public.organizo_la_sala("salaId")
  );

-- Sólo se pide para uno mismo, y sólo si todavía no se es de la sala.
-- La pertenencia se pregunta por función: dentro de un `with check`, una
-- subconsulta que nombre `solicitudes` se resuelve contra la tabla entera
-- y no contra la fila que se está insertando.
create policy solicitudes_alta on public.solicitudes
  for insert to authenticated
  with check (
    "usuarioId" = public.mi_usuario_id()
    and not public.soy_de_la_sala("salaId")
  );

-- Aceptar o rechazar es del organizador de esa sala.
create policy solicitudes_editar on public.solicitudes
  for update to authenticated
  using (public.organizo_la_sala("salaId"))
  with check (public.organizo_la_sala("salaId"));

-- El pedido propio se puede retirar; el organizador también lo descarta.
create policy solicitudes_borrar on public.solicitudes
  for delete to authenticated
  using (
    "usuarioId" = public.mi_usuario_id()
    or public.organizo_la_sala("salaId")
  );

/*
 * reuniones ─ las minutas se ven por sala, salvo tres excepciones:
 * la reunión privada, que sólo ven quienes están en ella; el
 * invitado de afuera, que ve esa reunión y nada más de la sala; y
 * el externo de la sala, que ve sólo aquellas a las que lo convocan.
 */

drop policy if exists reuniones_leer   on public.reuniones;
drop policy if exists reuniones_alta   on public.reuniones;
drop policy if exists reuniones_editar on public.reuniones;
drop policy if exists reuniones_borrar on public.reuniones;

create policy reuniones_leer on public.reuniones
  for select to authenticated
  using (
    public.soy_superadmin()
    or (not privada and public.soy_del_equipo("salaId"))
    or public.mi_usuario_id() = any ("participantesIds")
    or "moderadorId" = public.mi_usuario_id()
  );

-- Crear reuniones puede cualquiera del equipo; crear salas, no. El
-- externo participa de las que lo convocan: no arma la agenda.
create policy reuniones_alta on public.reuniones
  for insert to authenticated with check (public.soy_del_equipo("salaId"));

-- Conducir la reunión —iniciarla, guardar las conclusiones, cerrarla,
-- volcar la minuta— es del equipo de la sala.
--
-- Era del organizador y del moderador designado, y eso dejaba a los
-- demás mirando: la reunión no empezaba hasta que llegaba el que
-- tenía el botón, y la minuta de Gemini sólo la podía cargar él. Es
-- la misma regla con la que se crea una reunión (`reuniones_alta`):
-- si podés armarla, podés conducirla.
--
-- El externo queda afuera —`soy_del_equipo` lo excluye— salvo que lo
-- hayan puesto de moderador a propósito.
create policy reuniones_editar on public.reuniones
  for update to authenticated
  using (public.soy_del_equipo("salaId") or "moderadorId" = public.mi_usuario_id())
  with check (public.soy_del_equipo("salaId") or "moderadorId" = public.mi_usuario_id());

-- Borrar una reunión: el equipo de la sala, quien la creó o quien la
-- modera. Va con `reuniones_editar`: sería raro poder cambiarle la
-- fecha a una reunión y no poder darla de baja.
--
-- Antes era sólo del organizador, y con el equipo como miembros eso
-- dejaba a quien creaba una reunión sin poder darla de baja: la
-- interfaz le ofrecía el botón —ahí sí alcanzaba con haberla
-- creado— y la base se lo rechazaba. Como el borrado se aplica
-- primero en pantalla, la reunión desaparecía y volvía sola al
-- siguiente refresco, que es de las cosas más desconcertantes que
-- puede hacer una aplicación.
create policy reuniones_borrar on public.reuniones
  for delete to authenticated using (
    public.soy_del_equipo("salaId")
    or "creadoPor" = public.mi_usuario_id()
    or "moderadorId" = public.mi_usuario_id()
  );

/*
 * temas ─ el temario es privado; en una reunión, el equipo lo ve.
 *
 * Mientras el tema está en el bloc de notas personal no tiene sala y
 * sólo lo ve quien lo escribió: *"a vos no te interesa ver el temario
 * que yo quiero cargar"*. En cuanto se asigna a una reunión toma la
 * sala de esa reunión y pasa a ser del equipo.
 */

drop policy if exists temas_leer   on public.temas;
drop policy if exists temas_alta   on public.temas;
drop policy if exists temas_editar on public.temas;
drop policy if exists temas_borrar on public.temas;

create policy temas_leer on public.temas
  for select to authenticated
  using (
    ("salaId" is null and "propuestoPor" = public.mi_usuario_id())
    or public.soy_del_equipo("salaId")
    or public.participo_de_la_reunion("reunionId")
    or "propuestoPor" = public.mi_usuario_id()
  );

/*
 * El externo propone y espera: un tema suyo entra como `propuesto` y
 * lo aprueba el socio. Que no pueda escribir 'aprobado' de entrada es
 * lo que hace que "con aprobación" sea una regla y no una costumbre.
 */
create policy temas_alta on public.temas
  for insert to authenticated
  with check (
    (
      ("salaId" is null and "propuestoPor" = public.mi_usuario_id())
      or public.soy_del_equipo("salaId")
      or public.participo_de_la_reunion("reunionId")
    )
    and (
      public.soy_del_equipo("salaId")
      or "salaId" is null
      or estado in ('propuesto', 'banco', 'diferido')
    )
  );

-- El temario de una reunión lo maneja el equipo de esa sala: se
-- agregan temas, se reordenan y se escriben las conclusiones durante
-- la reunión. Escribir la conclusión de un tema es un `update` sobre
-- el tema, así que atarlo a quien lo propuso dejaba a quien toma nota
-- sin poder guardar nada de lo que no fuera suyo.
--
-- `propuestoPor` sigue estando por el bloc de notas personal, donde
-- no hay sala y el tema es de quien lo escribió y de nadie más.
create policy temas_editar on public.temas
  for update to authenticated
  using (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id())
  with check (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id());

create policy temas_borrar on public.temas
  for delete to authenticated
  using (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id());

/* compromisos ─ el responsable actualiza su propio avance */

drop policy if exists compromisos_leer   on public.compromisos;
drop policy if exists compromisos_alta   on public.compromisos;
drop policy if exists compromisos_editar on public.compromisos;
drop policy if exists compromisos_borrar on public.compromisos;

-- El externo llega acá sólo por las suyas: no ve el tablero del equipo.
create policy compromisos_leer on public.compromisos
  for select to authenticated
  using (
    public.soy_del_equipo("salaId")
    or "responsableId" = public.mi_usuario_id()
    or public.participo_de_la_reunion("reunionId")
  );

create policy compromisos_alta on public.compromisos
  for insert to authenticated
  with check (
    public.soy_del_equipo("salaId")
    or public.participo_de_la_reunion("reunionId")
  );

create policy compromisos_editar on public.compromisos
  for update to authenticated
  using (public.organizo_la_sala("salaId") or "responsableId" = public.mi_usuario_id())
  with check (public.organizo_la_sala("salaId") or "responsableId" = public.mi_usuario_id());

-- Borrar es del socio de la sala. Cualquiera crea tareas y actualiza el
-- avance de las suyas, pero sacar una del registro no: si dejó de tener
-- sentido, se marca como hecha o la borra quien conduce el equipo.
-- Borrar queda igual que editar: quien organiza la sala, o el
-- responsable de la tarea.
--
-- Estaba sólo en manos del organizador y no se sostenía: el
-- responsable ya podía reescribirle la acción, el detalle y la fecha
-- —o sea, dejarla irreconocible— así que impedirle borrarla no
-- protegía nada y sí lo obligaba a pedirle a un socio que le limpie
-- una tarea que había cargado él por error.
create policy compromisos_borrar on public.compromisos
  for delete to authenticated
  using (public.organizo_la_sala("salaId") or "responsableId" = public.mi_usuario_id());

/* notificaciones */

drop policy if exists notif_leer   on public.notificaciones;
drop policy if exists notif_alta   on public.notificaciones;
drop policy if exists notif_editar on public.notificaciones;
drop policy if exists notif_borrar on public.notificaciones;

-- El registro de lo que salió por correo es del equipo. El externo
-- recibe los correos de las reuniones a las que va, no el registro.
create policy notif_leer on public.notificaciones
  for select to authenticated using (public.soy_del_equipo("salaId"));

create policy notif_alta on public.notificaciones
  for insert to authenticated with check (public.soy_del_equipo("salaId"));

create policy notif_editar on public.notificaciones
  for update to authenticated
  using (public.soy_del_equipo("salaId")) with check (public.soy_del_equipo("salaId"));

create policy notif_borrar on public.notificaciones
  for delete to authenticated using (public.organizo_la_sala("salaId"));

/* config ─ global, sólo la toca el superadmin */

drop policy if exists config_leer   on public.config;
drop policy if exists config_alta   on public.config;
drop policy if exists config_editar on public.config;

create policy config_leer on public.config
  for select to authenticated using (true);

create policy config_alta on public.config
  for insert to authenticated with check (public.soy_superadmin());

create policy config_editar on public.config
  for update to authenticated
  using (public.soy_superadmin()) with check (public.soy_superadmin());

/* clientes ─ la lista es común a todo el estudio */

-- La ve y la amplía cualquiera. Si el alta fuera sólo de los socios,
-- el resto escribiría el nombre a mano y volveríamos al problema que
-- la tabla resuelve: «Lucky Tours» y «lucky tours» como dos clientes.
alter table public.clientes enable row level security;

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

/* comentarios ─ se ven si se ve la tarea */

alter table public.comentarios enable row level security;

drop policy if exists comentarios_leer   on public.comentarios;
drop policy if exists comentarios_alta   on public.comentarios;
drop policy if exists comentarios_editar on public.comentarios;
drop policy if exists comentarios_borrar on public.comentarios;

-- Se apoya en que `compromisos_leer` ya decide qué tareas son asunto
-- de cada uno: si acá se repitiera esa condición, con el tiempo las
-- dos definiciones de «esta tarea es mía» se separarían.
create policy comentarios_leer on public.comentarios
  for select to authenticated
  using (exists (select 1 from public.compromisos c where c.id = "compromisoId"));

create policy comentarios_alta on public.comentarios
  for insert to authenticated
  with check (
    "autorId" = public.mi_usuario_id()
    and exists (select 1 from public.compromisos c where c.id = "compromisoId")
  );

-- Editar es sobre todo marcar leído, que lo hace quien lee y no quien
-- escribió. Que nadie reescriba el texto ajeno lo cuida la
-- aplicación: acá haría falta comparar contra la fila anterior.
create policy comentarios_editar on public.comentarios
  for update to authenticated
  using (exists (select 1 from public.compromisos c where c.id = "compromisoId"))
  with check (exists (select 1 from public.compromisos c where c.id = "compromisoId"));

create policy comentarios_borrar on public.comentarios
  for delete to authenticated
  using ("autorId" = public.mi_usuario_id());

commit;
