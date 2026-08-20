export const config = { runtime: 'edge' }

/**
 * הקראה — פרוקסי ל-OpenAI TTS.
 *
 * הועבר לשרת כדי שמפתח ה-OpenAI לא ייצרב לבאנדל של הדפדפן.
 * הנתיב הזה לא דורש סיסמה, כי תלמידות משתמשות בו תוך כדי משחק;
 * במקום זאת הוא חסום לטקסט קצר בלבד, כדי שלא ישמש כפרוקסי כללי.
 */

const MAX_CHARS = 120

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'OPENAI_API_KEY not configured' }, { status: 500 })
  }

  let text = ''
  try {
    const body = (await req.json()) as { text?: string }
    text = (body.text || '').trim()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!text) return Response.json({ error: 'Missing text' }, { status: 400 })
  if (text.length > MAX_CHARS) {
    return Response.json({ error: 'Text too long' }, { status: 413 })
  }

  const isHebrew = /[֐-׿]/.test(text)

  const r = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'coral',
      input: text,
      speed: 1.1,
      instructions: isHebrew
        ? 'Speak clearly in Hebrew at a normal pace. Pay attention to nikud (vowel marks) for correct pronunciation.'
        : 'Speak clearly at a normal pace, suitable for children learning English.'
    })
  })

  if (!r.ok) {
    const detail = await r.text()
    console.error('OpenAI TTS error:', r.status, detail.slice(0, 300))
    return Response.json({ error: 'TTS failed' }, { status: 502 })
  }

  return new Response(r.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      // אותה מילה נקראת שוב ושוב — שווה לשמור במטמון
      'Cache-Control': 'public, max-age=86400'
    }
  })
}
