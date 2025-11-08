import { ReactNode } from 'react'

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className = '' }: TableProps) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full border-collapse">
        {children}
      </table>
    </div>
  )
}

interface TableHeaderProps {
  children: ReactNode
}

export function TableHeader({ children }: TableHeaderProps) {
  return <thead className="bg-bg">{children}</thead>
}

interface TableBodyProps {
  children: ReactNode
}

export function TableBody({ children }: TableBodyProps) {
  return <tbody>{children}</tbody>
}

interface TableRowProps {
  children: ReactNode
  onClick?: () => void
}

export function TableRow({ children, onClick }: TableRowProps) {
  return (
    <tr
      className={`border-b border-surface ${onClick ? 'cursor-pointer hover:bg-surface/50' : ''}`}
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
      className={`p-3 text-right ${header ? 'font-semibold' : ''} ${className}`}
      colSpan={colSpan}
    >
      {children}
    </Tag>
  )
}

