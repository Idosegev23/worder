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
  const [newCategory, setNewCategory] = useState({ name: '', display_name: '', display_order: 100 })

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
          display_order: newCategory.display_order
        })

      if (error) throw error

      setNewCategory({ name: '', display_name: '', display_order: 100 })
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
          display_order: editingCategory.display_order
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
    <div className="min-h-screen bg-gradient-to-b from-[#050A1C] to-[#0b1c3a] p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {isLoading && <LoadingOverlay fullscreen message="טוען קטגוריות..." />}
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.4em] text-white/60">ממשק אדמין</p>
            <h1 className="text-3xl sm:text-5xl font-black bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ניהול קטגוריות 📂
            </h1>
            <p className="text-white/60">הוספה, עריכה וסידור קטגוריות</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-3 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors"
            >
              ➕ קטגוריה חדשה
            </button>
            <Link to="/admin/dashboard">
              <button className="rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white/80 hover:text-white hover:border-white/40 transition-all">
                ← חזרה
              </button>
            </Link>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-4 text-center">
          <span className="text-white/60">
            סה"כ <span className="text-primary font-bold">{categories.length}</span> קטגוריות
            {' • '}
            <span className="text-green-400 font-bold">{categories.filter(c => c.is_active).length}</span> פעילות
          </span>
        </div>

        {/* Categories List */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 overflow-hidden">
          {categories.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-2xl mb-2">📭</p>
              <p className="text-white/60">אין קטגוריות</p>
            </div>
          ) : (
            <div className="divide-y divide-white/10">
              {categories.map((cat, index) => (
                <div 
                  key={cat.id}
                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 hover:bg-white/5 transition-colors ${
                    !cat.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-4 mb-3 sm:mb-0">
                    {/* Order controls */}
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleMoveUp(cat, index)}
                        disabled={index === 0}
                        className="text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveDown(cat, index)}
                        disabled={index === categories.length - 1}
                        className="text-white/50 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        ▼
                      </button>
                    </div>
                    
                    <div>
                      <p className="font-bold text-white text-lg">{cat.display_name}</p>
                      <p className="text-sm text-white/50">
                        {cat.name} • סדר: {cat.display_order}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 mr-10 sm:mr-0">
                    {/* Word count */}
                    <div className="text-center px-3">
                      <p className="text-xl font-bold text-blue-400">{cat.word_count}</p>
                      <p className="text-xs text-white/50">מילים</p>
                    </div>

                    {/* Status toggle */}
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                        cat.is_active 
                          ? 'bg-green-500/20 text-green-400 border border-green-400/30' 
                          : 'bg-red-500/20 text-red-400 border border-red-400/30'
                      }`}
                    >
                      {cat.is_active ? '✓ פעיל' : '✗ מושבת'}
                    </button>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
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
              <label className="block text-sm mb-1 text-white/70">שם מזהה (באנגלית):</label>
              <Input
                value={newCategory.name}
                onChange={e => setNewCategory({ ...newCategory, name: e.target.value })}
                placeholder="לדוגמה: Verbs"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">שם תצוגה (בעברית):</label>
              <Input
                value={newCategory.display_name}
                onChange={e => setNewCategory({ ...newCategory, display_name: e.target.value })}
                placeholder="לדוגמה: פעלים"
              />
            </div>
            <div>
              <label className="block text-sm mb-1 text-white/70">סדר תצוגה:</label>
              <Input
                type="number"
                value={newCategory.display_order}
                onChange={e => setNewCategory({ ...newCategory, display_order: Number(e.target.value) })}
              />
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
                <label className="block text-sm mb-1 text-white/70">שם מזהה (באנגלית):</label>
                <Input
                  value={editingCategory.name}
                  onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-white/70">שם תצוגה (בעברית):</label>
                <Input
                  value={editingCategory.display_name}
                  onChange={e => setEditingCategory({ ...editingCategory, display_name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-white/70">סדר תצוגה:</label>
                <Input
                  type="number"
                  value={editingCategory.display_order}
                  onChange={e => setEditingCategory({ ...editingCategory, display_order: Number(e.target.value) })}
                />
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

