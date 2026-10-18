type ProgressBarProps = {
  percent: number
  label?: string
  value?: string | number
}

export function ProgressBar({ percent, label, value }: ProgressBarProps) {
  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm text-stone-600 dark:text-stone-300">
        <span>{label ?? 'Progress'}</span>
        <span>{value ?? `${Math.round(percent)}%`}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-yellow-100 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500"
          style={{ width: `${Math.max(8, Math.min(percent, 100))}%` }}
        />
      </div>
    </div>
  )
}
