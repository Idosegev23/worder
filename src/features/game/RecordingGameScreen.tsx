import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Word, getWordsByCategory } from '../../lib/supabase'
import { useAuth } from '../../store/useAuth'
import { supabase } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
// אין GlobalProgress למישל - לא רלוונטי
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
      const { data: _uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm',
          upsert: false
        })

      // וידוא שההעלאה הצליחה
      if (uploadError) throw uploadError
      if (!_uploadData) throw new Error('Upload failed - no data returned')

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
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 md:p-8 relative">
      {/* אין GlobalProgress למישל - לא רלוונטי */}
      
      <div className="max-w-4xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
          <div className="text-center sm:text-right space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">משחק מיוחד</p>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              הקלטת משפטים 🎤
            </h1>
            <p className="text-sm text-white/70">
              משפט {currentIndex + 1} מתוך {words.length}
            </p>
          </div>
          <button
            onClick={() => nav('/categories')}
            className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all"
          >
            ← חזרה
          </button>
        </div>

        {/* כרטיס המשחק */}
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-6 sm:p-8">
          {/* הוראות */}
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-r from-primary/20 to-secondary/20 px-6 py-3 rounded-full border border-white/10 mb-4">
              <span className="text-white font-semibold">📢 קראי את המשפט והקליטי אותו</span>
            </div>
          </div>

          {/* המשפט */}
          <div className="text-center mb-10 py-8 px-4 bg-white rounded-2xl shadow-lg">
            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-800 leading-relaxed" dir="rtl">
              {currentWord.he}
            </p>
          </div>

          {/* כפתורי הקלטה */}
          <div className="space-y-6">
            {!audioBlob && !hasSubmitted && (
              <div className="text-center">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="px-10 py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                  >
                    🎤 התחילי הקלטה
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="px-10 py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg animate-pulse"
                  >
                    ⏹️ עצרי הקלטה
                  </button>
                )}
              </div>
            )}

            {/* נגן ההקלטה */}
            {audioBlob && !hasSubmitted && (
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 p-6 rounded-2xl border border-green-500/30 text-center">
                  <p className="text-white text-xl font-bold mb-6">
                    ההקלטה שלך מוכנה! 🎉
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                      onClick={playRecording}
                      disabled={isPlaying}
                      className="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-all disabled:opacity-50"
                    >
                      {isPlaying ? '▶️ מנגן...' : '▶️ שמעי את ההקלטה'}
                    </button>
                    <button
                      onClick={deleteRecording}
                      className="px-6 py-3 rounded-xl bg-gray-600 hover:bg-gray-700 text-white font-semibold transition-all"
                    >
                      🗑️ מחקי והקליטי שוב
                    </button>
                  </div>
                </div>

                <button
                  onClick={submitRecording}
                  disabled={isUploading}
                  className="w-full py-5 text-xl font-bold rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isUploading ? '⏳ שולח...' : '✅ שלחי את ההקלטה'}
                </button>
              </div>
            )}

            {hasSubmitted && (
              <div className="text-center py-8">
                <div className="text-3xl font-bold text-green-400 animate-bounce">
                  🎉 נשלח בהצלחה! 🌟
                </div>
                <p className="text-white/70 mt-2">עוברים למשפט הבא...</p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-8">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

