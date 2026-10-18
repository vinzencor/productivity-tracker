import { CheckCircle2, Clock3, Trash2 } from 'lucide-react'

import type { Task, WorkType } from '../types'

type TaskTileProps = {
  task: Task
  workType?: WorkType
  onComplete?: (taskId: string) => void
  onRevert?: (taskId: string) => void
  onDelete?: (taskId: string) => void
}

export function TaskTile({ task, workType, onComplete, onRevert, onDelete }: TaskTileProps) {
  return (
    <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-2xl dark:bg-yellow-900/30">
            {workType?.icon ?? '✨'}
          </div>
          <div>
            <div className="text-lg font-semibold text-stone-900 dark:text-white">
              {task.title || workType?.name || 'Task'}
            </div>
            <div className="mt-1 text-sm text-stone-500 dark:text-stone-300">
              {task.workTypeName} • {task.status === 'completed' ? 'Completed' : 'Pending'}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xl font-bold text-yellow-600 dark:text-yellow-300">+{task.points}</div>
          {task.completedDate ? (
            <div className="text-xs text-stone-500 dark:text-stone-400">{task.completedDate}</div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {task.status === 'pending' ? (
          <button
            type="button"
            onClick={() => onComplete?.(task.id)}
            className="inline-flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 font-semibold text-stone-900 transition hover:bg-yellow-300"
          >
            <CheckCircle2 size={18} />
            Mark as completed
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onRevert?.(task.id)}
            className="inline-flex items-center gap-2 rounded-full border border-yellow-300 bg-yellow-50 px-4 py-2 font-semibold text-stone-700 dark:border-yellow-700 dark:bg-stone-800 dark:text-yellow-100"
          >
            <Clock3 size={18} />
            Revert
          </button>
        )}

        <button
          type="button"
          onClick={() => onDelete?.(task.id)}
          className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white px-4 py-2 font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200"
        >
          <Trash2 size={18} />
          Delete
        </button>
      </div>
    </div>
  )
}
