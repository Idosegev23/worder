import { useEffect, useState } from 'react'
import { useAuth } from '../../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { getUserBenefits, getUnclaimedBenefitsCount, claimBigPrize, UserBenefit } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { makeAvatar } from '../../lib/dicebear'
import { fireConfetti } from '../../lib/confetti'
import { play } from '../../lib/sounds'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

export default function UserProfile() {
  const user = useAuth(s => s.user)
  const nav = useNavigate()
  
  const [benefits, setBenefits] = useState<UserBenefit[]>([])
  const [unclaimedCount, setUnclaimedCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

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
      setLoadError(null)
      const userBenefits = await getUserBenefits(user.id)
      const count = await getUnclaimedBenefitsCount(user.id)
      setBenefits(userBenefits)
      setUnclaimedCount(count)
    } catch (error) {
      console.error('Error loading benefits:', error)
      setLoadError('לא הצלחנו לטעון את ההטבות כרגע. נסו שוב.')
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
      <div className="p-6">
        <Card className="w-full text-center shadow-2xl border-4 border-gold bg-gradient-to-br from-gold/20 via-yellow-300/20 to-orange-400/20">
          <div className="text-8xl mb-6 animate-bounce">🎁</div>
          <h1 className="text-5xl font-bold mb-6 text-primary">מזל טוב!</h1>
          <p className="text-2xl mb-6 font-semibold text-secondary">
            זכית בפרס הגדול! 🎉
          </p>
          <p className="text-lg text-muted mb-8">
            תקבל את הפרס בשיעור הקרוב!<br />
            המורה שלך תודיע לך 🎊
          </p>
          <Button 
            className="w-full max-w-md mx-auto text-lg py-4" 
            onClick={() => setShowSuccess(false)}
          >
            סגור
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted mb-1">Profile</p>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-primary">
              האזור האישי שלי 👤
            </h1>
          </div>
          <p className="text-sm text-muted">
            עקוב אחרי ההטבות וההתקדמות שלך בזמן אמת.
          </p>
        </div>

        {/* פרטי משתמש */}
        <Card className="mb-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
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
                className="text-sm w-full sm:w-auto"
                onClick={() => nav('/avatar')}
              >
                ערוך אווטאר
              </Button>
            </div>
          </div>
        </Card>

        {/* BenefitsTracker */}
        <Card className="mb-6 shadow-2xl border-4 border-gold relative overflow-hidden">
          {loading && <LoadingOverlay message="טוען הטבות..." />}
          <div className="text-center">
            <div className="text-6xl mb-4">⭐</div>
            <h2 className="text-4xl font-bold text-gold mb-4">
              מעקב הטבות
            </h2>
            
            {loadError && !loading && (
              <div className="mb-4 rounded-xl bg-red-500/10 border border-red-400/40 text-red-200 py-2 px-4 text-sm">
                {loadError}
              </div>
            )}

            {!loading && (
              <>
                {/* מד התקדמות */}
                <div className="mb-6">
                  <p className="text-2xl font-bold text-primary mb-4">
                    {unclaimedCount} / 10 הטבות
                  </p>
                  
                  {/* אייקונים חזותיים */}
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-3 mb-6 justify-items-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div
                        key={i}
                        className={`text-5xl transition-all ${
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
                      style={{ width: `${(unclaimedCount / 10) * 100}%` }}
                    >
                      {unclaimedCount > 0 && `${Math.round((unclaimedCount / 10) * 100)}%`}
                    </div>
                  </div>
                </div>

                {/* כפתור קבלת פרס גדול */}
                {unclaimedCount >= 10 ? (
                  <div className="bg-gradient-to-r from-gold via-yellow-300 to-gold p-6 rounded-xl border-4 border-yellow-500 animate-pulse">
                    <p className="text-2xl font-bold text-orange-700 mb-4">
                      🎉 יש לך 10 הטבות! 🎉
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
                      צבור עוד {10 - unclaimedCount} הטבות כדי לקבל פרס גדול! 💪
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
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-lg border-2 ${
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

