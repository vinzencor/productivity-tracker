import type { LucideIcon } from 'lucide-react'

type SegmentedOption<T extends string> = {
  value: T
  label: string
  icon?: LucideIcon
  count?: number
}

type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  label: string
  fullWidth?: boolean
}

export function SegmentedControl<T extends string>({ options, value, onChange, label, fullWidth = false }: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={`${fullWidth ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex'} max-w-full gap-1 rounded-xl bg-stone-100 p-1 dark:bg-stone-800/70`}
    >
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon, count }) => {
        const active = optionValue === value
        return (
          <button
            key={optionValue}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(optionValue)}
            className={`inline-flex h-8 min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-2 text-xs font-semibold transition sm:px-3 sm:text-sm ${
              fullWidth ? 'flex-1 sm:flex-none' : ''
            } ${
              active
                ? 'bg-white text-stone-900 shadow-sm dark:bg-stone-950 dark:text-white'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white'
            }`}
          >
            {Icon ? <Icon size={15} className="hidden shrink-0 sm:block" /> : null}
            <span className="truncate">{optionLabel}</span>
            {count !== undefined ? (
              <span
                className={`hidden rounded-full px-1.5 text-[11px] font-semibold tabular-nums sm:inline ${
                  active ? 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300' : 'bg-stone-200/70 text-stone-500 dark:bg-stone-700 dark:text-stone-400'
                }`}
              >
                {count}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
