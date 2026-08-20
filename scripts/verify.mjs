import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env={}; for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/); if(m) env[m[1]]=m[2].trim()}
const sb=createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}})

const {data:cats}=await sb.from('worder_categories').select('*').order('display_order')
const {data:users}=await sb.from('worder_profiles').select('*').eq('role','user')
const {data:assign}=await sb.from('worder_user_categories').select('*')
const {data:words}=await sb.from('worder_words').select('category_id,en,he,alt_he')

// שכפול של resolveVisibleLeafIds מהאפליקציה
const resolve=(assignedIds,categories)=>{
  const a=new Set(assignedIds), vis=new Set()
  for(const c of categories){
    const isLeaf=!categories.some(x=>x.parent_id===c.id)
    if(!isLeaf) continue
    if(a.has(c.id)||(c.parent_id!==null&&a.has(c.parent_id))) vis.add(c.id)
  }
  return vis
}

console.log('=== מבנה ===')
for(const p of cats.filter(c=>c.parent_id===null)){
  console.log(`${p.display_name}  (#${p.id})`)
  for(const ch of cats.filter(c=>c.parent_id===p.id))
    console.log(`   └─ ${ch.display_name} — ${words.filter(w=>w.category_id===ch.id).length} מילים`)
}

console.log('\n=== מה כל תלמידה רואה ===')
let bad=0
for(const u of users){
  const ids=assign.filter(a=>a.user_id===u.id).map(a=>a.category_id)
  const vis=resolve(ids,cats)
  const total=[...vis].reduce((s,id)=>s+words.filter(w=>w.category_id===id).length,0)
  const ok = vis.size===4 && total===62
  if(!ok) bad++
  console.log(`${ok?'✅':'❌'} ${u.username.padEnd(16)} סיסמה=${u.password}  →  ${vis.size} יחידות, ${total} מילים`)
}

console.log('\n=== תשובות חלופיות ===')
for(const w of words.filter(w=>w.alt_he)) console.log(`   ${w.en} → ${w.he}  [${w.alt_he.join(', ')}]`)

console.log('\n=== שאריות מהמסד הישן ===')
const {count:oldProg}=await sb.from('worder_progress').select('*',{count:'exact',head:true})
const {count:oldRec}=await sb.from('worder_recordings').select('*',{count:'exact',head:true})
console.log(`   progress=${oldProg}  recordings=${oldRec}  קטגוריות=${cats.length}  מילים=${words.length}`)
process.exit(bad?1:0)
