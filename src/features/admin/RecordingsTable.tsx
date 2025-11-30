import { useEffect, useState } from 'react'
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
        sentence: r.word?.he || 'לא ידוע'
      }))

      setRecordings(formattedRecordings)
    } catch (err) {
      console.error('Error loading recordings:', err)
      alert('שגיאה בטעינת הקלטות')
    } finally {
      setIsLoading(false)
    }
  }

  const playRecording = (recording: Recording) => {
    if (playingId === recording.id) {
      // עצירת נגינה
      setPlayingId(null)
      return
    }

    setPlayingId(recording.id)
    const audio = new Audio(recording.audio_url)
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => {
      setPlayingId(null)
      alert('שגיאה בהשמעת ההקלטה')
    }
    audio.play()
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
          <Link to="/admin/dashboard">
            <button className="rounded-2xl border border-white/20 px-6 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all">
              ← חזרה לדשבורד
            </button>
          </Link>
        </div>

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
                      <div className="flex items-center gap-3">
                        <span className="bg-primary text-white text-sm font-bold px-3 py-1 rounded-full">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-700">
                          👤 {recording.user_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          📅 {formatDate(recording.created_at)}
                        </span>
                      </div>
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

