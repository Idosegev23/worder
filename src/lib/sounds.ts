import { Howl } from 'howler'

// צלילים חינמיים מהאינטרנט - Pixabay Free Sounds
// רישיון: Creative Commons CC0 (שימוש חופשי)
const SOUND_URLS = {
  correct: 'https://cdn.pixabay.com/audio/2021/08/04/audio_0625c1539c.mp3', // Success sound
  wrong: 'https://cdn.pixabay.com/audio/2022/03/10/audio_4dedf2bf94.mp3', // Wrong buzzer
  boing: 'https://cdn.pixabay.com/audio/2021/08/09/audio_bb630cc098.mp3', // Boing
  victory: 'https://cdn.pixabay.com/audio/2023/11/06/audio_0b20c10806.mp3', // Victory fanfare
  cheer: 'https://cdn.pixabay.com/audio/2023/08/28/audio_3a68e30421.mp3', // Crowd cheer
  sparkle: 'https://cdn.pixabay.com/audio/2022/03/24/audio_c8cb0b5b54.mp3', // Sparkle magic
}

// יצירת צלילים בצורה בטוחה
function createSound(src: string) {
  try {
    return new Howl({ 
      src: [src], 
      volume: 0.3,
      html5: true,
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
      sound.play()
    }
  } catch (e) {
    // Silently fail - sounds are optional
  }
}

