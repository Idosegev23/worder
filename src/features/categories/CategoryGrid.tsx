import { useEffect, useState, useRef } from 'react'
import { Category, getCategories, getWordsByCategory, getUserProgress, getUnclaimedBenefitsCount } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Modal } from '../../shared/ui/Modal'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { makeAvatar, AvatarStyle } from '../../lib/dicebear'
import { gsap } from 'gsap'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import UserProfile from '../profile/UserProfile'

type CategoryWithProgress = Category & {
  completed: boolean
  progress: number
}

export default function CategoryGrid() {
  const [cats, setCats] = useState<CategoryWithProgress[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [benefitsCount, setBenefitsCount] = useState(0)
  const user = useAuth(s => s.user)
  const logout = useAuth(s => s.logout)
  const nav = useNavigate()
  const avatarRef = useRef<HTMLDivElement>(null)
  const { achievements } = useGame()
  const cardsRef = useRef<(HTMLDivElement | null)[]>([])
  const [showAchievement, setShowAchievement] = useState<typeof achievements[0] | null>(null)

  // טעינת אווטר
  useEffect(() => {
    if (user?.avatarStyle && user?.avatarSeed) {
      try {
        const url = makeAvatar(user.avatarStyle as AvatarStyle, user.avatarSeed, 120)
        setAvatarUrl(url)
      } catch (e) {
        console.error('Avatar error:', e)
      }
    }
  }, [user])

  // אנימציה של האווטר - טיול מצד לצד
  useEffect(() => {
    if (avatarRef.current) {
      gsap.to(avatarRef.current, {
        x: 50,
        duration: 3,
        yoyo: true,
        repeat: -1,
        ease: 'power1.inOut'
      })
      
      // קפיצה קלה
      gsap.to(avatarRef.current, {
        y: -10,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut'
      })
    }
  }, [avatarUrl])

  // אנימציית כרטיסי קטגוריות בכניסה
  useEffect(() => {
    if (cats.length > 0) {
      cardsRef.current.forEach((card, index) => {
        if (card) {
          gsap.fromTo(
            card,
            { y: 50, opacity: 0, scale: 0.8 },
            { 
              y: 0, 
              opacity: 1, 
              scale: 1, 
              duration: 0.5, 
              delay: index * 0.1,
              ease: 'back.out(1.7)'
            }
          )
        }
      })
    }
  }, [cats])

  // הצגת הישגים חדשים
  useEffect(() => {
    const latestAchievement = achievements[achievements.length - 1]
    if (latestAchievement && latestAchievement.unlockedAt && Date.now() - latestAchievement.unlockedAt < 5000) {
      setShowAchievement(latestAchievement)
      setTimeout(() => setShowAchievement(null), 5000)
    }
  }, [achievements])

  // טעינת מספר הטבות
  useEffect(() => {
    if (!user) return
    
    const loadBenefitsCount = async () => {
      try {
        const count = await getUnclaimedBenefitsCount(user.id)
        setBenefitsCount(count)
      } catch (error) {
        console.error('Error loading benefits count:', error)
      }
    }
    
    loadBenefitsCount()
  }, [user])

  useEffect(() => {
    if (!user) return
    
    const loadCategoriesWithProgress = async () => {
      try {
        const allCategories = await getCategories()
        
        // קבלת כל ההתקדמות של המשתמש פעם אחת
        const userProgress = await getUserProgress(user.id)
        
        console.log(`📊 User ${user.id} has ${userProgress.length} progress entries`)
        
        const catsWithProgress = await Promise.all(
          allCategories.map(async (cat) => {
            const catWords = await getWordsByCategory(cat.id)
            
            if (catWords.length === 0) {
              return { ...cat, completed: false, progress: 0 }
            }
            
            console.log(`📁 Category ${cat.name} has ${catWords.length} words`)
            
            // ספירת תשובות נכונות ייחודיות לכל מילה בקטגוריה
            const correctWordsInCategory = new Set<number>()
            
            catWords.forEach(word => {
              // בדיקה אם יש תשובה נכונה למילה הזו
              const progressForWord = userProgress.filter(p => p.wordId === word.id)
              const hasCorrectAnswer = progressForWord.some(p => p.isCorrect === true)
              
              if (hasCorrectAnswer) {
                correctWordsInCategory.add(word.id)
                console.log(`  ✅ Word "${word.en}" (${word.id}): CORRECT`)
              } else if (progressForWord.length > 0) {
                console.log(`  ❌ Word "${word.en}" (${word.id}): attempted but wrong`)
              } else {
                console.log(`  ⏸️  Word "${word.en}" (${word.id}): not attempted`)
              }
            })
            
            const completed = correctWordsInCategory.size === catWords.length && catWords.length > 0
            const progress = catWords.length > 0 ? Math.round((correctWordsInCategory.size / catWords.length) * 100) : 0
            
            console.log(`📈 Category ${cat.name}: ${correctWordsInCategory.size}/${catWords.length} = ${progress}%`)
            
            return { ...cat, completed, progress }
          })
        )
        
        setCats(catsWithProgress)
        
        console.log('📊 Categories summary:', catsWithProgress.map(c => ({ 
          name: c.name, 
          completed: c.completed, 
          progress: c.progress 
        })))
      } catch (error) {
        console.error('Error loading categories with progress:', error)
      }
    }
    
    // טען נתונים רק פעם אחת בכניסה למסך
    loadCategoriesWithProgress()
  }, [user, nav])

  return (
    <div className="min-h-screen p-6 relative overflow-hidden">
      <div className="max-w-4xl mx-auto">
        {/* הודעת הישג */}
        {showAchievement && (
          <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
            <Card className="bg-gradient-to-r from-gold to-yellow-300 border-4 border-gold shadow-2xl">
              <div className="text-center">
                <div className="text-6xl mb-2">{showAchievement.icon}</div>
                <div className="text-2xl font-bold text-white mb-1">{showAchievement.title}</div>
                <div className="text-white/90">{showAchievement.description}</div>
              </div>
            </Card>
          </div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              בחר קטגוריה
            </h1>
            {user && (
              <div className="flex items-center gap-4 mt-2">
                <p className="text-muted text-lg">שלום, {user.firstName}! 👋</p>
                {achievements.length > 0 && (
                  <div className="flex items-center gap-2 bg-gold/20 px-3 py-1 rounded-full">
                    <span>🏆</span>
                    <span className="text-sm font-bold">{achievements.length} הישגים</span>
                  </div>
                )}
                {benefitsCount > 0 && (
                  <div className="flex items-center gap-2 bg-accent/20 px-3 py-1 rounded-full">
                    <span>⭐</span>
                    <span className="text-sm font-bold">{benefitsCount} הטבות</span>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowProfile(true)}
              className="bg-gradient-to-r from-accent to-secondary text-white px-4 py-2 rounded-lg hover:scale-105 transition-transform text-sm font-semibold shadow-lg"
            >
              👤 האזור האישי
            </button>
            <button
              onClick={() => {
                logout()
                window.location.href = '/'
              }}
              className="text-secondary hover:underline text-sm font-semibold"
            >
              יציאה
            </button>
          </div>
        </div>

        {/* סרגל התקדמות גלובלי */}
        <GlobalProgress />

        {/* האווטר המטייל */}
        {avatarUrl && (
          <div 
            ref={avatarRef}
            className="fixed bottom-8 right-8 z-10"
            style={{ willChange: 'transform' }}
          >
            <div className="relative">
              <img 
                src={avatarUrl} 
                alt="Avatar" 
                className="w-24 h-24 rounded-full border-4 border-primary shadow-2xl"
              />
              <div className="absolute -bottom-2 -right-2 bg-accent text-white text-xs px-2 py-1 rounded-full">
                {user?.firstName}
              </div>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {cats.map((c, index) => (
            <Link key={c.id} to={`/play/${c.id}`}>
              <div 
                ref={el => cardsRef.current[index] = el}
                className="transform transition-transform hover:scale-105"
              >
                <Card className={`cursor-pointer h-full relative shadow-lg hover:shadow-2xl transition-all ${
                  c.completed 
                    ? 'border-4 border-accent bg-gradient-to-br from-accent/10 to-accent/5' 
                    : 'border-2 border-primary/20'
                }`}>
                  {c.completed && (
                    <div className="absolute top-3 left-3 text-accent text-4xl animate-bounce">
                      ✓
                    </div>
                  )}
                  
                  <div className="text-secondary text-sm mb-2 font-semibold">
                    {c.displayName}
                  </div>
                  
                  <div className="text-3xl font-bold mb-3 text-primary">
                    {c.name}
                  </div>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm text-muted font-semibold">
                      {c.completed ? '🎉 הושלם!' : `התקדמות: ${c.progress}%`}
                    </div>
                    
                    {!c.completed && c.progress > 0 && (
                      <div className="text-primary text-xs font-bold">
                        בדרך! 🚀
                      </div>
                    )}
                  </div>
                  
                  {!c.completed && (
                    <div className="w-full bg-primary/10 h-3 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-500"
                        style={{ width: `${c.progress}%` }}
                      />
                    </div>
                  )}
                  
                  {c.completed && (
                    <div className="mt-2 flex items-center justify-center gap-2 text-gold">
                      <span>⭐</span>
                      <span>⭐</span>
                      <span>⭐</span>
                    </div>
                  )}
                </Card>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* מודל פרופיל */}
      <Modal isOpen={showProfile} onClose={() => {
        setShowProfile(false)
        // רענון מספר ההטבות בסגירה
        if (user) {
          getUnclaimedBenefitsCount(user.id).then(count => setBenefitsCount(count))
        }
      }}>
        <UserProfile />
      </Modal>
    </div>
  )
}

