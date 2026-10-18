import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  accent?: string
  icon?: ReactNode
}

export function StatCard({ label, value, accent = 'bg-yellow-50', icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-stone-600 dark:text-stone-300">{label}</span>
        <span className={`rounded-full p-2 ${accent} text-stone-800 dark:text-yellow-50`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-stone-900 dark:text-white">{value}</div>
    </div>
  )
}
