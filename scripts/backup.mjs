import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } })

const TABLES = ['worder_profiles','worder_categories','worder_words','worder_progress',
  'worder_rewards','worder_user_reward_choices','worder_user_benefits','worder_recordings']

const dump = {}
for (const t of TABLES) {
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(t).select('*').range(from, from + 999)
    if (error) throw new Error(`${t}: ${error.message}`)
    rows.push(...data)
    if (data.length < 1000) break
  }
  dump[t] = rows
  console.log(`   ${String(rows.length).padStart(6)}  ${t}`)
}

mkdirSync('backups', { recursive: true })
const out = `backups/backup-${process.argv[2]}.json`
writeFileSync(out, JSON.stringify(dump, null, 2))
console.log(`\n💾 ${out}`)
