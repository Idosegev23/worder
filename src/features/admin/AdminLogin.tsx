import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'

export default function AdminLogin() {
  const nav = useNavigate()
  const adminLogin = useAdmin(s => s.login)
  const [u, setU] = useState('אילנית שגב')
  const [p, setP] = useState('123456')
  const [e, setE] = useState('')

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('worder_profiles')
        .select('*')
        .eq('username', u)
        .eq('password', p)
        .eq('role', 'admin')
        .single()
      
      if (error || !data) {
        setE('שגיאה בזיהוי אדמין')
        return
      }
      adminLogin()
      nav('/admin/dashboard')
    } catch (error) {
      setE('שגיאה בזיהוי אדמין')
    }
  }

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-center">כניסת אדמין</h1>
        <div className="space-y-4">
          <Input
            placeholder="שם משתמש"
            value={u}
            onChange={e => setU(e.target.value)}
          />
          <Input
            placeholder="סיסמה"
            type="password"
            value={p}
            onChange={e => setP(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
          {e && <div className="text-danger text-sm">{e}</div>}
          <Button className="w-full" variant="secondary" onClick={handleLogin}>
            כניסה
          </Button>
          <div className="text-sm text-center text-muted mt-4">
            <Link to="/" className="text-secondary hover:underline">
              חזרה לדף הבית
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}

