import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type CardProps = {
  title?: string
  description?: string
  icon?: LucideIcon
  action?: ReactNode
  className?: string
  bodyClassName?: string
  children: ReactNode
}

export function Card({ title, description, icon: Icon, action, className = '', bodyClassName = 'p-4 sm:p-5', children }: CardProps) {
  return (
    <section className={`card flex flex-col ${className}`}>
      {title ? (
        <header className="flex min-h-[60px] items-center justify-between gap-3 border-b border-stone-100 px-4 py-3 sm:px-5 dark:border-stone-800">
          <div className="flex min-w-0 items-center gap-3">
            {Icon ? (
              <span className="icon-tile h-8 w-8">
                <Icon size={16} />
              </span>
            ) : null}
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-stone-900 dark:text-white">{title}</h2>
              {description ? <p className="truncate text-xs text-stone-500 dark:text-stone-400">{description}</p> : null}
            </div>
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={`flex-1 ${bodyClassName}`}>{children}</div>
    </section>
  )
}
