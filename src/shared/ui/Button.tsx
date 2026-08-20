import { ButtonHTMLAttributes, forwardRef } from 'react'

/**
 * כפתור בשפת המדבקה: קו מתאר כהה, צל מוצק, ולחיצה שמורידה אותו פיזית.
 * טקסט תמיד ink — לבן על צבעי המותג נכשל בניגודיות.
 */

type ButtonVariant = 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost' | 'outline'
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  fullWidth?: boolean
  as?: any
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-sky text-ink',       // פעולה
  accent: 'bg-mint text-ink',       // אישור / הצלחה
  secondary: 'bg-sun text-ink',     // מותג
  danger: 'bg-berry text-ink',      // הרס
  ghost: 'bg-track text-ink',       // משני
  outline: 'bg-surface text-ink'
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-1.5 text-sm rounded-sm2',
  md: 'px-5 py-2.5 text-base rounded-sm2',
  lg: 'px-6 py-3.5 text-lg rounded-md2',
  xl: 'px-8 py-4 text-xl rounded-md2'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'primary', size = 'md', fullWidth = false, className = '', children, as, ...props },
    ref
  ) => {
    const Component = as || 'button'

    return (
      <Component
        ref={ref}
        className={[
          'inline-flex items-center justify-center gap-2 font-bold',
          'border-outline border-ink shadow-solid pressable',
          'disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-solid-sm',
          'focus:outline-none focus-visible:ring-4 focus-visible:ring-ink/20',
          variantClasses[variant],
          sizeClasses[size],
          fullWidth ? 'w-full' : '',
          className
        ].join(' ')}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Button.displayName = 'Button'
