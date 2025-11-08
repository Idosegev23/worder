import { gsap } from 'gsap'
import { fireConfetti, fireFireworks, starShower } from './confetti'
import { play } from './sounds'

export type EffectCtx = { root: HTMLElement }
export type Effect = {
  key: string
  weight: number
  cooldownMs?: number
  safe?: boolean
  run: (ctx: EffectCtx) => Promise<void> | void
}

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

// אפקטים חגיגיים - לתשובות נכונות!
export const celebratoryEffects: Effect[] = [
  {
    key: 'confettiBurst',
    weight: 4,
    safe: true,
    run: async () => {
      // 3 גלים של קונפטי!
      fireConfetti()
      await sleep(400)
      fireConfetti()
      await sleep(400)
      fireConfetti()
      await sleep(800)
    }
  },
  {
    key: 'fireworks',
    weight: 3,
    safe: true,
    run: async () => {
      fireFireworks()
      await sleep(2000) // זיקוקים ארוכים יותר!
    }
  },
  {
    key: 'starShower',
    weight: 3,
    safe: true,
    run: async () => {
      // גשם כוכבים כפול!
      starShower()
      await sleep(600)
      starShower()
      await sleep(1000)
    }
  },
  {
    key: 'victoryDance',
    weight: 4,
    safe: true,
    run: async ({ root }) => {
      // ריקוד ארוך ומהנה!
      for (let i = 0; i < 3; i++) {
        root.classList.add('victory-dance')
        await sleep(800)
        root.classList.remove('victory-dance')
        await sleep(200)
      }
    }
  },
  {
    key: 'glowPulse',
    weight: 3,
    safe: true,
    run: async ({ root }) => {
      root.classList.add('glow')
      await sleep(2000) // זוהר ארוך!
      root.classList.remove('glow')
    }
  },
  {
    key: 'happyBounce',
    weight: 4,
    safe: true,
    run: async ({ root }) => {
      // קפיצות גבוהות יותר וארוכות יותר!
      gsap.to(root, {
        y: -50,
        duration: 0.4,
        yoyo: true,
        repeat: 4,
        ease: 'bounce.out'
      })
      await sleep(1800)
    }
  },
  {
    key: 'rainbowFlash',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      // קשת צבעים ארוכה ומהנה!
      const colors = ['#FF0080', '#FF4500', '#FFD700', '#00FF80', '#00CED1', '#8000FF', '#FF1493']
      for (let i = 0; i < 2; i++) {
        for (const color of colors) {
          root.style.backgroundColor = color
          await sleep(150)
        }
      }
      root.style.backgroundColor = ''
    }
  },
  {
    key: 'emojiRain',
    weight: 3,
    safe: true,
    run: async () => {
      // גשם אימוג'ים ענק!
      const emojis = ['🎉', '⭐', '✨', '🌟', '💫', '🎊', '🏆', '👏', '🎈', '🎆']
      const container = document.createElement('div')
      container.className = 'particles-container'
      document.body.appendChild(container)

      // 3 גלים של אימוג'ים!
      for (let wave = 0; wave < 3; wave++) {
        for (let i = 0; i < 20; i++) {
          const emoji = document.createElement('div')
          emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)]
          emoji.className = 'particle'
          emoji.style.cssText = `
            left: ${Math.random() * 100}%;
            top: -50px;
            font-size: ${30 + Math.random() * 40}px;
          `
          container.appendChild(emoji)

          gsap.to(emoji, {
            y: window.innerHeight + 100,
            rotation: Math.random() * 720,
            duration: 2.5 + Math.random() * 2,
            ease: 'power1.in',
            delay: wave * 0.8
          })
        }
      }

      await sleep(5000)
      container.remove()
    }
  },
  {
    key: 'scaleJoy',
    weight: 3,
    safe: true,
    run: async ({ root }) => {
      // זום וסיבוב מטורפים!
      gsap.to(root, {
        scale: 1.3,
        rotation: 360,
        duration: 0.8,
        yoyo: true,
        repeat: 2,
        ease: 'back.out(2)'
      })
      await sleep(1800)
    }
  },
  {
    key: 'particleExplosion',
    weight: 2,
    safe: true,
    run: async () => {
      // פיצוץ פרטיקלים ענק!
      const container = document.createElement('div')
      container.className = 'particles-container'
      document.body.appendChild(container)

      const centerX = window.innerWidth / 2
      const centerY = window.innerHeight / 2

      // 3 גלי פיצוצים!
      for (let wave = 0; wave < 3; wave++) {
        for (let i = 0; i < 30; i++) {
          const particle = document.createElement('div')
          particle.className = 'particle'
          const size = 15 + Math.random() * 20
          particle.style.cssText = `
            left: ${centerX}px;
            top: ${centerY}px;
            width: ${size}px;
            height: ${size}px;
            background: ${['#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#06B6D4'][Math.floor(Math.random() * 5)]};
            border-radius: 50%;
          `
          container.appendChild(particle)

          const angle = (Math.PI * 2 * i) / 30
          const distance = 150 + Math.random() * 200
          gsap.to(particle, {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance,
            opacity: 0,
            duration: 1.5 + Math.random(),
            ease: 'power2.out',
            delay: wave * 0.3
          })
        }
      }

      await sleep(3000)
      container.remove()
    }
  },
  {
    key: 'successChime',
    weight: 3,
    safe: true,
    run: async ({ root }) => {
      play('victory')
      root.classList.add('celebrate')
      await sleep(600)
      root.classList.remove('celebrate')
    }
  },
  {
    key: 'goldShimmer',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      // נצנוץ זהב ארוך ומהמם!
      root.classList.add('shimmer')
      root.style.background = 'linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.5), transparent)'
      await sleep(3000)
      root.classList.remove('shimmer')
      root.style.background = ''
    }
  }
]

// אפקטים עדינים - לתשובות שגויות (ללא רעידות ואפקטים מטרידים)
export const mischievousEffects: Effect[] = [
  {
    key: 'gentlePulse',
    weight: 3,
    safe: true,
    run: async ({ root }) => {
      // פעימה עדינה - ללא רעידה
      gsap.to(root, { 
        scale: 1.03, 
        duration: 0.3, 
        yoyo: true, 
        repeat: 2,
        ease: 'power1.inOut' 
      })
      await sleep(1000)
    }
  },
  {
    key: 'runawayBtn',
    weight: 3,
    safe: true,
    run: async () => {
      const btn = document.querySelector('button[type="submit"], .submit-btn') as HTMLElement
      if (!btn) return
      btn.style.position = 'relative'
      btn.style.left = Math.random() > 0.5 ? '120px' : '-120px'
      await sleep(800)
      btn.style.left = '0px'
    }
  },
  {
    key: 'ripple',
    weight: 3,
    safe: true,
    run: async ({ root }) => {
      root.classList.add('ripple')
      await sleep(600)
      root.classList.remove('ripple')
    }
  },
  {
    key: 'fadeEffect',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      // דהייה עדינה
      gsap.to(root, { opacity: 0.6, duration: 0.3, yoyo: true, repeat: 1 })
      await sleep(700)
    }
  },
  {
    key: 'confettiReverse',
    weight: 2,
    safe: true,
    run: async () => {
      // אפקט הפוך - קונפטי נופל כלפי מעלה
      fireConfetti()
      await sleep(600)
    }
  },
  {
    key: 'zoomBurst',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      gsap.to(root, { scale: 1.05, duration: 0.15, yoyo: true, repeat: 1 })
      await sleep(400)
    }
  },
  {
    key: 'gravityDrop',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      gsap.to(root, { y: 40, duration: 0.2, yoyo: true, repeat: 1, ease: 'bounce.out' })
      await sleep(500)
    }
  },
  {
    key: 'cursorMagnet',
    weight: 2,
    safe: true,
    run: async () => {
      document.body.classList.add('cursor-magnet')
      await sleep(1200)
      document.body.classList.remove('cursor-magnet')
    }
  },
  {
    key: 'typeScramble',
    weight: 2,
    safe: true,
    run: async () => {
      const el = document.querySelector('.word-text') as HTMLElement
      if (!el) return
      const original = el.textContent || ''
      el.textContent = [...original].sort(() => Math.random() - 0.5).join('')
      await sleep(600)
      el.textContent = original
    }
  },
  {
    key: 'emojiBurst',
    weight: 2,
    safe: true,
    run: async () => {
      const d = document.createElement('div')
      d.textContent = '🤪🎉😜'
      d.style.cssText = `
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(1.5);
        font-size: 3rem;
        z-index: 10000;
      `
      document.body.appendChild(d)
      await sleep(600)
      d.remove()
    }
  },
  {
    key: 'blurPulse',
    weight: 2,
    safe: true,
    run: async ({ root }) => {
      root.style.filter = 'blur(2px)'
      await sleep(250)
      root.style.filter = ''
    }
  },
  {
    key: 'buttonTeleport',
    weight: 1,
    safe: true,
    run: async () => {
      const btn = document.querySelector('button[type="submit"], .submit-btn') as HTMLElement
      if (!btn) return
      const old = btn.style.transform
      btn.style.transform = 'translateX(140px)'
      await sleep(700)
      btn.style.transform = old
    }
  },
  {
    key: 'afterimageEcho',
    weight: 1,
    safe: true,
    run: async ({ root }) => {
      root.classList.add('echo')
      await sleep(700)
      root.classList.remove('echo')
    }
  },
  {
    key: 'miniQuiz',
    weight: 1,
    safe: true,
    run: async () => {
      alert('בונוס זריז: כמה זה 2+2? (תשובה: 4)')
    }
  }
]

