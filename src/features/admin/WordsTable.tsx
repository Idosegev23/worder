import { useEffect, useState } from 'react'
import { db, Word, Category } from '../../lib/db'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Toggle } from '../../shared/ui/Toggle'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'

export default function WordsTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [words, setWords] = useState<Word[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filter, setFilter] = useState<number | 'all'>('all')

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
    const cats = await db.categories.toArray()
    setCategories(cats)
    const allWords = await db.words.toArray()
    setWords(allWords)
  }

  const filteredWords = filter === 'all' ? words : words.filter(w => w.categoryId === filter)

  const handleEdit = (word: Word) => {
    setEditing({ ...word })
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditing({
      categoryId: 1,
      en: '',
      he: '',
      altEn: [],
      altHe: [],
      order: words.length,
      active: true
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (editing.id) {
      await db.words.update(editing.id, {
        categoryId: editing.categoryId,
        en: editing.en,
        he: editing.he,
        altEn: editing.altEn,
        altHe: editing.altHe,
        order: editing.order,
        active: editing.active
      })
    } else {
      await db.words.add(editing)
    }
    setIsModalOpen(false)
    setEditing(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (confirm('למחוק מילה זו?')) {
      await db.words.delete(id)
      loadData()
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ניהול מילים</h1>
          <Link to="/admin/dashboard">
            <Button variant="secondary">חזרה</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <div className="flex gap-4 items-center flex-wrap">
            <Button onClick={handleCreate}>+ מילה חדשה</Button>
            <select
              value={filter}
              onChange={e => setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="p-2 rounded bg-bg text-text"
            >
              <option value="all">כל הקטגוריות</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>
                  {c.displayName}
                </option>
              ))}
            </select>
            <span className="text-muted text-sm">
              {filteredWords.length} מילים
            </span>
          </div>
        </Card>

        <Card>
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
                        className="text-secondary hover:underline text-sm"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleDelete(word.id!)}
                        className="text-danger hover:underline text-sm"
                      >
                        מחק
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
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
                <label className="block text-sm mb-1">קטגוריה:</label>
                <select
                  value={editing.categoryId}
                  onChange={e => setEditing({ ...editing, categoryId: Number(e.target.value) })}
                  className="w-full p-3 rounded bg-bg text-text"
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

