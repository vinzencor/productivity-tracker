import { lazy, Suspense, useCallback, useEffect, useState } from 'react'

import { markNotificationSeen, subscribeNotifications } from '../../lib/notifications'
import type { HrNotification } from '../../types'

// The modal and its confetti load only once a note is actually waiting.
const NotificationModal = lazy(() => import('./NotificationModal').then((module) => ({ default: module.NotificationModal })))

/** Pops up notes sent from /rahul/notification on whichever HR page is open, live. */
export function NotificationListener() {
  const [notes, setNotes] = useState<HrNotification[]>([])
  // Hides a note right away, even if the "seen" write is slow or rejected, so HR is never stuck behind it.
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(() => new Set())

  useEffect(() => subscribeNotifications(setNotes, undefined, 20), [])

  const dismiss = useCallback((note: HrNotification) => {
    setDismissed((current) => new Set(current).add(note.id))
    markNotificationSeen(note.id).catch((error: unknown) => console.error('Failed to mark notification as seen:', error))
  }, [])

  const unseen = notes.filter((note) => !note.seenAt && !dismissed.has(note.id)).reverse()
  if (unseen.length === 0) return null

  return (
    <Suspense fallback={null}>
      <NotificationModal notes={unseen} onDismiss={dismiss} />
    </Suspense>
  )
}
