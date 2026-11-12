import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase, uploadImage } from '../lib/supabase'
import { findMatches } from '../lib/api'

const CATEGORIES = ['Electronics', 'ID / Cards', 'Books & Stationery', 'Bags', 'Clothing', 'Keys', 'Accessories', 'Other']

export default function ReportItem({ user }) {
  const { type } = useParams() // "lost" | "found"
  const nav = useNavigate()
  const [form, setForm] = useState({ item_name: '', description: '', category: CATEGORIES[0], location: '' })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (type !== 'lost' && type !== 'found') return <p>Unknown report type.</p>
  const other = type === 'lost' ? 'found' : 'lost'
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const image_url = file ? await uploadImage(file, user.id) : null
      const { data: item, error: insErr } = await supabase.from('items')
        .insert({ ...form, report_type: type, image_url, user_id: user.id, status: 'active' })
        .select().single()
      if (insErr) throw insErr

      // Compare against active reports of the opposite type.
      const { data: candidates } = await supabase.from('items').select('*')
        .eq('report_type', other).in('status', ['active', 'potential_match'])

      if (candidates?.length) {
        // The match service can be down; the report is already saved, so don't fail the submit.
        const matches = await findMatches(item, candidates).catch(() => [])
        for (const m of matches.filter((x) => x.score >= 0.5)) {
          const cand = candidates.find((c) => c.id === m.item_id)
          const { data: row } = await supabase.from('matches').insert({
            lost_item_id: type === 'lost' ? item.id : cand.id,
            found_item_id: type === 'found' ? item.id : cand.id,
            similarity_score: m.score, match_reason: m.reason, status: 'pending',
          }).select().single()
          if (row) {
            await supabase.from('items').update({ status: 'potential_match' }).in('id', [item.id, cand.id])
            await supabase.from('notifications').insert([
              { user_id: user.id, match_id: row.id, message: `Possible match for your ${type} item “${item.item_name}”.` },
              { user_id: cand.user_id, match_id: row.id, message: `Possible match for your ${other} item “${cand.item_name}”.` },
            ])
          }
        }
      }
      nav('/matches')
    } catch (err) {
      setError(err.message || 'Something went wrong. Try again.')
    } finally { setBusy(false) }
  }

  const input = 'w-full rounded-md border border-line bg-white px-3 py-2'
  const label = 'block space-y-1 text-sm font-medium'
  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-4">
      <h1 className="text-3xl font-extrabold">
        {type === 'lost' ? 'Report a lost item' : 'Report a found item'}
      </h1>
      <label className={label}>Item name
        <input className={input} required placeholder="Black Dell laptop bag" value={form.item_name} onChange={set('item_name')} />
      </label>
      <label className={label}>Description
        <textarea className={input} rows={4} required
          placeholder="Colour, brand, stickers, scratches, what was inside…"
          value={form.description} onChange={set('description')} />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>Category
          <select className={input} value={form.category} onChange={set('category')}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
        <label className={label}>{type === 'lost' ? 'Where did you lose it?' : 'Where did you find it?'}
          <input className={input} required placeholder="Library, 2nd floor" value={form.location} onChange={set('location')} />
        </label>
      </div>
      <label className={label}>Photo (optional)
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
      </label>
      {file && <img src={URL.createObjectURL(file)} alt="Preview" className="h-40 rounded-md object-cover" />}
      {error && <p role="alert" className="text-sm text-lost">{error}</p>}
      <button disabled={busy} className="rounded-md bg-ink px-5 py-3 font-semibold text-white disabled:opacity-60">
        {busy ? 'Saving and matching…' : 'Submit report'}
      </button>
    </form>
  )
}
