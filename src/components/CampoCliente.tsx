import { useId } from 'react'
import { useApp } from '../store/AppContext'
import { Campo } from './ui'

/* ─────────────────────────────────────────────────────────────
   Para qué cliente es.

   Un `input` con `datalist` y no un `select`: se elige de lo ya
   cargado **o se escribe uno nuevo en el mismo campo**, sin pasar
   por ninguna pantalla de administración. Si dar de alta un cliente
   costara más que tipearlo, nadie lo cargaría y el filtro quedaría
   vacío justo en el trabajo que importa filtrar.

   El campo maneja texto; quien lo usa resuelve el nombre a un
   cliente con `asegurarCliente` al guardar. Así el cliente se crea
   recién cuando el formulario se envía y no mientras se tipea.
   ───────────────────────────────────────────────────────────── */

export default function CampoCliente({
  valor,
  onChange,
  ayuda = 'Opcional. Elegí de la lista o escribí uno nuevo.',
}: {
  valor: string
  onChange: (v: string) => void
  ayuda?: string
}) {
  const { estado } = useApp()
  /* Un id propio por instancia: puede haber dos en la misma pantalla. */
  const lista = useId()

  return (
    <Campo etiqueta="Cliente" ayuda={ayuda}>
      <input
        className="w-full"
        list={lista}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Sin cliente"
      />
      <datalist id={lista}>
        {estado.clientes
          .filter((c) => c.activo)
          .map((c) => (
            <option key={c.id} value={c.nombre} />
          ))}
      </datalist>
    </Campo>
  )
}
