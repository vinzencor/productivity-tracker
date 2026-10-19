import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { shuffle } from '../messages'

const FACES = ['🌷', '🧸', '🍫', '🐱', '🌙', '🍓', '🦋', '💖']

type Card = { id: number; face: string }

function newDeck(): Card[] {
  return shuffle([...FACES, ...FACES]).map((face, id) => ({ id, face }))
}

export function MemoryMatch() {
  const [deck, setDeck] = useState(newDeck)
  const [flipped, setFlipped] = useState<number[]>([])
  const [matched, setMatched] = useState<Set<string>>(() => new Set())
  const [moves, setMoves] = useState(0)
  const hideTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(hideTimer.current), [])

  const won = matched.size === FACES.length

  const flip = (index: number) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.has(deck[index].face)) return
    const next = [...flipped, index]
    setFlipped(next)
    if (next.length < 2) return

    setMoves((count) => count + 1)
    const [first, second] = next
    if (deck[first].face === deck[second].face) {
      setMatched((current) => new Set(current).add(deck[first].face))
      setFlipped([])
    } else {
      hideTimer.current = window.setTimeout(() => setFlipped([]), 800)
    }
  }

  const restart = () => {
    window.clearTimeout(hideTimer.current)
    setDeck(newDeck())
    setFlipped([])
    setMatched(new Set())
    setMoves(0)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold text-stone-600 dark:text-stone-300">
        <span>
          Moves: <span className="text-rose-600 dark:text-rose-300">{moves}</span>
        </span>
        <span>
          Pairs: <span className="text-rose-600 dark:text-rose-300">{matched.size}</span> / {FACES.length}
        </span>
      </div>

      <div className="mx-auto grid max-w-sm grid-cols-4 gap-2 [perspective:800px] sm:gap-3">
        {deck.map((card, index) => {
          const faceUp = flipped.includes(index) || matched.has(card.face)
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => flip(index)}
              aria-label={faceUp ? card.face : 'Hidden card'}
              className="relative aspect-square focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 rounded-xl"
            >
              <span
                className={`absolute inset-0 transition-transform duration-300 [transform-style:preserve-3d] ${faceUp ? '[transform:rotateY(180deg)]' : ''}`}
              >
                <span className="absolute inset-0 grid place-items-center rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 text-xl text-white shadow-sm [backface-visibility:hidden]">
                  ?
                </span>
                <span
                  className={`absolute inset-0 grid place-items-center rounded-xl border text-3xl shadow-sm [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    matched.has(card.face)
                      ? 'border-rose-200 bg-rose-50 dark:border-rose-400/30 dark:bg-rose-400/10'
                      : 'border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-800'
                  }`}
                >
                  {card.face}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      {won ? (
        <div className="animate-fade-up rounded-2xl bg-rose-50 p-4 text-center dark:bg-rose-400/10">
          <p className="text-base font-bold text-rose-600 dark:text-rose-300">You did it in {moves} moves! 🧠💖</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Smart AND pretty? Not fair to the rest of the world 😘</p>
        </div>
      ) : (
        <p className="text-center text-sm text-stone-500 dark:text-stone-400">Find all the matching pairs, my clever girl 🌷</p>
      )}

      <div className="flex justify-center">
        <button type="button" onClick={restart} className="btn btn-secondary btn-sm">
          <RotateCcw size={14} />
          Shuffle again
        </button>
      </div>
    </div>
  )
}
