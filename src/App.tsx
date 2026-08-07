import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './store/AppContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Panel from './pages/Panel'
import Reuniones from './pages/Reuniones'
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
  const { yo, cargando } = useApp()

  if (cargando) return <Cargando />
  if (!yo) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Panel />} />
        <Route path="reuniones" element={<Reuniones />} />
        <Route path="reuniones/:id" element={<ReunionDetalle />} />
        <Route path="compromisos" element={<Compromisos />} />
        {/* Los pendientes pasaron a ser una vista de Compromisos. */}
        <Route path="pendientes" element={<Navigate to="/compromisos" replace />} />
        <Route path="correos" element={<Correos />} />
        <Route path="admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

function Cargando() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="display text-5xl">Harvey</div>
      <div className="h-px w-32 overflow-hidden bg-borde">
        <div className="h-full w-1/3 animate-pulse bg-signal" />
      </div>
      <div className="label">Cargando</div>
    </div>
  )
}
