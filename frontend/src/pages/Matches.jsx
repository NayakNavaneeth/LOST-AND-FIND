import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function ItemCard({ item, label }) {
  return (
    <div className="flex-1 space-y-1">
      <p className="text-xs font-semibold">{label}</p>
      {item.image_url && <img src={item.image_url} alt={item.item_name} className="h-28 w-full rounded object-cover" />}
      <p className="font-bold">{item.item_name}</p>
      <p className="text-sm">{item.description}</p>
      <p className="text-sm text-ink/70">{item.location}</p>
    </div>
  )
}

export default function Matches({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await supabase.from('matches')
      .select('*, lost:items!matches_lost_item_id_fkey(*), found:items!matches_found_item_id_fkey(*)')
      .order('similarity_score', { ascending: false })
    // RLS should already limit rows; this keeps the page correct either way.
    setRows((data ?? []).filter((m) => m.lost?.user_id === user.id || m.found?.user_id === user.id))
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  async function claim(m) {
    await supabase.from('matches').update({ status: 'claim_pending' }).eq('id', m.id)
    await supabase.from('items').update({ status: 'claim_pending' }).in('id', [m.lost.id, m.found.id])
    load()
  }

  if (loading) return <p>Loading matches…</p>
  if (!rows.length) return <p>No matches yet. We’ll notify you when a report looks like yours.</p>

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Possible matches</h1>
      {rows.map((m) => {
        const pct = Math.round(m.similarity_score * 100)
        const r = m.match_reason || {}
        return (
          <article key={m.id} className="space-y-4 rounded-md border border-line bg-white p-4">
            <div className="flex items-center gap-3">
              <span className="rounded bg-tag px-2 py-1 text-lg font-extrabold">{pct}% match</span>
              <div className="h-2 flex-1 rounded bg-line" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-2 rounded bg-found" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row">
              <ItemCard item={m.lost} label="Lost" />
              <ItemCard item={m.found} label="Found" />
            </div>
            {(r.text != null || r.location != null) && (
              <p className="text-sm text-ink/70">
                Description {Math.round((r.text ?? 0) * 100)}% · Location {Math.round((r.location ?? 0) * 100)}%
                {r.date != null && ` · Date ${Math.round(r.date * 100)}%`}
              </p>
            )}
            {m.status === 'pending' && m.lost.user_id === user.id ? (
              <button onClick={() => claim(m)} className="rounded-md bg-ink px-4 py-2 font-semibold text-white">
                This is mine — request verification
              </button>
            ) : (
              <p className="text-sm font-semibold">
                {m.status === 'claim_pending' ? 'Waiting for security staff to verify ownership.' : m.status === 'returned' ? 'Returned to owner.' : 'Waiting for the owner to claim.'}
              </p>
            )}
          </article>
        )
      })}
    </div>
  )
}
