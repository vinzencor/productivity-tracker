import type { Completion } from './completions'

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

export function filterCompletionsByPeriod(items: Completion[], period: DatePreset, customStart?: string, customEnd?: string) {
  return items.filter((item) => {
    const completedAt = new Date(item.at)
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
  // Revoking synchronously can cancel the download in Safari/Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
