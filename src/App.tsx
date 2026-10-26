import { useState } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { isLoggedIn } from './lib/auth'
import Documents from './pages/Documents'
import Economy from './pages/Economy'
import Loans from './pages/Loans'
import Login from './pages/Login'
import Materials from './pages/Materials'
import Overview from './pages/Overview'
import Projects from './pages/Projects'
import PropertyPage from './pages/PropertyPage'
import Settings from './pages/Settings'

export default function App() {
  const [authed, setAuthed] = useState(isLoggedIn())

  if (!authed) return <Login onDone={() => setAuthed(true)} />
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout onLogout={() => setAuthed(false)} />}>
          <Route index element={<Overview />} />
          <Route path="dokument" element={<Documents />} />
          <Route path="ekonomi" element={<Economy />} />
          <Route path="lan" element={<Loans />} />
          <Route path="projekt" element={<Projects />} />
          <Route path="material" element={<Materials />} />
          <Route path="fastighet/:id" element={<PropertyPage />} />
          <Route path="installningar" element={<Settings />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
