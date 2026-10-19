import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'

import { pick, SWEET_NOTES } from '../messages'

const WORRIES = ['stress', 'deadline', 'meetings', 'emails', 'tired', 'overthinking', 'worry', 'headache', 'pending', 'traffic']
const MAX_BUBBLES = 12

type Bubble = { id: number; x: number; size: number; duration: number; label: string }
type Note = { id: number; x: number; y: number; text: string }

export function BubblePop() {
  const [bubbles, setBubbles] = useState<Bubble[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [popped, setPopped] = useState(0)
  const [message, setMessage] = useState('Pop every worry floating up. Each one you pop is gone for good 🫧')
  const nextId = useRef(0)
  const areaRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const spawn = () => {
      setBubbles((current) => {
        if (current.length >= MAX_BUBBLES) return current
        const id = nextId.current++
        return [
          ...current,
          { id, x: 8 + Math.random() * 84, size: 64 + Math.random() * 28, duration: 6 + Math.random() * 4, label: pick(WORRIES) },
        ]
      })
    }
    spawn()
    const timer = window.setInterval(spawn, 750)
    return () => window.clearInterval(timer)
  }, [])

  const popBubble = (bubble: Bubble, event: MouseEvent<HTMLButtonElement>) => {
    const rect = areaRef.current?.getBoundingClientRect()
    // Keyboard "clicks" carry no pointer position (detail is 0), so fall back to the bubble's lane.
    const fromPointer = rect && event.detail > 0
    const x = fromPointer ? ((event.clientX - rect.left) / rect.width) * 100 : bubble.x
    const y = fromPointer ? event.clientY - rect.top : 120
    const id = nextId.current++

    const count = popped + 1
    setBubbles((current) => current.filter((item) => item.id !== bubble.id))
    setNotes((current) => [...current, { id, x, y, text: '💖' }])
    setPopped(count)
    setMessage(count % 10 === 0 ? `${count} worries gone! Look at you go, superstar 🌟` : pick(SWEET_NOTES))
  }

  return (
    <div className="space-y-3">
      <div
        ref={areaRef}
        className="relative h-80 select-none overflow-hidden rounded-2xl bg-gradient-to-b from-sky-100 via-rose-50 to-pink-100 sm:h-96 dark:from-sky-950/60 dark:via-stone-900 dark:to-rose-950/60"
      >
        {bubbles.map((bubble) => (
          <div
            key={bubble.id}
            className="absolute top-full animate-bubble-rise"
            style={{ left: `calc(${bubble.x}% - ${bubble.size / 2}px)`, animationDuration: `${bubble.duration}s` }}
            onAnimationEnd={(event) => {
              // Bubbles that float away unpopped are cleaned up once they leave the top.
              if (event.target === event.currentTarget) setBubbles((current) => current.filter((item) => item.id !== bubble.id))
            }}
          >
            <div className="motion-safe:animate-bubble-sway">
              <button
                type="button"
                onClick={(event) => popBubble(bubble, event)}
                className="grid place-items-center rounded-full border border-white/80 bg-white/40 px-1 text-[11px] font-semibold text-sky-800 shadow-[inset_-6px_-8px_16px_rgba(255,255,255,0.7),0_4px_14px_rgba(14,165,233,0.15)] backdrop-blur-[2px] transition-transform active:scale-90 dark:border-white/20 dark:bg-white/10 dark:text-sky-100"
                style={{ width: bubble.size, height: bubble.size }}
                aria-label={`Pop ${bubble.label}`}
              >
                {bubble.label}
              </button>
            </div>
          </div>
        ))}

        {notes.map((note) => (
          <span
            key={note.id}
            className="pointer-events-none absolute animate-note-pop text-2xl"
            style={{ left: `${note.x}%`, top: note.y }}
            onAnimationEnd={() => setNotes((current) => current.filter((item) => item.id !== note.id))}
            aria-hidden="true"
          >
            {note.text}
          </span>
        ))}

        <span className="absolute left-3 top-3 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-rose-600 shadow-sm dark:bg-stone-900/80 dark:text-rose-300">
          🫧 {popped} popped
        </span>
      </div>

      <p key={message} className="animate-fade-up text-center text-sm font-semibold text-rose-600 dark:text-rose-300" aria-live="polite">
        {message}
      </p>
    </div>
  )
}
