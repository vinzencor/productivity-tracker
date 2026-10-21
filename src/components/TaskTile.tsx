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
  const multi = task.count > 1
  const done = task.completions.length

  return (
    <li className="rounded-xl border border-stone-200 p-4 transition-colors dark:border-stone-800">
      <div className="flex items-start gap-3">
        <span className="icon-tile h-11 w-11 rounded-xl text-xl">{workType?.icon ?? '✨'}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 break-words text-sm font-semibold text-stone-900 sm:text-base dark:text-white">{title}</p>
            <span className="shrink-0 text-sm font-bold tabular-nums text-amber-700 dark:text-yellow-300">
              +{task.points} pts{multi ? ` × ${task.count}` : ''}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-500 dark:text-stone-400">
            <StatusBadge status={task.status} />
            <span>{task.workTypeName}</span>
            {task.completedDate ? <span>· {formatDay(task.completedDate)}</span> : null}
          </div>
        </div>
      </div>

      {multi ? (
        <div className="mt-3 sm:pl-14">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-stone-700 dark:text-stone-300">
              {done} of {task.count} done
            </span>
            <span className="text-stone-500 dark:text-stone-400">{done < task.count ? `${task.count - done} left` : 'All done'}</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemin={0}
            aria-valuemax={task.count}
            aria-label={`${title} progress`}
          >
            <div className="h-full rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${(done / task.count) * 100}%` }} />
          </div>
        </div>
      ) : null}

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
        {task.status === 'pending' && done > 0 ? (
          <button
            type="button"
            onClick={() => onRevert(task.id)}
            disabled={busy}
            className="btn btn-secondary btn-icon"
            aria-label={`Undo one ${title}`}
            title="Undo last"
          >
            <Undo2 size={15} />
          </button>
        ) : null}
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
