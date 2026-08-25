import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantStyles = {
  primary:     'text-white font-semibold',
  secondary:   'font-medium border',
  ghost:       'font-medium',
  destructive: 'text-white font-semibold',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3.5 text-base' : 'px-4 py-2.5 text-sm'

  const variantStyle: React.CSSProperties =
    variant === 'primary' ? { background: 'var(--accent)', color: 'var(--accent-foreground)' } :
    variant === 'destructive' ? { background: 'var(--destructive)', color: '#fff' } :
    variant === 'secondary' ? { background: 'var(--surface)', color: 'var(--foreground)', borderColor: 'var(--border)' } :
    { background: 'transparent', color: 'var(--foreground)' }

  return (
    <button
      style={variantStyle}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl transition-[opacity,transform] duration-150 active:scale-[0.97] disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed',
        sizeClass,
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
