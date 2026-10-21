import { differenceInCalendarDays, format, isValid, parseISO } from 'date-fns'

/** Local calendar day as yyyy-MM-dd (matches how completedDate is stored). */
export function dayKey(value: Date | string) {
  return format(typeof value === 'string' ? new Date(value) : value, 'yyyy-MM-dd')
}

export function todayKey() {
  return dayKey(new Date())
}

export function formatDay(value?: string) {
  if (!value) return '—'
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : value
}

/** "Today", "Yesterday", or e.g. "Mon, Oct 19" for a yyyy-MM-dd key. */
export function relativeDayLabel(key: string) {
  const date = parseISO(key)
  if (!isValid(date)) return key
  const daysAgo = differenceInCalendarDays(new Date(), date)
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return 'Yesterday'
  return format(date, 'EEE, MMM d')
}

/** Timestamp for a completion recorded on `key`: now if it is today, otherwise midday that day. */
export function completionTimestamp(key: string) {
  return key === todayKey() ? new Date().toISOString() : new Date(`${key}T12:00:00`).toISOString()
}
