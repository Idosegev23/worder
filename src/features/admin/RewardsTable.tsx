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

export default function RewardsTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [rewards, setRewards] = useState<Reward[]>([])
  const [editing, setEditing] = useState<Reward | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadData()
  }, [isAuth, nav])

  const loadData = async () => {
    const all = await db.rewards.toArray()
    setRewards(all)
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
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ניהול מתנות</h1>
          <Link to="/admin/dashboard">
            <Button variant="secondary">חזרה</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <Button onClick={handleCreate}>+ מתנה חדשה</Button>
        </Card>

        <Card>
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

