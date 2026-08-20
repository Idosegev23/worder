import { HTMLAttributes, forwardRef } from 'react'

/**
 * כרטיס בשפת המדבקה. הווריאנטים glass/gradient הישנים הוסרו —
 * השמות נשמרים כדי שמסכים שטרם הומרו לא יישברו, וכולם מתמפים לאותו משטח.
 */

type CardVariant = 'solid' | 'glass' | 'gradient' | 'sun' | 'mint' | 'sky'
type CardPadding = 'sm' | 'md' | 'lg' | 'none'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
  padding?: CardPadding
  interactive?: boolean
}

const variantClasses: Record<CardVariant, string> = {
  solid: 'bg-surface text-ink',
  glass: 'bg-surface text-ink',
  gradient: 'bg-sun text-ink',
  sun: 'bg-sun text-ink',
  mint: 'bg-mint text-ink',
  sky: 'bg-sky text-ink'
}

const paddingClasses: Record<CardPadding, string> = {
  none: '',
  sm: 'p-3.5',
  md: 'p-5',
  lg: 'p-7'
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ variant = 'solid', padding = 'md', interactive = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={[
          'rounded-md2 border-outline border-ink shadow-solid',
          variantClasses[variant],
          paddingClasses[padding],
          interactive ? 'pressable cursor-pointer' : '',
          className
        ].join(' ')}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'
