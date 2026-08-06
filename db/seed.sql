-- ─────────────────────────────────────────────────────────────
-- Harvey OS — datos de demostración
--
-- Las fechas son relativas a la ejecución, así la vista previa
-- siempre muestra una reunión próxima con la agenda abierta.
-- Idempotente: se puede volver a correr para restablecer.
-- ─────────────────────────────────────────────────────────────

begin;

truncate table public.notificaciones, public.compromisos, public.temas,
               public.reuniones, public.usuarios, public.config restart identity cascade;

/* Fechas ancla */
create temporary table t_fechas on commit drop as
select
  date_trunc('day', now()) as hoy,
  -- Próximo lunes 10:00
  (date_trunc('week', now()) + interval '1 week' + interval '10 hours') as lunes_prox,
  (date_trunc('week', now()) + interval '2 week' + interval '10 hours') as lunes_prox2,
  (date_trunc('week', now()) - interval '0 week' + interval '10 hours') as lunes_esta,
  (date_trunc('week', now()) - interval '2 week' + interval '10 hours') as lunes_menos2;

/* ── Equipo ───────────────────────────────────────────────── */

insert into public.usuarios (id, nombre, email, rol, cargo, activo, "creadoEn") values
  ('u_matias',  'Matías Harvey',        'matias@harveywillys.com',   'organizador', 'Socio · Operaciones',        true, now() - interval '120 days'),
  ('u_tomas',   'Tomás Harvey',         'tomas@harveywillys.com',    'miembro',     'Socio · Producto y diseño',  true, now() - interval '120 days'),
  ('u_nico',    'Nicolás Harvey',       'nicolas@harveywillys.com',  'miembro',     'Socio · Comercial y retail', true, now() - interval '120 days'),
  ('u_lucas',   'Lucas Harvey',         'lucas@harveywillys.com',    'miembro',     'Socio · Marketing y comunidad', true, now() - interval '120 days'),
  ('u_fran',    'Francisco Lebermann',  'francisco@calcuta.com',     'admin',       'Calcuta · Consultoría',      true, now() - interval '140 days'),
  ('u_agustin', 'Agustín Ducculi',      'aguducculi@gmail.com',      'admin',       'Calcuta · Tecnología',       true, now() - interval '140 days');

/* ── Reuniones ────────────────────────────────────────────── */

insert into public.reuniones
  (id, titulo, fecha, "duracionPrevistaMin", lugar, "moderadorId", "participantesIds",
   estado, "horasCierreAgenda", "conclusionesGenerales", observaciones,
   "proximaReunionFecha", "agendaCerradaEn", "iniciadaEn", "cerradaEn", "creadoPor", "creadoEn")
select * from (
  select
    'r_s12', 'Reunión semanal de socios · #12', f.lunes_menos2 - interval '1 week', 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas','u_fran'],
    'cerrada', 24,
    'Se aprobó el presupuesto de la campaña de invierno y se definió adelantar el drop cápsula a la primera semana de agosto. Queda pendiente cerrar el proveedor de denim: el taller actual viene con dos semanas de atraso sostenido.',
    'Riesgo abierto: si el taller de denim no confirma entrega antes de fin de mes, hay que activar el proveedor alternativo aunque el costo suba ~12%.',
    f.lunes_menos2, f.lunes_menos2 - interval '1 week 1 day', f.lunes_menos2 - interval '1 week', f.lunes_menos2 - interval '1 week',
    'u_matias', now() - interval '25 days'
  from t_fechas f
  union all
  select
    'r_s13', 'Reunión semanal de socios · #13', f.lunes_esta, 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas','u_fran'],
    'cerrada', 24,
    'Se cerró la lista de precios de primavera/verano con un ajuste promedio del 18%. Nicolás presentó los números del local de Córdoba: el punto de equilibrio se alcanza recién en el cuarto mes, se decide seguir adelante igual. El equipo acordó que las reuniones pasen a tener temario cargado con 24 h de anticipación.',
    'Se acordó probar la plataforma de gestión de reuniones que está armando Calcuta a partir de la semana próxima.',
    date_trunc('day', now()) + interval '16 hours 30 minutes',
    f.lunes_esta - interval '1 day', f.lunes_esta, f.lunes_esta,
    'u_matias', now() - interval '12 days'
  from t_fechas f
  union all
  select
    'r_s14', 'Reunión semanal de socios · #14',
    date_trunc('day', now()) + interval '16 hours 30 minutes', 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas','u_fran','u_agustin'],
    'agenda_cerrada', 24, null, null,
    f.lunes_prox, now() - interval '1 day', null, null,
    'u_matias', now() - interval '6 days'
  from t_fechas f
  union all
  select
    'r_s15', 'Reunión semanal de socios · #15', f.lunes_prox, 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas','u_fran'],
    'agenda_abierta', 24, null, null,
    f.lunes_prox2, null, null, null,
    'u_matias', now() - interval '2 days'
  from t_fechas f
  union all
  select
    'r_s16', 'Reunión semanal de socios · #16', f.lunes_prox2, 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas'],
    'borrador', 24, null, null,
    null, null, null, null,
    'u_matias', now() - interval '1 day'
  from t_fechas f
) x;

/* ── Temas ────────────────────────────────────────────────── */

insert into public.temas
  (id, "reunionId", titulo, detalle, importancia, objetivo, "propuestoPor",
   "duracionMin", "duracionRealSeg", estado, orden, conclusiones, "motivoRechazo", "creadoEn")
values
  -- #12
  ('t_1','r_s12','Presupuesto campaña invierno','Cierre de números de producción audiovisual, pauta y locaciones.','alta','decision','u_lucas',20,1480,'tratado',0,
   'Se aprueba el presupuesto por $4.200.000 con tope. La producción se hace con el mismo equipo del año pasado. Lucas negocia la pauta directo con Meta para bajar el fee de agencia.',null, now() - interval '26 days'),
  ('t_2','r_s12','Atraso del taller de denim','Vienen dos semanas tarde con la entrega de la línea de jeans.','alta','exploratoria','u_tomas',15,1920,'tratado',1,
   'Tomás va a reunirse con el taller para entender si el atraso es puntual o estructural. En paralelo se cotiza un proveedor alternativo en Villa Crespo.',null, now() - interval '26 days'),
  ('t_3','r_s12','Adelanto del drop cápsula',null,'media','decision','u_matias',10,640,'tratado',2,
   'Se adelanta a la primera semana de agosto para pegarle al Día del Niño.',null, now() - interval '26 days'),

  -- #13
  ('t_4','r_s13','Lista de precios primavera/verano','Ajuste por costos de tela y márgenes objetivo por categoría.','alta','decision','u_nico',20,1680,'tratado',0,
   'Ajuste promedio del 18%. Remeras suben 15%, denim 22%, abrigos 20%. Se mantiene el 10% off por transferencia y las 3 cuotas sin interés.',null, now() - interval '13 days'),
  ('t_5','r_s13','Números del local de Córdoba',null,'alta','exploratoria','u_nico',15,1320,'tratado',1,
   'El punto de equilibrio llega al cuarto mes. Se decide sostener la apertura. Nicolás arma un tablero mensual de seguimiento.',null, now() - interval '13 days'),
  ('t_6','r_s13','Cómo ordenamos estas reuniones','Propuesta de Calcuta: pre-reunión, reunión y post-reunión.','media','comunicativa','u_fran',15,1140,'tratado',2,
   'Se adopta el esquema de tres fases. El temario se carga con 24 h de anticipación y Matías aprueba qué entra. Calcuta arma la plataforma.',null, now() - interval '13 days'),

  -- #14 (lista para correr en vivo)
  ('t_7','r_s14','Definir proveedor de denim','Ya están las dos cotizaciones. El alternativo entrega en 3 semanas pero sale 12% más caro. Hay que decidir hoy porque la producción de PV arranca el lunes.','alta','decision','u_tomas',15,null,'aprobado',0,null,null, now() - interval '5 days'),
  ('t_8','r_s14','Repaso de compromisos abiertos','Bloque fijo al inicio: se abre el tablero de pendientes y se repasa lo que quedó de reuniones anteriores.','media','informativa','u_matias',10,null,'aprobado',1,null,null, now() - interval '5 days'),
  ('t_9','r_s14','Contratación de community manager','Tres candidatos preseleccionados. Rango salarial y a quién reporta.','media','decision','u_lucas',15,null,'aprobado',2,null,null, now() - interval '4 days'),
  ('t_10','r_s14','Estado del ecommerce','Métricas del mes y la tasa de abandono en el checkout.','baja','informativa','u_nico',10,null,'aprobado',3,null,null, now() - interval '4 days'),
  ('t_11','r_s14','Rediseño del packaging','Tomás trajo tres opciones de bolsa.','baja','exploratoria','u_tomas',10,null,'diferido',4,null,'No entra en los 60 minutos. Pasa a la próxima.', now() - interval '4 days'),

  -- #15 (agenda abierta)
  ('t_12','r_s15','Apertura del local de Rosario','Apareció un local sobre Córdoba al 1200. Alquiler alto pero muy buena zona. Necesito que lo veamos entre todos antes de dar una seña.','alta','decision','u_nico',20,null,'aprobado',0,null,null, now() - interval '2 days'),
  ('t_13','r_s15','Colaboración con banda para el drop de octubre','Hay charla avanzada con el manager. Definir si vamos y con qué presupuesto.','media','exploratoria','u_lucas',15,null,'aprobado',1,null,null, now() - interval '2 days'),
  ('t_14','r_s15','Rediseño del packaging','Viene diferido de la #14. Tres opciones de bolsa para elegir.','baja','decision','u_tomas',10,null,'propuesto',2,null,null, now() - interval '1 day'),
  ('t_15','r_s15','Sistema de talles: sumar XXL','Nos lo piden mucho por Instagram. Impacta en moldería y en costos de tela.','media','exploratoria','u_lucas',15,null,'propuesto',3,null,null, now() - interval '1 day'),
  ('t_16','r_s15','Cambiar el proveedor de envíos','Vienen mal las entregas del interior, hay muchos reclamos.','alta','decision','u_matias',15,null,'propuesto',4,null,null, now() - interval '6 hours');

/* ── Compromisos ──────────────────────────────────────────── */

insert into public.compromisos
  (id, "reunionId", "temaId", accion, detalle, "responsableId", "fechaLimite",
   importancia, estado, avance, "completadoEn", "creadoEn")
values
  ('c_1','r_s12','t_1','Cerrar la pauta de Meta sin intermediarios','Negociar directo para eliminar el fee del 15% de agencia.','u_lucas', now() - interval '12 days','media','hecho','Cerrado. Quedó cuenta propia, ahorro estimado de $380.000 por campaña.', now() - interval '14 days', now() - interval '25 days'),
  ('c_2','r_s12','t_2','Reunirse con el taller de denim y traer diagnóstico','¿El atraso es puntual o estructural? Traer respuesta con fechas.','u_tomas', now() - interval '6 days','alta','en_curso','Reunión hecha. Falta que el taller mande el cronograma firmado.',null, now() - interval '25 days'),
  ('c_3','r_s12','t_2','Cotizar proveedor alternativo de denim',null,'u_matias', now() - interval '3 days','alta','hecho','Cotización recibida: 12% más caro, entrega en 3 semanas.', now() - interval '4 days', now() - interval '25 days'),
  ('c_4','r_s12','t_3','Armar el calendario de contenido del drop cápsula',null,'u_lucas', now() - interval '9 days','media','bloqueado','Frenado hasta tener las fotos del shooting. El fotógrafo reprogramó dos veces.',null, now() - interval '25 days'),
  ('c_5','r_s13','t_4','Cargar la nueva lista de precios en el ecommerce y en el POS',null,'u_nico', now() + interval '2 days','alta','en_curso','Ecommerce listo. Falta el POS de los tres locales.',null, now() - interval '12 days'),
  ('c_6','r_s13','t_5','Armar tablero mensual de seguimiento del local de Córdoba','Ventas, ticket promedio, costo fijo y avance al punto de equilibrio.','u_nico', now() + interval '6 days','media','pendiente',null,null, now() - interval '12 days'),
  ('c_7','r_s13','t_6','Definir quién aprueba los temas de cada reunión',null,'u_matias', now() - interval '4 days','baja','hecho','Queda Matías como organizador fijo.', now() - interval '5 days', now() - interval '12 days'),
  ('c_8','r_s13','t_6','Presentar la plataforma de gestión de reuniones',null,'u_agustin', now() + interval '1 day','alta','en_curso','Primera versión funcionando. Se presenta en la próxima reunión.',null, now() - interval '12 days'),
  ('c_9','r_s13',null,'Renegociar el alquiler del showroom de Palermo','Vence el contrato en noviembre. Adelantarse a la negociación.','u_matias', now() + interval '20 days','media','pendiente',null,null, now() - interval '12 days'),
  ('c_10','r_s12',null,'Definir la campaña de ropa de invierno 2027','Proyecto largo: arranca ahora y cierra recién en cinco meses.','u_lucas', now() + interval '140 days','baja','pendiente',null,null, now() - interval '25 days');

/* ── Configuración ────────────────────────────────────────── */

insert into public.config (id) values ('global');

commit;
