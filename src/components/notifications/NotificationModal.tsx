import { Heart, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { formatMoment } from '../../lib/dates'
import type { HrNotification } from '../../types'
import { celebrate } from '../tulip/celebrate'

type NotificationModalProps = {
  /** Notes waiting to be read, oldest first; the modal shows the first one. */
  notes: HrNotification[]
  onDismiss: (note: HrNotification) => void
}

const FLOATING_DECOR = [
  { emoji: '💌', className: 'left-[6%] top-[10%]', delay: '0s' },
  { emoji: '💕', className: 'right-[8%] top-[16%]', delay: '0.8s' },
  { emoji: '🌸', className: 'left-[12%] bottom-[16%]', delay: '1.6s' },
  { emoji: '💖', className: 'right-[10%] bottom-[12%]', delay: '0.4s' },
  { emoji: '✨', className: 'left-[34%] top-[5%]', delay: '1.2s' },
  { emoji: '🌷', className: 'right-[32%] bottom-[5%]', delay: '2s' },
]

const primaryButton = 'btn bg-rose-500 text-white shadow-sm hover:bg-rose-400 focus-visible:ring-rose-400'

export function NotificationModal({ notes, onDismiss }: NotificationModalProps) {
  const note = notes[0]
  const noteId = note?.id
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  // Every new note arrives with a little burst.
  useEffect(() => {
    if (!noteId) return
    celebrate()
    buttonRef.current?.focus()
  }, [noteId])

  useEffect(() => {
    if (!note) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss(note)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [note, onDismiss])

  if (!note) return null

  const remaining = notes.length - 1

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      {/* No click-to-close on the backdrop: a stray tap would mark the note seen before it was read. */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-rose-200/70 via-pink-200/60 to-fuchsia-200/70 backdrop-blur-md dark:from-rose-950/80 dark:via-stone-950/80 dark:to-fuchsia-950/80"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {FLOATING_DECOR.map((item, index) => (
          <span
            key={index}
            className={`absolute text-3xl opacity-70 motion-safe:animate-float-drift sm:text-4xl ${item.className}`}
            style={{ animationDelay: item.delay }}
          >
            {item.emoji}
          </span>
        ))}
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-title"
        aria-describedby="notification-message"
        className="relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-rose-100 bg-white p-6 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-8 dark:border-rose-400/20 dark:bg-stone-900"
      >
        <button type="button" onClick={() => onDismiss(note)} className="btn btn-ghost btn-icon absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        <div key={note.id} className="animate-fade-up space-y-6 text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 rounded-full bg-rose-200 motion-safe:animate-soft-pulse dark:bg-rose-500/40" aria-hidden="true" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-rose-100 to-pink-100 text-5xl dark:from-rose-500/20 dark:to-fuchsia-500/20">
              <span className="animate-pop-in">{note.emoji}</span>
            </span>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-500 dark:text-rose-300">You’ve got a message</p>
            {/* The emoji sits outside the gradient text, which would otherwise paint it as a flat blob. */}
            <h2 id="notification-title" className="mt-1.5 text-2xl font-extrabold sm:text-3xl">
              <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">A little note for you</span>{' '}
              💌
            </h2>
          </div>

          <div className="relative rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 via-white to-pink-50 px-5 pb-4 pt-7 shadow-inner dark:border-rose-400/20 dark:from-rose-500/10 dark:via-stone-900 dark:to-fuchsia-500/10">
            <span
              className="absolute -top-3 left-1/2 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-rose-500 text-white shadow-md ring-4 ring-white dark:ring-stone-900"
              aria-hidden="true"
            >
              <Heart size={13} fill="currentColor" />
            </span>
            <p
              id="notification-message"
              className="whitespace-pre-wrap break-words text-pretty text-lg font-medium leading-relaxed text-stone-800 dark:text-stone-100"
            >
              {note.message}
            </p>
            <p className="mt-4 text-xs font-medium text-stone-400 dark:text-stone-500">Sent {formatMoment(note.createdAt)}</p>
          </div>

          <button ref={buttonRef} type="button" onClick={() => onDismiss(note)} className={`${primaryButton} h-11 w-full sm:w-auto sm:px-6`}>
            <Heart size={16} />
            {remaining > 0 ? `Next note (${remaining} more)` : 'Aww, thank you 🥰'}
          </button>
        </div>
      </div>
    </div>
  )
}
