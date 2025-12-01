import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

interface Recording {
  id: number
  user_id: string
  word_id: number
  audio_url: string
  duration_seconds: number | null
  created_at: string
  user_name?: string
  sentence?: string
  format?: string
}

// בדיקה אם פורמט נתמך במכשיר הנוכחי
const canPlayFormat = (format: string): boolean => {
  const audio = document.createElement('audio')
  const mimeTypes: Record<string, string> = {
    'webm': 'audio/webm',
    'mp4': 'audio/mp4',
    'm4a': 'audio/mp4',
    'ogg': 'audio/ogg',
    'wav': 'audio/wav',
    'mp3': 'audio/mpeg'
  }
  const mime = mimeTypes[format] || `audio/${format}`
  return audio.canPlayType(mime) !== ''
}

// חילוץ פורמט מ-URL
const getFormatFromUrl = (url: string): string => {
  const match = url.match(/\.(\w+)(?:\?|$)/)
  return match ? match[1].toLowerCase() : 'unknown'
}

// בדיקה אם זה iOS/Safari
const isIOS = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export default function RecordingsTable() {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [playingId, setPlayingId] = useState<number | null>(null)

  useEffect(() => {
    loadRecordings()
  }, [])

  const loadRecordings = async () => {
    setIsLoading(true)
    try {
      // שליפת הקלטות עם פרטי משתמש ומשפט
      const { data, error } = await supabase
        .from('worder_recordings')
        .select(`
          *,
          user:worder_profiles!user_id(first_name, last_name),
          word:worder_words!word_id(he)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const formattedRecordings = (data || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        word_id: r.word_id,
        audio_url: r.audio_url,
        duration_seconds: r.duration_seconds,
        created_at: r.created_at,
        user_name: r.user ? `${r.user.first_name} ${r.user.last_name}` : 'לא ידוע',
        sentence: r.word?.he || 'לא ידוע',
        format: getFormatFromUrl(r.audio_url)
      }))

      setRecordings(formattedRecordings)
    } catch (err) {
      console.error('Error loading recordings:', err)
      alert('שגיאה בטעינת הקלטות')
    } finally {
      setIsLoading(false)
    }
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString('he-IL')
    const logEntry = `[${timestamp}] ${message}`
    console.log(logEntry)
    setDebugLogs(prev => [...prev.slice(-50), logEntry]) // שמור 50 לוגים אחרונים
  }

  const playRecording = (recording: Recording) => {
    const format = recording.format || getFormatFromUrl(recording.audio_url)
    const canPlay = canPlayFormat(format)
    
    addLog(`🎵 ניסיון השמעה: ${recording.audio_url}`)
    addLog(`📋 פרטי הקלטה: ID=${recording.id}, משתמש=${recording.user_name}`)
    addLog(`📁 פורמט: ${format}, נתמך: ${canPlay ? 'כן' : 'לא'}`)
    addLog(`📱 מכשיר: ${isIOS() ? 'iOS/Safari' : 'אחר'}`)
    
    if (!canPlay) {
      addLog(`❌ פורמט ${format} לא נתמך במכשיר זה!`)
      alert(`⚠️ פורמט ${format.toUpperCase()} לא נתמך במכשיר זה.\n\n${
        isIOS() 
          ? 'iOS/Safari לא תומך ב-WebM.\nנסה לשמוע במחשב או באנדרואיד.'
          : 'נסה לשמוע במכשיר אחר.'
      }`)
      return
    }
    
    // אם כבר מנגן את אותה הקלטה - עצור
    if (playingId === recording.id) {
      addLog('⏹️ עצירת השמעה (אותה הקלטה)')
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
      setPlayingId(null)
      return
    }

    // עצור הקלטה קודמת אם יש
    if (audioRef.current) {
      addLog('⏹️ עצירת הקלטה קודמת')
      audioRef.current.pause()
      audioRef.current = null
    }

    setPlayingId(recording.id)
    
    const audio = new Audio()
    audioRef.current = audio
    
    // הגדרות לתאימות מובייל
    audio.preload = 'auto'
    
    addLog(`🔧 יצירת Audio element`)
    addLog(`🔗 URL: ${recording.audio_url}`)
    
    audio.onloadstart = () => addLog('📥 התחלת טעינה (loadstart)')
    audio.onloadedmetadata = () => addLog(`📊 מטאדאטה נטענה: duration=${audio.duration}s`)
    audio.onloadeddata = () => addLog('✅ נתונים נטענו (loadeddata)')
    
    audio.oncanplay = () => {
      addLog('▶️ ניתן להשמיע (canplay)')
    }
    
    audio.oncanplaythrough = () => {
      addLog('▶️ ניתן להשמיע עד הסוף (canplaythrough)')
      audio.play().then(() => {
        addLog('🎶 השמעה התחילה בהצלחה!')
      }).catch(err => {
        addLog(`❌ שגיאת play(): ${err.name} - ${err.message}`)
        setPlayingId(null)
        alert(`שגיאה בהשמעה: ${err.message}`)
      })
    }
    
    audio.onplaying = () => addLog('🎶 מנגן (playing)')
    
    audio.onended = () => {
      addLog('✅ השמעה הסתיימה')
      setPlayingId(null)
      audioRef.current = null
    }
    
    audio.onerror = () => {
      const errorCode = audio.error?.code
      const errorMessage = audio.error?.message || 'Unknown error'
      const errorTypes: Record<number, string> = {
        1: 'MEDIA_ERR_ABORTED - טעינה בוטלה',
        2: 'MEDIA_ERR_NETWORK - שגיאת רשת',
        3: 'MEDIA_ERR_DECODE - שגיאת פענוח (פורמט לא נתמך)',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - מקור לא נתמך'
      }
      const errorType = errorCode ? errorTypes[errorCode] : 'Unknown'
      
      addLog(`❌ שגיאת Audio: code=${errorCode}, type=${errorType}`)
      addLog(`❌ הודעה: ${errorMessage}`)
      addLog(`❌ URL שנכשל: ${recording.audio_url}`)
      
      setPlayingId(null)
      audioRef.current = null
      alert(`שגיאה: ${errorType}\n\nURL: ${recording.audio_url}`)
    }
    
    audio.onstalled = () => addLog('⚠️ טעינה נתקעה (stalled)')
    audio.onwaiting = () => addLog('⏳ ממתין לנתונים (waiting)')
    audio.onsuspend = () => addLog('⏸️ טעינה הושהתה (suspend)')
    
    addLog('🔄 מתחיל טעינה...')
    audio.src = recording.audio_url
    audio.load()
  }

  const deleteRecording = async (id: number) => {
    if (!confirm('האם למחוק הקלטה זו?')) return

    try {
      const { error } = await supabase
        .from('worder_recordings')
        .delete()
        .eq('id', id)

      if (error) throw error

      setRecordings(recordings.filter(r => r.id !== id))
      alert('ההקלטה נמחקה בהצלחה')
    } catch (err) {
      console.error('Error deleting recording:', err)
      alert('שגיאה במחיקת ההקלטה')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (isLoading) {
    return <LoadingOverlay fullscreen message="טוען הקלטות..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              הקלטות מישל 🎤
            </h1>
            <p className="text-white/70">
              סה"כ {recordings.length} הקלטות
            </p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowDebug(!showDebug)}
              className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-all ${
                showDebug 
                  ? 'border-yellow-400/60 text-yellow-400 bg-yellow-400/10' 
                  : 'border-white/20 text-white/60 hover:text-white'
              }`}
            >
              🐛 Debug
            </button>
            <Link to="/admin/dashboard">
              <button className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all">
                ← חזרה
              </button>
            </Link>
          </div>
        </div>

        {/* אזהרת iOS */}
        {isIOS() && recordings.some(r => (r.format || 'webm') === 'webm') && (
          <div className="mb-6 bg-yellow-500/20 border border-yellow-400/40 rounded-2xl p-4">
            <p className="text-yellow-200 text-sm">
              ⚠️ <strong>שים לב:</strong> את/ה משתמש/ת ב-iOS/Safari. 
              חלק מההקלטות (WebM) לא יתנגנו במכשיר זה.
              <br />
              לשמיעת כל ההקלטות, השתמש/י במחשב או בטלפון אנדרואיד.
            </p>
          </div>
        )}

        {/* Debug Panel */}
        {showDebug && (
          <div className="mb-6 bg-black/50 rounded-2xl border border-yellow-400/30 p-4 font-mono text-xs">
            <div className="flex justify-between items-center mb-3">
              <span className="text-yellow-400 font-bold">🐛 Debug Logs</span>
              <button 
                onClick={() => setDebugLogs([])}
                className="text-red-400 hover:text-red-300"
              >
                🗑️ נקה
              </button>
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {debugLogs.length === 0 ? (
                <p className="text-white/50">לחץ על "השמע" כדי לראות לוגים...</p>
              ) : (
                debugLogs.map((log, i) => (
                  <div 
                    key={i} 
                    className={`text-white/80 ${
                      log.includes('❌') ? 'text-red-400' : 
                      log.includes('✅') ? 'text-green-400' : 
                      log.includes('⚠️') ? 'text-yellow-400' : ''
                    }`}
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* רשימת הקלטות */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
          {recordings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-white/70">אין הקלטות עדיין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording, index) => (
                <div
                  key={recording.id}
                  className="bg-white rounded-xl p-5 shadow-md hover:shadow-lg transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* מספר ופרטי ההקלטה */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          👤 {recording.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          📅 {formatDate(recording.created_at)}
                        </span>
                        {/* תג פורמט */}
                        <span className={`text-xs px-2 py-1 rounded-full font-mono ${
                          canPlayFormat(recording.format || 'webm')
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {(recording.format || 'webm').toUpperCase()}
                          {!canPlayFormat(recording.format || 'webm') && ' ⚠️'}
                        </span>
                      </div>
                      {/* אזהרת תאימות */}
                      {!canPlayFormat(recording.format || 'webm') && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-800">
                          ⚠️ פורמט זה לא נתמך במכשיר הנוכחי. נסה לשמוע במחשב או באנדרואיד.
                        </div>
                      )}
                      <div className="bg-gray-100 p-4 rounded-lg">
                        <p className="text-lg font-bold text-gray-800 leading-relaxed" dir="rtl">
                          📝 {recording.sentence}
                        </p>
                      </div>
                    </div>

                    {/* כפתורים */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => playRecording(recording)}
                        className={`px-5 py-3 rounded-xl font-semibold transition-all ${
                          playingId === recording.id
                            ? 'bg-green-500 text-white animate-pulse'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                      >
                        {playingId === recording.id ? '🔊 מנגן...' : '▶️ השמע'}
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="px-4 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

