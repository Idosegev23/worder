import { ReactNode } from 'react'

/** טבלה בגרסה הצפופה של השפה — קו מתאר 2px, בלי אריחים גדולים. */

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto rounded-md2 border-2 border-ink bg-surface shadow-solid ${className}`}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="bg-track border-b-2 border-ink">{children}</thead>
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

interface TableRowProps {
  children: ReactNode
  onClick?: () => void
}

export function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr
      className={`border-b border-line last:border-b-0 ${onClick ? 'cursor-pointer hover:bg-cream' : ''}`}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  header?: boolean
  colSpan?: number
  className?: string
}

export function TableCell({ children, header, colSpan, className = '' }: TableCellProps) {
  const Tag = header ? 'th' : 'td'
  return (
    <Tag
      className={`p-3 text-right text-ink ${header ? 'font-bold text-sm' : 'text-sm'} ${className}`}
      colSpan={colSpan}
    >
      {children}
    </Tag>
  )
}
