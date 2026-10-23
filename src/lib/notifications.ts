import { collection, deleteDoc, doc, limit, onSnapshot, orderBy, query, setDoc, updateDoc } from 'firebase/firestore'

import { db } from '../firebase'
import type { HrNotification } from '../types'

/** Matches the limit in firestore.rules. */
export const MAX_NOTIFICATION_LENGTH = 1000

const notifications = collection(db, 'notifications')

const mapNotification = (data: Record<string, unknown> & { id?: string }): HrNotification => ({
  id: (data.id as string) ?? '',
  message: (data.message as string) ?? '',
  emoji: (data.emoji as string) ?? '💌',
  createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  seenAt: (data.seenAt as string | null) ?? null,
})

/** Live list of the most recent notifications, newest first. Returns the unsubscribe function. */
export function subscribeNotifications(onChange: (notes: HrNotification[]) => void, onError?: (error: Error) => void, max = 50) {
  return onSnapshot(
    query(notifications, orderBy('createdAt', 'desc'), limit(max)),
    (snapshot) => onChange(snapshot.docs.map((docSnap) => mapNotification({ id: docSnap.id, ...docSnap.data() }))),
    (error) => {
      console.error('Failed to sync notifications:', error)
      onError?.(error)
    },
  )
}

export async function sendNotification(message: string, emoji: string) {
  const note: HrNotification = {
    id: `note-${crypto.randomUUID()}`,
    message,
    emoji,
    createdAt: new Date().toISOString(),
    seenAt: null,
  }
  await setDoc(doc(notifications, note.id), note)
  return note
}

/** Only a signed-in HR admin may do this (see firestore.rules). */
export function markNotificationSeen(id: string) {
  return updateDoc(doc(notifications, id), { seenAt: new Date().toISOString() })
}

export function deleteNotification(id: string) {
  return deleteDoc(doc(notifications, id))
}
