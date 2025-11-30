import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { supabase } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { GlobalProgress } from '../../shared/ui/GlobalProgress'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

/**
 * מסך משחק הקלטות למישל מישמיש
 * - השמעת משפט בעברית (TTS)
 * - הקלטת המשפט על ידי המשתמש
 * - שמיעת ההקלטה
 * - שליחה לאדמין
 */
export default function RecordingGameScreen() {
  const { categoryId } = useParams()
  const nav = useNavigate()
  const user = useAuth(s => s.user)

  const [words, setWords] = useState<Word[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  
  // הקלטה
  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  
  // TTS
  const [isSpeaking, setIsSpeaking] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null)

  const currentWord = words[currentIndex]

  // טעינת מילים
  useEffect(() => {
    if (!categoryId || !user) return
    loadWords()
  }, [categoryId, user])

  const loadWords = async () => {
    if (!categoryId || !user) return
    setIsLoading(true)
    setLoadError(null)
    try {
      const allWords = await getWordsByCategory(parseInt(categoryId))
      
      if (allWords.length === 0) {
        setLoadError('אין משפטים זמינים')
        setWords([])
      } else {
        setWords(allWords)
      }
    } catch (err) {
      console.error('Error loading words:', err)
      setLoadError('שגיאה בטעינת המשפטים')
    } finally {
      setIsLoading(false)
    }
  }

  // השמעת המשפט בעברית (TTS)
  const handleSpeak = () => {
    if (!currentWord || isSpeaking) return
    setIsSpeaking(true)
    
    const utterance = new SpeechSynthesisUtterance(currentWord.he)
    utterance.lang = 'he-IL'
    utterance.rate = 0.7 // קצב איטי יותר לבהירות
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  // התחלת הקלטה
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        
        // עצירת הזרם
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Error starting recording:', err)
      alert('שגיאה בהפעלת המיקרופון. אנא וודאי שנתת הרשאה.')
    }
  }

  // עצירת הקלטה
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  // השמעת ההקלטה
  const playRecording = () => {
    if (!audioUrl) return
    
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }

    const audio = new Audio(audioUrl)
    audioPlayerRef.current = audio
    audio.onplay = () => setIsPlaying(true)
    audio.onended = () => setIsPlaying(false)
    audio.onerror = () => setIsPlaying(false)
    audio.play()
  }

  // מחיקת הקלטה
  const deleteRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
    setAudioBlob(null)
    setAudioUrl(null)
    setIsPlaying(false)
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause()
      audioPlayerRef.current = null
    }
  }

  // שליחת ההקלטה
  const submitRecording = async () => {
    if (!audioBlob || !user || !currentWord) return
    
    setIsUploading(true)
    try {
      // העלאה ל-Supabase Storage
      const fileName = `${user.id}/${currentWord.id}_${Date.now()}.webm`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        })

      if (uploadError) throw uploadError

      // קבלת URL ציבורי
      const { data: urlData } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName)

      // שמירה בטבלה
      const { error: dbError } = await supabase
        .from('worder_recordings')
        .insert({
          user_id: user.id,
          word_id: currentWord.id,
          audio_url: urlData.publicUrl
        })

      if (dbError) throw dbError

      setHasSubmitted(true)
      alert('ההקלטה נשלחה בהצלחה! 🎉')
      
      // מעבר למשפט הבא אחרי 2 שניות
      setTimeout(() => {
        moveToNextSentence()
      }, 2000)
    } catch (err) {
      console.error('Error uploading recording:', err)
      alert('שגיאה בשליחת ההקלטה. נסי שוב.')
    } finally {
      setIsUploading(false)
    }
  }

  // מעבר למשפט הבא
  const moveToNextSentence = () => {
    deleteRecording()
    setHasSubmitted(false)

    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      // סיום המשחק
      alert('כל הכבוד מישל! סיימת את כל ההקלטות! 🎉🌟')
      nav('/categories')
    }
  }

  if (isLoading) {
    return <LoadingOverlay fullscreen message="טוען משפטים..." />
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-xl text-white mb-4">{loadError}</p>
          <Button onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
        </Card>
      </div>
    )
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md text-center">
          <p className="text-xl text-white mb-4">אין משפטים זמינים</p>
          <Button onClick={() => nav('/categories')}>חזרה לקטגוריות</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 md:p-8 relative">
      <GlobalProgress />
      
      <div className="max-w-4xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
          <div className="text-center sm:text-right">
            <h1 className="text-2xl sm:text-3xl font-black text-white mb-1">
              הקלטת משפטים 🎤
            </h1>
            <p className="text-sm text-white/70">
              משפט {currentIndex + 1} מתוך {words.length}
            </p>
          </div>
          <Button
            onClick={() => nav('/categories')}
            className="w-full sm:w-auto"
          >
            ← חזרה
          </Button>
        </div>

        {/* כרטיס המשחק */}
        <Card className="relative min-h-[520px] sm:min-h-[600px] flex flex-col">
          {/* הוראות */}
          <div className="text-center mb-6 bg-gradient-to-r from-primary/20 to-secondary/20 p-4 rounded-xl">
            <p className="text-lg font-bold text-white mb-2">
              📢 הוראה ברורה
            </p>
            <p className="text-base text-white/90">
              האזיני לקטע השמיעה והקליטי את מה ששמעת
            </p>
          </div>

          {/* המשפט */}
          <div className="text-center mb-6 bg-white/10 p-6 rounded-2xl">
            <p className="text-2xl sm:text-3xl font-bold text-white leading-relaxed" dir="rtl">
              {currentWord.he}
            </p>
          </div>

          {/* כפתור השמעה */}
          <div className="text-center mb-6">
            <button
              onClick={handleSpeak}
              disabled={isSpeaking}
              className={`px-8 py-4 rounded-2xl text-xl font-bold transition-all ${
                isSpeaking
                  ? 'bg-primary/50 animate-pulse'
                  : 'bg-gradient-to-r from-primary to-secondary text-white hover:scale-105 shadow-lg'
              }`}
            >
              {isSpeaking ? '🔊 מנגן...' : '🔉 האזיני למשפט'}
            </button>
          </div>

          {/* כפתורי הקלטה */}
          <div className="space-y-4 flex-1">
            {!audioBlob && !hasSubmitted && (
              <div className="text-center">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="w-full sm:w-auto text-xl py-4 px-8 bg-red-500 hover:bg-red-600"
                  >
                    🎤 התחילי הקלטה
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="w-full sm:w-auto text-xl py-4 px-8 bg-red-600 hover:bg-red-700 animate-pulse"
                  >
                    ⏹️ עצרי הקלטה
                  </Button>
                )}
              </div>
            )}

            {/* נגן ההקלטה */}
            {audioBlob && !hasSubmitted && (
              <div className="space-y-4">
                <div className="bg-white/10 p-4 rounded-xl text-center">
                  <p className="text-white font-semibold mb-4">
                    ההקלטה שלך מוכנה! 🎉
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                      onClick={playRecording}
                      disabled={isPlaying}
                      className="bg-blue-500 hover:bg-blue-600"
                    >
                      {isPlaying ? '▶️ מנגן...' : '▶️ שמעי את ההקלטה'}
                    </Button>
                    <Button
                      onClick={deleteRecording}
                      className="bg-gray-500 hover:bg-gray-600"
                    >
                      🗑️ מחקי והקליטי שוב
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={submitRecording}
                  disabled={isUploading}
                  className="w-full text-xl py-4 bg-green-500 hover:bg-green-600"
                >
                  {isUploading ? '⏳ שולח...' : '✅ שלחי את ההקלטה'}
                </Button>
              </div>
            )}

            {hasSubmitted && (
              <div className="text-center text-2xl font-bold text-green-400 animate-bounce">
                🎉 נשלח בהצלחה! עוברים למשפט הבא... 🌟
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

