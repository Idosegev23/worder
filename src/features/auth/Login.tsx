import { useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const login = useAuth(s => s.login)
  const nav = useNavigate()

  const handleLogin = async () => {
    const ok = await login(username, password)
    if (!ok) {
      setErr('שם משתמש או סיסמה שגויים')
      return
    }
    nav('/avatar')
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-sky via-purple to-pink relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gold rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-pink rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/2 w-36 h-36 bg-purple rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-4 border-white/30">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            ברוכים הבאים ל-WordQuest
          </h1>
          <p className="text-muted mt-2">למידת אנגלית מהנה ומרגשת!</p>
        </div>
        <div className="space-y-4">
          <Input
            placeholder="שם משתמש (למשל: עידו שגב)"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          <Input
            placeholder="סיסמה"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {err && <div className="text-danger text-sm">{err}</div>}
          <Button className="w-full" onClick={handleLogin}>
            התחבר
          </Button>
          <div className="text-sm text-center text-muted mt-4 space-x-2 space-x-reverse">
            <span>משתמש חדש?</span>
            <Link to="/register" className="text-secondary hover:underline">
              הרשמה
            </Link>
            <span>•</span>
            <Link to="/admin" className="text-secondary hover:underline">
              כניסת אדמין
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

