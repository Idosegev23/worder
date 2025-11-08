import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`w-full p-3 rounded-lg bg-bg text-text border border-surface focus:border-primary focus:outline-none transition-colors ${className}`}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'

