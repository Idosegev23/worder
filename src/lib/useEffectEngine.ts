import { celebratoryEffects, mischievousEffects } from './effectsRegistry'

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const sum = items.reduce((a, i) => a + i.weight, 0)
  let r = Math.random() * sum
  for (const it of items) {
    if ((r -= it.weight) <= 0) return it
  }
  return items[0]
}

// אפקט חגיגי לתשובה נכונה
export async function triggerCelebration(rootEl?: HTMLElement) {
  const target = rootEl || document.getElementById('root')!
  const fx = pickWeighted(celebratoryEffects)
  try {
    await fx.run({ root: target })
  } catch (e) {
    console.warn('Celebration effect failed:', fx.key, e)
  }
}

// אפקט שובב לתשובה שגויה
export async function triggerFunnyEffect(rootEl?: HTMLElement) {
  const target = rootEl || document.getElementById('root')!
  const fx = pickWeighted(mischievousEffects)
  try {
    await fx.run({ root: target })
  } catch (e) {
    console.warn('Mischievous effect failed:', fx.key, e)
  }
}

