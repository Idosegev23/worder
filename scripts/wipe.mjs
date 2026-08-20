// מחיקת כל התלמידים, המילים והקטגוריות מ-Supabase.
// אדמינים (role='admin') וקטלוג הפרסים (worder_rewards) נשמרים.
//
// שימוש:
//   node wipe.mjs            → dry-run, רק מדפיס מה יימחק
//   node wipe.mjs --confirm  → מוחק באמת
//
// הרצה מתוך תיקיית הפרויקט (worder/) כדי ש-.env.local יימצא.

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const CONFIRM = process.argv.includes('--confirm')

// --- טעינת .env.local ---
const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const url = env.VITE_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
if (!url || !key) throw new Error('חסר VITE_SUPABASE_URL או מפתח ב-.env.local')
console.log(`🔗 ${url}`)
console.log(env.SUPABASE_SERVICE_ROLE_KEY ? '🔑 service_role' : '🔑 anon (כפוף ל-RLS)')

const sb = createClient(url, key, { auth: { persistSession: false } })

const count = async (table, filter) => {
  let q = sb.from(table).select('*', { count: 'exact', head: true })
  if (filter) q = filter(q)
  const { count: n, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  return n ?? 0
}

// --- ספירה לפני ---
const studentIds = await (async () => {
  const { data, error } = await sb.from('worder_profiles').select('id').eq('role', 'user')
  if (error) throw new Error(`worder_profiles: ${error.message}`)
  return data.map(r => r.id)
})()

const before = {
  'worder_progress': await count('worder_progress'),
  'worder_user_reward_choices': await count('worder_user_reward_choices'),
  'worder_user_benefits': await count('worder_user_benefits'),
  'worder_recordings': await count('worder_recordings'),
  'worder_words': await count('worder_words'),
  'worder_categories': await count('worder_categories'),
  "worder_profiles (role='user')": studentIds.length,
}
const admins = await count('worder_profiles', q => q.eq('role', 'admin'))

console.log('\n📊 יימחק:')
for (const [t, n] of Object.entries(before)) console.log(`   ${String(n).padStart(6)}  ${t}`)
console.log(`\n🛡️  יישמר: ${admins} אדמינים, ${await count('worder_rewards')} פרסים בקטלוג`)

// --- קבצי אודיו ב-Storage ---
const audioPaths = []
for (const uid of studentIds) {
  const { data, error } = await sb.storage.from('recordings').list(uid, { limit: 1000 })
  if (error) { console.warn(`   ⚠️  לא הצלחתי לרשום קבצים של ${uid}: ${error.message}`); continue }
  for (const f of data ?? []) audioPaths.push(`${uid}/${f.name}`)
}
console.log(`   ${String(audioPaths.length).padStart(6)}  קבצי אודיו ב-bucket 'recordings'`)

if (!CONFIRM) {
  console.log('\n🔍 DRY-RUN — שום דבר לא נמחק. הרץ שוב עם --confirm כדי למחוק באמת.')
  process.exit(0)
}

// --- מחיקה בסדר בטוח מבחינת מפתחות זרים ---
console.log('\n🗑️  מוחק...')

const wipe = async (table, filter) => {
  let q = sb.from(table).delete({ count: 'exact' })
  q = filter ? filter(q) : q.not('id', 'is', null)
  const { count: n, error } = await q
  if (error) throw new Error(`${table}: ${error.message}`)
  console.log(`   ✓ ${table}: ${n ?? 0}`)
}

await wipe('worder_progress')
await wipe('worder_user_reward_choices')
await wipe('worder_user_benefits')
await wipe('worder_recordings')

if (audioPaths.length) {
  for (let i = 0; i < audioPaths.length; i += 100) {
    const batch = audioPaths.slice(i, i + 100)
    const { error } = await sb.storage.from('recordings').remove(batch)
    if (error) throw new Error(`storage: ${error.message}`)
  }
  console.log(`   ✓ storage/recordings: ${audioPaths.length} קבצים`)
}

await wipe('worder_words')
await wipe('worder_categories')
await wipe('worder_profiles', q => q.eq('role', 'user'))

console.log('\n✅ בוצע. נותרו:')
console.log(`   אדמינים: ${await count('worder_profiles', q => q.eq('role', 'admin'))}`)
console.log(`   פרסים:   ${await count('worder_rewards')}`)
