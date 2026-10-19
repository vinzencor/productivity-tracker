import confetti from 'canvas-confetti'
import { format } from 'date-fns'
import { Gamepad2, Heart, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { BirthdayCalendar } from './BirthdayCalendar'
import { BreathingCircle } from './BreathingCircle'
import { GameHub } from './games/GameHub'
import {
  CHECK_IN_QUESTIONS,
  HAPPY_REPLIES,
  MOOD_QUESTIONS,
  PET_NAMES,
  pick,
  SECRET_BIRTHDAY,
  shuffle,
  timeGreeting,
  WRONG_BIRTHDAY_REPLIES,
} from './messages'

type Step = 'birthday' | 'greeting' | 'checkIn' | 'mood' | 'happy' | 'whatHappened' | 'breathe' | 'love' | 'games'

type TulipSurpriseProps = {
  startUnlocked: boolean
  onUnlock: () => void
  onClose: () => void
}

const FLOATING_DECOR = [
  { emoji: '🌷', className: 'left-[6%] top-[12%]', delay: '0s' },
  { emoji: '💕', className: 'right-[8%] top-[18%]', delay: '0.8s' },
  { emoji: '🌸', className: 'left-[10%] bottom-[14%]', delay: '1.6s' },
  { emoji: '💖', className: 'right-[12%] bottom-[10%]', delay: '0.4s' },
  { emoji: '🌷', className: 'right-[30%] top-[6%]', delay: '1.2s' },
]

const primaryButton = 'btn bg-rose-500 text-white shadow-sm hover:bg-rose-400 focus-visible:ring-rose-400'
const choiceButton =
  'btn h-auto min-h-11 w-full whitespace-normal border border-rose-200 bg-white py-2.5 text-stone-800 shadow-sm hover:border-rose-300 hover:bg-rose-50 focus-visible:ring-rose-400 dark:border-rose-400/30 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700'

let confettiShapes: confetti.Shape[] | null = null

function celebrate() {
  try {
    confettiShapes ??= ['🌷', '💖', '💕'].map((text) => confetti.shapeFromText({ text, scalar: 2 }))
    confetti({ shapes: confettiShapes, scalar: 2, particleCount: 70, spread: 110, origin: { y: 0.65 }, disableForReducedMotion: true })
  } catch {
    // Emoji confetti needs canvas text support; the surprise works fine without it.
  }
}

function isSecretBirthday(date: Date) {
  return date.getFullYear() === SECRET_BIRTHDAY.year && date.getMonth() === SECRET_BIRTHDAY.month && date.getDate() === SECRET_BIRTHDAY.day
}

export function TulipSurprise({ startUnlocked, onUnlock, onClose }: TulipSurpriseProps) {
  const [step, setStep] = useState<Step>(startUnlocked ? 'greeting' : 'birthday')
  // A fresh order every time she opens it, so each screen calls her something different.
  const [names] = useState(() => shuffle(PET_NAMES))
  const [checkIns] = useState(() => shuffle(CHECK_IN_QUESTIONS).slice(0, 2))
  const [moodQuestion] = useState(() => pick(MOOD_QUESTIONS))
  const [happyReply] = useState(() => pick(HAPPY_REPLIES))

  const [birthday, setBirthday] = useState<Date | null>(null)
  const [wrongAttempts, setWrongAttempts] = useState(0)
  const [checkInIndex, setCheckInIndex] = useState(0)
  const [checkInReply, setCheckInReply] = useState<string | null>(null)
  const [feelings, setFeelings] = useState('')
  const [sharedFeelings, setSharedFeelings] = useState(false)
  const [breaths, setBreaths] = useState(0)
  const [tickerIndex, setTickerIndex] = useState(1)
  const dialogRef = useRef<HTMLDivElement>(null)

  const nameAt = (index: number) => names[index % names.length].name
  const sweetNameAt = (index: number) => `${nameAt(index)} ${names[index % names.length].emoji}`
  const greeting = timeGreeting()

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.scrollTo({ top: 0 })
    // Keep focus inside the dialog between steps, without stealing it from a button that auto-focused.
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus()
  }, [step])

  useEffect(() => {
    if (step !== 'greeting') return
    celebrate()
    const timer = window.setInterval(() => setTickerIndex((index) => (index % (names.length - 1)) + 1), 1600)
    return () => window.clearInterval(timer)
  }, [names.length, step])

  useEffect(() => {
    if (step === 'love') celebrate()
  }, [step])

  const handleBreath = useCallback((count: number) => setBreaths(count), [])

  const unlock = () => {
    if (!birthday) return
    if (isSecretBirthday(birthday)) {
      onUnlock()
      setStep('greeting')
    } else {
      setWrongAttempts((count) => count + 1)
    }
  }

  const answerCheckIn = (reply: string) => setCheckInReply(reply)

  const nextCheckIn = () => {
    setCheckInReply(null)
    if (checkInIndex + 1 < checkIns.length) {
      setCheckInIndex(checkInIndex + 1)
    } else {
      setStep('mood')
    }
  }

  const tellFeelings = (shared: boolean) => {
    setSharedFeelings(shared)
    // Whatever she types stays in this component only; it is never saved or sent anywhere.
    setFeelings('')
    setStep('breathe')
  }

  const checkIn = checkIns[checkInIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-gradient-to-br from-rose-200/70 via-pink-200/60 to-fuchsia-200/70 backdrop-blur-md dark:from-rose-950/80 dark:via-stone-950/80 dark:to-fuchsia-950/80"
        onClick={onClose}
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
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="A little surprise for you"
        tabIndex={-1}
        className={`relative max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl border border-rose-100 bg-white p-5 shadow-2xl outline-none sm:rounded-3xl sm:p-7 dark:border-rose-400/20 dark:bg-stone-900 ${
          step === 'games' ? 'sm:max-w-2xl' : 'sm:max-w-md'
        }`}
      >
        <button type="button" onClick={onClose} className="btn btn-ghost btn-icon absolute right-3 top-3" aria-label="Close">
          <X size={18} />
        </button>

        {step === 'birthday' ? (
          <div className="animate-fade-up space-y-4">
            <div className="pr-8 text-center sm:pr-0">
              <p className="text-4xl">🌷</p>
              <h2 className="mt-2 text-xl font-extrabold text-stone-900 dark:text-white">Hey, who’s there? 👀</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                This tulip opens for one special person only. Pick your birthday on the calendar to prove it’s you 💕
              </p>
            </div>

            <BirthdayCalendar value={birthday} onChange={setBirthday} />

            <p className="text-center text-sm font-semibold text-stone-700 dark:text-stone-200">
              {birthday ? `🎂 ${format(birthday, 'd MMMM yyyy')}` : 'No date picked yet'}
            </p>

            {wrongAttempts > 0 ? (
              <p key={wrongAttempts} className="animate-fade-up text-center text-sm font-semibold text-rose-600 dark:text-rose-300" role="alert">
                {WRONG_BIRTHDAY_REPLIES[(wrongAttempts - 1) % WRONG_BIRTHDAY_REPLIES.length]}
              </p>
            ) : null}

            <button type="button" onClick={unlock} disabled={!birthday} className={`${primaryButton} w-full`}>
              <Heart size={16} />
              Unlock my surprise
            </button>
          </div>
        ) : null}

        {step === 'greeting' ? (
          <div className="animate-fade-up space-y-5 py-2 text-center">
            <p className="text-5xl motion-safe:animate-float-drift">{greeting.emoji}</p>
            <div>
              <p className="text-2xl font-extrabold text-stone-900 sm:text-3xl dark:text-white">{greeting.text}</p>
              {/* The emoji sits outside the gradient text, which would otherwise paint it as a flat blob. */}
              <p className="mt-1 text-3xl font-extrabold sm:text-4xl">
                <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-transparent">{nameAt(0)}</span>{' '}
                {names[0].emoji}
              </p>
            </div>
            <p className="h-6 text-sm text-stone-500 dark:text-stone-400">
              …or should I say{' '}
              <span key={tickerIndex} className="inline-block animate-fade-up font-bold text-rose-600 dark:text-rose-300">
                {sweetNameAt(tickerIndex)}
              </span>
            </p>
            <button type="button" onClick={() => setStep('checkIn')} className={primaryButton} autoFocus>
              Hiii 🥰
            </button>
          </div>
        ) : null}

        {step === 'checkIn' && checkIn ? (
          <div key={checkInIndex} className="animate-fade-up space-y-5 py-2 text-center">
            <div>
              <p className="text-sm font-semibold text-rose-500 dark:text-rose-300">Hey {nameAt(checkInIndex + 1)},</p>
              <h2 className="mt-1 text-xl font-extrabold text-stone-900 dark:text-white">{checkIn.question}</h2>
            </div>
            {checkInReply ? (
              <div className="space-y-4">
                <p className="animate-pop-in rounded-2xl bg-rose-50 px-4 py-3 text-base font-semibold text-rose-700 dark:bg-rose-400/10 dark:text-rose-200">
                  {checkInReply}
                </p>
                <button type="button" onClick={nextCheckIn} className={primaryButton} autoFocus>
                  Next 💌
                </button>
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {checkIn.answers.map((answer) => (
                  <button key={answer.label} type="button" onClick={() => answerCheckIn(answer.reply)} className={choiceButton}>
                    {answer.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {step === 'mood' ? (
          <div className="animate-fade-up space-y-5 py-2 text-center">
            <p className="text-4xl">🥺</p>
            <div>
              <p className="text-sm font-semibold text-rose-500 dark:text-rose-300">Okay {nameAt(3)},</p>
              <h2 className="mt-1 text-xl font-extrabold text-stone-900 dark:text-white">{moodQuestion}</h2>
            </div>
            <div className="grid gap-2">
              <button type="button" onClick={() => setStep('happy')} className={choiceButton}>
                Super happy 🥰
              </button>
              <button type="button" onClick={() => setStep('happy')} className={choiceButton}>
                I’m good 😊
              </button>
              <button type="button" onClick={() => setStep('whatHappened')} className={choiceButton}>
                Not fine 😔
              </button>
            </div>
          </div>
        ) : null}

        {step === 'happy' ? (
          <div className="animate-fade-up space-y-5 py-2 text-center">
            <p className="text-5xl motion-safe:animate-float-drift">🥰</p>
            <p className="text-lg font-bold text-stone-900 dark:text-white">{happyReply}</p>
            <button type="button" onClick={() => setStep('games')} className={primaryButton} autoFocus>
              <Gamepad2 size={16} />
              Let’s play!
            </button>
          </div>
        ) : null}

        {step === 'whatHappened' ? (
          <div className="animate-fade-up space-y-4 py-2">
            <div className="text-center">
              <p className="text-4xl">🫂</p>
              <h2 className="mt-2 text-xl font-extrabold text-stone-900 dark:text-white">Aww, what happened, {nameAt(4)}? 🥺</h2>
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                You can tell me anything. It stays right here, nothing gets saved anywhere.
              </p>
            </div>
            <textarea
              value={feelings}
              onChange={(event) => setFeelings(event.target.value)}
              rows={4}
              placeholder="Let it all out…"
              className="field h-auto resize-none py-2.5 focus:border-rose-400 focus:ring-rose-400/30"
              autoFocus
            />
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button type="button" onClick={() => tellFeelings(true)} disabled={!feelings.trim()} className={`${primaryButton} sm:flex-1`}>
                Tell you 💌
              </button>
              <button type="button" onClick={() => tellFeelings(false)} className="btn btn-secondary sm:flex-1">
                I don’t want to talk
              </button>
            </div>
          </div>
        ) : null}

        {step === 'breathe' ? (
          <div className="animate-fade-up space-y-3 py-2 text-center">
            <p className="text-sm font-semibold text-rose-500 dark:text-rose-300">
              {sharedFeelings ? 'Thank you for telling me 💕' : 'That’s okay, you don’t have to say anything 💕'}
            </p>
            <h2 className="text-xl font-extrabold text-stone-900 dark:text-white">It’s okay, {nameAt(5)}. Take a deep breath with me 🌬️</h2>
            <BreathingCircle onCycle={handleBreath} />
            {breaths > 0 ? (
              <div className="animate-fade-up space-y-2">
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {breaths} {breaths === 1 ? 'breath' : 'breaths'} done. Take as many as you need.
                </p>
                <button type="button" onClick={() => setStep('love')} className={primaryButton}>
                  I feel a little better 💗
                </button>
              </div>
            ) : (
              <p className="text-xs text-stone-500 dark:text-stone-400">Follow the circle. In through the nose, out through the mouth.</p>
            )}
          </div>
        ) : null}

        {step === 'love' ? (
          <div className="animate-fade-up space-y-4 py-4 text-center">
            <p className="animate-pop-in text-6xl">💖</p>
            <p className="bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500 bg-clip-text text-4xl font-extrabold text-transparent">
              I love you
            </p>
            <p className="text-base text-stone-600 dark:text-stone-300">
              So so so much, {nameAt(6)}. Whatever it is, we’ll get through it together. You’re never alone 🫶
            </p>
            <button type="button" onClick={() => setStep('games')} className={primaryButton} autoFocus>
              <Gamepad2 size={16} />
              Now let me make you smile
            </button>
          </div>
        ) : null}

        {step === 'games' ? <GameHub name={sweetNameAt(0)} /> : null}
      </div>
    </div>
  )
}
