import { useEffect, useState, useRef } from 'react'
import { db, Reward } from '../../lib/db'
import { useAuth } from '../../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { fireConfetti } from '../../lib/confetti'
import { play } from '../../lib/sounds'
import { gsap } from 'gsap'

export default function RewardChooser() {
  const user = useAuth(s => s.user)
  const nav = useNavigate()
  const [rewards, setRewards] = useState<[Reward, Reward] | null>(null)
  const [chosen, setChosen] = useState<Reward | null>(null)
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }

    // בחירת 2 מתנות אקראיות
    db.rewards
      .where({ active: true })
      .toArray()
      .then(all => {
        if (all.length >= 2) {
          const shuffled = all.sort(() => Math.random() - 0.5)
          setRewards([shuffled[0], shuffled[1]])
        }
      })
  }, [user, nav])

  // אנימציית כניסה דרמטית!
  useEffect(() => {
    if (!rewards) return

    // קונפטי מיד בכניסה
    fireConfetti()
    play('correct')

    // אנימציית הכותרת
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { scale: 0, rotation: -180, opacity: 0 },
        { scale: 1, rotation: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.7)' }
      )
    }

    // אנימציית הקלפים - טיסה מהצדדים
    if (card1Ref.current) {
      gsap.fromTo(
        card1Ref.current,
        { x: -500, rotation: -90, opacity: 0 },
        { x: 0, rotation: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: 'back.out(1.7)' }
      )
    }

    if (card2Ref.current) {
      gsap.fromTo(
        card2Ref.current,
        { x: 500, rotation: 90, opacity: 0 },
        { x: 0, rotation: 0, opacity: 1, duration: 0.8, delay: 0.3, ease: 'back.out(1.7)' }
      )
    }

    // אנימציית ריחוף מתמשכת
    const floatAnimation = () => {
      if (card1Ref.current) {
        gsap.to(card1Ref.current, {
          y: -10,
          duration: 1.5,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut'
        })
      }
      if (card2Ref.current) {
        gsap.to(card2Ref.current, {
          y: -10,
          duration: 1.5,
          yoyo: true,
          repeat: -1,
          ease: 'sine.inOut',
          delay: 0.75 // קצב שונה
        })
      }
    }

    setTimeout(floatAnimation, 800)
  }, [rewards])

  const handleChoose = async (reward: Reward) => {
    if (!user || !rewards) return

    // אנימציה טרום בחירה - הקלף הנבחר גדל והשני נעלם
    const chosenCard = reward.id === rewards[0].id ? card1Ref.current : card2Ref.current
    const otherCard = reward.id === rewards[0].id ? card2Ref.current : card1Ref.current

    if (chosenCard && otherCard) {
      // הקלף השני נעלם
      gsap.to(otherCard, {
        scale: 0,
        rotation: 180,
        opacity: 0,
        duration: 0.5,
        ease: 'back.in(1.7)'
      })

      // הקלף הנבחר גדל ומסתובב
      gsap.to(chosenCard, {
        scale: 1.3,
        rotation: 360,
        duration: 0.8,
        ease: 'back.out(1.7)'
      })
    }

    // צלילים ואפקטים
    play('correct')
    fireConfetti()
    
    setTimeout(() => {
      fireConfetti()
    }, 300)
    
    setTimeout(() => {
      fireConfetti()
    }, 600)

    // שמירת הבחירה ב-DB
    await db.userRewardChoices.add({
      userId: user.id,
      rewardAId: rewards[0].id!,
      rewardBId: rewards[1].id!,
      chosenId: reward.id!,
      chosenAt: Date.now(),
      reported: false
    })

    setTimeout(() => {
      setChosen(reward)
    }, 1000)
  }

  const handleCardHover = (rewardId: number, isHovering: boolean) => {
    setHoveredId(isHovering ? rewardId : null)
    
    const cardRef = rewardId === rewards?.[0].id ? card1Ref.current : card2Ref.current
    if (!cardRef) return

    if (isHovering) {
      gsap.to(cardRef, {
        scale: 1.1,
        rotation: 5,
        duration: 0.3,
        ease: 'back.out(1.7)'
      })
      play('correct') // צליל קל בריחוף
    } else {
      gsap.to(cardRef, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: 'back.out(1.7)'
      })
    }
  }

  if (!rewards) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-purple to-pink">
        <Card className="shadow-2xl">
          <p className="text-muted">טוען מתנות... 🎁</p>
        </Card>
      </div>
    )
  }

  if (chosen) {
    return (
      <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-gold via-yellow-300 to-orange-400">
        <Card className="w-full max-w-lg text-center shadow-2xl border-4 border-gold">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-5xl font-bold mb-6 text-primary">כל הכבוד!</h1>
          <p className="text-2xl mb-4 font-semibold">בחרת ב:</p>
          <div className="text-4xl font-bold text-secondary mb-4 animate-pulse">
            {chosen.title}
          </div>
          <p className="text-muted text-lg mb-6">{chosen.description}</p>
          {chosen.payload?.url && (
            <a
              href={chosen.payload.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-accent text-white px-6 py-3 rounded-xl hover:scale-110 transition-transform text-lg font-bold mb-4"
            >
              🎁 לחץ כאן לקבלת המתנה
            </a>
          )}
          <Button 
            className="w-full mt-6 text-lg py-4" 
            onClick={() => nav('/categories')}
          >
            חזרה לקטגוריות
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-gradient-to-br from-sky via-purple to-pink relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-32 h-32 bg-gold rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-40 right-20 w-40 h-40 bg-pink rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-1/2 w-36 h-36 bg-purple rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <h1 
          ref={titleRef}
          className="text-6xl font-bold text-center mb-4 text-white drop-shadow-2xl"
        >
          🎁 בחר את המתנה שלך! 🎁
        </h1>
        <p className="text-center text-white text-xl mb-12 drop-shadow-lg">
          סיימת את כל הקטגוריות! הגיע זמן לבחור פרס מדהים! ✨
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          {rewards.map((reward, index) => (
            <div
              key={reward.id}
              ref={index === 0 ? card1Ref : card2Ref}
              className="relative"
            >
              <Card
                className={`cursor-pointer transition-all transform shadow-2xl border-4 ${
                  hoveredId === reward.id 
                    ? 'border-gold shadow-gold/50' 
                    : 'border-white/30'
                }`}
                onClick={() => handleChoose(reward)}
                onMouseEnter={() => handleCardHover(reward.id!, true)}
                onMouseLeave={() => handleCardHover(reward.id!, false)}
              >
                {/* אייקון ענק */}
                <div className="text-8xl text-center mb-6">
                  {index === 0 ? '🎁' : '🎉'}
                </div>
                
                <div className="text-3xl font-bold mb-4 text-center text-primary">
                  {reward.title}
                </div>
                
                <p className="text-muted text-center text-lg">
                  {reward.description}
                </p>
                
                {/* אפקט זוהר */}
                {hoveredId === reward.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-gold/20 via-yellow-300/20 to-gold/20 rounded-xl animate-pulse pointer-events-none" />
                )}
              </Card>
              
              {/* כוכבים מסביב */}
              {hoveredId === reward.id && (
                <>
                  <div className="absolute -top-4 -left-4 text-4xl animate-bounce">⭐</div>
                  <div className="absolute -top-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.1s' }}>⭐</div>
                  <div className="absolute -bottom-4 -left-4 text-4xl animate-bounce" style={{ animationDelay: '0.2s' }}>⭐</div>
                  <div className="absolute -bottom-4 -right-4 text-4xl animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

