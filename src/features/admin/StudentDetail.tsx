import { useState } from 'react'
import { Category } from '../../lib/supabase'
import {
  StudentSummary,
  formatSince,
  parentSummaryPayload,
  STATUS_LABEL,
  STATUS_TONE
} from '../../lib/progressAnalytics'
import { callAi } from '../../lib/adminAi'
import { useAdmin } from '../../store/useAdmin'
import { Button } from '../../shared/ui/Button'
import { openWorksheet } from './worksheet'

/**
 * פירוט תלמידה. מחליף את היומן הכרונולוגי הישן — כל שורה כאן היא
 * מילה, לא ניסיון, וברירת המחדל היא מה שצריך תרגול.
 */

export default function StudentDetail({
  summary,
  categories,
  onClose
}: {
  summary: StudentSummary
  categories: Category[]
  onClose: () => void
}) {
  const adminPassword = useAdmin(s => s.password)
  const [showMastered, setShowMastered] = useState(false)

  const [parentText, setParentText] = useState<string | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isBuilding, setIsBuilding] = useState(false)

  // משפטי ההשלמה הם הרובד היחיד שמרוויח מ-AI. אם הוא נופל,
  // הדף עדיין נוצר עם שני תרגילי התרגום שנבנים בקוד.
  const buildWorksheet = async () => {
    setIsBuilding(true)
    setAiError(null)
    const words = summary.toPractice.map(w => ({ en: w.en, he: w.he }))
    let sentences
    try {
      const res = await callAi<{ sentences: { sentence: string; answer: string }[] }>(
        'worksheet',
        { words: words.slice(0, 10), הוראה: 'משפט אחד לכל מילה, עם ___ במקום המילה' },
        {
          adminPassword,
          jsonSchema: {
            type: 'object',
            additionalProperties: false,
            required: ['sentences'],
            properties: {
              sentences: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['sentence', 'answer'],
                  properties: { sentence: { type: 'string' }, answer: { type: 'string' } }
                }
              }
            }
          }
        }
      )
      sentences = res.sentences
    } catch (e) {
      console.warn('Worksheet AI enrichment failed, printing basic sheet:', e)
    }
    openWorksheet({ title: `תרגול — ${summary.user.firstName}`, words, sentences })
    setIsBuilding(false)
  }

  const generateSummary = async () => {
    setIsWriting(true)
    setAiError(null)
    try {
      const text = await callAi<string>(
        'parent-summary',
        parentSummaryPayload(summary, categories),
        { adminPassword }
      )
      setParentText(text)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'יצירת הסיכום נכשלה')
    } finally {
      setIsWriting(false)
    }
  }

  const copy = async () => {
    if (!parentText) return
    await navigator.clipboard.writeText(parentText)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="space-y-5">
      {/* מספרים */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-xs font-bold text-ink border-2 border-ink rounded-pill px-2.5 py-0.5 ${STATUS_TONE[summary.status]}`}>
          {STATUS_LABEL[summary.status]}
        </span>
        <Stat label="ידעה" value={`${summary.masteredWords}/${summary.totalWords}`} />
        <Stat label="הצלחה" value={summary.totalAttempts > 0 ? `${summary.successRate}%` : '—'} />
        <Stat label="פעילות" value={formatSince(summary.daysSinceActivity)} />
      </div>

      {/* לתרגול */}
      <section>
        <h3 className="text-sm font-bold text-ink mb-2">
          לתרגול ({summary.toPractice.length})
        </h3>
        {summary.toPractice.length === 0 ? (
          <p className="text-sm text-muted">
            {summary.totalAttempts === 0 ? 'עוד לא שיחקה.' : 'אין מילים שנכשלו.'}
          </p>
        ) : (
          <div className="rounded-sm2 border-2 border-ink overflow-hidden">
            {summary.toPractice.map((w, i) => (
              <div
                key={w.wordId}
                className={`px-3 py-2 flex items-center gap-3 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-ink text-sm truncate" dir="ltr">{w.en}</div>
                  <div className="text-xs text-muted truncate">
                    {w.he}
                    {w.wrongAnswers.length > 0 && (
                      <> · ענתה: {w.wrongAnswers.join(', ')}</>
                    )}
                  </div>
                </div>
                {w.mastered && (
                  <span className="shrink-0 text-[11px] font-bold text-ink bg-mint border-2 border-ink rounded-pill px-2">
                    בסוף ידעה
                  </span>
                )}
                <span className="shrink-0 text-xs font-bold text-ink bg-berry border-2 border-ink rounded-pill px-2 py-0.5">
                  {w.wrongCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* יודעת — מקופל */}
      <section>
        <button
          onClick={() => setShowMastered(v => !v)}
          className="text-sm font-bold text-ink underline underline-offset-4 decoration-2"
        >
          {showMastered ? 'הסתירי' : 'הציגי'} מילים שידעה מיד ({summary.masteredList.length})
        </button>
        {showMastered && summary.masteredList.length > 0 && (
          <p className="mt-2 text-sm text-muted leading-relaxed" dir="ltr">
            {summary.masteredList.map(w => w.en).join(' · ')}
          </p>
        )}
      </section>

      {/* כלי עזר */}
      <section className="space-y-3 pt-1">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={buildWorksheet}
            disabled={summary.toPractice.length === 0 || isBuilding}
          >
            {isBuilding ? 'מכין…' : '🖨️ דף תרגול'}
          </Button>
          <Button size="sm" onClick={generateSummary} disabled={isWriting}>
            {isWriting ? 'כותב…' : '✉️ סיכום להורים'}
          </Button>
        </div>

        {aiError && (
          <div className="bg-berry border-2 border-ink rounded-sm2 px-3 py-2 text-sm font-bold text-ink">
            {aiError}
          </div>
        )}

        {parentText !== null && (
          <div className="space-y-2">
            <p className="text-xs text-muted font-medium">
              טיוטה — קראי ותקני לפני ששולחת.
            </p>
            <textarea
              value={parentText}
              onChange={e => setParentText(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 rounded-sm2 bg-surface text-ink border-outline border-ink shadow-solid-sm focus:outline-none text-sm leading-relaxed"
            />
            <Button size="sm" variant="accent" onClick={copy}>
              {copied ? '✓ הועתק' : 'העתקי'}
            </Button>
          </div>
        )}
      </section>

      <Button variant="ghost" fullWidth onClick={onClose}>סגירה</Button>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-ink bg-track border-2 border-ink rounded-pill px-2.5 py-0.5">
      <span className="text-muted font-medium">{label}</span> {value}
    </span>
  )
}
