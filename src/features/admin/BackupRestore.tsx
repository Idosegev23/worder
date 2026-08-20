import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { exportAll, importAll } from '../../lib/storage'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

export default function BackupRestore() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  if (!isAuth) {
    nav('/admin')
    return null
  }

  const handleExport = async () => {
    try {
      setIsLoading(true)
      const blob = await exportAll()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wordquest-backup-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('✓ הגיבוי הורד בהצלחה!')
    } catch (e) {
      setStatus('✗ שגיאה בייצוא')
    } finally {
      setIsLoading(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsLoading(true)
      await importAll(file)
      setStatus('✓ הנתונים שוחזרו בהצלחה! יש לרענן את הדף.')
    } catch (err) {
      setStatus('✗ שגיאה בייבוא')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">גיבוי ושחזור</h1>
          <Link to="/admin/dashboard">
            <Button variant="secondary">חזרה</Button>
          </Link>
        </div>

        <Card className="space-y-6 relative overflow-hidden">
          {isLoading && <LoadingOverlay message="מבצע פעולה..." />}
          <div>
            <h2 className="text-2xl font-bold mb-3">ייצוא נתונים</h2>
            <p className="text-muted mb-4">
              הורד קובץ JSON עם כל הנתונים (משתמשים, מילים, התקדמות, מתנות)
            </p>
            <Button onClick={handleExport}>📥 ייצוא JSON</Button>
          </div>

          <hr className="border-surface" />

          <div>
            <h2 className="text-2xl font-bold mb-3">ייבוא נתונים</h2>
            <p className="text-muted mb-4">
              שחזר נתונים מקובץ גיבוי קודם (זה ימחק את כל הנתונים הנוכחיים!)
            </p>
            <label className="inline-block">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button as="span" variant="accent">
                📤 בחר קובץ JSON
              </Button>
            </label>
          </div>

          {status && (
            <div
              className={`p-4 rounded-lg ${
                status.startsWith('✓') ? 'bg-mint/20 text-mint' : 'bg-berry/20 text-berry'
              }`}
            >
              {status}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}



