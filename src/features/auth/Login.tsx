import { useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'
import { IconBook } from '../../shared/ui/icons'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuth(s => s.login)
  const nav = useNavigate()

  const handleLogin = async () => {
    if (!username.trim() || !password) return
    setLoading(true)
    setErr('')
    const ok = await login(username, password)
    setLoading(false)
    if (!ok) {
      setErr('שם משתמש או סיסמה שגויים')
      return
    }
    nav('/avatar')
  }

  return (
    <div className="min-h-screen app-bg grid place-items-center p-6">
      <div className="w-full max-w-md animate-pop-in">
        <Card variant="solid" padding="lg" className="space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-grid place-items-center w-16 h-16 rounded-md2 bg-sun text-ink border-outline border-ink shadow-solid mb-1">
              <IconBook size={30} />
            </div>
            <h1 className="text-[26px] font-bold text-ink tracking-tight leading-tight">
              ברוכים הבאים
            </h1>
            <p className="text-muted text-base font-medium">
              נכנסים, לומדים, נהנים — ולומדים עוד.
            </p>
          </div>

          <div className="space-y-3">
            <Input
              placeholder="שם מלא — למשל: עידו שגב"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
            <Input
              placeholder="סיסמה"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              error={!!err}
            />
            {err && (
              <div className="bg-berry text-ink text-sm font-bold px-3 py-2 rounded-sm2 border-2 border-ink animate-nudge">
                {err}
              </div>
            )}
            <Button
              size="lg"
              fullWidth
              onClick={handleLogin}
              disabled={loading || !username.trim() || !password}
              className="mt-2"
            >
              {loading ? 'בודק…' : 'כניסה'}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-3 text-sm text-muted pt-2">
            <Link to="/register" className="font-bold text-ink underline underline-offset-4 decoration-2">
              משתמש חדש? הרשמה
            </Link>
            <span className="text-muted">·</span>
            <Link to="/admin" className="font-medium hover:text-ink transition-colors">
              כניסת אדמין
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
