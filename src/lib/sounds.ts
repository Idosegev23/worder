import { Howl } from 'howler'

// צלילים חינמיים מ-Freesound.org
// רישיון: Creative Commons (שימוש חופשי)
const SOUND_URLS = {
  correct: 'https://freesound.org/data/previews/320/320655_5260872-lq.mp3', // Success bell
  wrong: 'https://freesound.org/data/previews/415/415209_5121236-lq.mp3', // Wrong buzz
  boing: 'https://freesound.org/data/previews/341/341695_5858296-lq.mp3', // Boing
  victory: 'https://freesound.org/data/previews/270/270319_5123851-lq.mp3', // Victory fanfare
  cheer: 'https://freesound.org/data/previews/277/277203_3263906-lq.mp3', // Small crowd
  sparkle: 'https://freesound.org/data/previews/415/415763_6378373-lq.mp3', // Magic sparkle
}

// יצירת צלילים בצורה בטוחה
function createSound(src: string) {
  try {
    return new Howl({
      src: [src],
      volume: 0.3,
      html5: true, // חזרה ל-HTML5 Audio - עובד טוב יותר עם CORS
      pool: 5, // הגדלת ה-pool ל-5
      preload: false, // טעינה lazy - רק כשצריך
      onloaderror: () => {
        console.log(`Sound could not load (optional)`)
      }
    })
  } catch (e) {
    console.log(`Could not create sound`)
    return null
  }
}

export const sfx = {
  correct: createSound(SOUND_URLS.correct),
  wrong: createSound(SOUND_URLS.wrong),
  boing: createSound(SOUND_URLS.boing),
  victory: createSound(SOUND_URLS.victory),
  cheer: createSound(SOUND_URLS.cheer),
  sparkle: createSound(SOUND_URLS.sparkle),
}

export function play(name: keyof typeof sfx) {
  try {
    const sound = sfx[name]
    if (sound) {
      // נסה לנגן גם אם לא נטען עדיין
      sound.play()
    }
  } catch (e) {
    // Silently fail - sounds are optional
  }
}

