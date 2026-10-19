import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { pick } from '../messages'

const ROUND_SECONDS = 30
const HOLES = 9
const WORRIES = ['😤', '😩', '🌧️', '📧', '⏰', '😵‍💫', '📋', '🤯']
const LOVE = '💖'

type Mole = { id: number; hole: number; emoji: string }
type Phase = 'ready' | 'playing' | 'done'

export function WhackWorry() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [mole, setMole] = useState<Mole | null>(null)
  const [bonked, setBonked] = useState<{ hole: number; text: string } | null>(null)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS)
  const nextId = useRef(0)
  const bonkTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(bonkTimer.current), [])

  useEffect(() => {
    if (phase !== 'playing') return

    let popTimer: number
    const popUp = () => {
      setMole((current) => {
        let hole = Math.floor(Math.random() * HOLES)
        if (hole === current?.hole) hole = (hole + 1 + Math.floor(Math.random() * (HOLES - 1))) % HOLES
        return { id: nextId.current++, hole, emoji: Math.random() < 0.15 ? LOVE : pick(WORRIES) }
      })
      popTimer = window.setTimeout(popUp, 650 + Math.random() * 450)
    }
    popUp()

    const endsAt = Date.now() + ROUND_SECONDS * 1000
    const clock = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setTimeLeft(left)
      if (left === 0) {
        setPhase('done')
        setMole(null)
      }
    }, 250)

    return () => {
      window.clearTimeout(popTimer)
      window.clearInterval(clock)
    }
  }, [phase])

  const whack = (hole: number) => {
    if (phase !== 'playing' || !mole || mole.hole !== hole) return
    const isLove = mole.emoji === LOVE
    setScore((current) => current + (isLove ? 3 : 1))
    setMole(null)
    setBonked({ hole, text: isLove ? '+3 💖' : '💥' })
    window.clearTimeout(bonkTimer.current)
    bonkTimer.current = window.setTimeout(() => setBonked(null), 350)
  }

  const start = () => {
    setScore(0)
    setTimeLeft(ROUND_SECONDS)
    setBonked(null)
    setPhase('playing')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-stone-600 dark:text-stone-300">
        <span>
          Worries whacked: <span className="text-rose-600 dark:text-rose-300">{score}</span>
        </span>
        <span>⏱️ {timeLeft}s</span>
      </div>

      <div className="relative">
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-3 rounded-2xl bg-gradient-to-b from-lime-100 to-emerald-100 p-4 dark:from-emerald-950/50 dark:to-stone-900">
          {Array.from({ length: HOLES }, (_, hole) => {
            const showing = mole?.hole === hole ? mole : null
            const bonk = bonked?.hole === hole ? bonked : null
            return (
              <button
                key={hole}
                type="button"
                onPointerDown={() => whack(hole)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') whack(hole)
                }}
                aria-label={showing ? `Whack ${showing.emoji === LOVE ? 'the heart' : 'the worry'}` : 'Empty hole'}
                className="relative grid aspect-square place-items-center overflow-hidden rounded-full bg-gradient-to-b from-amber-900/70 to-amber-950/90 shadow-inner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
              >
                {showing ? (
                  <span key={showing.id} className="animate-pop-in text-4xl sm:text-5xl">
                    {showing.emoji}
                  </span>
                ) : null}
                {bonk ? <span className="animate-pop-in text-xl font-bold text-white sm:text-2xl">{bonk.text}</span> : null}
              </button>
            )
          })}
        </div>

        {phase !== 'playing' ? (
          <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/60 p-6 text-center backdrop-blur-sm dark:bg-stone-950/60">
            <div className="animate-fade-up space-y-3">
              {phase === 'done' ? (
                <>
                  <p className="text-4xl">🔨💪</p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-300">{score} points of stress, bonked!</p>
                  <p className="text-sm text-stone-600 dark:text-stone-300">See? You’re stronger than every single worry 💖</p>
                </>
              ) : (
                <>
                  <p className="text-4xl">😤🔨</p>
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    Tap the worries to bonk them away.
                    <br />
                    Hit a {LOVE} for 3 bonus points!
                  </p>
                </>
              )}
              <button type="button" onClick={start} className="btn bg-rose-500 text-white shadow-sm hover:bg-rose-400">
                <Play size={16} />
                {phase === 'done' ? 'Play again' : 'Start'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
