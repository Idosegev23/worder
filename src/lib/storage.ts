import { db } from './db'

export async function exportAll(): Promise<Blob> {
  const data = {
    profiles: await db.profiles.toArray(),
    categories: await db.categories.toArray(),
    words: await db.words.toArray(),
    progress: await db.progress.toArray(),
    rewards: await db.rewards.toArray(),
    userRewardChoices: await db.userRewardChoices.toArray(),
    exportedAt: new Date().toISOString()
  }
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
}

export async function importAll(file: File) {
  const txt = await file.text()
  const json = JSON.parse(txt)
  
  await db.transaction('rw', [db.profiles, db.categories, db.words, db.progress, db.rewards, db.userRewardChoices], async () => {
    await db.profiles.clear()
    await db.categories.clear()
    await db.words.clear()
    await db.progress.clear()
    await db.rewards.clear()
    await db.userRewardChoices.clear()
    
    await db.profiles.bulkAdd(json.profiles || [])
    await db.categories.bulkAdd(json.categories || [])
    await db.words.bulkAdd(json.words || [])
    await db.progress.bulkAdd(json.progress || [])
    await db.rewards.bulkAdd(json.rewards || [])
    await db.userRewardChoices.bulkAdd(json.userRewardChoices || [])
  })
}

