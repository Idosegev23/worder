import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'accent'
  as?: any
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', className = '', children, as, ...props }, ref) => {
    const Component = as || 'button'
    const baseClasses = 'px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50 inline-block'
    const variantClasses = {
      primary: 'bg-primary text-white',
      secondary: 'bg-secondary text-white',
      danger: 'bg-danger text-white',
      accent: 'bg-accent text-white'
    }

    return (
      <Component
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Button.displayName = 'Button'

