import { useEffect, useState } from 'react'
import {
  Category,
  getCategories,
  getWordsByCategory,
  getUserProgress,
  getUnclaimedBenefitsCount,
  getUserCategoryIds,
  resolveVisibleLeafIds
} from '../../lib/supabase'
import { Link, useParams } from 'react-router-dom'
import { Card } from '../../shared/ui/Card'
import { Modal } from '../../shared/ui/Modal'
import { Badge } from '../../shared/ui/Badge'
import { useAuth } from '../../store/useAuth'
import { useGame } from '../../store/useGame'
import { makeAvatar, AvatarStyle } from '../../lib/dicebear'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import UserProfile from '../profile/UserProfile'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'
import { iconForCategory, tileColor, IconArrowRight, IconLogout } from '../../shared/ui/icons'

type CategoryWithProgress = Category & {
  completed: boolean
  progress: number
  wordCount: number
  correctCount: number
  /** כמה יחידות יש תחת הקטגוריה — 0 כשזו יחידה שאפשר לשחק בה */
  childCount: number
}

export default function CategoryGrid() {
  const [cats, setCats] = useState<CategoryWithProgress[]>([])
  const [avatarUrl, setAvatarUrl] = useState('')
  const [showProfile, setShowProfile] = useState(false)
  const [benefitsCount, setBenefitsCount] = useState(0)
  const user = useAuth(s => s.user)
  const logout = useAuth(s => s.logout)
  const { achievements } = useGame()
  const [showAchievement, setShowAchievement] = useState<typeof achievements[0] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  // ניווט דו-שלבי: ללא פרמטר = רמת הכיתות; עם פרמטר = היחידות שבתוך כיתה
  const { parentId: parentIdParam } = useParams()
  const parentId = parentIdParam ? Number(parentIdParam) : null
  const [parentName, setParentName] = useState<string | null>(null)

  useEffect(() => {
    if (user?.avatarStyle && user?.avatarSeed) {
      try {
        setAvatarUrl(makeAvatar(user.avatarStyle as AvatarStyle, user.avatarSeed, 96))
      } catch (e) {
        console.error('Avatar error:', e)
      }
    }
  }, [user])

  useEffect(() => {
    const latest = achievements[achievements.length - 1]
    if (latest?.unlockedAt && Date.now() - latest.unlockedAt < 5000) {
      setShowAchievement(latest)
      const t = setTimeout(() => setShowAchievement(null), 5000)
      return () => clearTimeout(t)
    }
  }, [achievements])

  useEffect(() => {
    if (!user) return
    getUnclaimedBenefitsCount(user.id).then(setBenefitsCount).catch(console.error)
  }, [user])

  useEffect(() => {
    if (!user) return

    const load = async () => {
      setIsLoading(true)
      setLoadError(null)
      try {
        const allCategories = await getCategories()

        // נראוּת נקבעת אך ורק לפי שיוך מפורש שהאדמין הגדיר.
        // שיוך לכיתה (קטגוריית אב) מזכה בכל היחידות שתחתיה.
        const assignedIds = await getUserCategoryIds(user.id)
        const visibleLeafIds = resolveVisibleLeafIds(assignedIds, allCategories)

        const userProgress = await getUserProgress(user.id)

        // התקדמות לכל יחידה גלויה. יחידות ללא מילים נושרות.
        const leafStats = new Map<number, { wordCount: number; correctCount: number }>()
        await Promise.all(
          allCategories
            .filter(c => visibleLeafIds.has(c.id))
            .map(async cat => {
              const catWords = await getWordsByCategory(cat.id)
              if (catWords.length === 0) return
              const correctCount = catWords.filter(w =>
                userProgress.some(p => p.wordId === w.id && p.isCorrect)
              ).length
              leafStats.set(cat.id, { wordCount: catWords.length, correctCount })
            })
        )

        const decorate = (
          cat: Category,
          wordCount: number,
          correctCount: number,
          childCount: number
        ): CategoryWithProgress => ({
          ...cat,
          wordCount,
          correctCount,
          childCount,
          completed: wordCount > 0 && correctCount === wordCount,
          progress: wordCount > 0 ? Math.round((correctCount / wordCount) * 100) : 0
        })

        let view: CategoryWithProgress[]

        if (parentId !== null) {
          // בתוך כיתה: היחידות שלה
          const parent = allCategories.find(c => c.id === parentId)
          setParentName(parent?.displayName ?? null)
          view = allCategories
            .filter(c => c.parentId === parentId && leafStats.has(c.id))
            .map(c => {
              const st = leafStats.get(c.id)!
              return decorate(c, st.wordCount, st.correctCount, 0)
            })
        } else {
          setParentName(null)
          // רמה עליונה: כיתות שיש תחתן לפחות יחידה גלויה אחת, ועוד יחידות בודדות ללא אב
          const parents = allCategories.filter(c =>
            c.parentId === null && allCategories.some(ch => ch.parentId === c.id)
          )

          const parentCards = parents
            .map(p => {
              const children = allCategories.filter(
                c => c.parentId === p.id && leafStats.has(c.id)
              )
              if (children.length === 0) return null
              const wordCount = children.reduce((a, c) => a + leafStats.get(c.id)!.wordCount, 0)
              const correctCount = children.reduce((a, c) => a + leafStats.get(c.id)!.correctCount, 0)
              return decorate(p, wordCount, correctCount, children.length)
            })
            .filter(Boolean) as CategoryWithProgress[]

          const orphanCards = allCategories
            .filter(c => c.parentId === null && leafStats.has(c.id))
            .map(c => {
              const st = leafStats.get(c.id)!
              return decorate(c, st.wordCount, st.correctCount, 0)
            })

          view = [...parentCards, ...orphanCards]
        }

        setCats(view.sort((a, b) => a.displayOrder - b.displayOrder))
      } catch (error) {
        console.error('Error loading categories:', error)
        setLoadError('לא הצלחנו לטעון קטגוריות. נסי שוב אחרי רענון.')
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [user, parentId])

  const greeting = `שלום, ${user?.firstName} 👋`

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 relative">
      {isLoading && <LoadingOverlay fullscreen message="טוען קטגוריות…" />}

      <div className="max-w-5xl mx-auto">
        {/* Achievement toast */}
        {showAchievement && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-pop-in">
            <div className="bg-sun text-ink rounded-md2 border-outline border-ink shadow-solid-lg px-5 py-3.5 flex items-center gap-3">
              <span className="text-3xl">{showAchievement.icon}</span>
              <div>
                <div className="font-bold text-base">{showAchievement.title}</div>
                <div className="text-sm text-muted">{showAchievement.description}</div>
              </div>
            </div>
          </div>
        )}

        {/* Header — clean, integrated */}
        <header className="flex items-center justify-between gap-3 mb-6">
          <button
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-3 group"
          >
            {avatarUrl && (
              <div className="relative">
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-12 h-12 sm:w-13 sm:h-13 rounded-sm2 bg-sky border-2 border-ink shadow-solid-sm"
                />
              </div>
            )}
            <div className="text-right">
              <div className="text-lg font-bold text-ink leading-tight">{greeting}</div>
              <div className="text-sm text-muted font-medium">הפרופיל שלי</div>
            </div>
          </button>

          <div className="flex items-center gap-2 flex-wrap justify-end">
            {achievements.length > 0 && (
              <Badge tone="gold" icon="🏆">{achievements.length}</Badge>
            )}
            {benefitsCount > 0 && (
              <Badge tone="mint" icon="🎁">{benefitsCount}</Badge>
            )}
            <button
              onClick={() => { logout(); window.location.href = '/' }}
              className="inline-flex items-center gap-1.5 text-sm font-bold text-ink bg-track border-2 border-ink shadow-solid-sm pressable px-3 py-1.5 rounded-pill"
            >
              <IconLogout size={16} /> יציאה
            </button>
          </div>
        </header>

        <GlobalProgress />

        {parentId !== null && (
          <Link
            to="/categories"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-ink bg-surface border-2 border-ink shadow-solid-sm pressable px-3 py-1.5 rounded-pill mb-4"
          >
            <IconArrowRight size={16} /> חזרה לכיתות
          </Link>
        )}

        <div className="mb-5 flex items-baseline justify-between">
          <h1 className="text-2xl sm:text-[26px] font-bold text-ink tracking-tight">
            {parentId !== null ? (parentName ?? 'יחידות') : 'בחרי קטגוריה'}
          </h1>
          {!isLoading && cats.length > 0 && (
            <span className="text-sm text-muted font-medium">
              {cats.length} {parentId !== null ? 'יחידות' : 'קטגוריות'}
            </span>
          )}
        </div>

        {!isLoading && loadError && (
          <Card variant="solid" className="bg-berry text-ink text-center font-bold mb-5">
            {loadError}
          </Card>
        )}

        {!isLoading && !loadError && cats.length === 0 && (
          <Card variant="solid" padding="lg" className="text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-muted font-medium">
              {parentId !== null
                ? 'אין יחידות זמינות בכיתה הזאת.'
                : 'עדיין לא שויכו לך קטגוריות. פני למורה.'}
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cats.map((c, i) => (
            <CategoryCard key={c.id} cat={c} delay={i * 45} index={i} />
          ))}
        </div>
      </div>

      <Modal isOpen={showProfile} onClose={() => {
        setShowProfile(false)
        if (user) getUnclaimedBenefitsCount(user.id).then(setBenefitsCount).catch(() => {})
      }}>
        <UserProfile />
      </Modal>
    </div>
  )
}

function CategoryCard({ cat, delay, index }: { cat: CategoryWithProgress; delay: number; index: number }) {
  const Icon = iconForCategory(cat.name)

  // כיתה (יש לה יחידות) נכנסת פנימה; יחידה פותחת את המשחק
  const isParent = cat.childCount > 0
  const remaining = cat.wordCount - cat.correctCount

  return (
    <Link
      to={isParent ? `/categories/${cat.id}` : `/play/${cat.id}`}
      className="block animate-pop-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
    >
      <Card variant="solid" padding="sm" interactive className="h-full">
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-12 h-12 rounded-sm2 grid place-items-center text-ink border-2 border-ink shadow-solid-sm ${tileColor(index)}`}
          >
            <Icon size={24} />
          </div>

          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-pill text-xs font-bold text-ink border-2 border-ink shadow-solid-sm ${
              cat.completed ? 'bg-mint' : cat.correctCount > 0 ? 'bg-sun' : 'bg-track'
            }`}
          >
            {cat.correctCount}/{cat.wordCount}
          </span>
        </div>

        <h3 className="text-lg font-bold text-ink leading-tight break-words mt-3">
          {cat.displayName}
        </h3>
        <p className="text-sm text-muted font-medium mt-0.5">
          {isParent && <>{cat.childCount} יחידות · </>}
          {cat.completed
            ? 'סיימת הכול'
            : cat.correctCount === 0
            ? 'עוד לא התחלת'
            : `עוד ${remaining} ${remaining === 1 ? 'מילה' : 'מילים'} לסיום`}
        </p>

        <div className="mt-3 h-2.5 rounded-pill bg-track border-2 border-ink overflow-hidden">
          <div
            className="h-full bg-mint transition-all duration-500 ease-out"
            style={{ width: `${cat.progress}%` }}
          />
        </div>
      </Card>
    </Link>
  )
}
