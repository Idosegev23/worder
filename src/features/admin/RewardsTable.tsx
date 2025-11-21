import { useEffect, useState } from 'react'
import { db, Reward } from '../../lib/db'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Toggle } from '../../shared/ui/Toggle'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

export default function RewardsTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [rewards, setRewards] = useState<Reward[]>([])
  const [editing, setEditing] = useState<Reward | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
      const all = await db.rewards.toArray()
      setRewards(all)
    } catch (error) {
      console.error('Error loading rewards:', error)
      setError('טעינת המתנות נכשלה.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (reward: Reward) => {
    setEditing({ ...reward })
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditing({
      title: '',
      description: '',
      payload: { type: 'link', url: '#' },
      active: true
    })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    if (editing.id) {
      await db.rewards.update(editing.id, {
        title: editing.title,
        description: editing.description,
        payload: editing.payload,
        active: editing.active
      })
    } else {
      await db.rewards.add(editing)
    }
    setIsModalOpen(false)
    setEditing(null)
    loadData()
  }

  const handleDelete = async (id: number) => {
    if (confirm('למחוק מתנה זו?')) {
      await db.rewards.delete(id)
      loadData()
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted mb-1">פרסים</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-primary leading-tight">ניהול מתנות</h1>
          </div>
          <Link to="/admin/dashboard" className="w-full md:w-auto">
            <Button variant="secondary" className="w-full md:w-auto justify-center">
              חזרה לדשבורד
            </Button>
          </Link>
        </div>

        <Card className="mb-6">
          <Button onClick={handleCreate} className="w-full sm:w-auto justify-center">+ מתנה חדשה</Button>
        </Card>

        <Card className="relative overflow-hidden">
          {isLoading && <LoadingOverlay message="טוען מתנות..." />}
          {error && !isLoading && (
            <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell header>כותרת</TableCell>
                  <TableCell header>תיאור</TableCell>
                  <TableCell header>פעיל</TableCell>
                  <TableCell header>פעולות</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rewards.map(reward => (
                  <TableRow key={reward.id}>
                    <TableCell>{reward.title}</TableCell>
                    <TableCell>{reward.description}</TableCell>
                    <TableCell>{reward.active ? '✓' : '✗'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(reward)}
                          className="text-secondary hover:underline text-sm"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleDelete(reward.id!)}
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
          </div>

          <div className="md:hidden space-y-4">
            {rewards.map(reward => (
              <div key={reward.id} className="rounded-2xl border border-white/10 bg-bg/80 p-4 shadow-lg">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-muted tracking-widest">כותרת</p>
                    <p className="text-lg font-bold text-primary">{reward.title}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${reward.active ? 'bg-accent/20 text-accent' : 'bg-danger/20 text-danger'}`}>
                    {reward.active ? 'פעיל' : 'לא פעיל'}
                  </span>
                </div>
                {reward.description && (
                  <p className="mt-2 text-sm text-muted">{reward.description}</p>
                )}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEdit(reward)}
                    className="rounded-xl border border-secondary/40 py-2 text-sm font-semibold text-secondary"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => handleDelete(reward.id!)}
                    className="rounded-xl border border-danger/40 py-2 text-sm font-semibold text-danger"
                  >
                    מחק
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="עריכת מתנה">
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">כותרת:</label>
                <Input
                  value={editing.title}
                  onChange={e => setEditing({ ...editing, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">תיאור:</label>
                <Input
                  value={editing.description || ''}
                  onChange={e => setEditing({ ...editing, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">קישור (URL):</label>
                <Input
                  value={editing.payload?.url || ''}
                  onChange={e =>
                    setEditing({ ...editing, payload: { ...editing.payload, url: e.target.value } })
                  }
                />
              </div>
              <Toggle
                checked={editing.active}
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

