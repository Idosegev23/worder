import { useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { useNavigate, Link } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'

export default function Register() {
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [pwd, setPwd] = useState('')
  const [err, setErr] = useState('')
  const register = useAuth(s => s.register)
  const nav = useNavigate()

  const handleRegister = async () => {
    if (!first || !last || !pwd) {
      setErr('נא למלא את כל השדות')
      return
    }
    const ok = await register(first, last, pwd)
    if (!ok) {
      setErr('שם משתמש תפוס, נסה וריאציה אחרת')
      return
    }
    nav('/avatar')
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-purple via-pink to-sky relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-sky rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-gold rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/2 w-36 h-36 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-4 border-white/30">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            הרשמה
          </h1>
          <p className="text-muted mt-2">הצטרף להרפתקה!</p>
        </div>
        <div className="space-y-4">
          <Input
            placeholder="שם פרטי"
            value={first}
            onChange={e => setFirst(e.target.value)}
          />
          <Input
            placeholder="שם משפחה"
            value={last}
            onChange={e => setLast(e.target.value)}
          />
          <Input
            placeholder="סיסמה"
            type="password"
            value={pwd}
            onChange={e => setPwd(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleRegister()}
          />
          {err && <div className="text-danger text-sm">{err}</div>}
          <div className="text-xs text-muted mb-2">
            שם המשתמש שלך יהיה: {first && last ? `${first} ${last}` : '...'}
          </div>
          <Button className="w-full" onClick={handleRegister}>
            צור משתמש
          </Button>
          <div className="text-sm text-center text-muted mt-4">
            <Link to="/" className="text-secondary hover:underline">
              חזרה לכניסה
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

