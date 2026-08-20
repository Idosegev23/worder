export const config = { runtime: 'edge' }

/**
 * פרוקסי ל-OpenAI לכלי העזר של האדמין.
 *
 * המפתח נשאר כאן בשרת (OPENAI_API_KEY, בלי קידומת VITE_). כל קריאה
 * דורשת את סיסמת האדמין, שמאומתת מול worder_profiles — הסיסמה מוקלדת
 * ולא נמצאת בבאנדל של הדפדפן, ולכן זו הגנה אמיתית על הנתיב.
 */

type Task = 'parent-summary' | 'worksheet'

const MODELS: Record<Task, string> = {
  'parent-summary': 'gpt-4o-mini',
  worksheet: 'gpt-4o-mini'
}

const SYSTEM: Record<Task, string> = {
  'parent-summary':
    'את/ה עוזר/ת למורה לאנגלית בבית ספר יסודי בישראל. ' +
    'כתוב/כתבי פסקה קצרה אחת בעברית להורים על התקדמות התלמידה, ' +
    'על בסיס הנתונים בלבד. אל תמציא/י עובדות שלא מופיעות בנתונים. ' +
    'טון חם ועובדתי, בלי סופרלטיבים ריקים. 3-5 משפטים. ' +
    'אם אין מספיק נתונים — אמור/אמרי זאת במפורש במקום להמציא.',
  worksheet:
    'את/ה עוזר/ת למורה לאנגלית בבית ספר יסודי בישראל. ' +
    'קיבלת רשימת מילים אנגלית-עברית. החזר/י JSON בלבד לפי הסכימה שתינתן. ' +
    'המשפטים חייבים להיות פשוטים ומתאימים לכיתה ה, ולהשתמש רק במילים מהרשימה ' +
    'או במילים בסיסיות מאוד. בלי הסברים מחוץ ל-JSON.'
}

async function verifyAdmin(password: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key || !password) return false

  const r = await fetch(
    `${url}/rest/v1/worder_profiles?select=id&role=eq.admin&password=eq.${encodeURIComponent(password)}&limit=1`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` } }
  )
  if (!r.ok) return false
  const rows = (await r.json()) as unknown[]
  return Array.isArray(rows) && rows.length > 0
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  let body: { task?: Task; adminPassword?: string; payload?: unknown; jsonSchema?: unknown }
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { task, adminPassword, payload, jsonSchema } = body

  if (!task || !(task in SYSTEM)) {
    return Response.json({ error: 'Unknown task' }, { status: 400 })
  }

  if (!(await verifyAdmin(adminPassword || ''))) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const openaiBody: Record<string, unknown> = {
    model: MODELS[task],
    messages: [
      { role: 'system', content: SYSTEM[task] },
      { role: 'user', content: JSON.stringify(payload) }
    ],
    temperature: 0.4
  }
  if (jsonSchema) {
    openaiBody.response_format = {
      type: 'json_schema',
      json_schema: { name: 'result', strict: true, schema: jsonSchema }
    }
  }

  const r = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(openaiBody)
  })

  if (!r.ok) {
    const detail = await r.text()
    console.error('OpenAI error:', r.status, detail.slice(0, 300))
    return Response.json({ error: 'OpenAI request failed' }, { status: 502 })
  }

  const data = (await r.json()) as { choices?: { message?: { content?: string } }[] }
  return Response.json({ text: data.choices?.[0]?.message?.content ?? '' })
}
