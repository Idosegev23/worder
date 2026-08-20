import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', error = false, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'w-full px-4 py-3 text-lg rounded-sm2',
          'bg-surface text-ink placeholder:text-muted',
          'border-outline shadow-solid-sm',
          'focus:outline-none focus:shadow-solid',
          error ? 'border-berry' : 'border-ink',
          className
        ].join(' ')}
        {...props}
      />
    )
  }
)

Input.displayName = 'Input'
