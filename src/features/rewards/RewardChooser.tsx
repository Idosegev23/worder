import { useEffect, useState, useRef } from 'react'
import { addBenefit } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { useNavigate } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { fireConfetti } from '../../lib/confetti'
import { play } from '../../lib/sounds'
import { gsap } from 'gsap'

// פרסים מעפנים
const SILLY_PRIZES = [
  { emoji: '🧻', title: 'גליל נייר טואלט', description: 'מזל טוב! זכית בגליל נייר טואלט משומש (כמעט)' },
  { emoji: '✏️', title: 'מחק משומש', description: 'וואו! מחק שכבר מחק הכל פרט לתקוות שלך' },
  { emoji: '🧦', title: 'גרב בודד', description: 'מדהים! גרב אחד בלי הזוג שלו, בול כמו בכביסה' },
  { emoji: '🔘', title: 'כפתור', description: 'יש! כפתור שנפל מחולצה לפני 3 שנים' },
  { emoji: '🛍️', title: 'שקית ריקה', description: 'כל הכבוד! שקית ניילון ריקה (ידידותית לסביבה?)' },
  { emoji: '🥄', title: 'כפית פלסטיק שבורה', description: 'מעולה! כפית שכבר לא כפית אבל עדיין כפית' },
  { emoji: '📎', title: 'מהדק נייר חלוד', description: 'נחמד! מהדק שראה ימים טובים יותר' },
  { emoji: '🗑️', title: 'פתק ממוחזר', description: 'יופי! פתק עם רשימת קניות של מישהו אחר' },
]

type PrizeResult = {
  type: 'benefit' | 'silly'
  benefit?: any
  silly?: typeof SILLY_PRIZES[0]
}

export default function RewardChooser() {
  const user = useAuth(s => s.user)
  const nav = useNavigate()
  const [ready, setReady] = useState(false)
  const [result, setResult] = useState<PrizeResult | null>(null)
  const [hoveredId, setHoveredId] = useState<1 | 2 | null>(null)
  const card1Ref = useRef<HTMLDivElement>(null)
  const card2Ref = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!user) {
      nav('/')
      return
    }

    // פשוט מסמנים שמוכנים להתחיל
    setReady(true)
  }, [user, nav])

  // אנימציית כניסה דרמטית!
  useEffect(() => {
    if (!ready) return

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
  }, [ready])

  const handleChoose = async (boxId: 1 | 2) => {
    if (!user || result) return

    // אנימציה טרום בחירה - הקלף הנבחר גדל והשני נעלם
    const chosenCard = boxId === 1 ? card1Ref.current : card2Ref.current
    const otherCard = boxId === 1 ? card2Ref.current : card1Ref.current

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

    // הגרלה: 70% הטבה, 30% מעפן - כדי שילדים יזכו יותר!
    const isBenefit = Math.random() < 0.7
    
    let prizeResult: PrizeResult
    
    if (isBenefit) {
      // זכה בהטבה!
      try {
        const benefit = await addBenefit(user.id)
        prizeResult = { type: 'benefit', benefit }
      } catch (error) {
        console.error('Error adding benefit:', error)
        // אם יש שגיאה, נותנים לו פרס מעפן במקום
        const randomSilly = SILLY_PRIZES[Math.floor(Math.random() * SILLY_PRIZES.length)]
        prizeResult = { type: 'silly', silly: randomSilly }
      }
    } else {
      // פרס מעפן
      const randomSilly = SILLY_PRIZES[Math.floor(Math.random() * SILLY_PRIZES.length)]
      prizeResult = { type: 'silly', silly: randomSilly }
    }

    setTimeout(() => {
      setResult(prizeResult)
    }, 1000)
  }

  const handleCardHover = (boxId: 1 | 2, isHovering: boolean) => {
    if (result) return // אם כבר בחר, לא מגיבים לריחוף
    
    setHoveredId(isHovering ? boxId : null)
    
    const cardRef = boxId === 1 ? card1Ref.current : card2Ref.current
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

  if (!ready) {
    return (
      <div className="min-h-screen grid place-items-center p-6 app-bg">
        <Card className="shadow-solid">
          <p className="text-muted">מכין פרסים... 🎁</p>
        </Card>
      </div>
    )
  }

  if (result) {
    if (result.type === 'benefit') {
      return (
        <div className="min-h-screen grid place-items-center p-6 app-bg">
          <Card className="w-full max-w-lg text-center shadow-solid border-4 border-sun">
            <div className="text-8xl mb-6 animate-bounce">🎉</div>
            <h1 className="text-5xl font-bold mb-6 text-sky">מזל טוב!</h1>
            <p className="text-2xl mb-4 font-semibold">זכית בהטבה! ⭐</p>
            <div className="text-4xl font-bold text-berry mb-4 animate-pulse">
              הטבה #{result.benefit?.id}
            </div>
            <p className="text-muted text-lg mb-6">
              צבור 5 הטבות וקבל פרס גדול! 🎁<br />
              בדוק את ההתקדמות באזור האישי שלך
            </p>
            <Button 
              className="w-full mt-6 text-lg py-4" 
              onClick={() => nav('/categories')}
            >
              חזרה לקטגוריות
            </Button>
          </Card>
        </div>
      )
    } else {
      // פרס מעפן
      const silly = result.silly!
      return (
        <div className="min-h-screen grid place-items-center p-6 app-bg">
          <Card className="w-full max-w-lg text-center shadow-solid border-4 border-sky">
            <div className="text-8xl mb-6 animate-bounce">{silly.emoji}</div>
            <h1 className="text-5xl font-bold mb-6 text-sky">אופס!</h1>
            <p className="text-2xl mb-4 font-semibold">זכית ב:</p>
            <div className="text-4xl font-bold text-sun mb-4 animate-pulse">
              {silly.title}
            </div>
            <p className="text-muted text-lg mb-6">{silly.description}</p>
            <p className="text-sm text-sky mb-6">
              😅 אל תדאג, בפעם הבאה תזכה בהטבה!
            </p>
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
  }

  return (
    <div className="min-h-screen grid place-items-center p-6 app-bg relative overflow-hidden">
      {/* אפקט רקע מנצנץ */}
      <div className="absolute inset-0 opacity-20">
      </div>

      <div className="w-full max-w-5xl relative z-10">
        <h1 
          ref={titleRef}
          className="text-6xl font-bold text-center mb-4 text-ink drop-shadow-solid"
        >
          🎁 בחר את המתנה שלך! 🎁
        </h1>
        <p className="text-center text-ink text-xl mb-12 drop-shadow-lg">
          סיימת את כל הקטגוריות! הגיע זמן לבחור פרס מדהים! ✨
        </p>
        
        <div className="grid md:grid-cols-2 gap-8">
          {[1, 2].map((boxId) => (
            <div
              key={boxId}
              ref={boxId === 1 ? card1Ref : card2Ref}
              className="relative"
            >
              <Card
                className={`cursor-pointer transition-all transform shadow-solid border-4 ${
                  hoveredId === boxId 
                    ? 'border-sun shadow-sun/50' 
                    : 'border-white/30'
                }`}
                onClick={() => handleChoose(boxId as 1 | 2)}
                onMouseEnter={() => handleCardHover(boxId as 1 | 2, true)}
                onMouseLeave={() => handleCardHover(boxId as 1 | 2, false)}
              >
                {/* אייקון ענק */}
                <div className="text-8xl text-center mb-6">
                  🎁
                </div>
                
                <div className="text-3xl font-bold mb-4 text-center text-sky">
                  קופסה מסתורית #{boxId}
                </div>
                
                <p className="text-muted text-center text-lg">
                  מה מסתתר בפנים? 🤔
                </p>
                
                {/* אפקט זוהר */}
                {hoveredId === boxId && (
                  <div className="absolute inset-0 app-bg/20 to-sun/20 rounded-sm2 animate-pulse pointer-events-none" />
                )}
              </Card>
              
              {/* כוכבים מסביב */}
              {hoveredId === boxId && (
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

