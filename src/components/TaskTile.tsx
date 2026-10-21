import { CircleCheck, Trash, Undo2 } from 'lucide-react'

import { formatDay } from '../lib/dates'
import type { Task, WorkType } from '../types'
import { Spinner } from './Loader'
import { StatusBadge } from './StatusBadge'

type TaskTileProps = {
  task: Task
  workType?: WorkType
  busy?: boolean
  onComplete: (taskId: string) => void
  onRevert: (taskId: string) => void
  /** Omit to hide the delete button (deleting is HR-only). */
  onDelete?: (taskId: string) => void
}

export function TaskTile({ task, workType, busy = false, onComplete, onRevert, onDelete }: TaskTileProps) {
  const title = task.title || workType?.name || task.workTypeName || 'Task'

  return (
    <li className="rounded-xl border border-stone-200 p-4 transition-colors dark:border-stone-800">
      <div className="flex items-start gap-3">
        <span className="icon-tile h-11 w-11 rounded-xl text-xl">{workType?.icon ?? '✨'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words text-sm font-semibold text-stone-900 sm:text-base dark:text-white">{title}</p>
            <span className="shrink-0 text-sm font-bold tabular-nums text-amber-700 dark:text-yellow-300">+{task.points} pts</span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <StatusBadge status={task.status} />
            <span>{task.workTypeName}</span>
            {task.completedDate ? <span>· {formatDay(task.completedDate)}</span> : null}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 sm:pl-14">
        {task.status === 'pending' ? (
          <button type="button" onClick={() => onComplete(task.id)} disabled={busy} className="btn btn-primary btn-sm flex-1 sm:flex-none">
            {busy ? <Spinner size={16} /> : <CircleCheck size={16} />}
            Mark as done
          </button>
        ) : (
          <button type="button" onClick={() => onRevert(task.id)} disabled={busy} className="btn btn-secondary btn-sm flex-1 sm:flex-none">
            {busy ? <Spinner size={16} /> : <Undo2 size={16} />}
            Move to pending
          </button>
        )}
        {onDelete ? (
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            disabled={busy}
            className="btn btn-ghost-danger btn-icon"
            aria-label={`Delete ${title}`}
            title="Delete"
          >
            <Trash size={15} />
          </button>
        ) : null}
      </div>
    </li>
  )
}
