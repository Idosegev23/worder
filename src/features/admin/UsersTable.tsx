import { useEffect, useState } from 'react'
import { db, Profile } from '../../lib/db'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'

export default function UsersTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [users, setUsers] = useState<Profile[]>([])
  const [editing, setEditing] = useState<Profile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadData()
  }, [isAuth, nav])

  const loadData = async () => {
    const all = await db.profiles.toArray()
    setUsers(all)
  }

  const handleEdit = (user: Profile) => {
    setEditing({ ...user })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    await db.profiles.update(editing.id, editing)
    setIsModalOpen(false)
    setEditing(null)
    loadData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('למחוק משתמש זה?')) {
      await db.profiles.delete(id)
      loadData()
    }
  }

  const handleResetPassword = async (user: Profile) => {
    const newPwd = prompt('סיסמה חדשה:', user.password)
    if (newPwd) {
      await db.profiles.update(user.id, { password: newPwd })
      loadData()
    }
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">ניהול משתמשים</h1>
          <Link to="/admin/dashboard">
            <Button variant="secondary">חזרה</Button>
          </Link>
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell header>שם</TableCell>
                <TableCell header>שם משתמש</TableCell>
                <TableCell header>סיסמה</TableCell>
                <TableCell header>תפקיד</TableCell>
                <TableCell header>פעולות</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map(user => (
                <TableRow key={user.id}>
                  <TableCell>
                    {user.firstName} {user.lastName}
                  </TableCell>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>
                    <span className="font-mono bg-surface px-2 py-1 rounded text-sm">
                      {user.password}
                    </span>
                  </TableCell>
                  <TableCell>{user.role === 'admin' ? '👑 אדמין' : 'משתמש'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleEdit(user)}
                        className="text-secondary hover:underline text-sm"
                      >
                        ערוך
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="text-accent hover:underline text-sm"
                      >
                        סיסמה
                      </button>
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="text-danger hover:underline text-sm"
                        >
                          מחק
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* Edit Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="עריכת משתמש">
          {editing && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">שם פרטי:</label>
                <Input
                  value={editing.firstName}
                  onChange={e => setEditing({ ...editing, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">שם משפחה:</label>
                <Input
                  value={editing.lastName}
                  onChange={e => setEditing({ ...editing, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">שם משתמש:</label>
                <Input
                  value={editing.username}
                  onChange={e => setEditing({ ...editing, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1">סיסמה:</label>
                <Input
                  value={editing.password}
                  onChange={e => setEditing({ ...editing, password: e.target.value })}
                />
              </div>
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


