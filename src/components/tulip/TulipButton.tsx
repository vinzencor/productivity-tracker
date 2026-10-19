import { lazy, Suspense, useCallback, useState } from 'react'

// The surprise and its games load only when the tulip is tapped, keeping the HR pages light.
const TulipSurprise = lazy(() => import('./TulipSurprise').then((module) => ({ default: module.TulipSurprise })))

export function TulipButton() {
  const [open, setOpen] = useState(false)
  // Once the birthday is right, reopening skips the lock until she logs out.
  const [unlocked, setUnlocked] = useState(false)

  const close = useCallback(() => setOpen(false), [])
  const unlock = useCallback(() => setUnlocked(true), [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 grid h-14 w-14 place-items-center rounded-full border border-rose-200 bg-white shadow-lg shadow-rose-200/60 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2 lg:bottom-6 lg:right-6 dark:border-rose-400/30 dark:bg-stone-900 dark:shadow-rose-950/60"
        aria-label="A little surprise for you"
        title="🌷"
      >
        <span className="absolute inset-0 rounded-full bg-rose-300 motion-safe:animate-soft-pulse dark:bg-rose-500/60" aria-hidden="true" />
        <span className="relative text-3xl motion-safe:animate-tulip-sway" aria-hidden="true">
          🌷
        </span>
      </button>

      {open ? (
        <Suspense fallback={null}>
          <TulipSurprise startUnlocked={unlocked} onUnlock={unlock} onClose={close} />
        </Suspense>
      ) : null}
    </>
  )
}
