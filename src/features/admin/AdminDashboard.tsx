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
    { to: '/admin/rewards', title: 'ניהול מתנות', emoji: '🎁' },
    { to: '/admin/backup', title: 'גיבוי ושחזור', emoji: '💾' }
  ]

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">דשבורד אדמין</h1>
          <Button variant="danger" onClick={handleLogout}>
            יציאה
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map(sec => (
            <Link key={sec.to} to={sec.to}>
              <Card className="hover:opacity-90 transition-opacity cursor-pointer">
                <div className="text-4xl mb-3">{sec.emoji}</div>
                <div className="text-2xl font-bold">{sec.title}</div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

