-- ─────────────────────────────────────────────────────────────
-- Imporbamas — base compartida SIN acceso con Google
--
-- ⚠️ ESTO ABRE LA BASE. Léelo entero antes de correrlo.
--
-- Mientras no estén los correos con los que entra cada uno, se
-- entra a la plataforma eligiendo un perfil, sin sesión de Google.
-- Sin sesión no hay token, y sin token las políticas de `rls.sql`
-- —que preguntan por el correo del token— no dejan ver ni escribir
-- nada. Por eso lo que carga uno no lo ve el otro.
--
-- Esto suma un permiso paralelo para las peticiones sin token, para
-- que los cuatro perfiles trabajen sobre los mismos datos.
--
-- ── Lo que hay que saber ──────────────────────────────────────
-- La dirección de la Data API viaja dentro del javascript de la
-- página, que es pública. Con esto corrido, cualquiera que la
-- encuentre puede leer y escribir todo lo que haya en la base. No
-- hay contraseña en el medio: el candado era el login de Google.
--
-- Es una medida para probar entre varios estos días, no para dejar
-- puesta. **Al conectar Google hay que correr `db/acceso-por-perfil-
-- revertir.sql`**, que la vuelve a cerrar.
--
-- No pongas acá nada que no querrías que se vea: mientras esté
-- abierta, las reuniones y las minutas que se carguen están al
-- alcance de quien tenga esa dirección.
-- ─────────────────────────────────────────────────────────────

begin;

/* ── Permisos ─────────────────────────────────────────────── */

-- `public` en Postgres son todos los roles, así que cubre al que
-- use la Data API para las peticiones sin token, se llame como se
-- llame en esta versión de Neon.
grant usage on schema public to public;
grant select, insert, update, delete on all tables in schema public to public;
grant usage, select on all sequences in schema public to public;

alter default privileges in schema public
  grant select, insert, update, delete on tables to public;
alter default privileges in schema public
  grant usage, select on sequences to public;

/* ── Políticas ────────────────────────────────────────────── */

-- Una por tabla, con nombre propio para poder borrarlas de a una.
-- Conviven con las de `rls.sql`: las políticas de Postgres se suman
-- —alcanza con que una permita—, así que quien entre con Google
-- sigue viendo exactamente lo suyo y nada más.
do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','salas','membresias','solicitudes','reuniones','temas',
    'compromisos','notificaciones','config','clientes','comentarios'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'abierta_' || t, t);
    execute format(
      'create policy %I on public.%I for all to public using (true) with check (true)',
      'abierta_' || t, t
    );
  end loop;
end $$;

commit;
