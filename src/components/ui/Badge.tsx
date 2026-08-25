import { cn } from '@/lib/utils'

interface BadgeProps {
  label?: string
  children?: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'muted' | 'destructive'
  className?: string
}

const variantStyles = {
  default:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning:     'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  error:       'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  destructive: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:        'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  muted:       'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
