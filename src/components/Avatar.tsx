type AvatarProps = {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  const first = parts[0][0] ?? ''
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : ''
  return `${first}${last}`.toUpperCase()
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-stone-100 font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200 ${sizes[size]}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
