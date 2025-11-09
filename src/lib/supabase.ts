import { createClient } from '@supabase/supabase-js'

// Supabase Configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check your .env.local file.')
}

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types matching the Supabase schema
export type Role = 'admin' | 'user'

export interface Profile {
  id: string
  firstName: string // מותאם ל-camelCase לתאימות עם הקוד הקיים
  lastName: string
  username: string
  password: string
  role: Role
  avatarStyle?: string
  avatarSeed?: string
  createdAt: string
}

// Internal DB types (snake_case for Supabase)
interface ProfileDB {
  id: string
  first_name: string
  last_name: string
  username: string
  password: string
  role: Role
  avatar_style?: string
  avatar_seed?: string
  created_at: string
}

// Helper to convert DB to App format
function dbToProfile(db: ProfileDB): Profile {
  return {
    id: db.id,
    firstName: db.first_name,
    lastName: db.last_name,
    username: db.username,
    password: db.password,
    role: db.role,
    avatarStyle: db.avatar_style,
    avatarSeed: db.avatar_seed,
    createdAt: db.created_at
  }
}

// Helper to convert App to DB format
function profileToDb(profile: Partial<Profile>): Partial<ProfileDB> {
  return {
    id: profile.id,
    first_name: profile.firstName,
    last_name: profile.lastName,
    username: profile.username,
    password: profile.password,
    role: profile.role,
    avatar_style: profile.avatarStyle,
    avatar_seed: profile.avatarSeed
  }
}

export interface Category {
  id: number
  name: 'Nouns' | 'Verbs' | 'Prepositions' | 'Adjectives'
  display_name: string
  display_order: number
  created_at: string
}

export interface Word {
  id: number
  category_id: number
  en: string
  he: string
  alt_en?: string[]
  alt_he?: string[]
  display_order?: number
  active: boolean
  created_at: string
}

export interface Progress {
  id: number
  userId: string
  wordId: number
  isCorrect: boolean
  attempts: number
  lastAnswer?: string
  wrongAnswers?: string[]
  audioPlayed: boolean
  answeredAt: string
}

// Internal DB types (snake_case for Supabase)
interface ProgressDB {
  id: number
  user_id: string
  word_id: number
  is_correct: boolean
  attempts: number
  last_answer?: string
  wrong_answers?: string[]
  audio_played: boolean
  answered_at: string
}

// Helper to convert DB to App format
function dbToProgress(db: ProgressDB): Progress {
  return {
    id: db.id,
    userId: db.user_id,
    wordId: db.word_id,
    isCorrect: db.is_correct,
    attempts: db.attempts,
    lastAnswer: db.last_answer,
    wrongAnswers: db.wrong_answers,
    audioPlayed: db.audio_played,
    answeredAt: db.answered_at
  }
}

// Helper to convert App to DB format
function progressToDb(progress: Omit<Progress, 'id' | 'answeredAt'>): Omit<ProgressDB, 'id' | 'answered_at'> {
  return {
    user_id: progress.userId,
    word_id: progress.wordId,
    is_correct: progress.isCorrect,
    attempts: progress.attempts,
    last_answer: progress.lastAnswer,
    wrong_answers: progress.wrongAnswers,
    audio_played: progress.audioPlayed
  }
}

export interface Reward {
  id: number
  title: string
  description?: string
  payload?: any
  active: boolean
  created_at: string
}

export interface UserRewardChoice {
  id: number
  user_id: string
  reward_a_id: number
  reward_b_id: number
  chosen_id?: number
  chosen_at?: string
  reported: boolean
  created_at: string
}

// Database Helper Functions

/** Get all categories ordered by display_order */
export async function getCategories() {
  const { data, error } = await supabase
    .from('worder_categories')
    .select('*')
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return data as Category[]
}

/** Get all active words for a category */
export async function getWordsByCategory(categoryId: number) {
  const { data, error } = await supabase
    .from('worder_words')
    .select('*')
    .eq('category_id', categoryId)
    .eq('active', true)
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return data as Word[]
}

/** Get all active words */
export async function getAllActiveWords() {
  const { data, error } = await supabase
    .from('worder_words')
    .select('*')
    .eq('active', true)
    .order('category_id', { ascending: true })
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return data as Word[]
}

/** Get all words (admin only) */
export async function getAllWords() {
  const { data, error } = await supabase
    .from('worder_words')
    .select('*')
    .order('category_id', { ascending: true })
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return data as Word[]
}

/** Get user progress for specific words */
export async function getUserProgress(userId: string, wordIds?: number[]) {
  let query = supabase
    .from('worder_progress')
    .select('*')
    .eq('user_id', userId)
  
  if (wordIds && wordIds.length > 0) {
    query = query.in('word_id', wordIds)
  }
  
  const { data, error } = await query.order('answered_at', { ascending: false })
  
  if (error) throw error
  return (data as ProgressDB[]).map(dbToProgress)
}

/** Save user progress */
export async function saveProgress(progress: Omit<Progress, 'id' | 'answeredAt'>) {
  const dbProgress = progressToDb(progress)
  const { data, error } = await supabase
    .from('worder_progress')
    .insert(dbProgress)
    .select()
    .single()
  
  if (error) throw error
  return dbToProgress(data as ProgressDB)
}

/** Get all active rewards */
export async function getActiveRewards() {
  const { data, error } = await supabase
    .from('worder_rewards')
    .select('*')
    .eq('active', true)
  
  if (error) throw error
  return data as Reward[]
}

/** Get user by username */
export async function getUserByUsername(username: string) {
  const { data, error } = await supabase
    .from('worder_profiles')
    .select('*')
    .eq('username', username)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    throw error
  }
  return dbToProfile(data as ProfileDB)
}

/** Create new user */
export async function createUser(user: Omit<Profile, 'id' | 'createdAt'>) {
  const dbUser = profileToDb(user)
  const { data, error } = await supabase
    .from('worder_profiles')
    .insert(dbUser)
    .select()
    .single()
  
  if (error) throw error
  return dbToProfile(data as ProfileDB)
}

/** Get all users (admin only) */
export async function getAllUsers() {
  const { data, error } = await supabase
    .from('worder_profiles')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return (data as ProfileDB[]).map(dbToProfile)
}

/** Update user */
export async function updateUser(userId: string, updates: Partial<Profile>) {
  const dbUpdates = profileToDb(updates)
  const { data, error } = await supabase
    .from('worder_profiles')
    .update(dbUpdates)
    .eq('id', userId)
    .select()
    .single()
  
  if (error) throw error
  return dbToProfile(data as ProfileDB)
}

/** Delete user */
export async function deleteUser(userId: string) {
  const { error } = await supabase
    .from('worder_profiles')
    .delete()
    .eq('id', userId)
  
  if (error) throw error
}

/** Create or update word */
export async function upsertWord(word: Partial<Word>) {
  const { data, error } = await supabase
    .from('worder_words')
    .upsert(word)
    .select()
    .single()
  
  if (error) throw error
  return data as Word
}

/** Delete word */
export async function deleteWord(wordId: number) {
  const { error } = await supabase
    .from('worder_words')
    .delete()
    .eq('id', wordId)
  
  if (error) throw error
}

/** Create reward */
export async function createReward(reward: Omit<Reward, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('worder_rewards')
    .insert(reward)
    .select()
    .single()
  
  if (error) throw error
  return data as Reward
}

/** Get user reward choices */
export async function getUserRewardChoices(userId: string) {
  const { data, error } = await supabase
    .from('worder_user_reward_choices')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data as UserRewardChoice[]
}

/** Save user reward choice */
export async function saveRewardChoice(choice: Omit<UserRewardChoice, 'id' | 'created_at'>) {
  const { data, error } = await supabase
    .from('worder_user_reward_choices')
    .insert(choice)
    .select()
    .single()
  
  if (error) throw error
  return data as UserRewardChoice
}

/** Update reward choice */
export async function updateRewardChoice(choiceId: number, updates: Partial<UserRewardChoice>) {
  const { data, error } = await supabase
    .from('worder_user_reward_choices')
    .update(updates)
    .eq('id', choiceId)
    .select()
    .single()
  
  if (error) throw error
  return data as UserRewardChoice
}

