import type { LucideIcon } from 'lucide-react'

type StatCardProps = {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
}

export function StatCard({ label, value, icon: Icon, hint }: StatCardProps) {
  return (
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-stone-500 dark:text-stone-400">{label}</span>
        <span className="icon-tile h-8 w-8">
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 truncate text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-white">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {hint ? <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">{hint}</p> : null}
    </div>
  )
}
