import { useEffect, useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { getUserBenefits, getUnclaimedBenefitsCount, claimBigPrize, UserBenefit } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { makeAvatar } from '../../lib/dicebear'
import { fireConfetti } from '../../lib/confetti'
import { play } from '../../lib/sounds'

export default function UserProfile() {
  const user = useAuth(s => s.user)
  const nav = useNavigate()
  
  const [benefits, setBenefits] = useState<UserBenefit[]>([])
  const [unclaimedCount, setUnclaimedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }
    loadBenefits()
  }, [user, nav])

  const loadBenefits = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const userBenefits = await getUserBenefits(user.id)
      const count = await getUnclaimedBenefitsCount(user.id)
      setBenefits(userBenefits)
      setUnclaimedCount(count)
    } catch (error) {
      console.error('Error loading benefits:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleClaimBigPrize = async () => {
    if (!user || unclaimedCount < 5 || claiming) return
    
    try {
      setClaiming(true)
      
      // אפקטים!
      play('correct')
      fireConfetti()
      setTimeout(() => fireConfetti(), 300)
      setTimeout(() => fireConfetti(), 600)
      
      await claimBigPrize(user.id)
      
      setShowSuccess(true)
      
      // רענון הנתונים
      setTimeout(() => {
        loadBenefits()
        setShowSuccess(false)
      }, 5000)
      
    } catch (error) {
      console.error('Error claiming big prize:', error)
      alert('שגיאה בקבלת הפרס. אנא נסה שוב.')
    } finally {
      setClaiming(false)
    }
  }

  if (!user) return null

  const avatarUrl = user.avatarStyle && user.avatarSeed 
    ? makeAvatar(user.avatarStyle as any, user.avatarSeed)
    : ''

  if (showSuccess) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-gold via-yellow-300 to-orange-400">
        <Card className="w-full max-w-2xl text-center shadow-2xl border-4 border-gold">
          <div className="text-9xl mb-6 animate-bounce">🎁</div>
          <h1 className="text-6xl font-bold mb-6 text-primary">מזל טוב!</h1>
          <p className="text-3xl mb-6 font-semibold text-secondary">
            זכית בפרס הגדול! 🎉
          </p>
          <p className="text-xl text-muted mb-8">
            תקבל את הפרס בשיעור הקרוב!<br />
            המורה שלך תודיע לך 🎊
          </p>
          <Button 
            className="w-full max-w-md mx-auto text-xl py-6" 
            onClick={() => setShowSuccess(false)}
          >
            סגור
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-sky via-purple to-pink">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg">
            האזור האישי שלי
          </h1>
          <button
            onClick={() => nav('/categories')}
            className="text-white hover:underline text-lg font-semibold"
          >
            חזרה
          </button>
        </div>

        {/* פרטי משתמש */}
        <Card className="mb-6 shadow-2xl">
          <div className="flex items-center gap-6">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-32 h-32 rounded-full border-4 border-primary shadow-xl"
              />
            )}
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-primary mb-2">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-muted text-lg mb-3">@{user.username}</p>
              <Button 
                className="text-sm" 
                onClick={() => nav('/avatar')}
              >
                ערוך אווטאר
              </Button>
            </div>
          </div>
        </Card>

        {/* BenefitsTracker */}
        <Card className="mb-6 shadow-2xl border-4 border-gold">
          <div className="text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-4xl font-bold text-gold mb-4">
              מעקב הטבות
            </h2>
            
            {loading ? (
              <p className="text-muted">טוען...</p>
            ) : (
              <>
                {/* מד התקדמות */}
                <div className="mb-6">
                  <p className="text-2xl font-bold text-primary mb-4">
                    {unclaimedCount} / 5 הטבות
                  </p>
                  
                  {/* אייקונים חזותיים */}
                  <div className="flex justify-center gap-4 mb-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`text-6xl transition-all ${
                          i <= unclaimedCount 
                            ? 'scale-110 animate-pulse' 
                            : 'opacity-30 grayscale'
                        }`}
                      >
                        {i <= unclaimedCount ? '⭐' : '☆'}
                      </div>
                    ))}
                  </div>
                  
                  {/* פס התקדמות */}
                  <div className="w-full bg-surface rounded-full h-8 overflow-hidden border-2 border-gold">
                    <div 
                      className="h-full bg-gradient-to-r from-gold via-yellow-300 to-gold transition-all duration-1000 flex items-center justify-center text-white font-bold"
                      style={{ width: `${(unclaimedCount / 5) * 100}%` }}
                    >
                      {unclaimedCount > 0 && `${Math.round((unclaimedCount / 5) * 100)}%`}
                    </div>
                  </div>
                </div>

                {/* כפתור קבלת פרס גדול */}
                {unclaimedCount >= 5 ? (
                  <div className="bg-gradient-to-r from-gold via-yellow-300 to-gold p-6 rounded-xl border-4 border-yellow-500 animate-pulse">
                    <p className="text-2xl font-bold text-orange-700 mb-4">
                      🎉 יש לך 5 הטבות! 🎉
                    </p>
                    <Button
                      className="w-full max-w-md mx-auto text-2xl py-6 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      onClick={handleClaimBigPrize}
                      disabled={claiming}
                    >
                      {claiming ? '⏳ מעבד...' : '🎁 קבל פרס גדול!'}
                    </Button>
                    <p className="text-sm text-orange-800 mt-3">
                      הפרס יינתן לך בשיעור הקרוב!
                    </p>
                  </div>
                ) : (
                  <div className="bg-sky/20 p-4 rounded-xl">
                    <p className="text-muted">
                      צבור עוד {5 - unclaimedCount} הטבות כדי לקבל פרס גדול! 💪
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        {/* היסטוריית הטבות */}
        <Card className="shadow-2xl">
          <h3 className="text-2xl font-bold text-primary mb-4">
            📜 היסטוריית הטבות
          </h3>
          
          {loading ? (
            <p className="text-muted">טוען...</p>
          ) : benefits.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-6xl mb-4">🎁</div>
              <p className="text-muted text-lg">
                עדיין אין לך הטבות.<br />
                סיים קטגוריה כדי לקבל הטבות!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {benefits.map((benefit) => (
                <div
                  key={benefit.id}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    benefit.claimed 
                      ? 'bg-muted/20 border-muted' 
                      : 'bg-accent/10 border-accent'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-4xl">
                      {benefit.claimed ? '✅' : '⭐'}
                    </div>
                    <div>
                      <p className="font-bold text-lg">
                        הטבה #{benefit.id}
                      </p>
                      <p className="text-sm text-muted">
                        {new Date(benefit.receivedAt).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div>
                    {benefit.claimed ? (
                      <span className="text-muted font-semibold">נוצל ✓</span>
                    ) : (
                      <span className="text-accent font-semibold">פעיל ⭐</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

