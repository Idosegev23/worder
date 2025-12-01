// Text-to-Speech Service
// תומך גם ב-OpenAI (בתשלום) וגם ב-Web Speech API (חינמי)

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const USE_BROWSER_TTS = import.meta.env.VITE_USE_BROWSER_TTS === 'true'

// מילון תיקוני הגייה - מילים שה-TTS לא מבטא נכון
const PRONUNCIATION_FIXES: Record<string, string> = {
  'שרוכים': 'שְׂרוֹכִים', // עם שין שמאלית (ס)
}

// הקראה באמצעות Web Speech API (חינמי!)
function speakWithBrowserAPI(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser TTS not supported'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.85 // קצב דיבור
    utterance.pitch = 1.0
    
    utterance.onend = () => resolve()
    utterance.onerror = (error) => reject(error)
    
    window.speechSynthesis.speak(utterance)
  })
}

// תיקון הגייה - מחליף מילים בעייתיות בגרסה עם ניקוד/הגייה נכונה
function fixPronunciation(text: string): string {
  let fixed = text
  for (const [original, corrected] of Object.entries(PRONUNCIATION_FIXES)) {
    fixed = fixed.replace(new RegExp(original, 'g'), corrected)
  }
  return fixed
}

// הקראה באמצעות OpenAI TTS (בתשלום, איכות גבוהה יותר)
async function speakWithOpenAI(word: string): Promise<void> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key not configured')
  }

  // תיקון הגייה
  const fixedWord = fixPronunciation(word)

  // זיהוי אם הטקסט בעברית
  const isHebrew = /[\u0590-\u05FF]/.test(fixedWord)

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'coral', // קול חדש ואיכותי
      input: fixedWord,
      speed: 1.1, // קצב מהיר יותר
      instructions: isHebrew 
        ? "Speak clearly in Hebrew at a normal pace. Pay attention to nikud (vowel marks) for correct pronunciation." 
        : "Speak clearly at a normal pace, suitable for children learning English.",
    }),
  })

  if (!response.ok) {
    throw new Error(`OpenAI TTS failed: ${response.statusText}`)
  }

  const audioBlob = await response.blob()
  const audioUrl = URL.createObjectURL(audioBlob)
  const audio = new Audio(audioUrl)
  
  await audio.play()
  
  audio.onended = () => {
    URL.revokeObjectURL(audioUrl)
  }
}

export async function speakWord(word: string): Promise<void> {
  try {
    // אם הוגדר מפורשות להשתמש ב-TTS של הדפדפן
    if (USE_BROWSER_TTS) {
      console.log('Using browser TTS (free)')
      await speakWithBrowserAPI(word)
      return
    }
    
    // נסה OpenAI קודם (אם יש API key)
    if (OPENAI_API_KEY) {
      try {
        console.log('Using OpenAI TTS with model: gpt-4o-mini-tts, voice: coral')
        await speakWithOpenAI(word)
        return
      } catch (error) {
        console.warn('OpenAI TTS failed, falling back to browser TTS:', error)
      }
    }
    
    // fallback לדפדפן
    console.log('Using browser TTS as fallback')
    await speakWithBrowserAPI(word)
    
  } catch (error) {
    console.error('Error playing TTS:', error)
    throw error
  }
}

