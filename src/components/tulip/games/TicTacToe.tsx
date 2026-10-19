import { RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'

import { pick } from '../messages'

const HER = '🌷'
const ME = '💖'
const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

const HER_WIN = [
  'You beat me! Okay okay, you win… you always win my heart anyway 😘',
  'Champion! 🏆 I let you win… just kidding, you’re too good 😜',
  'Victory for the queen 👑 I bow to you, kuttakalla.',
]
const MY_WIN = [
  'Hehe, I won! Prize: you owe me one tight hug 🤗',
  'My point! Penalty: 10 kisses, payable today 😘',
]
const DRAW = ['A tie! Guess we’re just perfect for each other 💞', 'Draw! Same brain, same heart 🧠💕']

type Cell = typeof HER | typeof ME | null

function winnerOf(board: Cell[]) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return board.every(Boolean) ? 'draw' : null
}

// Plays properly about half the time, so she wins often without it feeling rigged.
function chooseMove(board: Cell[]) {
  const empty = board.flatMap((cell, index) => (cell ? [] : [index]))
  if (Math.random() < 0.5) return pick(empty)

  const completing = (mark: Cell) =>
    empty.find((index) => {
      const next = [...board]
      next[index] = mark
      return winnerOf(next) === mark
    })

  return completing(ME) ?? completing(HER) ?? (board[4] ? undefined : 4) ?? pick(empty)
}

export function TicTacToe() {
  const [board, setBoard] = useState<Cell[]>(() => Array(9).fill(null))
  const [herTurn, setHerTurn] = useState(true)
  const [tally, setTally] = useState({ her: 0, me: 0, draw: 0 })
  const [message, setMessage] = useState('You’re 🌷, I’m 💖. Your move, cutie!')

  const result = winnerOf(board)

  const finishRound = (outcome: NonNullable<ReturnType<typeof winnerOf>>) => {
    if (outcome === HER) {
      setTally((current) => ({ ...current, her: current.her + 1 }))
      setMessage(pick(HER_WIN))
    } else if (outcome === ME) {
      setTally((current) => ({ ...current, me: current.me + 1 }))
      setMessage(pick(MY_WIN))
    } else {
      setTally((current) => ({ ...current, draw: current.draw + 1 }))
      setMessage(pick(DRAW))
    }
  }

  useEffect(() => {
    if (herTurn || winnerOf(board)) return
    const timer = window.setTimeout(() => {
      const next = [...board]
      next[chooseMove(board)] = ME
      setBoard(next)
      setHerTurn(true)
      const outcome = winnerOf(next)
      if (outcome) finishRound(outcome)
      else setMessage('Your turn, cutie 🌷')
    }, 550)
    return () => window.clearTimeout(timer)
  }, [board, herTurn])

  const play = (index: number) => {
    if (!herTurn || result || board[index]) return
    const next = [...board]
    next[index] = HER
    setBoard(next)
    setHerTurn(false)
    const outcome = winnerOf(next)
    if (outcome) finishRound(outcome)
    else setMessage('Hmm, let me think… 🤔')
  }

  const reset = () => {
    setBoard(Array(9).fill(null))
    setHerTurn(true)
    setMessage('New round! Your move first, always 🌷')
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold text-stone-500 dark:text-stone-400">
        <div className="rounded-xl bg-rose-50 py-2 dark:bg-rose-400/10">
          <p className="text-lg font-bold text-rose-600 dark:text-rose-300">{tally.her}</p>
          You {HER}
        </div>
        <div className="rounded-xl bg-stone-100 py-2 dark:bg-stone-800">
          <p className="text-lg font-bold text-stone-700 dark:text-stone-200">{tally.draw}</p>
          Ties 💞
        </div>
        <div className="rounded-xl bg-pink-50 py-2 dark:bg-pink-400/10">
          <p className="text-lg font-bold text-pink-600 dark:text-pink-300">{tally.me}</p>
          Me {ME}
        </div>
      </div>

      <div className="mx-auto grid max-w-[18rem] grid-cols-3 gap-2">
        {board.map((cell, index) => (
          <button
            key={index}
            type="button"
            onClick={() => play(index)}
            disabled={Boolean(cell) || Boolean(result) || !herTurn}
            aria-label={cell ? `Square ${index + 1}: ${cell === HER ? 'yours' : 'mine'}` : `Square ${index + 1}: empty`}
            className="grid aspect-square place-items-center rounded-2xl border border-rose-100 bg-white text-4xl shadow-sm transition-colors enabled:hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-default dark:border-rose-400/20 dark:bg-stone-800 dark:enabled:hover:bg-stone-700"
          >
            {cell ? (
              <span key={`${index}-${cell}`} className="animate-pop-in">
                {cell}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      <p key={message} className="animate-fade-up text-center text-sm font-semibold text-rose-600 dark:text-rose-300" aria-live="polite">
        {message}
      </p>

      <div className="flex justify-center">
        <button type="button" onClick={reset} className="btn btn-secondary btn-sm">
          <RotateCcw size={14} />
          {result ? 'Play again' : 'Restart'}
        </button>
      </div>
    </div>
  )
}
