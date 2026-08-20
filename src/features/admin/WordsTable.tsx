import { useEffect, useState } from 'react'
import { Word, Category, getAllWords, getCategories, upsertWord, deleteWord } from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Toggle } from '../../shared/ui/Toggle'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

export default function WordsTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [words, setWords] = useState<Word[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filter, setFilter] = useState<number | 'all'>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [editing, setEditing] = useState<Word | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadData()
  }, [isAuth, nav])

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const cats = await getCategories()
      setCategories(cats)
      const allWords = await getAllWords()
      setWords(allWords)
    } catch (error) {
      console.error('Error loading data:', error)
      setError('טעינת המילים נכשלה. נסו שוב.')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredWords = filter === 'all' ? words : words.filter(w => w.categoryId === filter)

  const handleEdit = (word: Word) => {
    setEditing({ ...word })
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditing({
      id: 0,
      categoryId: 1,
      en: '',
      he: '',
      altEn: [],
      altHe: [],
      translation: null,
      displayOrder: words.length,
      active: true,
      createdAt: new Date().toISOString()
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await upsertWord(editing)
      setIsModalOpen(false)
      setEditing(null)
      loadData()
    } catch (error) {
      console.error('Error saving word:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('למחוק מילה זו?')) {
      try {
        await deleteWord(id)
        loadData()
      } catch (error) {
        console.error('Error deleting word:', error)
      }
    }
  }

  return (
    <div className="min-h-screen app-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted mb-1">מאגר</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-sky leading-tight">ניהול מילים</h1>
          </div>
          <Link to="/admin/dashboard" className="w-full md:w-auto">
            <Button variant="secondary" className="w-full md:w-auto justify-center">
              חזרה לדשבורד
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">+ מילה חדשה</Button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
              <select
                value={filter}
                onChange={e => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                className="w-full sm:w-60 p-2 rounded-lg bg-cream text-ink border border-ink"
              >
                <option value="all">כל הקטגוריות</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.displayName}
                  </option>
                ))}
              </select>
              <span className="text-muted text-sm text-center sm:text-right">
                {filteredWords.length} מילים
              </span>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden">
          {isLoading && <LoadingOverlay message="טוען מילים..." />}
          {error && !isLoading && (
            <div className="mb-4 rounded-sm2 border border-berry bg-berry px-4 py-3 text-sm text-berry">
              {error}
            </div>
          )}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>אנגלית</TableCell>
                  <TableCell header>עברית</TableCell>
                  <TableCell header>קטגוריה</TableCell>
                  <TableCell header>פעיל</TableCell>
                  <TableCell header>פעולות</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWords.map(word => (
                  <TableRow key={word.id}>
                    <TableCell>{word.en}</TableCell>
                    <TableCell>{word.he}</TableCell>
                    <TableCell>
                      {categories.find(c => c.id === word.categoryId)?.displayName}
                    </TableCell>
                    <TableCell>{word.active ? '✓' : '✗'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(word)}
                          className="text-berry hover:underline text-sm"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDelete(word.id!)}
                          className="text-berry hover:underline text-sm"
                        >
                          מחק
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-4">
            {filteredWords.map(word => (
              <div key={word.id} className="rounded-md2 border border-ink bg-cream/80 p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-muted ">אנגלית</p>
                    <p className="text-lg font-bold text-sky">{word.en}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${word.active ? 'bg-mint/20 text-mint' : 'bg-berry/20 text-berry'}`}>
                    {word.active ? 'פעיל' : 'מושבת'}
                  </span>
                </div>
                <div className="mt-3">
                  <p className="text-xs uppercase text-muted ">עברית</p>
                  <p className="text-lg font-semibold">{word.he}</p>
                </div>
                <div className="mt-2">
                  <p className="text-xs uppercase text-muted ">קטגוריה</p>
                  <p className="text-sm font-medium">
                    {categories.find(c => c.id === word.categoryId)?.displayName}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEdit(word)}
                    className="rounded-sm2 border border-berry/40 py-2 text-sm font-semibold text-berry"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(word.id!)}
                    className="rounded-sm2 border border-berry/40 py-2 text-sm font-semibold text-berry"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="עריכת מילה">
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">אנגלית:</label>
                <Input
                  value={editing.en}
                  onChange={e => setEditing({ ...editing, en: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">עברית:</label>
                <Input
                  value={editing.he}
                  onChange={e => setEditing({ ...editing, he: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">תרגום מלא (לעברית):</label>
                <Input
                  value={editing.translation || ''}
                  onChange={e => setEditing({ ...editing, translation: e.target.value || null })}
                  placeholder="תרגום המשפט המלא (למשחקי השלמה)"
                />
                <p className="text-xs text-muted mt-1">
                  💡 שדה זה משמש להצגת תרגום מלא במשחקי Am/Is/Are ו-Have/Has
                </p>
              </div>
              <div>
                <label className="block text-sm mb-1">קטגוריה:</label>
                <select
                  value={editing.categoryId}
                  onChange={e => setEditing({ ...editing, categoryId: Number(e.target.value) })}
                  className="w-full p-3 rounded bg-cream text-ink"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1">תרגומים נוספים (מופרד בפסיקים):</label>
                <Input
                  value={(editing.altHe || []).join(', ')}
                  onChange={e =>
                    setEditing({ ...editing, altHe: e.target.value.split(',').map(s => s.trim()) })
                  }
                  placeholder="למשל: תרגום1, תרגום2"
                />
              </div>
              <Toggle
                checked={editing.active || false}
                onChange={active => setEditing({ ...editing, active })}
                label="פעיל"
              />
              <div className="flex gap-3 mt-6">
                <Button onClick={handleSave} className="flex-1">
                  שמור
                </Button>
                <Button variant="danger" onClick={() => setIsModalOpen(false)} className="flex-1">
                  בטל
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </div>
  )
}

