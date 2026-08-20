// Text-to-Speech Service
// תומך גם ב-OpenAI (בתשלום) וגם ב-Web Speech API (חינמי)

// המפתח כבר לא נמצא בדפדפן — ההקראה עוברת דרך /api/tts.
// VITE_USE_BROWSER_TTS=true כופה את מנוע הדפדפן החינמי.
const USE_BROWSER_TTS = import.meta.env.VITE_USE_BROWSER_TTS === 'true'

// מילון תיקוני הגייה - מילים שה-TTS לא מבטא נכון
const PRONUNCIATION_FIXES: Record<string, string> = {
  'שרוכים': 'סרוכים', // TTS קורא ש כמו ס, אז נכתוב ס ישירות
}

// הקראה באמצעות Web Speech API (חינמי!)
function speakWithBrowserAPI(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('Browser TTS not supported'))
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    // היה מקודד ל-en-US — קול אנגלי שמנסה לקרוא עברית מייצר ג'יבריש
    utterance.lang = /[\u0590-\u05FF]/.test(text) ? 'he-IL' : 'en-US'
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

// הקראה דרך הפונקציה השרתית — המפתח נשאר בשרת
async function speakWithOpenAI(word: string): Promise<void> {
  const fixedWord = fixPronunciation(word)

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: fixedWord })
  })

  if (!response.ok) {
    throw new Error(`TTS failed: ${response.status}`)
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
    
    // ניסיון ראשון: הפונקציה השרתית
    try {
      await speakWithOpenAI(word)
      return
    } catch (error) {
      console.warn('Server TTS failed, falling back to browser TTS:', error)
    }
    
    // fallback לדפדפן
    console.log('Using browser TTS as fallback')
    await speakWithBrowserAPI(word)
    
  } catch (error) {
    console.error('Error playing TTS:', error)
    throw error
  }
}

