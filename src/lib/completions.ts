import { dayKey } from './dates'
import type { Task, TaskStatus } from '../types'

/** One "Mark as done" on a task. A task with count 3 has up to three of these. */
export type Completion = {
  task: Task
  /** ISO timestamp of the completion. */
  at: string
  /** Local day (yyyy-MM-dd) the points count on. */
  day: string
  /** 1-based position, e.g. 2 for the second of three. */
  unit: number
}

export function earnedPoints(task: Task) {
  return task.points * task.completions.length
}

export function sumEarned(tasks: Task[]) {
  return tasks.reduce((sum, task) => sum + earnedPoints(task), 0)
}

export function completionsOf(tasks: Task[]): Completion[] {
  return tasks.flatMap((task) =>
    task.completions.map((at, index) => ({
      task,
      at,
      // Single tasks keep the day recorded on the device that completed them.
      day: task.count === 1 && task.completedDate ? task.completedDate : dayKey(at),
      unit: index + 1,
    })),
  )
}

export const sumCompletionPoints = (items: Completion[]) => items.reduce((sum, item) => sum + item.task.points, 0)

/** "Poster (2/3)" for multi-count tasks, plain title otherwise. */
export function completionLabel({ task, unit }: Completion) {
  const title = task.title || task.workTypeName
  return task.count > 1 ? `${title} (${unit}/${task.count})` : title
}

/**
 * Status fields for a task with these completions. Single tasks keep their original shape
 * (no `completions` array) so they stay compatible with older clients and rules.
 * `undefined` means "remove the field".
 */
export function progressFields(count: number, completions: string[]) {
  const done = completions.length >= count
  const last = completions[completions.length - 1]
  return {
    status: (done ? 'completed' : 'pending') as TaskStatus,
    completions: count > 1 ? completions : undefined,
    completedAt: done ? last : undefined,
    completedDate: done ? dayKey(last) : undefined,
  }
}
