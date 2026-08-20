import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/45" onClick={onClose} />
      <div className="relative bg-surface text-ink rounded-md2 border-outline border-ink shadow-solid-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {title && <h2 className="text-xl font-bold mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
