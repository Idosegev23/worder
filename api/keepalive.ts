export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const url = process.env.VITE_SUPABASE_URL
  const key = process.env.VITE_SUPABASE_ANON_KEY
  if (!url || !key) {
    return new Response('Missing Supabase env vars', { status: 500 })
  }

  const r = await fetch(`${url}/rest/v1/worder_categories?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` }
  })

  return Response.json({
    ok: r.ok,
    status: r.status,
    pingedAt: new Date().toISOString()
  })
}
