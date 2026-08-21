-- ─────────────────────────────────────────────────────────────
-- Imporbamas — volver a cerrar la base
--
-- Deshace `db/acceso-por-perfil-imporbamas.sql`. Se corre **el
-- mismo día que se enciende el acceso con Google**: a partir de ahí
-- cada uno entra con su cuenta y las políticas de `rls.sql` vuelven
-- a ser las únicas que mandan.
--
-- Antes de correrlo, poner `accesoGoogle: true` en
-- `src/marca/imporbamas.ts` y desplegar. Al revés —cerrar la base
-- con la app todavía entrando por perfil— deja a todos afuera.
-- ─────────────────────────────────────────────────────────────

begin;

do $$
declare t text;
begin
  foreach t in array array[
    'usuarios','salas','membresias','solicitudes','reuniones','temas',
    'compromisos','notificaciones','config','clientes','comentarios'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'abierta_' || t, t);
  end loop;
end $$;

alter default privileges in schema public
  revoke select, insert, update, delete on tables from public;
alter default privileges in schema public
  revoke usage, select on sequences from public;

revoke all on all tables in schema public from public;
revoke all on all sequences in schema public from public;
revoke usage on schema public from public;

commit;
