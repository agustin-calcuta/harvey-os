/* ═══════════════════════════════════════════════════════════════
   Conducir una reunión deja de ser un cargo — 21/08/2026

   Antes, iniciar la reunión, escribir las conclusiones de los temas
   y volcar la minuta de Gemini era de quien organiza la sala o de
   quien figura como moderador. En un equipo chico eso no es un
   permiso, es un cuello de botella: la reunión no empieza hasta que
   llega el que tiene el botón.

   Ahora es del equipo de la sala. Es la misma regla con la que se
   crea una reunión (`reuniones_alta` ya pedía `soy_del_equipo`): si
   podés armarla, podés conducirla.

   El externo queda afuera: `soy_del_equipo` excluye el rol
   'externo'. Participa de la reunión que lo convoca, propone temas y
   espera la aprobación —ahí la aprobación es el punto—, pero no
   maneja la agenda ni cierra nada.

   ── Cómo se corre ────────────────────────────────────────────
   Es idempotente: reemplaza las políticas por nombre. Va sobre las
   dos bases, la de Calcuta y la de Imporbamas. En Imporbamas no
   cambia nada en la práctica —los cuatro socios ya son
   organizadores de su sala—, pero las dos bases tienen que decir lo
   mismo que `db/rls.sql`, que es de donde salen.

   Este archivo NO toca `acceso-por-perfil-imporbamas.sql`: aquel
   agrega permisos para el rol anónimo y este reemplaza los del rol
   `authenticated`. Son policies distintas y conviven.
   ═══════════════════════════════════════════════════════════════ */

/* ── reuniones ──────────────────────────────────────────────── */

drop policy if exists reuniones_editar on public.reuniones;

create policy reuniones_editar on public.reuniones
  for update to authenticated
  using (public.soy_del_equipo("salaId") or "moderadorId" = public.mi_usuario_id())
  with check (public.soy_del_equipo("salaId") or "moderadorId" = public.mi_usuario_id());

/*
 * Borrar va con editar: sería raro poder cambiarle la fecha a una
 * reunión y no poder darla de baja. `creadoPor` y `moderadorId` se
 * quedan por si quien la armó dejó de ser del equipo de esa sala.
 */

drop policy if exists reuniones_borrar on public.reuniones;

create policy reuniones_borrar on public.reuniones
  for delete to authenticated using (
    public.soy_del_equipo("salaId")
    or "creadoPor" = public.mi_usuario_id()
    or "moderadorId" = public.mi_usuario_id()
  );

/* ── temas ──────────────────────────────────────────────────────

   `temas_alta` cambia en una sola cláusula: quién puede dar de alta
   un tema ya aprobado. Era el organizador; ahora es el equipo. Sin
   esto, agregar un tema como miembro lo dejaba en «propuesto» y la
   agenda seguía vacía, sin ningún cartel que lo explicara.

   En `temas_editar` y `temas_borrar`, `propuestoPor` se queda por el
   bloc de notas personal: ahí no hay sala y el tema es de quien lo
   escribió y de nadie más.
   ─────────────────────────────────────────────────────────────── */

drop policy if exists temas_alta   on public.temas;
drop policy if exists temas_editar on public.temas;
drop policy if exists temas_borrar on public.temas;

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

create policy temas_editar on public.temas
  for update to authenticated
  using (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id())
  with check (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id());

create policy temas_borrar on public.temas
  for delete to authenticated
  using (public.soy_del_equipo("salaId") or "propuestoPor" = public.mi_usuario_id());

/* ── Comprobación ───────────────────────────────────────────────
   Las cuatro tienen que nombrar `soy_del_equipo`.
   ─────────────────────────────────────────────────────────────── */

select tablename, policyname, qual
from pg_policies
where schemaname = 'public'
  and policyname in ('reuniones_editar', 'reuniones_borrar', 'temas_editar', 'temas_borrar')
order by tablename, policyname;
