import { format, isValid, parseISO } from 'date-fns'

/** Local calendar day as yyyy-MM-dd (matches how completedDate is stored). */
export function todayKey() {
  return format(new Date(), 'yyyy-MM-dd')
}

export function formatDay(value?: string) {
  if (!value) return '—'
  const date = parseISO(value)
  return isValid(date) ? format(date, 'MMM d, yyyy') : value
}
