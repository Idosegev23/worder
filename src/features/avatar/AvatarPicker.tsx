import { useState, useEffect } from 'react'
import { useAuth } from '../../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { makeAvatar, availableStyles, AvatarStyle } from '../../lib/dicebear'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'

export default function AvatarPicker() {
  const user = useAuth(s => s.user)
  const updateAvatar = useAuth(s => s.updateAvatar)
  const nav = useNavigate()

  const [style, setStyle] = useState<AvatarStyle>('bottts')
  const [seed, setSeed] = useState('random')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    
    // אתחול ערכים מהמשתמש
    setStyle((user.avatarStyle as AvatarStyle) || 'bottts')
    setSeed(user.avatarSeed || user.id || 'random')
    setLoading(false)
  }, [user, nav])

  useEffect(() => {
    if (!loading && user) {
      try {
        const url = makeAvatar(style, seed)
        setAvatarUrl(url)
        setError('')
      } catch (e) {
        console.error('Avatar generation error:', e)
        setError('שגיאה ביצירת אווטאר')
      }
    }
  }, [style, seed, loading, user])

  const handleSave = async () => {
    await updateAvatar(style, seed)
    nav('/categories')
  }

  const handleSkip = () => {
    nav('/categories')
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <Card>
          <p className="text-muted">טוען...</p>
        </Card>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-gold via-orange-300 to-pink relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-primary rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-sky rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/2 w-36 h-36 bg-secondary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <Card className="w-full max-w-md shadow-2xl relative z-10 border-4 border-white/30">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">🎨</div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            בחר אווטאר
          </h1>
          <p className="text-muted mt-2">תן לעצמך זהות ייחודית!</p>
        </div>
        
        <div className="flex justify-center mb-6">
          {avatarUrl && !error ? (
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-48 h-48 rounded-full bg-white border-8 border-gradient-to-r from-primary to-secondary shadow-2xl hover:scale-110 transition-transform"
              onError={() => setError('שגיאה בטעינת אווטאר')}
            />
          ) : (
            <div className="w-48 h-48 rounded-full bg-white border-8 border-primary/20 flex items-center justify-center shadow-2xl">
              <span className="text-6xl">👤</span>
            </div>
          )}
        </div>

        {error && (
          <div className="text-danger text-sm text-center mb-4">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">סגנון:</label>
            <div className="grid grid-cols-3 gap-2">
              {availableStyles.map(s => (
                <button
                  key={s}
                  onClick={() => setStyle(s)}
                  className={`p-2 rounded-lg border-2 transition-colors text-sm ${
                    style === s ? 'border-primary bg-primary/20' : 'border-surface hover:border-primary/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Seed (לשינוי המראה):</label>
            <input
              type="text"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              className="w-full p-3 rounded-lg bg-bg text-text border border-surface focus:border-primary focus:outline-none"
            />
            <button
              onClick={() => setSeed(Math.random().toString(36).substring(2, 9))}
              className="text-sm text-secondary mt-2 hover:underline"
            >
              🎲 אקראי
            </button>
          </div>

          <div className="space-y-2">
            <Button className="w-full" onClick={handleSave}>
              שמור והמשך
            </Button>
            <button
              onClick={handleSkip}
              className="w-full text-sm text-muted hover:text-secondary"
            >
              דלג (תמשיך עם אווטאר ברירת מחדל)
            </button>
          </div>
        </div>
      </Card>
    </div>
  )
}

