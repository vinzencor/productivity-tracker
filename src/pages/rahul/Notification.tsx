import { Check, CheckCheck, CircleAlert, Eye, Lock, LockKeyhole, MailOpen, Send, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import toast from 'react-hot-toast'

import { ConfirmDialog, type ConfirmRequest } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { Spinner } from '../../components/Loader'
import { NotificationModal } from '../../components/notifications/NotificationModal'
import { ThemeToggle } from '../../components/ThemeToggle'
import { formatMoment } from '../../lib/dates'
import { errorMessage } from '../../lib/errors'
import { deleteNotification, MAX_NOTIFICATION_LENGTH, sendNotification, subscribeNotifications } from '../../lib/notifications'
import type { HrNotification } from '../../types'

// The page unlocks only for this date of birth (8 March 2002), in the date input's yyyy-MM-dd format.
const SENDER_BIRTHDAY = '2002-03-08'
const UNLOCK_KEY = 'productivity-quest-notification-unlocked'
const EMOJIS = ['💌', '💖', '🌷', '🥰', '🌸', '🤗', '☕', '✨']

const primaryButton = 'btn bg-rose-500 text-white shadow-sm hover:bg-rose-400 focus-visible:ring-rose-400'
const roseFocus = 'focus:border-rose-400 focus:ring-rose-400/30'

function readUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === 'yes'
  } catch {
    return false
  }
}

function storeUnlocked(unlocked: boolean) {
  try {
    if (unlocked) {
      sessionStorage.setItem(UNLOCK_KEY, 'yes')
    } else {
      sessionStorage.removeItem(UNLOCK_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); the page still unlocks until it is reloaded.
  }
}

export function NotificationSenderPage() {
  // Unlocking lasts for this browser tab, so a refresh doesn't ask for the date again.
  const [unlocked, setUnlocked] = useState(readUnlocked)

  const changeLock = (next: boolean) => {
    storeUnlocked(next)
    setUnlocked(next)
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-br from-rose-50 via-stone-50 to-pink-50 text-stone-900 dark:from-stone-950 dark:via-stone-950 dark:to-rose-950/30 dark:text-stone-100">
      <header className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-100 text-lg dark:bg-rose-500/15" aria-hidden="true">
            💌
          </span>
          <p className="text-sm font-bold text-stone-900 dark:text-white">Love Notes</p>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle className="btn btn-ghost btn-icon" />
          {unlocked ? (
            <button type="button" onClick={() => changeLock(false)} className="btn btn-ghost btn-sm">
              <Lock size={16} />
              Lock
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6">
        {unlocked ? <Composer /> : <LockScreen onUnlock={() => changeLock(true)} />}
      </main>
    </div>
  )
}

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [birthday, setBirthday] = useState('')
  const [wrongAttempts, setWrongAttempts] = useState(0)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (birthday === SENDER_BIRTHDAY) {
      onUnlock()
    } else {
      setWrongAttempts((count) => count + 1)
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-8rem)] w-full max-w-sm flex-col justify-center py-8">
      <div className="mb-8 text-center">
        <p className="text-5xl motion-safe:animate-tulip-sway" aria-hidden="true">
          🌷
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-stone-900 dark:text-white">Hey, is that you?</h1>
        <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">Enter your date of birth to send a note to the HR dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6 sm:p-7" noValidate>
        <div>
          <label htmlFor="sender-birthday" className="label">
            Date of birth
          </label>
          <input
            id="sender-birthday"
            type="date"
            required
            value={birthday}
            onChange={(event) => setBirthday(event.target.value)}
            className={`field h-11 ${roseFocus}`}
            autoFocus
          />
        </div>

        {wrongAttempts > 0 ? (
          <div
            key={wrongAttempts}
            role="alert"
            className="flex animate-fade-up items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
          >
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            <span>That’s not the right date. Try again.</span>
          </div>
        ) : null}

        <button type="submit" disabled={!birthday} className={`${primaryButton} h-11 w-full`}>
          <LockKeyhole size={16} />
          Unlock
        </button>
      </form>
    </div>
  )
}

function Composer() {
  const [notes, setNotes] = useState<HrNotification[]>([])
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [sending, setSending] = useState(false)
  const [preview, setPreview] = useState<HrNotification | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  useEffect(
    () =>
      subscribeNotifications(
        (next) => {
          setNotes(next)
          setLoaded(true)
          setLoadError(null)
        },
        (error) => {
          setLoaded(true)
          setLoadError(errorMessage(error))
        },
      ),
    [],
  )

  const trimmed = message.trim()

  const send = async () => {
    if (!trimmed || sending) return
    setSending(true)
    try {
      await sendNotification(trimmed, emoji)
      setMessage('')
      toast.success('Sent! It will pop up on the HR dashboard 💌')
    } catch (error) {
      console.error(error)
      toast.error(errorMessage(error))
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void send()
  }

  // Ctrl/Cmd + Enter sends; plain Enter starts a new line.
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void send()
    }
  }

  const closePreview = useCallback(() => setPreview(null), [])
  const closeConfirm = useCallback(() => setConfirmRequest(null), [])

  const askDelete = (note: HrNotification) =>
    setConfirmRequest({
      title: note.seenAt ? 'Delete this note?' : 'Unsend this note?',
      description: note.seenAt
        ? 'It will be removed from your sent notes.'
        : 'It has not been seen yet, so it will no longer pop up on the HR dashboard.',
      confirmLabel: note.seenAt ? 'Delete' : 'Unsend',
      onConfirm: async () => {
        await deleteNotification(note.id)
        toast.success(note.seenAt ? 'Note deleted' : 'Note unsent')
      },
    })

  return (
    <div className="space-y-6 pt-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-white">Send a little note 💌</h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          It pops up on whichever HR page is open the moment you send it. You’ll see a tick here once it has been read.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-5 sm:p-6">
        <div>
          <label htmlFor="note-message" className="label">
            Your message
          </label>
          <textarea
            id="note-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            maxLength={MAX_NOTIFICATION_LENGTH}
            placeholder="Write something sweet…"
            className={`field h-auto resize-y py-2.5 ${roseFocus}`}
            autoFocus
          />
          <p className="mt-1.5 flex justify-between gap-3 text-xs text-stone-400 dark:text-stone-500">
            <span className="hidden sm:inline">Ctrl/⌘ + Enter to send</span>
            <span className="ml-auto tabular-nums">
              {message.length}/{MAX_NOTIFICATION_LENGTH}
            </span>
          </p>
        </div>

        <fieldset>
          <legend className="label">Emoji on top</legend>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setEmoji(option)}
                aria-pressed={emoji === option}
                className={`grid h-11 w-11 place-items-center rounded-xl border text-2xl transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
                  emoji === option
                    ? 'border-rose-400 bg-rose-50 shadow-sm dark:border-rose-400/60 dark:bg-rose-500/15'
                    : 'border-stone-200 bg-white hover:border-rose-200 hover:bg-rose-50/60 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => setPreview({ id: 'preview', message: trimmed, emoji, createdAt: new Date().toISOString(), seenAt: null })}
            disabled={!trimmed}
            className="btn btn-secondary"
          >
            <Eye size={16} />
            Preview
          </button>
          <button type="submit" disabled={!trimmed || sending} className={primaryButton}>
            {sending ? <Spinner size={16} /> : <Send size={16} />}
            {sending ? 'Sending…' : 'Send note'}
          </button>
        </div>
      </form>

      <section className="card p-5 sm:p-6" aria-labelledby="sent-notes-heading">
        <h2 id="sent-notes-heading" className="text-base font-semibold text-stone-900 dark:text-white">
          Sent notes
        </h2>
        <div className="mt-4">
          {!loaded ? (
            <div className="flex items-center justify-center gap-3 py-10 text-sm font-medium text-stone-500 dark:text-stone-400" role="status">
              <Spinner className="text-rose-500" />
              Loading notes…
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              <span>Couldn’t load your notes. {loadError}</span>
            </div>
          ) : notes.length === 0 ? (
            <EmptyState icon={MailOpen} title="No notes yet" description="Notes you send show up here, with a tick once they’ve been read." />
          ) : (
            <ul className="-my-3 divide-y divide-stone-100 dark:divide-stone-800">
              {notes.map((note) => (
                <li key={note.id} className="flex items-start gap-3 py-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-50 text-xl dark:bg-rose-500/10" aria-hidden="true">
                    {note.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="whitespace-pre-wrap break-words text-sm text-stone-800 dark:text-stone-100">{note.message}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone-500 dark:text-stone-400">
                      <span>{formatMoment(note.createdAt)}</span>
                      {note.seenAt ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-300">
                          <CheckCheck size={14} />
                          Seen {formatMoment(note.seenAt)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1">
                          <Check size={14} />
                          Not seen yet
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => askDelete(note)}
                    className="btn btn-ghost-danger btn-icon"
                    aria-label={note.seenAt ? 'Delete note' : 'Unsend note'}
                    title={note.seenAt ? 'Delete' : 'Unsend'}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {preview ? <NotificationModal notes={[preview]} onDismiss={closePreview} /> : null}
      <ConfirmDialog request={confirmRequest} onClose={closeConfirm} />
    </div>
  )
}
