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

// Internal DB types (snake_case for Supabase)
interface CategoryDB {
  id: number
  name: 'Nouns' | 'Verbs' | 'Prepositions' | 'Adjectives' | 'Pronouns' | 'Vocabulary' | 'Am/Is/Are' | 'Have/Has'
  display_name: string
  display_order: number
  created_at: string
}

interface WordDB {
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

// Exported types (camelCase for app compatibility)
export interface Category {
  id: number
  name: 'Nouns' | 'Verbs' | 'Prepositions' | 'Adjectives' | 'Pronouns' | 'Vocabulary' | 'Am/Is/Are' | 'Have/Has'
  displayName: string
  displayOrder: number
  createdAt: string
}

export interface Word {
  id: number
  categoryId: number
  en: string
  he: string
  altEn?: string[]
  altHe?: string[]
  displayOrder?: number
  active: boolean
  createdAt: string
}

// Helper to convert DB to App format
function dbToCategory(db: CategoryDB): Category {
  return {
    id: db.id,
    name: db.name,
    displayName: db.display_name,
    displayOrder: db.display_order,
    createdAt: db.created_at
  }
}

function dbToWord(db: WordDB): Word {
  return {
    id: db.id,
    categoryId: db.category_id,
    en: db.en,
    he: db.he,
    altEn: db.alt_en,
    altHe: db.alt_he,
    displayOrder: db.display_order,
    active: db.active,
    createdAt: db.created_at
  }
}

// Helper to convert App to DB format
function wordToDb(word: Partial<Word>): Partial<WordDB> {
  return {
    id: word.id,
    category_id: word.categoryId,
    en: word.en,
    he: word.he,
    alt_en: word.altEn,
    alt_he: word.altHe,
    display_order: word.displayOrder,
    active: word.active
  }
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
  userId: string // camelCase לתאימות
  rewardAId: number
  rewardBId: number
  chosenId?: number
  chosenAt?: string
  reported: boolean
  createdAt: string
}

export interface UserBenefit {
  id: number
  userId: string
  receivedAt: string
  claimed: boolean
  createdAt: string
}

// Internal DB types for UserRewardChoice
interface UserRewardChoiceDB {
  id: number
  user_id: string
  reward_a_id: number
  reward_b_id: number
  chosen_id?: number
  chosen_at?: string
  reported: boolean
  created_at: string
}

// Internal DB types for UserBenefit
interface UserBenefitDB {
  id: number
  user_id: string
  received_at: string
  claimed: boolean
  created_at: string
}

function dbToUserRewardChoice(db: UserRewardChoiceDB): UserRewardChoice {
  return {
    id: db.id,
    userId: db.user_id,
    rewardAId: db.reward_a_id,
    rewardBId: db.reward_b_id,
    chosenId: db.chosen_id,
    chosenAt: db.chosen_at,
    reported: db.reported,
    createdAt: db.created_at
  }
}

function userRewardChoiceToDb(choice: Partial<UserRewardChoice>): Partial<UserRewardChoiceDB> {
  return {
    id: choice.id,
    user_id: choice.userId,
    reward_a_id: choice.rewardAId,
    reward_b_id: choice.rewardBId,
    chosen_id: choice.chosenId,
    chosen_at: choice.chosenAt,
    reported: choice.reported
  }
}

function dbToUserBenefit(db: UserBenefitDB): UserBenefit {
  return {
    id: db.id,
    userId: db.user_id,
    receivedAt: db.received_at,
    claimed: db.claimed,
    createdAt: db.created_at
  }
}

// Database Helper Functions

/** Get all categories ordered by display_order */
export async function getCategories() {
  const { data, error } = await supabase
    .from('worder_categories')
    .select('*')
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return (data as CategoryDB[]).map(dbToCategory)
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
  return (data as WordDB[]).map(dbToWord)
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
  return (data as WordDB[]).map(dbToWord)
}

/** Get all words (admin only) */
export async function getAllWords() {
  const { data, error } = await supabase
    .from('worder_words')
    .select('*')
    .order('category_id', { ascending: true })
    .order('display_order', { ascending: true })
  
  if (error) throw error
  return (data as WordDB[]).map(dbToWord)
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
  // נרמול השם: trim + המרת רווחים מרובים לרווח אחד
  const normalizeUsername = (name: string) => {
    return name.trim().replace(/\s+/g, ' ')
  }
  
  const normalizedUsername = normalizeUsername(username)
  
  // נסה למצוא עם חיפוש חלקי ואז נבדוק נרמול
  const { data: allUsers, error: fetchError } = await supabase
    .from('worder_profiles')
    .select('*')
    .ilike('username', `%${normalizedUsername.split(' ')[0]}%`) // חיפוש לפי המילה הראשונה
  
  if (fetchError) {
    console.error('getUserByUsername error:', fetchError)
    return null
  }
  
  if (!allUsers || allUsers.length === 0) {
    return null
  }
  
  // מצא את המשתמש שהשם המנורמל שלו תואם
  for (const user of allUsers) {
    const dbUsernameNormalized = normalizeUsername((user as any).username || '')
    if (dbUsernameNormalized === normalizedUsername) {
      return dbToProfile(user as ProfileDB)
    }
  }
  
  return null
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
  const dbWord = wordToDb(word)
  const { data, error } = await supabase
    .from('worder_words')
    .upsert(dbWord)
    .select()
    .single()
  
  if (error) throw error
  return dbToWord(data as WordDB)
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
  return (data as UserRewardChoiceDB[]).map(dbToUserRewardChoice)
}

/** Save user reward choice */
export async function saveRewardChoice(choice: Omit<UserRewardChoice, 'id' | 'createdAt'>) {
  const dbChoice = userRewardChoiceToDb(choice)
  const { data, error } = await supabase
    .from('worder_user_reward_choices')
    .insert(dbChoice)
    .select()
    .single()
  
  if (error) throw error
  return dbToUserRewardChoice(data as UserRewardChoiceDB)
}

/** Update reward choice */
export async function updateRewardChoice(choiceId: number, updates: Partial<UserRewardChoice>) {
  const dbUpdates = userRewardChoiceToDb(updates)
  const { data, error } = await supabase
    .from('worder_user_reward_choices')
    .update(dbUpdates)
    .eq('id', choiceId)
    .select()
    .single()
  
  if (error) throw error
  return dbToUserRewardChoice(data as UserRewardChoiceDB)
}

/** Get user benefits */
export async function getUserBenefits(userId: string) {
  const { data, error } = await supabase
    .from('worder_user_benefits')
    .select('*')
    .eq('user_id', userId)
    .order('received_at', { ascending: false })
  
  if (error) throw error
  return (data as UserBenefitDB[]).map(dbToUserBenefit)
}

/** Add a benefit for user */
export async function addBenefit(userId: string) {
  const { data, error } = await supabase
    .from('worder_user_benefits')
    .insert({ user_id: userId })
    .select()
    .single()
  
  if (error) throw error
  return dbToUserBenefit(data as UserBenefitDB)
}

/** Get count of unclaimed benefits */
export async function getUnclaimedBenefitsCount(userId: string) {
  const { data, error } = await supabase
    .from('worder_user_benefits')
    .select('id')
    .eq('user_id', userId)
    .eq('claimed', false)
  
  if (error) throw error
  return data?.length || 0
}

/** Claim big prize (marks 5 benefits as claimed) */
export async function claimBigPrize(userId: string) {
  // Get first 5 unclaimed benefits
  const { data: benefits, error: fetchError } = await supabase
    .from('worder_user_benefits')
    .select('id')
    .eq('user_id', userId)
    .eq('claimed', false)
    .order('received_at', { ascending: true })
    .limit(5)
  
  if (fetchError) throw fetchError
  
  if (!benefits || benefits.length < 5) {
    throw new Error('Not enough benefits to claim big prize')
  }
  
  const benefitIds = benefits.map(b => b.id)
  
  // Mark them as claimed
  const { error: updateError } = await supabase
    .from('worder_user_benefits')
    .update({ claimed: true })
    .in('id', benefitIds)
  
  if (updateError) throw updateError
  
  return true
}

