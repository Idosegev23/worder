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
    <div className="min-h-screen grid place-items-center p-6 app-bg relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
      </div>
      
      <Card className="w-full max-w-md shadow-solid relative z-10 border-4 border-white/30 p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-3">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-4xl font-bold app-bg bg-clip-text text-transparent">
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
          {err && (
            <div className="rounded-lg border border-berry/40 bg-berry/10 text-berry text-sm px-3 py-2">
              {err}
            </div>
          )}
          <div className="text-xs text-muted mb-2">
            שם המשתמש שלך יהיה: {first && last ? `${first} ${last}` : '...'}
          </div>
          <Button className="w-full py-3 text-lg font-semibold rounded-sm2" onClick={handleRegister}>
            צור משתמש
          </Button>
          <div className="text-sm text-center text-muted mt-4">
            <Link to="/" className="text-berry hover:underline">
              חזרה לכניסה
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

