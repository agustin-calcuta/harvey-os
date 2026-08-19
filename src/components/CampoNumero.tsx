import { useEffect, useState } from 'react'

/* ─────────────────────────────────────────────────────────────
   Un número que se puede terminar de escribir.

   El problema que resuelve: con `value={n}` y
   `onChange={e => set(Number(e.target.value))}`, borrar el contenido
   convierte el campo en `0` —`Number('')` es cero— y el cero queda
   adelante de lo que se escriba después. Para cambiar 45 por 60 hay
   que seleccionar todo antes de tipear, y si no, sale «045».

   Acá el texto que se está escribiendo vive como texto, y el número
   sale recién cuando hay uno válido. El campo puede quedar vacío
   mientras se piensa, que es lo que uno hace naturalmente al
   corregir un número.
   ───────────────────────────────────────────────────────────── */

export default function CampoNumero({
  valor,
  onChange,
  min,
  step,
  className = 'w-full',
  ...resto
}: {
  valor: number
  onChange: (n: number) => void
  min?: number
  step?: number
  className?: string
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'>) {
  const [texto, setTexto] = useState(String(valor))

  /*
   * Si el valor cambia desde afuera —al abrir el formulario, o al
   * cambiar de sala— se refleja. Mientras se escribe no: comparar
   * contra el número evita pisar «6» con «60» a mitad de camino.
   */
  useEffect(() => {
    if (Number(texto) !== valor) setTexto(String(valor))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor])

  return (
    <input
      {...resto}
      type="number"
      inputMode="numeric"
      min={min}
      step={step}
      className={className}
      value={texto}
      onChange={(e) => {
        const v = e.target.value
        setTexto(v)
        /* Vacío o a medio escribir no se propaga: no hay número todavía. */
        if (v !== '' && Number.isFinite(Number(v))) onChange(Number(v))
      }}
      onBlur={() => {
        /* Al salir, si quedó vacío se vuelve al último valor válido. */
        if (texto === '' || !Number.isFinite(Number(texto))) setTexto(String(valor))
      }}
    />
  )
}
