import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

export default function AdminDashboard() {
  const nav = useNavigate()
  const { isAuthenticated, logout } = useAdmin()

  if (!isAuthenticated) {
    nav('/admin')
    return null
  }

  const handleLogout = () => {
    logout()
    nav('/admin')
  }

  const sections = [
    { to: '/admin/words', title: 'ניהול מילים', emoji: '📝' },
    { to: '/admin/users', title: 'ניהול משתמשים', emoji: '👥' },
    { to: '/admin/progress', title: 'התקדמות תלמידים', emoji: '📊' },
    { to: '/admin/errors', title: 'ניתוח טעויות', emoji: '🔍', highlight: true },
    { to: '/admin/recordings', title: 'הקלטות מישל', emoji: '🎤' },
    { to: '/admin/rewards', title: 'ניהול מתנות', emoji: '🎁' },
    { to: '/admin/backup', title: 'גיבוי ושחזור', emoji: '💾' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">WordQuest</p>
            <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight">
              דשבורד אדמין
            </h1>
            <p className="text-sm text-white/60 mt-1">
              ניהול משתמשים, קטגוריות, פרסים והתקדמות במקום אחד.
            </p>
          </div>
          <Button variant="danger" onClick={handleLogout} className="w-full sm:w-auto justify-center">
            יציאה
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map(sec => (
            <Link key={sec.to} to={sec.to} className="focus:outline-none">
              <Card
                className={`h-full cursor-pointer overflow-hidden border border-white/10 bg-white/5 p-5 backdrop-blur transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-white/10 ${
                  sec.highlight ? 'ring-2 ring-primary/40' : ''
                }`}
              >
                <div className="text-4xl mb-4">{sec.emoji}</div>
                <div className="text-xl font-bold mb-1">{sec.title}</div>
                <p className="text-sm text-white/60">
                  {sec.highlight ? 'הכי מבוקש השבוע' : 'לחצו לניהול מהיר'}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

