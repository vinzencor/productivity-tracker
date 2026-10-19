import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const FIRST_YEAR = 1970

type BirthdayCalendarProps = {
  value: Date | null
  onChange: (date: Date) => void
}

function sameDay(a: Date | null, year: number, month: number, day: number) {
  return a !== null && a.getFullYear() === year && a.getMonth() === month && a.getDate() === day
}

export function BirthdayCalendar({ value, onChange }: BirthdayCalendarProps) {
  // Opens on the current month so the calendar itself doesn't give the date away.
  const [today] = useState(() => new Date())
  const [view, setView] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const lastYear = today.getFullYear()
  const years = Array.from({ length: lastYear - FIRST_YEAR + 1 }, (_, index) => lastYear - index)

  const leadingBlanks = new Date(view.year, view.month, 1).getDay()
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate()

  const shiftMonth = (delta: number) => {
    setView(({ year, month }) => {
      const next = new Date(year, month + delta, 1)
      if (next.getFullYear() < FIRST_YEAR || next.getFullYear() > lastYear) return { year, month }
      return { year: next.getFullYear(), month: next.getMonth() }
    })
  }

  return (
    <div className="rounded-2xl border border-rose-100 bg-white p-3 shadow-sm dark:border-rose-400/20 dark:bg-stone-950">
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => shiftMonth(-1)} className="btn btn-ghost btn-icon" aria-label="Previous month">
          <ChevronLeft size={18} />
        </button>
        <select
          aria-label="Month"
          value={view.month}
          onChange={(event) => setView((current) => ({ ...current, month: Number(event.target.value) }))}
          className="field h-9 flex-1 border-rose-100 focus:border-rose-400 focus:ring-rose-400/30 dark:border-rose-400/20"
        >
          {MONTHS.map((label, index) => (
            <option key={label} value={index}>
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Year"
          value={view.year}
          onChange={(event) => setView((current) => ({ ...current, year: Number(event.target.value) }))}
          className="field h-9 w-24 shrink-0 border-rose-100 focus:border-rose-400 focus:ring-rose-400/30 dark:border-rose-400/20"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => shiftMonth(1)} className="btn btn-ghost btn-icon" aria-label="Next month">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((day) => (
          <span key={day} className="py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-400">
            {day}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const selected = sameDay(value, view.year, view.month, day)
          return (
            <button
              key={day}
              type="button"
              onClick={() => onChange(new Date(view.year, view.month, day))}
              aria-pressed={selected}
              aria-label={`${day} ${MONTHS[view.month]} ${view.year}`}
              className={`grid aspect-square place-items-center rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                selected
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-rose-50 hover:text-rose-600 dark:text-stone-200 dark:hover:bg-rose-400/10 dark:hover:text-rose-300'
              }`}
            >
              {day}
            </button>
          )
        })}
      </div>
    </div>
  )
}
