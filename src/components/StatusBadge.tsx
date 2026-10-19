import { CircleCheck, Clock3 } from 'lucide-react'

import type { TaskStatus } from '../types'

export function StatusBadge({ status }: { status: TaskStatus }) {
  if (status === 'completed') {
    return (
      <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20">
        <CircleCheck size={12} />
        Completed
      </span>
    )
  }

  return (
    <span className="badge bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20">
      <Clock3 size={12} />
      Pending
    </span>
  )
}
