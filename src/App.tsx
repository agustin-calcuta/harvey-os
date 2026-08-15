import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Salas from './pages/Salas'
import Reuniones from './pages/Reuniones'
import Temario from './pages/Temario'
import ReunionDetalle from './pages/ReunionDetalle'
import Compromisos from './pages/Compromisos'
import Correos from './pages/Correos'
import Admin from './pages/Admin'

/* HashRouter: GitHub Pages sirve archivos estáticos y no reescribe rutas. */

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Rutas />
      </HashRouter>
    </AppProvider>
  )
}

function Rutas() {
  const { yo, cargando, misSalas, esSuperadmin } = useApp()

  if (cargando) return <Cargando />
  if (!yo) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Sin ninguna sala no hay nada que mostrar en el panel. */}
        <Route index element={misSalas.length ? <Panel /> : <Navigate to="/salas" replace />} />
        <Route path="salas" element={<Salas />} />
        <Route path="reuniones" element={<Reuniones />} />
        <Route path="reuniones/:id" element={<ReunionDetalle />} />
        <Route path="temario" element={<Temario />} />
        <Route path="compromisos" element={<Compromisos />} />
        {/*
          Correos salió de producción: mostraba vistas previas de mensajes
          sin configurar y confundía. El registro sigue estando para
          soporte, que es quien lo necesita para revisar un envío.
        */}
        <Route
          path="correos"
          element={esSuperadmin ? <Correos /> : <Navigate to="/" replace />}
        />
        <Route path="admin" element={<Admin />} />
        {/* La sección de pendientes pasó a ser una vista de Tareas. */}
        <Route path="pendientes" element={<Navigate to="/compromisos" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Cargando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="display text-4xl">Impor Bamas</div>
      <div className="h-px w-32 overflow-hidden bg-borde">
        <div className="h-full w-1/3 animate-pulse bg-signal" />
      </div>
      <div className="label">Cargando</div>
    </div>
  )
}
