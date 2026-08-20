import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAdmin } from '../../store/useAdmin'
import { supabase } from '../../lib/supabase'
import { LoadingOverlay } from '../../shared/ui/LoadingOverlay'
import { Modal } from '../../shared/ui/Modal'
import { Input } from '../../shared/ui/Input'
import { Button } from '../../shared/ui/Button'

interface CategoryWithCount {
  id: number
  name: string
  display_name: string
  display_order: number
  parent_id: number | null
  is_active: boolean
  word_count: number
}

export default function CategoriesTable() {
  const nav = useNavigate()
  const isAuth = useAdmin(s => s.isAuthenticated)
  const [categories, setCategories] = useState<CategoryWithCount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryWithCount | null>(null)
  const [newCategory, setNewCategory] = useState<{
    name: string
    display_name: string
    display_order: number
    parent_id: number | null
  }>({ name: '', display_name: '', display_order: 100, parent_id: null })

  // קטגוריות־על בלבד — היררכיה של רמה אחת, כיתה לא יכולה להיכנס תחת כיתה
  const parentOptions = categories.filter(c => c.parent_id === null)

  useEffect(() => {
    if (!isAuth) {
      nav('/admin')
      return
    }
    loadCategories()
  }, [isAuth, nav])

  const loadCategories = async () => {
    try {
      setIsLoading(true)
      
      // Get categories
      const { data: cats } = await supabase
        .from('worder_categories')
        .select('*')
        .order('display_order')
      
      // Get word counts per category
      const { data: words } = await supabase
        .from('worder_words')
        .select('category_id')
      
      if (!cats) {
        setIsLoading(false)
        return
      }

      // Count words per category
      const wordCounts = new Map<number, number>()
      words?.forEach(w => {
        wordCounts.set(w.category_id, (wordCounts.get(w.category_id) || 0) + 1)
      })

      const categoriesWithCount: CategoryWithCount[] = cats.map(cat => ({
        id: cat.id,
        name: cat.name,
        display_name: cat.display_name,
        display_order: cat.display_order,
        parent_id: cat.parent_id ?? null,
        is_active: cat.is_active !== false, // Default to true if not set
        word_count: wordCounts.get(cat.id) || 0
      }))

      setCategories(categoriesWithCount)
      setIsLoading(false)
    } catch (error) {
      console.error('Error loading categories:', error)
      setIsLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategory.name || !newCategory.display_name) {
      alert('נא למלא את כל השדות')
      return
    }

    try {
      const { error } = await supabase
        .from('worder_categories')
        .insert({
          name: newCategory.name,
          display_name: newCategory.display_name,
          display_order: newCategory.display_order,
          parent_id: newCategory.parent_id
        })

      if (error) throw error

      setNewCategory({ name: '', display_name: '', display_order: 100, parent_id: null })
      setIsModalOpen(false)
      loadCategories()
    } catch (error) {
      console.error('Error adding category:', error)
      alert('שגיאה בהוספת קטגוריה')
    }
  }

  const handleEditCategory = async () => {
    if (!editingCategory) return

    try {
      const { error } = await supabase
        .from('worder_categories')
        .update({
          name: editingCategory.name,
          display_name: editingCategory.display_name,
          display_order: editingCategory.display_order,
          parent_id: editingCategory.parent_id
        })
        .eq('id', editingCategory.id)

      if (error) throw error

      setEditingCategory(null)
      loadCategories()
    } catch (error) {
      console.error('Error updating category:', error)
      alert('שגיאה בעדכון קטגוריה')
    }
  }

  const handleToggleActive = async (cat: CategoryWithCount) => {
    try {
      const { error } = await supabase
        .from('worder_categories')
        .update({ is_active: !cat.is_active })
        .eq('id', cat.id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error toggling category:', error)
    }
  }

  const handleMoveUp = async (cat: CategoryWithCount, index: number) => {
    if (index === 0) return
    const prevCat = categories[index - 1]
    
    try {
      await supabase
        .from('worder_categories')
        .update({ display_order: prevCat.display_order })
        .eq('id', cat.id)
      
      await supabase
        .from('worder_categories')
        .update({ display_order: cat.display_order })
        .eq('id', prevCat.id)

      loadCategories()
    } catch (error) {
      console.error('Error moving category:', error)
    }
  }

  const handleMoveDown = async (cat: CategoryWithCount, index: number) => {
    if (index === categories.length - 1) return
    const nextCat = categories[index + 1]
    
    try {
      await supabase
        .from('worder_categories')
        .update({ display_order: nextCat.display_order })
        .eq('id', cat.id)
      
      await supabase
        .from('worder_categories')
        .update({ display_order: cat.display_order })
        .eq('id', nextCat.id)

      loadCategories()
    } catch (error) {
      console.error('Error moving category:', error)
    }
  }

  const handleDeleteCategory = async (cat: CategoryWithCount) => {
    if (cat.word_count > 0) {
      alert(`לא ניתן למחוק קטגוריה עם ${cat.word_count} מילים. יש להעביר או למחוק את המילים קודם.`)
      return
    }

    if (!confirm(`למחוק את הקטגוריה "${cat.display_name}"?`)) return

    try {
      const { error } = await supabase
        .from('worder_categories')
        .delete()
        .eq('id', cat.id)

      if (error) throw error
      loadCategories()
    } catch (error) {
      console.error('Error deleting category:', error)
      alert('שגיאה במחיקת קטגוריה')
    }
  }

  return (
    <div className="min-h-screen app-bg p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {isLoading && <LoadingOverlay fullscreen message="טוען קטגוריות..." />}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-muted">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-bold bg-surface bg-clip-text text-transparent">
              ניהול קטגוריות 📂
            </h1>
            <p className="text-muted">הוספה, עריכה וסידור קטגוריות</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-3 bg-sky text-ink rounded-sm2 font-semibold hover:bg-sky/90 transition-colors"
            >
              ➕ קטגוריה חדשה
            </button>
            <Link to="/admin/dashboard">
              <button className="rounded-sm2 border border-ink px-5 py-3 text-sm font-semibold text-muted hover:text-ink hover:border-white/40 transition-all">
                ← חזרה
              </button>
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 bg-surface rounded-md2 border border-ink p-4 text-center">
          <span className="text-muted">
            סה"כ <span className="text-sky font-bold">{categories.length}</span> קטגוריות
            {' • '}
            <span className="text-mint font-bold">{categories.filter(c => c.is_active).length}</span> פעילות
          </span>
        </div>

        {/* Categories List */}
        <div className="bg-surface rounded-md2 border border-ink overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-muted">אין קטגוריות</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {categories.map((cat, index) => (
                <div 
                  key={cat.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-surface transition-colors ${
                    !cat.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    {/* Order controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(cat, index)}
                        disabled={index === 0}
                        className="text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(cat, index)}
                        disabled={index === categories.length - 1}
                        className="text-muted hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▼
                      </button>
                    </div>
                    
                    <div>
                      <p className="font-bold text-ink text-lg">{cat.display_name}</p>
                      <p className="text-sm text-muted">
                        {cat.name} • סדר: {cat.display_order}
                        {cat.parent_id !== null && (
                          <span className="text-muted">
                            {' '}• בתוך: {categories.find(c => c.id === cat.parent_id)?.display_name ?? '?'}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mr-10 sm:mr-0">
                    {/* Word count */}
                    <div className="text-center px-3">
                      <p className="text-xl font-bold text-sky">{cat.word_count}</p>
                      <p className="text-xs text-muted">מילים</p>
                    </div>

                    {/* Status toggle */}
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                        cat.is_active 
                          ? 'bg-mint text-mint border border-mint' 
                          : 'bg-berry text-berry border border-berry'
                      }`}
                    >
                      {cat.is_active ? '✓ פעיל' : '✗ מושבת'}
                    </button>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="px-3 py-2 bg-sky text-sky rounded-lg hover:bg-sky transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="px-3 py-2 bg-berry text-berry rounded-lg hover:bg-berry transition-colors"
                        disabled={cat.word_count > 0}
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

        {/* Add Category Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="הוספת קטגוריה חדשה">
          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 text-muted">שם מזהה (באנגלית):</label>
              <Input
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="לדוגמה: Verbs"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">שם תצוגה (בעברית):</label>
              <Input
                value={newCategory.display_name}
                onChange={e => setNewCategory({ ...newCategory, display_name: e.target.value })}
                placeholder="לדוגמה: פעלים"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">סדר תצוגה:</label>
              <Input
                type="number"
                value={newCategory.display_order}
                onChange={e => setNewCategory({ ...newCategory, display_order: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-muted">שייכת לכיתה:</label>
              <select
                className="w-full rounded-sm2 bg-surface border border-ink text-ink px-3 py-2 outline-none focus:border-ink"
                value={newCategory.parent_id ?? ''}
                onChange={e => setNewCategory({
                  ...newCategory,
                  parent_id: e.target.value ? Number(e.target.value) : null
                })}
              >
                <option value="">— ללא (זו קטגוריית־על / כיתה) —</option>
                {parentOptions.map(p => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleAddCategory} className="flex-1">
                הוסף קטגוריה
              </Button>
              <Button variant="danger" onClick={() => setIsModalOpen(false)} className="flex-1">
                בטל
              </Button>
            </div>
          </div>
        </Modal>

        {/* Edit Category Modal */}
        <Modal 
          isOpen={!!editingCategory} 
          onClose={() => setEditingCategory(null)} 
          title="עריכת קטגוריה"
        >
          {editingCategory && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1 text-muted">שם מזהה (באנגלית):</label>
                <Input
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted">שם תצוגה (בעברית):</label>
                <Input
                  value={editingCategory.display_name}
                  onChange={e => setEditingCategory({ ...editingCategory, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted">סדר תצוגה:</label>
                <Input
                  type="number"
                  value={editingCategory.display_order}
                  onChange={e => setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-muted">שייכת לכיתה:</label>
                <select
                  className="w-full rounded-sm2 bg-surface border border-ink text-ink px-3 py-2 outline-none focus:border-ink"
                  value={editingCategory.parent_id ?? ''}
                  onChange={e => setEditingCategory({
                    ...editingCategory,
                    parent_id: e.target.value ? Number(e.target.value) : null
                  })}
                >
                  <option value="">— ללא (זו קטגוריית־על / כיתה) —</option>
                  {parentOptions
                    .filter(p => p.id !== editingCategory.id)
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.display_name}</option>
                    ))}
                </select>
              </div>
              <div className="flex gap-3 mt-6">
                <Button onClick={handleEditCategory} className="flex-1">
                  שמור שינויים
                </Button>
                <Button variant="danger" onClick={() => setEditingCategory(null)} className="flex-1">
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

