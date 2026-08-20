import { useEffect, useState } from 'react'
import {
  Profile,
  Category,
  getAllUsers,
  updateUser,
  deleteUser,
  resetUserProgress,
  getCategories,
  getAllUserCategoryIds,
  setUserCategoryIds
} from '../../lib/supabase'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { Card } from '../../shared/ui/Card'
import { Button } from '../../shared/ui/Button'
import { Input } from '../../shared/ui/Input'
import { Modal } from '../../shared/ui/Modal'
import { Table, TableHeader, TableBody, TableRow, TableCell } from '../../shared/ui/Table'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'

export default function UsersTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)

  const [users, setUsers] = useState<Profile[]>([])
  const [editing, setEditing] = useState<Profile | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // שיוך קטגוריות — מקור האמת לְמה שכל תלמידה רואה
  const [categories, setCategories] = useState<Category[]>([])
  const [assignments, setAssignments] = useState<Record<string, number[]>>({})
  const [assigning, setAssigning] = useState<Profile | null>(null)
  const [draftIds, setDraftIds] = useState<Set<number>>(new Set())
  const [isSavingAssign, setIsSavingAssign] = useState(false)

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
      const [all, cats, assigned] = await Promise.all([
        getAllUsers(),
        getCategories(),
        getAllUserCategoryIds()
      ])
      setUsers(all)
      setCategories(cats)
      setAssignments(assigned)
    } catch (error) {
      console.error('Error loading users:', error)
      setError('טעינת המשתמשים נכשלה. נסו לרענן את הדף.')
    } finally {
      setIsLoading(false)
    }
  }

  const topLevel = categories.filter(c => c.parentId === null)

  const openAssign = (user: Profile) => {
    setDraftIds(new Set(assignments[user.id] ?? []))
    setAssigning(user)
  }

  const toggleDraft = (id: number) => {
    setDraftIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const saveAssign = async () => {
    if (!assigning) return
    setIsSavingAssign(true)
    try {
      await setUserCategoryIds(assigning.id, [...draftIds])
      setAssignments(prev => ({ ...prev, [assigning.id]: [...draftIds] }))
      setAssigning(null)
    } catch (e) {
      console.error('Error saving assignments:', e)
      alert('שמירת השיוך נכשלה')
    } finally {
      setIsSavingAssign(false)
    }
  }

  const handleEdit = (user: Profile) => {
    setEditing({ ...user })
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!editing) return
    try {
      await updateUser(editing.id, editing)
      setIsModalOpen(false)
      setEditing(null)
      loadData()
    } catch (error) {
      console.error('Error updating user:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('למחוק משתמש זה?')) {
      try {
        await deleteUser(id)
        loadData()
      } catch (error) {
        console.error('Error deleting user:', error)
      }
    }
  }

  const handleResetPassword = async (user: Profile) => {
    const newPwd = prompt('סיסמה חדשה:', user.password)
    if (newPwd) {
      try {
        await updateUser(user.id, { ...user, password: newPwd })
        loadData()
      } catch (error) {
        console.error('Error resetting password:', error)
      }
    }
  }

  const handleResetProgress = async (user: Profile) => {
    if (confirm(`האם לאפס את כל ההתקדמות של ${user.firstName} ${user.lastName}?\n\nפעולה זו תמחק:\n- את כל ההתקדמות במילים\n- את כל הפרסים\n- את כל ההטבות\n\nהפעולה בלתי הפיכה!`)) {
      try {
        const result = await resetUserProgress(user.id)
        alert(`✅ ההתקדמות אופסה בהצלחה!\n\nנמחקו:\n- ${result.progressDeleted} רשומות התקדמות\n- ${result.rewardsDeleted} פרסים\n- ${result.benefitsDeleted} הטבות`)
        loadData()
      } catch (error) {
        console.error('Error resetting progress:', error)
        alert('❌ שגיאה באיפוס ההתקדמות')
      }
    }
  }

  return (
    <div className="min-h-screen app-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-muted mb-1">אדמין</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-sky leading-tight">ניהול משתמשים</h1>
          </div>
          <Link to="/admin/dashboard" className="w-full md:w-auto">
            <Button variant="secondary" className="w-full md:w-auto justify-center">
              חזרה לדשבורד
            </Button>
          </Link>
        </div>

        <Card className="relative overflow-hidden">
          {isLoading && <LoadingOverlay message="טוען משתמשים..." />}
          {error && !isLoading && (
            <div className="mb-4 rounded-sm2 border border-berry bg-berry px-4 py-3 text-sm text-berry">
              {error}
            </div>
          )}
          <div className="hidden md:block">
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
                          className="text-berry hover:underline text-sm"
                        >
                          ערוך
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="text-mint hover:underline text-sm"
                        >
                          סיסמה
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => openAssign(user)}
                            className="text-sky hover:underline text-sm font-bold"
                            title="אילו קטגוריות התלמידה רואה"
                          >
                            📚 קטגוריות ({(assignments[user.id] ?? []).length})
                          </button>
                        )}
                        <button
                          onClick={() => handleResetProgress(user)}
                          className="text-sun hover:underline text-sm font-bold"
                          title="איפוס התקדמות"
                        >
                          🔄 איפוס
                        </button>
                        {user.role !== 'admin' && (
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="text-berry hover:underline text-sm"
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
          </div>

          <div className="md:hidden space-y-4">
            {users.map(user => (
              <div key={user.id} className="rounded-md2 border border-ink bg-cream/80 p-4 shadow-lg">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase text-muted">שם מלא</p>
                    <p className="text-lg font-bold text-sky">{user.firstName} {user.lastName}</p>
                  </div>
                  <span className="rounded-full bg-sky/15 px-3 py-1 text-xs font-semibold text-sky">
                    {user.role === 'admin' ? '👑 אדמין' : 'משתמש'}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted">שם משתמש</span>
                    <span className="font-medium">@{user.username}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">סיסמה</span>
                    <span className="font-mono text-xs bg-surface/60 px-2 py-1 rounded-lg">
                      {user.password}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="rounded-sm2 border border-berry/40 py-2 text-sm font-semibold text-berry"
                  >
                    ערוך
                  </button>
                  <button
                    onClick={() => handleResetPassword(user)}
                    className="rounded-sm2 border border-mint/40 py-2 text-sm font-semibold text-mint"
                  >
                    סיסמה
                  </button>
                  <button
                    onClick={() => handleResetProgress(user)}
                    className="col-span-2 rounded-sm2 border border-sun py-2 text-sm font-semibold text-sun"
                  >
                    🔄 איפוס התקדמות
                  </button>
                  {user.role !== 'admin' && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="col-span-2 rounded-sm2 border border-berry/60 py-2 text-sm font-semibold text-berry"
                    >
                      מחק משתמש
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
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

        {/* שיוך קטגוריות — קובע בדיוק מה התלמידה רואה */}
        <Modal
          isOpen={!!assigning}
          onClose={() => setAssigning(null)}
          title={assigning ? `קטגוריות של ${assigning.firstName} ${assigning.lastName}` : ''}
        >
          {assigning && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                סימון כיתה מזכה אוטומטית בכל היחידות שתחתיה. אפשר גם לסמן יחידה בודדת.
              </p>

              {topLevel.length === 0 && (
                <p className="text-sm text-muted">אין קטגוריות במערכת.</p>
              )}

              <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-1">
                {topLevel.map(parent => {
                  const children = categories.filter(c => c.parentId === parent.id)
                  return (
                    <div key={parent.id} className="rounded-sm2 border border-ink/10 p-3">
                      <label className="flex items-center gap-2 font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-sky"
                          checked={draftIds.has(parent.id)}
                          onChange={() => toggleDraft(parent.id)}
                        />
                        <span>{parent.displayName}</span>
                        {children.length > 0 && (
                          <span className="text-xs text-muted font-medium">
                            ({children.length} יחידות)
                          </span>
                        )}
                      </label>

                      {children.length > 0 && (
                        <div className="mt-2 mr-6 space-y-1.5">
                          {children.map(child => {
                            const viaParent = draftIds.has(parent.id)
                            return (
                              <label
                                key={child.id}
                                className={`flex items-center gap-2 text-sm cursor-pointer ${
                                  viaParent ? 'opacity-50' : ''
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-sky"
                                  checked={viaParent || draftIds.has(child.id)}
                                  disabled={viaParent}
                                  onChange={() => toggleDraft(child.id)}
                                />
                                <span>{child.displayName}</span>
                              </label>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <Button onClick={saveAssign} disabled={isSavingAssign} className="flex-1">
                  {isSavingAssign ? 'שומר…' : 'שמור שיוך'}
                </Button>
                <Button variant="danger" onClick={() => setAssigning(null)} className="flex-1">
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


