import Dexie, { Table } from 'dexie'

export type Role = 'admin' | 'user'

export interface Profile {
  id: string
  firstName: string
  lastName: string
  role: Role
  username: string
  password: string
  avatarStyle?: string
  avatarSeed?: string
  createdAt: number
}

export interface Category {
  id: number
  name: 'Nouns' | 'Verbs' | 'Prepositions' | 'Adjectives' | 'Pronouns' | 'Vocabulary' | 'Am/Is/Are' | 'Have/Has'
  displayName: string
  order: number
}

export interface Word {
  id?: number
  categoryId: number
  en: string
  he: string
  altEn?: string[]
  altHe?: string[]
  order?: number
  active?: boolean
}

export interface Progress {
  id?: number
  userId: string
  wordId: number
  isCorrect: boolean
  attempts: number
  lastAnswer?: string
  wrongAnswers?: string[] // כל התשובות השגויות
  audioPlayed?: boolean // האם לחץ על כפתור ההשמעה
  answeredAt: number
}

export interface Reward {
  id?: number
  title: string
  description?: string
  payload?: any
  active: boolean
}

export interface UserRewardChoice {
  id?: number
  userId: string
  rewardAId: number
  rewardBId: number
  chosenId?: number
  chosenAt?: number
  reported?: boolean
}

class WordQuestDB extends Dexie {
  profiles!: Table<Profile, string>
  categories!: Table<Category, number>
  words!: Table<Word, number>
  progress!: Table<Progress, number>
  rewards!: Table<Reward, number>
  userRewardChoices!: Table<UserRewardChoice, number>

  constructor() {
    super('wordquest-db')
    this.version(1).stores({
      profiles: 'id, username, role',
      categories: '++id, name, order',
      words: '++id, categoryId, order, active',
      progress: '++id, userId, wordId, answeredAt',
      rewards: '++id, active',
      userRewardChoices: '++id, userId, chosenAt, reported'
    })
  }
}

export const db = new WordQuestDB()

