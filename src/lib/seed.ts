import { db, Category, Word, Profile, Reward } from './db'
import { nanoid } from 'nanoid/non-secure'

// קטגוריות
const categories: Category[] = [
  { id: 1, name: 'Nouns', displayName: 'שמות עצם', order: 1 },
  { id: 2, name: 'Verbs', displayName: 'פעלים', order: 2 },
  { id: 3, name: 'Prepositions', displayName: 'מילות יחס', order: 3 },
  { id: 4, name: 'Adjectives', displayName: 'שמות תואר', order: 4 },
]

// מילים
const words: Omit<Word, 'id'>[] = [
  // Nouns (9)
  { categoryId: 1, en: 'Age', he: 'גיל' },
  { categoryId: 1, en: 'Brush', he: 'מברשת' },
  { categoryId: 1, en: 'Blanket', he: 'שמיכה' },
  { categoryId: 1, en: 'Chess', he: 'שחמט' },
  { categoryId: 1, en: 'Hobby', he: 'תחביב' },
  { categoryId: 1, en: 'Idea', he: 'רעיון' },
  { categoryId: 1, en: 'Money', he: 'כסף' },
  { categoryId: 1, en: 'People', he: 'אנשים' },
  { categoryId: 1, en: 'Team', he: 'קבוצה' },
  
  // Verbs (11)
  { categoryId: 2, en: 'Call', he: 'להתקשר', altHe: ['לקרוא'] },
  { categoryId: 2, en: 'Choose', he: 'לבחור' },
  { categoryId: 2, en: 'Cry', he: 'לבכות' },
  { categoryId: 2, en: 'Find', he: 'למצוא' },
  { categoryId: 2, en: 'Learn', he: 'ללמוד' },
  { categoryId: 2, en: 'Put', he: 'לשים' },
  { categoryId: 2, en: 'Use', he: 'להשתמש' },
  { categoryId: 2, en: 'Wash', he: 'לשטוף' },
  { categoryId: 2, en: 'Win', he: 'לנצח' },
  { categoryId: 2, en: 'Give', he: 'לתת' },
  { categoryId: 2, en: 'Tell a story', he: 'לספר סיפור', altEn: ['tell story', 'tell-a-story'] },
  
  // Prepositions (7)
  { categoryId: 3, en: 'In', he: 'ב', altHe: ['בתוך'] },
  { categoryId: 3, en: 'On', he: 'על' },
  { categoryId: 3, en: 'Under', he: 'מתחת' },
  { categoryId: 3, en: 'Behind', he: 'מאחורי' },
  { categoryId: 3, en: 'Between', he: 'בין' },
  { categoryId: 3, en: 'Next to', he: 'ליד' },
  { categoryId: 3, en: 'In front of', he: 'מול', altHe: ['לפני'] },
  
  // Adjectives (11)
  { categoryId: 4, en: 'Young', he: 'צעיר' },
  { categoryId: 4, en: 'Tall', he: 'גבוה' },
  { categoryId: 4, en: 'Nice', he: 'נחמד' },
  { categoryId: 4, en: 'Fast', he: 'מהיר' },
  { categoryId: 4, en: 'Different', he: 'שונה' },
  { categoryId: 4, en: 'Special', he: 'מיוחד' },
  { categoryId: 4, en: 'Short', he: 'קצר' },
  { categoryId: 4, en: 'Beautiful', he: 'יפה' },
  { categoryId: 4, en: 'Best', he: 'הטוב ביותר' },
  { categoryId: 4, en: 'Better', he: 'טוב יותר' },
  { categoryId: 4, en: 'Old', he: 'ישן' }
]

// מתנות
const rewards: Reward[] = [
  { title: 'Surprise A', description: 'מדבקות מצחיקות PDF', payload: { type: 'link', url: '#' }, active: true },
  { title: 'Surprise B', description: 'תעודת מצטיין PNG', payload: { type: 'link', url: '#' }, active: true },
]

export async function seedAll() {
  const count = await db.categories.count()
  if (count > 0) {
    console.log('Database already seeded')
    return
  }

  console.log('Seeding database...')
  
  await db.categories.bulkAdd(categories)
  console.log('Categories added:', categories.length)
  
  const wordsToAdd = words.map((w, i) => ({ ...w, order: i, active: true }))
  await db.words.bulkAdd(wordsToAdd)
  console.log('Words added:', wordsToAdd.length)
  
  await db.rewards.bulkAdd(rewards)
  console.log('Rewards added:', rewards.length)

  // אדמין: אילנית שגב / 123456
  const adminId = nanoid()
  await db.profiles.add({
    id: adminId,
    firstName: 'אילנית',
    lastName: 'שגב',
    role: 'admin',
    username: 'אילנית שגב',
    password: '123456',
    avatarStyle: 'bottts',
    avatarSeed: adminId,
    createdAt: Date.now()
  })
  
  console.log('Database seeded successfully!')
}

