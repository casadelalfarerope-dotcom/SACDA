import { cn } from '@/lib/utils'

interface BadgeProps {
  label?: string
  children?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'destructive'
  className?: string
}

const variantStyles = {
  default:     'bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-[color:var(--accent)]',
  success:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  error:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:        'bg-teal-100 text-teal-800 dark:bg-teal-900/35 dark:text-teal-300',
  muted:       'bg-stone-200/70 text-stone-700 dark:bg-stone-800 dark:text-stone-300',
}

export default function Badge({ label, children, variant = 'default', className }: BadgeProps) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
      variantStyles[variant],
      className
    )}>
      {children ?? label}
    </span>
  )
}
