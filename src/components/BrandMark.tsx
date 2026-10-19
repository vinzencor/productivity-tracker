import { Zap } from 'lucide-react'

type BrandMarkProps = {
  size?: 'sm' | 'lg'
}

export function BrandMark({ size = 'sm' }: BrandMarkProps) {
  const box = size === 'lg' ? 'h-12 w-12 rounded-2xl' : 'h-9 w-9 rounded-xl'
  return (
    <span className={`grid shrink-0 place-items-center bg-yellow-400 text-stone-900 shadow-sm ${box}`}>
      <Zap size={size === 'lg' ? 24 : 18} strokeWidth={2.5} className="fill-current" />
    </span>
  )
}
