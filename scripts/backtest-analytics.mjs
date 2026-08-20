// בדיקה חוזרת של לוגיקת הצבירה מול גיבוי אמיתי — בלי לגעת בפרודקשן.
import { readFileSync } from 'node:fs'
// דורש בנייה מקדימה:
//   npx esbuild src/lib/progressAnalytics.ts --bundle --format=esm --outfile=/tmp/pa.mjs
import { summarizeStudent, hardestWords, formatSince, STATUS_LABEL } from '/tmp/pa.mjs'

const b = JSON.parse(readFileSync('backups/backup-pre-wipe-20260820-095444.json','utf8'))
const words = b.worder_words.map(w => ({ id:w.id, categoryId:w.category_id, en:w.en, he:w.he, active:w.active }))
const prog  = b.worder_progress.map(p => ({ id:p.id, userId:p.user_id, wordId:p.word_id,
  isCorrect:p.is_correct, attempts:p.attempts, lastAnswer:p.last_answer, answeredAt:p.answered_at }))
const users = b.worder_profiles.filter(u => u.role === 'user')
  .map(u => ({ id:u.id, firstName:u.first_name, lastName:u.last_name, role:u.role }))

const byUser = new Map()
for (const p of prog) (byUser.get(p.userId) ?? byUser.set(p.userId, []).get(p.userId)).push(p)

const now = Date.parse('2026-08-20T00:00:00Z')
const summaries = users.map(u => summarizeStudent(u, byUser.get(u.id) ?? [], words, now))
  .filter(s => s.totalAttempts > 0)

console.log(`נתוני מקור: ${prog.length} רשומות · ${words.length} מילים · ${users.length} תלמידים\n`)
console.log('=== לפי תלמידה ===')
for (const s of summaries.sort((a,b)=>b.totalAttempts-a.totalAttempts).slice(0,8)) {
  console.log(`${(s.user.firstName+' '+s.user.lastName).padEnd(18)} ${String(s.totalAttempts).padStart(4)} ניסיונות → ${String(s.toPractice.length).padStart(3)} מילים לתרגול · ${String(s.masteredWords).padStart(3)}/${s.totalWords} · ${String(s.successRate).padStart(3)}% · ${STATUS_LABEL[s.status]} · ${formatSince(s.daysSinceActivity)}`)
}

const totalAttempts = summaries.reduce((a,s)=>a+s.totalAttempts,0)
const totalRows = summaries.reduce((a,s)=>a+s.toPractice.length+s.masteredList.length,0)
console.log(`\n=== הכיווץ ===`)
console.log(`  לפני: ${totalAttempts} שורות (ניסיון בכל שורה)`)
console.log(`  אחרי: ${totalRows} שורות (מילה בכל שורה)`)
console.log(`  יחס:  ${(totalAttempts/totalRows).toFixed(1)}x פחות`)

console.log('\n=== 8 המילים הקשות ביותר בכיתה ===')
for (const w of hardestWords(summaries, 8)) {
  console.log(`  ${w.en.padEnd(14)} ${w.he.padEnd(12)} ${w.studentsFailed} תלמידות · ${w.totalWrong} טעויות`)
}

const bad = summaries.filter(s => s.masteredWords > s.totalWords || s.successRate > 100 || s.progressPercent > 100)
console.log(bad.length ? `\n❌ ${bad.length} חישובים לא תקינים` : '\n✅ כל המספרים בטווח תקין')
