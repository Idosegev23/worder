// Text-to-Speech Service
// תומך גם ב-OpenAI (בתשלום) וגם ב-Web Speech API (חינמי)

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY
const USE_BROWSER_TTS = import.meta.env.VITE_USE_BROWSER_TTS === 'true'

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

// הקראה באמצעות OpenAI TTS (בתשלום, איכות גבוהה יותר)
async function speakWithOpenAI(word: string): Promise<void> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key not configured')
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'alloy',
      input: word,
      speed: 0.9
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
    // אם הוגדר להשתמש ב-TTS של הדפדפן, או אם אין OpenAI Key
    if (USE_BROWSER_TTS || !OPENAI_API_KEY) {
      console.log('Using browser TTS (free)')
      await speakWithBrowserAPI(word)
    } else {
      // נסה OpenAI, אם נכשל - חזור ל-Browser TTS
      try {
        console.log('Using OpenAI TTS')
        await speakWithOpenAI(word)
      } catch (error) {
        console.warn('OpenAI TTS failed, falling back to browser TTS:', error)
        await speakWithBrowserAPI(word)
      }
    }
  } catch (error) {
    console.error('Error playing TTS:', error)
    throw error
  }
}

