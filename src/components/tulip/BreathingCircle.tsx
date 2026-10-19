import { useEffect, useState } from 'react'

type Phase = 'rest' | 'in' | 'hold' | 'out'

const PHASES: Record<Exclude<Phase, 'rest'>, { label: string; seconds: number; next: Exclude<Phase, 'rest'> }> = {
  in: { label: 'Breathe in…', seconds: 4, next: 'hold' },
  hold: { label: 'Hold…', seconds: 2, next: 'out' },
  out: { label: 'Breathe out…', seconds: 4, next: 'in' },
}

// One slow 4-2-4 breath per cycle; reports each finished cycle so the parent can move on.
export function BreathingCircle({ onCycle }: { onCycle: (count: number) => void }) {
  const [phase, setPhase] = useState<Phase>('rest')
  const [cycles, setCycles] = useState(0)

  useEffect(() => {
    if (phase === 'rest') {
      // Start from the small circle so the first inhale actually animates.
      const timer = window.setTimeout(() => setPhase('in'), 300)
      return () => window.clearTimeout(timer)
    }
    const { seconds, next } = PHASES[phase]
    const timer = window.setTimeout(() => {
      if (phase === 'out') setCycles((count) => count + 1)
      setPhase(next)
    }, seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [phase])

  useEffect(() => {
    if (cycles > 0) onCycle(cycles)
  }, [cycles, onCycle])

  const expanded = phase === 'in' || phase === 'hold'

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <div className="relative grid h-44 w-44 place-items-center">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-300 via-pink-300 to-fuchsia-300 opacity-80 shadow-[0_0_60px_rgba(244,114,182,0.45)] transition-transform ease-in-out dark:from-rose-500 dark:via-pink-500 dark:to-fuchsia-500"
          style={{
            transform: `scale(${expanded ? 1 : 0.55})`,
            transitionDuration: phase === 'hold' ? '0s' : phase === 'rest' ? '0.3s' : `${PHASES[phase].seconds}s`,
          }}
          aria-hidden="true"
        />
        <span className="relative text-4xl" aria-hidden="true">
          🌷
        </span>
      </div>
      <p className="text-lg font-bold text-rose-600 dark:text-rose-300" aria-live="polite">
        {phase === 'rest' ? 'Get comfy…' : PHASES[phase].label}
      </p>
    </div>
  )
}
