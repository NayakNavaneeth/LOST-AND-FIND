import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Upload a photo to the item-images bucket and return its public URL.
export async function uploadImage(file, userId) {
  const path = `${userId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`
  const { error } = await supabase.storage.from('item-images').upload(path, file)
  if (error) throw error
  return supabase.storage.from('item-images').getPublicUrl(path).data.publicUrl
}
