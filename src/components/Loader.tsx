import { LoaderCircle } from 'lucide-react'

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return <LoaderCircle size={size} className={`animate-spin ${className}`} aria-hidden="true" />
}

export function FullScreenLoader({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen min-h-[100dvh] items-center justify-center bg-stone-50 dark:bg-stone-950" role="status">
      <div className="flex items-center gap-3 text-sm font-medium text-stone-500 dark:text-stone-400">
        <Spinner className="text-yellow-500" />
        {label}
      </div>
    </div>
  )
}

export function SectionLoader({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="card flex items-center justify-center gap-3 px-6 py-16 text-sm font-medium text-stone-500 dark:text-stone-400" role="status">
      <Spinner className="text-yellow-500" />
      {label}
    </div>
  )
}
