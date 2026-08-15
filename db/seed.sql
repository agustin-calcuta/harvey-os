-- ─────────────────────────────────────────────────────────────
-- Impor Bamas — datos de demostración
--
-- Tres salas para que se entienda el modelo de un vistazo: la
-- gerencial, donde los cuatro socios están a la par, y dos de
-- equipo, donde un socio organiza y su gente propone.
--
-- Las fechas son relativas a la ejecución, así siempre hay una
-- reunión próxima con la agenda abierta.
-- Idempotente: se puede volver a correr para restablecer.
-- ─────────────────────────────────────────────────────────────

begin;

truncate table public.notificaciones, public.compromisos, public.temas,
               public.reuniones, public.solicitudes, public.membresias,
               public.salas, public.usuarios, public.config restart identity cascade;

create temporary table t_fechas on commit drop as
select
  (date_trunc('week', now()) + interval '1 week' + interval '10 hours') as lunes_prox,
  (date_trunc('week', now()) + interval '2 week' + interval '10 hours') as lunes_prox2,
  (date_trunc('week', now()) + interval '10 hours')                     as lunes_esta,
  (date_trunc('week', now()) - interval '2 week' + interval '10 hours') as lunes_menos2;

/* ── Personas ─────────────────────────────────────────────── */

-- `puedeCrearSalas` es de los socios: el resto crea reuniones en las suyas.
insert into public.usuarios (id, nombre, email, alcance, "puedeCrearSalas", cargo, activo, "creadoEn") values
  ('u_matias', 'Matías Harvey', 'matias@harveywillys.com',  'usuario', true, 'Socio · Operaciones',           true, now() - interval '120 days'),
  ('u_tomas',  'Tomás Harvey',  'tomas@harveywillys.com',   'usuario', true, 'Socio · Producto y diseño',     true, now() - interval '120 days'),
  ('u_nico',   'Nicolás Harvey','nicolas@harveywillys.com', 'usuario', true, 'Socio · Comercial y retail',    true, now() - interval '120 days'),
  ('u_lucas',  'Lucas Harvey',  'lucas@harveywillys.com',   'usuario', true, 'Socio · Marketing y comunidad', true, now() - interval '120 days'),
  ('u_renata', 'Renata Sosa',   'renata@harveywillys.com',  'usuario', false,'Diseño · Moldería',             true, now() - interval '90 days'),
  ('u_juli',   'Julieta Paz',   'julieta@harveywillys.com', 'usuario', false,'Diseño · Estampas',             true, now() - interval '90 days'),
  ('u_pedro',  'Pedro Arana',   'pedro@harveywillys.com',   'usuario', false,'Marketing · Contenido',         true, now() - interval '70 days'),
  ('u_cami',   'Camila Ruiz',   'camila@harveywillys.com',  'usuario', false,'Marketing · Community',         true, now() - interval '70 days'),
  -- Entró hace poco y todavía no está en ninguna sala: pidió sumarse
  -- a la de socios y el pedido espera respuesta.
  ('u_sofia',  'Sofía Ledesma', 'sofia@harveywillys.com',   'usuario', false,'Gerencia · Operaciones',        true, now() - interval '9 days');

/* ── Salas ────────────────────────────────────────────────── */

insert into public.salas
  (id, nombre, descripcion, cadencia, "horasCierreAgenda", "cierreManual",
   "duracionReunionDefaultMin", "duracionTemaDefaultMin", "lugarHabitual", lugares,
   "creadaPor", "creadaEn", archivada)
values
  ('sala_gerencial','Socios','La reunión semanal de los cuatro. Acá están todos a la par.',
   'Lunes 10:00', 24, true, 60, 15, 'Showroom Palermo',
   array['Showroom Palermo','Fábrica','Meet'], 'u_matias', now() - interval '130 days', false),
  ('sala_diseno','Diseño','Tomás con el equipo de producto y moldería.',
   'Miércoles 15:00', 12, true, 45, 15, 'Taller',
   array['Taller','Fábrica','Meet'], 'u_tomas', now() - interval '60 days', false),
  ('sala_marketing','Marketing','Lucas con el equipo de contenido y comunidad.',
   'Jueves 11:00', 24, true, 45, 10, null,
   array['Meet','Showroom Palermo'], 'u_lucas', now() - interval '45 days', false);

/* ── Membresías ───────────────────────────────────────────── */

insert into public.membresias (id, "salaId", "usuarioId", rol, desde) values
  -- En la gerencial los cuatro están a la par: todos proponen y todos aprueban.
  ('mb_g_matias','sala_gerencial','u_matias','organizador', now() - interval '130 days'),
  ('mb_g_tomas', 'sala_gerencial','u_tomas', 'organizador', now() - interval '130 days'),
  ('mb_g_nico',  'sala_gerencial','u_nico',  'organizador', now() - interval '130 days'),
  ('mb_g_lucas', 'sala_gerencial','u_lucas', 'organizador', now() - interval '130 days'),
  -- En cada sala de equipo, el socio organiza y su gente propone.
  ('mb_d_tomas', 'sala_diseno',   'u_tomas', 'organizador', now() - interval '60 days'),
  ('mb_d_renata','sala_diseno',   'u_renata','miembro',     now() - interval '60 days'),
  ('mb_d_juli',  'sala_diseno',   'u_juli',  'miembro',     now() - interval '55 days'),
  ('mb_m_lucas', 'sala_marketing','u_lucas', 'organizador', now() - interval '45 days'),
  ('mb_m_pedro', 'sala_marketing','u_pedro', 'miembro',     now() - interval '45 days'),
  ('mb_m_cami',  'sala_marketing','u_cami',  'miembro',     now() - interval '40 days');

/* ── Pedidos de entrada ───────────────────────────────────── */

insert into public.solicitudes (id, "salaId", "usuarioId", mensaje, estado, "creadaEn") values
  ('sol_1', 'sala_gerencial', 'u_sofia',
   'Arranqué en operaciones y me pidieron seguir los temas de la semanal.',
   'pendiente', now() - interval '1 day');

/* ── Reuniones ────────────────────────────────────────────── */

-- Las de socios comparten serie: en «Próximas» se ve sólo la primera, y la
-- siguiente se crea sola al cerrar cada una.
insert into public.reuniones
  (id, "salaId", titulo, fecha, "duracionPrevistaMin", lugar, "moderadorId", "participantesIds",
   estado, privada, recurrencia, "serieId",
   "horasCierreAgenda", "cierreManual", "conclusionesGenerales", observaciones,
   "proximaReunionFecha", "agendaCerradaEn", "iniciadaEn", "cerradaEn", "creadoPor", "creadoEn")
select * from (
  select
    'r_s12', 'sala_gerencial', 'Reunión semanal de socios · #12', f.lunes_menos2 - interval '1 week', 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas'],
    'cerrada', false, 'semanal', 'serie_socios', 24, true,
    'Se aprobó el presupuesto de la campaña de invierno y se definió adelantar el drop cápsula a la primera semana de agosto. Queda pendiente cerrar el proveedor de denim: el taller actual viene con dos semanas de atraso sostenido.',
    'Riesgo abierto: si el taller de denim no confirma entrega antes de fin de mes, hay que activar el proveedor alternativo aunque el costo suba ~12%.',
    f.lunes_menos2, f.lunes_menos2 - interval '1 week 1 day', f.lunes_menos2 - interval '1 week', f.lunes_menos2 - interval '1 week',
    'u_matias', now() - interval '25 days'
  from t_fechas f
  union all
  select
    'r_s13', 'sala_gerencial', 'Reunión semanal de socios · #13', f.lunes_esta, 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas'],
    'cerrada', false, 'semanal', 'serie_socios', 24, true,
    'Se cerró la lista de precios de primavera/verano con un ajuste promedio del 18%. Nicolás presentó los números del local de Córdoba: el punto de equilibrio se alcanza recién en el cuarto mes, se decide seguir adelante igual. El equipo acordó que las reuniones pasen a tener temario cargado con 24 h de anticipación.',
    'Se empieza a usar la plataforma de gestión de reuniones a partir de la semana próxima.',
    date_trunc('day', now()) + interval '16 hours 30 minutes',
    f.lunes_esta - interval '1 day', f.lunes_esta, f.lunes_esta,
    'u_matias', now() - interval '12 days'
  from t_fechas f
  union all
  select
    'r_s14', 'sala_gerencial', 'Reunión semanal de socios · #14',
    date_trunc('day', now()) + interval '16 hours 30 minutes', 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas'],
    'agenda_cerrada', false, 'semanal', 'serie_socios', 24, true, null, null,
    f.lunes_prox, now() - interval '1 day', null, null,
    'u_matias', now() - interval '6 days'
  from t_fechas f
  union all
  select
    'r_s15', 'sala_gerencial', 'Reunión semanal de socios · #15', f.lunes_prox, 60, 'Showroom Palermo',
    'u_matias', array['u_matias','u_tomas','u_nico','u_lucas'],
    'agenda_abierta', false, 'semanal', 'serie_socios', 24, true, null, null,
    f.lunes_prox2, null, null, null,
    'u_matias', now() - interval '2 days'
  from t_fechas f
  union all
  select
    'r_d01', 'sala_diseno', 'Diseño · Avance primavera/verano',
    date_trunc('day', now()) + interval '1 day 15 hours', 45, 'Taller',
    'u_tomas', array['u_tomas','u_renata','u_juli'],
    'agenda_abierta', false, 'unica', null, 12, true, null, null,
    null, null, null, null,
    'u_tomas', now() - interval '3 days'
  from t_fechas f
  union all
  select
    'r_m01', 'sala_marketing', 'Marketing · Calendario de agosto',
    date_trunc('day', now()) - interval '4 days' + interval '11 hours', 45, null,
    'u_lucas', array['u_lucas','u_pedro','u_cami'],
    'cerrada', false, 'unica', null, 24, true,
    'Se definió el calendario de contenido hasta fin de mes. El shooting del drop cápsula se reprograma para la semana que viene y se prioriza contenido de archivo mientras tanto.',
    null,
    date_trunc('day', now()) + interval '3 days 11 hours',
    now() - interval '5 days', now() - interval '4 days', now() - interval '4 days',
    'u_lucas', now() - interval '8 days'
  from t_fechas f
  union all
  -- Privada: la ven Lucas y Pedro. Camila, que también es de Marketing, no.
  select
    'r_m02', 'sala_marketing', 'Seguimiento individual · Pedro',
    date_trunc('day', now()) + interval '2 days 9 hours 30 minutes', 30, 'Meet',
    'u_lucas', array['u_lucas','u_pedro'],
    'agenda_abierta', true, 'unica', null, 24, true, null, null,
    null, null, null, null,
    'u_lucas', now() - interval '1 day'
  from t_fechas f
) x;

/* ── Temas ────────────────────────────────────────────────── */

insert into public.temas
  (id, "salaId", "reunionId", titulo, detalle, importancia, objetivo, "propuestoPor",
   "duracionMin", "duracionRealSeg", estado, orden, conclusiones, "motivoRechazo", "creadoEn")
values
  -- Socios #12
  ('t_1','sala_gerencial','r_s12','Presupuesto campaña invierno','Cierre de números de producción audiovisual, pauta y locaciones.','alta','decision','u_lucas',20,1480,'tratado',0,
   'Se aprueba el presupuesto por $4.200.000 con tope. La producción se hace con el mismo equipo del año pasado. Lucas negocia la pauta directo con Meta para bajar el fee de agencia.',null, now() - interval '26 days'),
  ('t_2','sala_gerencial','r_s12','Atraso del taller de denim','Vienen dos semanas tarde con la entrega de la línea de jeans.','alta','exploratoria','u_tomas',15,1920,'tratado',1,
   'Tomás va a reunirse con el taller para entender si el atraso es puntual o estructural. En paralelo se cotiza un proveedor alternativo en Villa Crespo.',null, now() - interval '26 days'),
  ('t_3','sala_gerencial','r_s12','Adelanto del drop cápsula',null,'media','decision','u_matias',10,640,'tratado',2,
   'Se adelanta a la primera semana de agosto para pegarle al Día del Niño.',null, now() - interval '26 days'),

  -- Socios #13
  ('t_4','sala_gerencial','r_s13','Lista de precios primavera/verano','Ajuste por costos de tela y márgenes objetivo por categoría.','alta','decision','u_nico',20,1680,'tratado',0,
   'Ajuste promedio del 18%. Remeras suben 15%, denim 22%, abrigos 20%. Se mantiene el 10% off por transferencia y las 3 cuotas sin interés.',null, now() - interval '13 days'),
  ('t_5','sala_gerencial','r_s13','Números del local de Córdoba',null,'alta','exploratoria','u_nico',15,1320,'tratado',1,
   'El punto de equilibrio llega al cuarto mes. Se decide sostener la apertura. Nicolás arma un tablero mensual de seguimiento.',null, now() - interval '13 days'),
  ('t_6','sala_gerencial','r_s13','Cómo ordenamos estas reuniones','Dividir cada reunión en tres fases: pre-reunión, reunión y post-reunión.','media','comunicativa','u_matias',15,1140,'tratado',2,
   'Se adopta el esquema de tres fases. El temario se carga con 24 h de anticipación y Matías aprueba qué entra.',null, now() - interval '13 days'),

  -- Socios #14 (lista para correr en vivo)
  ('t_7','sala_gerencial','r_s14','Definir proveedor de denim','Ya están las dos cotizaciones. El alternativo entrega en 3 semanas pero sale 12% más caro. Hay que decidir hoy porque la producción de PV arranca el lunes.','alta','decision','u_tomas',15,null,'aprobado',0,null,null, now() - interval '5 days'),
  ('t_8','sala_gerencial','r_s14','Repaso de tareas abiertas','Bloque fijo al inicio: se abre el tablero y se repasa lo que quedó de antes.','media','informativa','u_matias',10,null,'aprobado',1,null,null, now() - interval '5 days'),
  ('t_9','sala_gerencial','r_s14','Contratación de community manager','Tres candidatos preseleccionados. Rango salarial y a quién reporta.','media','decision','u_lucas',15,null,'aprobado',2,null,null, now() - interval '4 days'),
  ('t_10','sala_gerencial','r_s14','Estado del ecommerce','Métricas del mes y la tasa de abandono en el checkout.','baja','informativa','u_nico',10,null,'aprobado',3,null,null, now() - interval '4 days'),
  -- Quedó fuera de la #14: conserva la sala y pierde la reunión, así el
  -- organizador lo puede incluir y a Tomás le vuelve a aparecer en su temario.
  ('t_11','sala_gerencial',null,'Rediseño del packaging','Tomás trajo tres opciones de bolsa.','baja','exploratoria','u_tomas',10,null,'diferido',0,null,'No entró en los 60 minutos de la #14.', now() - interval '4 days'),

  -- Socios #15 (agenda abierta)
  ('t_12','sala_gerencial','r_s15','Apertura del local de Rosario','Apareció un local sobre Córdoba al 1200. Alquiler alto pero muy buena zona. Necesito que lo veamos entre todos antes de dar una seña.','alta','decision','u_nico',20,null,'aprobado',0,null,null, now() - interval '2 days'),
  ('t_13','sala_gerencial','r_s15','Colaboración con banda para el drop de octubre','Hay charla avanzada con el manager. Definir si vamos y con qué presupuesto.','media','exploratoria','u_lucas',15,null,'aprobado',1,null,null, now() - interval '2 days'),
  ('t_15','sala_gerencial','r_s15','Cambiar el proveedor de envíos','Vienen mal las entregas del interior, hay muchos reclamos.','alta','decision','u_matias',15,null,'propuesto',3,null,null, now() - interval '6 hours'),

  -- Temarios personales: sin sala y sin reunión. Cada uno ve sólo los suyos.
  ('t_b1',null,null,'Revisar el seguro del showroom','Vence en octubre y nunca lo comparamos con otras aseguradoras.','baja','informativa','u_nico',10,null,'banco',0,null,null, now() - interval '9 days'),
  ('t_b2',null,null,'Sistema de talles: sumar XXL','Nos lo piden mucho por Instagram. Impacta en moldería y en costos de tela.','media','exploratoria','u_lucas',15,null,'banco',0,null,null, now() - interval '6 days'),
  ('t_b3',null,null,'Vacaciones de enero: quién cubre qué',null,'media','decision','u_matias',15,null,'banco',0,null,null, now() - interval '2 days'),

  -- Diseño
  ('t_d1','sala_diseno','r_d01','Moldería de la campera oversize','La primera muestra vino corta de manga. Revisar la ficha técnica.','alta','decision','u_renata',15,null,'aprobado',0,null,null, now() - interval '2 days'),
  ('t_d2','sala_diseno','r_d01','Estampas del drop cápsula','Tengo tres opciones para mostrar y elegir entre todos.','media','exploratoria','u_juli',15,null,'propuesto',1,null,null, now() - interval '1 day'),
  ('t_d3',null,null,'Probar el proveedor de avíos nuevo','Mandaron muestras de cierres y botones. Verlas antes de la próxima temporada.','baja','exploratoria','u_renata',10,null,'banco',0,null,null, now() - interval '4 days'),

  -- Marketing
  ('t_m1','sala_marketing','r_m01','Calendario de contenido de agosto',null,'alta','decision','u_lucas',20,1500,'tratado',0,
   'Tres posteos por semana y dos reels. Pedro arma el guion de los reels y Camila el calendario de historias.',null, now() - interval '8 days'),
  ('t_m2','sala_marketing','r_m01','Reprogramación del shooting','El fotógrafo se cayó dos veces.','alta','decision','u_cami',15,1100,'tratado',1,
   'Se reprograma para la semana que viene. Mientras tanto se usa material de archivo.',null, now() - interval '8 days');

/* ── Compromisos ──────────────────────────────────────────── */

insert into public.compromisos
  (id, "salaId", "reunionId", "temaId", accion, detalle, "responsableId", "fechaLimite",
   importancia, estado, avance, "completadoEn", "creadoEn")
values
  ('c_1','sala_gerencial','r_s12','t_1','Cerrar la pauta de Meta sin intermediarios','Negociar directo para eliminar el fee del 15% de agencia.','u_lucas', now() - interval '12 days','media','hecho','Cerrado. Quedó cuenta propia, ahorro estimado de $380.000 por campaña.', now() - interval '14 days', now() - interval '25 days'),
  ('c_2','sala_gerencial','r_s12','t_2','Reunirse con el taller de denim y traer diagnóstico','¿El atraso es puntual o estructural? Traer respuesta con fechas.','u_tomas', now() - interval '6 days','alta','en_curso','Reunión hecha. Falta que el taller mande el cronograma firmado.',null, now() - interval '25 days'),
  ('c_3','sala_gerencial','r_s12','t_2','Cotizar proveedor alternativo de denim',null,'u_matias', now() - interval '3 days','alta','hecho','Cotización recibida: 12% más caro, entrega en 3 semanas.', now() - interval '4 days', now() - interval '25 days'),
  ('c_4','sala_gerencial','r_s12','t_3','Armar el calendario de contenido del drop cápsula',null,'u_lucas', now() - interval '9 days','media','en_curso','Frenado hasta tener las fotos del shooting. El fotógrafo reprogramó dos veces.',null, now() - interval '25 days'),
  ('c_5','sala_gerencial','r_s13','t_4','Cargar la nueva lista de precios en el ecommerce y en el POS',null,'u_nico', now() + interval '2 days','alta','en_curso','Ecommerce listo. Falta el POS de los tres locales.',null, now() - interval '12 days'),
  ('c_6','sala_gerencial','r_s13','t_5','Armar tablero mensual de seguimiento del local de Córdoba','Ventas, ticket promedio, costo fijo y avance al punto de equilibrio.','u_nico', now() + interval '6 days','media','pendiente',null,null, now() - interval '12 days'),
  ('c_7','sala_gerencial','r_s13','t_6','Definir quién aprueba los temas de cada reunión',null,'u_matias', now() - interval '4 days','baja','hecho','Queda Matías como organizador fijo.', now() - interval '5 days', now() - interval '12 days'),
  ('c_8','sala_gerencial','r_s13','t_6','Cargar los temas de la próxima con 24 h de anticipación','Estrenar el esquema acordado en la reunión que viene.','u_matias', now() + interval '1 day','alta','en_curso','Temario de la #14 ya cargado y cerrado.',null, now() - interval '12 days'),
  ('c_9','sala_gerencial','r_s13',null,'Renegociar el alquiler del showroom de Palermo','Vence el contrato en noviembre. Adelantarse a la negociación.','u_matias', now() + interval '20 days','media','pendiente',null,null, now() - interval '12 days'),
  ('c_10','sala_gerencial','r_s12',null,'Definir la campaña de ropa de invierno 2027','Proyecto largo: arranca ahora y cierra recién en cinco meses.','u_lucas', now() + interval '140 days','baja','pendiente',null,null, now() - interval '25 days'),
  -- Suelto, sin reunión
  ('c_11','sala_gerencial',null,null,'Pedir presupuesto de cartelería para Rosario','Surgió por WhatsApp, fuera de reunión.','u_nico', now() + interval '9 days','media','pendiente',null,null, now() - interval '1 day'),

  ('c_d1','sala_diseno',null,null,'Corregir la ficha técnica de la campera oversize',null,'u_renata', now() + interval '4 days','alta','en_curso','Manga corregida, falta revisar el largo de espalda.',null, now() - interval '3 days'),
  ('c_d2','sala_diseno',null,null,'Pedir muestras de tela al proveedor nuevo',null,'u_juli', now() - interval '1 day','media','pendiente',null,null, now() - interval '6 days'),

  ('c_m1','sala_marketing','r_m01','t_m1','Escribir los guiones de los reels de agosto',null,'u_pedro', now() + interval '2 days','alta','en_curso','Dos de cuatro listos.',null, now() - interval '4 days'),
  ('c_m2','sala_marketing','r_m01','t_m1','Armar el calendario de historias',null,'u_cami', now() + interval '1 day','media','pendiente',null,null, now() - interval '4 days'),
  ('c_m3','sala_marketing','r_m01','t_m2','Confirmar fecha nueva con el fotógrafo',null,'u_lucas', now() - interval '2 days','alta','en_curso','No contesta desde el martes.',null, now() - interval '4 days');

/* ── Configuración ────────────────────────────────────────── */

insert into public.config (id, organizacion) values ('global', 'Impor Bamas');

commit;
