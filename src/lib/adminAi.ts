/**
 * לקוח לכלי ה-AI של האדמין. כל הקריאות עוברות דרך /api/ai,
 * שמחזיק את מפתח OpenAI בשרת ומאמת את סיסמת האדמין.
 */

export type AiTask = 'parent-summary' | 'worksheet'

export async function callAi<T = string>(
  task: AiTask,
  payload: unknown,
  opts: { adminPassword: string | null; jsonSchema?: unknown } 
): Promise<T> {
  if (!opts.adminPassword) {
    throw new Error('חסרה סיסמת אדמין — התחברי מחדש')
  }

  const r = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      task,
      adminPassword: opts.adminPassword,
      payload,
      jsonSchema: opts.jsonSchema
    })
  })

  if (r.status === 401) throw new Error('סיסמת האדמין נדחתה — התחברי מחדש')
  if (!r.ok) {
    const body = await r.json().catch(() => ({}))
    throw new Error((body as { error?: string }).error || `השירות נכשל (${r.status})`)
  }

  const { text } = (await r.json()) as { text: string }
  return (opts.jsonSchema ? JSON.parse(text) : text) as T
}
