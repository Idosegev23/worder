// OpenAI Text-to-Speech Service

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY

export async function speakWord(word: string): Promise<void> {
  if (!OPENAI_API_KEY) {
    console.error('OpenAI API Key not configured')
    return
  }

  try {
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
    
    // ניקוי ה-URL אחרי השמעה
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl)
    }
  } catch (error) {
    console.error('Error playing TTS:', error)
    throw error
  }
}

