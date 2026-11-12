const API = import.meta.env.VITE_API_URL

/**
 * Agreed contract with the FastAPI developer (confirm with them!):
 * POST /match
 *   body:    { item: {...}, candidates: [{id,item_name,description,category,location,created_at}] }
 *   returns: { matches: [{ item_id, score, reason: { text, category, location, date } }] }
 * score is 0-1.
 */
export async function findMatches(item, candidates) {
  const res = await fetch(`${API}/match`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item, candidates }),
  })
  if (!res.ok) throw new Error('Matching service is unavailable')
  return (await res.json()).matches
}
