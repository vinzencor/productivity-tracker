import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import { pick } from '../messages'

const ROUND_SECONDS = 30
const GOOD_ITEMS = ['💖', '💕', '🌷', '🍫', '🧸', '💗']
const CLOUD = '🌧️'
const BASKET_Y = 0.86
const CATCH_RADIUS = 0.11

type Item = { id: number; x: number; y: number; speed: number; emoji: string }
type Game = { items: Item[]; basketX: number; score: number; timeLeft: number; spawnIn: number; nextId: number }
type Phase = 'ready' | 'playing' | 'done'

function freshGame(): Game {
  return { items: [], basketX: 0.5, score: 0, timeLeft: ROUND_SECONDS, spawnIn: 0, nextId: 0 }
}

export function CatchHearts() {
  const [phase, setPhase] = useState<Phase>('ready')
  const [view, setView] = useState<Game>(freshGame)
  const game = useRef<Game>(freshGame())
  const areaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (phase !== 'playing') return

    let frame = 0
    let last = performance.now()

    const tick = (now: number) => {
      // Clamp the step so a backgrounded tab doesn't dump a burst of items on return.
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const g = game.current

      g.timeLeft = Math.max(0, g.timeLeft - dt)
      g.spawnIn -= dt
      if (g.spawnIn <= 0) {
        g.spawnIn = 0.45 + Math.random() * 0.35
        const emoji = Math.random() < 0.18 ? CLOUD : pick(GOOD_ITEMS)
        g.items.push({ id: g.nextId++, x: 0.06 + Math.random() * 0.88, y: -0.08, speed: 0.28 + Math.random() * 0.22, emoji })
      }

      g.items = g.items.filter((item) => {
        item.y += item.speed * dt
        // Items are centred on (x, y); they count as caught once they reach the basket's rim.
        if (item.y >= BASKET_Y - 0.08 && item.y <= BASKET_Y && Math.abs(item.x - g.basketX) < CATCH_RADIUS) {
          g.score = Math.max(0, g.score + (item.emoji === CLOUD ? -1 : 1))
          return false
        }
        return item.y < 1.05
      })

      setView({ ...g, items: g.items.map((item) => ({ ...item })) })

      if (g.timeLeft <= 0) {
        setPhase('done')
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase])

  useEffect(() => {
    if (phase !== 'playing') return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const step = event.key === 'ArrowLeft' ? -0.07 : 0.07
      game.current.basketX = Math.min(0.95, Math.max(0.05, game.current.basketX + step))
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [phase])

  const moveBasket = (event: PointerEvent<HTMLDivElement>) => {
    const rect = areaRef.current?.getBoundingClientRect()
    if (!rect || phase !== 'playing') return
    game.current.basketX = Math.min(0.95, Math.max(0.05, (event.clientX - rect.left) / rect.width))
  }

  const start = () => {
    game.current = freshGame()
    setView(freshGame())
    setPhase('playing')
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-stone-600 dark:text-stone-300">
        <span>
          Caught: <span className="text-rose-600 dark:text-rose-300">{view.score}</span>
        </span>
        <span>⏱️ {Math.ceil(view.timeLeft)}s</span>
      </div>

      <div
        ref={areaRef}
        onPointerMove={moveBasket}
        onPointerDown={moveBasket}
        className="relative h-80 touch-none select-none overflow-hidden rounded-2xl bg-gradient-to-b from-pink-100 via-rose-50 to-amber-50 sm:h-96 dark:from-rose-950/60 dark:via-stone-900 dark:to-stone-900"
      >
        {view.items.map((item) => (
          <span
            key={item.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-3xl"
            style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%` }}
            aria-hidden="true"
          >
            {item.emoji}
          </span>
        ))}

        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 text-5xl"
          style={{ left: `${view.basketX * 100}%`, top: `${BASKET_Y * 100}%` }}
          aria-hidden="true"
        >
          🧺
        </span>

        {phase !== 'playing' ? (
          <div className="absolute inset-0 grid place-items-center bg-white/60 p-6 text-center backdrop-blur-sm dark:bg-stone-950/60">
            <div className="animate-fade-up space-y-3">
              {phase === 'done' ? (
                <>
                  <p className="text-4xl">🧺💖</p>
                  <p className="text-lg font-bold text-rose-600 dark:text-rose-300">You caught {view.score} hearts!</p>
                  <p className="text-sm text-stone-600 dark:text-stone-300">But you caught mine a long time ago 😘</p>
                </>
              ) : (
                <>
                  <p className="text-4xl">💖🌷🍫</p>
                  <p className="text-sm font-medium text-stone-600 dark:text-stone-300">
                    Move the basket with your finger, mouse or ← → keys.
                    <br />
                    Catch the love, dodge the rain clouds {CLOUD}
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
