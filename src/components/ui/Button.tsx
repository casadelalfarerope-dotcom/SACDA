import { cn } from '@/lib/utils'
import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

// Botones en cápsula al estilo Apple: relleno (primary), tintado (secondary) y sin fondo (ghost).
const variantStyle: Record<NonNullable<ButtonProps['variant']>, React.CSSProperties> = {
  primary:     { background: 'var(--accent)', color: 'var(--accent-foreground)' },
  destructive: { background: 'var(--destructive)', color: '#fff' },
  secondary:   { background: 'color-mix(in srgb, var(--accent) 12%, transparent)', color: 'var(--accent)' },
  ghost:       { background: 'transparent', color: 'var(--accent)' },
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
  const sizeClass = size === 'sm' ? 'h-8 px-3.5 text-[13px]' : size === 'lg' ? 'h-12 px-6 text-[16px]' : 'h-10 px-5 text-[14px]'

  return (
    <button
      style={variantStyle[variant]}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[-0.01em] whitespace-nowrap',
        'transition-[opacity,transform,filter] duration-150 hover:brightness-[1.06] active:scale-[0.97] active:opacity-80',
        'disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed',
        sizeClass,
        className
      )}
      {...props}
    >
      {loading && (
        <span aria-hidden="true" className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
}
