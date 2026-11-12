import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export function Badge({ type }) {
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-semibold text-white ${type === 'lost' ? 'bg-lost' : 'bg-found'}`}>
      {type === 'lost' ? 'Lost' : 'Found'}
    </span>
  )
}

export default function Dashboard({ user }) {
  const [items, setItems] = useState([])
  const [mine, setMine] = useState([])
  const [notes, setNotes] = useState([])

  useEffect(() => {
    supabase.from('items').select('*').order('created_at', { ascending: false }).limit(12)
      .then(({ data }) => setItems(data ?? []))
    supabase.from('items').select('id,status').eq('user_id', user.id)
      .then(({ data }) => setMine(data ?? []))
    supabase.from('notifications').select('*').eq('user_id', user.id).eq('is_read', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => setNotes(data ?? []))
  }, [user.id])

  const count = (s) => mine.filter((i) => i.status === s).length

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-3">
        <Link to="/report/lost" className="rounded-md bg-lost px-5 py-3 font-semibold text-white">I lost something</Link>
        <Link to="/report/found" className="rounded-md bg-found px-5 py-3 font-semibold text-white">I found something</Link>
      </div>

      {notes.length > 0 && (
        <section aria-label="New notifications" className="rounded-md border-l-4 border-tag bg-white p-4">
          {notes.map((n) => (
            <p key={n.id}>
              {n.message}{' '}
              <Link to="/matches" className="underline">View matches</Link>
            </p>
          ))}
        </section>
      )}

      <dl className="grid grid-cols-3 gap-4 text-center">
        {[['My reports', mine.length], ['Possible matches', count('potential_match')], ['Returned', count('returned')]].map(([k, v]) => (
          <div key={k} className="rounded-md bg-white p-4">
            <dd className="text-3xl font-extrabold">{v}</dd>
            <dt className="text-sm text-ink/70">{k}</dt>
          </div>
        ))}
      </dl>

      <section>
        <h2 className="mb-3 text-xl font-bold">Recent reports</h2>
        {items.length === 0 && <p>No reports yet. Be the first to report an item.</p>}
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <li key={it.id} className="overflow-hidden rounded-md border border-line bg-white">
              {it.image_url && <img src={it.image_url} alt={it.item_name} className="h-36 w-full object-cover" />}
              <div className="space-y-1 p-3">
                <Badge type={it.report_type} />
                <h3 className="font-bold">{it.item_name}</h3>
                <p className="text-sm text-ink/70">{it.location} · {new Date(it.created_at).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
