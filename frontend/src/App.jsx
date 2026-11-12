import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ReportItem from './pages/ReportItem'
import Matches from './pages/Matches'

const link = ({ isActive }) =>
  `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-ink text-white' : 'hover:bg-line'}`

export default function App() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <p className="p-8">Loading…</p>
  if (!session) return <Login />

  const user = session.user
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-3">
          <span className="mr-4 font-display text-xl font-extrabold">
            Campus<span className="bg-tag px-1">Find</span>
          </span>
          <NavLink to="/" end className={link}>Dashboard</NavLink>
          <NavLink to="/report/lost" className={link}>I lost something</NavLink>
          <NavLink to="/report/found" className={link}>I found something</NavLink>
          <NavLink to="/matches" className={link}>My matches</NavLink>
          <button onClick={() => supabase.auth.signOut()}
            className="ml-auto text-sm underline">Sign out</button>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Dashboard user={user} />} />
          <Route path="/report/:type" element={<ReportItem user={user} />} />
          <Route path="/matches" element={<Matches user={user} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  )
}
