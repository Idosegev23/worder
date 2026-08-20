// הזרעת הנתונים החדשים: כיתה ה׳ + 4 יחידות + 62 מילים + 4 תלמידות + שיוך.
// דורש שהמיגרציה (scripts/migration.sql) כבר רצה.
//
//   node scripts/seed.mjs            → dry-run
//   node scripts/seed.mjs --confirm  → כותב באמת

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const CONFIRM = process.argv.includes('--confirm')

const env = {}
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } })

const data = JSON.parse(readFileSync('scripts/seed-data.json', 'utf8'))

// בדיקת מוכנות הסכימה לפני שנוגעים במשהו
{
  const { error } = await sb.from('worder_user_categories').select('id').limit(1)
  if (error) {
    console.error('❌ הטבלה worder_user_categories לא קיימת — הרץ קודם את scripts/migration.sql')
    console.error('  ', error.message)
    process.exit(1)
  }
  const { error: pErr } = await sb.from('worder_categories').select('parent_id').limit(1)
  if (pErr) {
    console.error('❌ העמודה parent_id חסרה — הרץ קודם את scripts/migration.sql')
    console.error('  ', pErr.message)
    process.exit(1)
  }
}

const totalWords = Object.values(data.words).flat().length
console.log('📋 ייווצר:')
console.log(`   1 קטגוריית אב — ${data.parent.display_name}`)
console.log(`   ${data.children.length} יחידות`)
console.log(`   ${totalWords} מילים`)
console.log(`   ${data.users.length} תלמידות: ${data.users.map(u => u.username).join(', ')}`)
console.log(`   ${data.users.length} שיוכים (כל תלמידה → ${data.parent.display_name})`)

if (!CONFIRM) {
  console.log('\n🔍 DRY-RUN — לא נכתב כלום. הרץ עם --confirm.')
  process.exit(0)
}

const ins = async (table, payload) => {
  const { data: rows, error } = await sb.from(table).insert(payload).select()
  if (error) throw new Error(`${table}: ${error.message}`)
  return rows
}

console.log('\n✍️  כותב...')

// 1) קטגוריית האב
const [parent] = await ins('worder_categories', { ...data.parent, parent_id: null })
console.log(`   ✓ אב #${parent.id} ${parent.display_name}`)

// 2) היחידות
const children = await ins('worder_categories',
  data.children.map(c => ({ ...c, parent_id: parent.id })))
const childId = Object.fromEntries(children.map(c => [c.name, c.id]))
children.forEach(c => console.log(`   ✓ יחידה #${c.id} ${c.display_name}`))

// 3) המילים
const wordRows = []
for (const [catName, list] of Object.entries(data.words)) {
  list.forEach(([en, he, altHe], i) => {
    wordRows.push({
      category_id: childId[catName],
      en, he,
      alt_he: altHe ?? null,
      display_order: i,
      active: true
    })
  })
}
const words = await ins('worder_words', wordRows)
console.log(`   ✓ ${words.length} מילים`)

// 4) התלמידות
const users = await ins('worder_profiles', data.users.map(u => ({
  first_name: u.first_name,
  last_name: u.last_name,
  username: u.username,
  password: u.password,
  role: 'user'
})))
users.forEach(u => console.log(`   ✓ ${u.username}`))

// 5) שיוך כל תלמידה לכיתה — מזכה בכל היחידות שתחתיה
await ins('worder_user_categories', users.map(u => ({
  user_id: u.id,
  category_id: parent.id
})))
console.log(`   ✓ ${users.length} שיוכים ל-${parent.display_name}`)

console.log('\n✅ הושלם.')
