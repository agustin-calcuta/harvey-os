/* ─────────────────────────────────────────────────────────────
   Fechas relativas a hoy, para los datos de demostración.

   Los seeds no pueden tener fechas fijas: una demostración con
   reuniones de agosto de 2026 se ve vieja en septiembre. Todo se
   calcula contra el día en que se abre, así que siempre hay una
   reunión próxima con el temario abierto y una que ya pasó.

   Comunes a todos los clientes: lo que cambia entre uno y otro son
   las personas y los temas, no cómo se cuentan los días.
   ───────────────────────────────────────────────────────────── */

const dia = 86400000
const hoy = new Date()

/** Dentro de `dias` (negativo para atrás), a la hora indicada. */
export function en(dias: number, h = 10, m = 0): string {
  const d = new Date(hoy.getTime() + dias * dia)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export function proximoLunes(semanas = 0): string {
  const d = new Date(hoy)
  const delta = (8 - d.getDay()) % 7 || 7
  d.setDate(d.getDate() + delta + semanas * 7)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}

export function lunesPasado(semanasAtras = 1): string {
  const d = new Date(hoy)
  const delta = (d.getDay() + 6) % 7 || 7
  d.setDate(d.getDate() - delta - (semanasAtras - 1) * 7)
  d.setHours(10, 0, 0, 0)
  return d.toISOString()
}
