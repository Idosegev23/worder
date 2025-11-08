import { Howl } from 'howler'

export const sfx = {
  correct: new Howl({ src: ['/sfx/correct.mp3'], volume: 0.3 }),
  wrong: new Howl({ src: ['/sfx/wrong.mp3'], volume: 0.3 }),
  boing: new Howl({ src: ['/sfx/boing.mp3'], volume: 0.3 }),
  victory: new Howl({ src: ['/sfx/victory.mp3'], volume: 0.3 }),
  cheer: new Howl({ src: ['/sfx/cheer.mp3'], volume: 0.3 }),
  sparkle: new Howl({ src: ['/sfx/sparkle.mp3'], volume: 0.3 }),
}

export function play(name: keyof typeof sfx) {
  try {
    sfx[name]?.play()
  } catch (e) {
    console.warn('Sound not available:', name)
  }
}

