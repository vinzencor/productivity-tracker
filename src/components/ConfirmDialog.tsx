import { TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'

import { errorMessage } from '../lib/errors'
import { Spinner } from './Loader'

export type ConfirmRequest = {
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => Promise<void> | void
}

type ConfirmDialogProps = {
  request: ConfirmRequest | null
  onClose: () => void
}

export function ConfirmDialog({ request, onClose }: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!request) return
    cancelRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [busy, onClose, request])

  if (!request) return null

  const handleConfirm = async () => {
    setBusy(true)
    try {
      await request.onConfirm()
      onClose()
    } catch (error) {
      console.error(error)
      toast.error(errorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm" onClick={() => !busy && onClose()} aria-hidden="true" />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-description"
        className="card relative w-full max-w-md p-5 shadow-xl sm:p-6"
      >
        <div className="flex gap-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <TriangleAlert size={18} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-base font-semibold text-stone-900 dark:text-white">
              {request.title}
            </h2>
            <p id="confirm-description" className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              {request.description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button ref={cancelRef} type="button" onClick={onClose} disabled={busy} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={() => void handleConfirm()} disabled={busy} className="btn btn-danger">
            {busy ? <Spinner size={16} /> : null}
            {request.confirmLabel ?? 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}
