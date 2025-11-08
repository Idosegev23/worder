import { Howl } from 'howler'

// יצירת צלילים בצורה בטוחה - אם הקובץ לא קיים, לא יהיה שגיאה
function createSound(src: string) {
  try {
    return new Howl({ 
      src: [src], 
      volume: 0.3,
      html5: true,
      onloaderror: () => {
        console.log(`Sound file not found: ${src} (optional)`)
      }
    })
  } catch (e) {
    console.log(`Could not load sound: ${src}`)
    return null
  }
}

export const sfx = {
  correct: createSound('/sfx/correct.mp3'),
  wrong: createSound('/sfx/wrong.mp3'),
  boing: createSound('/sfx/boing.mp3'),
  victory: createSound('/sfx/victory.mp3'),
  cheer: createSound('/sfx/cheer.mp3'),
  sparkle: createSound('/sfx/sparkle.mp3'),
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

