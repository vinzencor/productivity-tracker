import type { Employee, Task, Team, WorkType } from '../types'

export type DatePreset = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'custom'

export function getRangeForPreset(preset: DatePreset) {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  if (preset === 'today') {
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  if (preset === 'yesterday') {
    start.setDate(now.getDate() - 1)
    start.setHours(0, 0, 0, 0)
    end.setDate(now.getDate() - 1)
    end.setHours(23, 59, 59, 999)
    return { start, end }
  }

  if (preset === 'this-week') {
    const day = now.getDay()
    const diffToMonday = (day + 6) % 7
    start.setDate(now.getDate() - diffToMonday)
    start.setHours(0, 0, 0, 0)
    end.setTime(now.getTime())
    return { start, end }
  }

  if (preset === 'this-month') {
    start.setDate(1)
    start.setHours(0, 0, 0, 0)
    end.setTime(now.getTime())
    return { start, end }
  }

  return { start, end }
}

export function aggregateByEmployee(tasks: Task[], employees: Employee[]) {
  return employees.map((employee) => {
    const points = tasks
      .filter(
        (task) => task.employeeId === employee.id && task.status === 'completed',
      )
      .reduce((sum, task) => sum + task.points, 0)

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      teamId: employee.teamId,
      points,
    }
  })
}

export function aggregateByType(tasks: Task[], workTypes: WorkType[]) {
  const totals = new Map<string, { name: string; points: number }>()

  tasks
    .filter((task) => task.status === 'completed')
    .forEach((task) => {
      const entry = totals.get(task.workTypeId) ?? {
        name: task.workTypeName,
        points: 0,
      }

      entry.points += task.points
      totals.set(task.workTypeId, entry)
    })

  return workTypes
    .filter((workType) => totals.has(workType.id))
    .map((workType) => ({
      name: workType.name,
      points: totals.get(workType.id)?.points ?? 0,
    }))
}

export function aggregateByTeam(tasks: Task[], teams: Team[]) {
  const totals = new Map<string, number>()

  tasks
    .filter((task) => task.status === 'completed')
    .forEach((task) => {
      totals.set(task.teamId, (totals.get(task.teamId) ?? 0) + task.points)
    })

  return teams.map((team) => ({
    name: team.name,
    points: totals.get(team.id) ?? 0,
  }))
}

export function filterTasksByPeriod(tasks: Task[], period: DatePreset, customStart?: string, customEnd?: string) {
  return tasks.filter((task) => {
    if (task.status !== 'completed') {
      return false
    }

    const rawDate = task.completedAt ?? task.completedDate
    if (!rawDate) {
      return false
    }

    const completedAt = new Date(rawDate)
    if (Number.isNaN(completedAt.getTime())) {
      return false
    }

    if (period === 'custom') {
      if (!customStart || !customEnd) {
        return true
      }

      const start = new Date(`${customStart}T00:00:00`)
      const end = new Date(`${customEnd}T23:59:59.999`)
      return completedAt >= start && completedAt <= end
    }

    const { start, end } = getRangeForPreset(period)
    return completedAt >= start && completedAt <= end
  })
}

export function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
