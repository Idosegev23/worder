import { HTMLAttributes, ReactNode } from 'react'

/**
 * תגית pill עם קו מתאר וצל מוצק.
 * `icon` מקבל גם אמוג'י (🎁 הטבה, 🏆 הישג) — שם הוא תוכן, לא ממשק.
 */

type BadgeTone = 'primary' | 'mint' | 'gold' | 'rose' | 'sky' | 'neutral'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone
  icon?: ReactNode
}

const toneClasses: Record<BadgeTone, string> = {
  primary: 'bg-sky',
  mint: 'bg-mint',
  gold: 'bg-sun',
  rose: 'bg-berry',
  sky: 'bg-sky',
  neutral: 'bg-track'
}

export function Badge({ tone = 'neutral', icon, className = '', children, ...props }: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 px-3 py-1 rounded-pill text-xs font-bold text-ink',
        'border-2 border-ink shadow-solid-sm',
        toneClasses[tone],
        className
      ].join(' ')}
      {...props}
    >
      {icon && <span className="text-sm leading-none">{icon}</span>}
      {children}
    </span>
  )
}
