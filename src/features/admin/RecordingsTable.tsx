import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
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
    <div className="min-h-screen p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* כותרת */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black text-white mb-2">
              הקלטות מישל 🎤
            </h1>
            <p className="text-white/70">
              סה"כ {recordings.length} הקלטות
            </p>
          </div>
          <Link to="/admin/dashboard">
            <Button variant="secondary" className="w-full sm:w-auto">
              חזרה לדשבורד
            </Button>
          </Link>
        </div>

        {/* טבלה */}
        <Card>
          {recordings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xl text-white/70">אין הקלטות עדיין</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recordings.map((recording) => (
                <div
                  key={recording.id}
                  className="bg-white/5 hover:bg-white/10 transition-colors p-4 rounded-xl border border-white/10"
                >
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* פרטי ההקלטה */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-primary">
                          {recording.user_name}
                        </span>
                        <span className="text-xs text-white/50">
                          {formatDate(recording.created_at)}
                        </span>
                      </div>
                      <p className="text-white font-medium" dir="rtl">
                        {recording.sentence}
                      </p>
                    </div>

                    {/* כפתורים */}
                    <div className="flex gap-2">
                      <Button
                        onClick={() => playRecording(recording)}
                        className={`${
                          playingId === recording.id
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {playingId === recording.id ? '⏸️ עצור' : '▶️ השמע'}
                      </Button>
                      <Button
                        onClick={() => deleteRecording(recording.id)}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

