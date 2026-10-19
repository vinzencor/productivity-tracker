import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 px-6 py-10 text-center dark:border-stone-700">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
        <Icon size={18} />
      </span>
      <p className="mt-3 text-sm font-semibold text-stone-900 dark:text-white">{title}</p>
      {description ? <p className="mt-1 max-w-xs text-sm text-stone-500 dark:text-stone-400">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
