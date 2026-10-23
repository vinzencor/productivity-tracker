import { LayoutGrid, Play, RotateCcw, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'

import { celebrate } from '../celebrate'
import { pick, SWEET_NOTES } from '../messages'
import {
  areAdjacent,
  colOf,
  createBoard,
  findHint,
  goalDone,
  KINDS,
  levelConfig,
  playMove,
  RAINBOW,
  rowOf,
  shuffleBoard,
  SIZE,
  tallyClear,
} from './sweetCrushEngine'
import type { Board, Goal, Level, Piece, Tally } from './sweetCrushEngine'

const STORAGE_KEY = 'tulip-sweet-crush'
// Waits line up with the tile transition and `animate-tile-drop` durations.
const MOVE_MS = 240
const CLEAR_MS = 200
const HINT_AFTER_MS = 6000
const EXTRA_MOVES = 5
const PRAISE = ['Sweet! 🍬', 'Lovely! 🌷', 'Gorgeous! 😍', 'Delicious! 🍫', 'Unstoppable! 💖', 'Queen! 👑']

type Progress = { unlocked: number; stars: (number | null)[] }
type Phase = 'map' | 'playing' | 'won' | 'lost'
type Game = Tally & { board: Board; movesLeft: number }

const sleep = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms))

function readProgress(): Progress {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    if (Number.isInteger(saved?.unlocked) && Array.isArray(saved?.stars)) return saved
  } catch {
    // Unreadable or blocked storage just means starting again from level 1.
  }
  return { unlocked: 1, stars: [] }
}

function starsFor(level: Level, movesLeft: number) {
  const spare = movesLeft / level.moves
  return spare >= 0.3 ? 3 : spare >= 0.12 ? 2 : 1
}

function goalSummary(goal: Goal) {
  switch (goal.type) {
    case 'score':
      return `score ${goal.target.toLocaleString()}`
    case 'collect':
      return `collect ${goal.count} ${KINDS[goal.kind]}`
    case 'ice':
      return 'melt all the ice ❄️'
  }
}

function GoalChip({ goal, game }: { goal: Goal; game: Game }) {
  const done = goalDone(goal, game)
  let label: string
  switch (goal.type) {
    case 'score':
      label = `🎯 ${game.score.toLocaleString()} / ${goal.target.toLocaleString()}`
      break
    case 'collect':
      label = `${KINDS[goal.kind]} ${Math.min(game.collected[goal.kind], goal.count)} / ${goal.count}`
      break
    case 'ice':
      label = `❄️ ${game.ice.filter(Boolean).length} left`
      break
  }
  return (
    <span
      className={`badge px-3 py-1 text-sm ${
        done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200'
      }`}
    >
      {label}
      {done ? ' ✓' : ''}
    </span>
  )
}

type PieceTileProps = { piece: Piece; cell: number; clearing: boolean; selected: boolean; hinted: boolean }

function PieceTile({ piece, cell, clearing, selected, hinted }: PieceTileProps) {
  return (
    <div
      className="pointer-events-none absolute left-0 top-0 h-[12.5%] w-[12.5%] transition-transform duration-[240ms] ease-in"
      style={{ transform: `translate(${colOf(cell) * 100}%, ${rowOf(cell) * 100}%)` }}
    >
      <div
        className={`h-full w-full ${piece.special && piece.drop === 0 ? 'animate-pop-in' : 'animate-tile-drop'}`}
        style={{ '--drop': piece.drop } as CSSProperties}
      >
        <div
          className={`relative grid h-full w-full place-items-center transition duration-200 ${clearing ? 'scale-0 opacity-0' : selected ? 'scale-110' : ''} ${
            hinted ? 'animate-hint-wiggle' : ''
          }`}
        >
          {piece.special === 'row' ? (
            <span className="absolute inset-x-0.5 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-amber-300 via-white to-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          ) : null}
          {piece.special === 'col' ? (
            <span className="absolute inset-y-0.5 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-amber-300 via-white to-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]" />
          ) : null}
          {piece.special === 'bomb' ? (
            <span className="absolute inset-[10%] rounded-full bg-amber-300/60 ring-2 ring-amber-400 motion-safe:animate-pulse dark:bg-amber-400/30" />
          ) : null}
          {piece.special === 'rainbow' ? (
            <span className="absolute inset-[8%] rounded-full bg-gradient-to-br from-pink-300 via-yellow-200 to-sky-300 shadow-md motion-safe:animate-pulse" />
          ) : null}
          <span className="relative text-[min(6.8vw,1.9rem)] leading-none drop-shadow-sm">{piece.kind === RAINBOW ? '🌈' : KINDS[piece.kind]}</span>
        </div>
      </div>
    </div>
  )
}

function cellLabel(piece: Piece | null) {
  if (!piece) return 'Empty'
  if (piece.special === 'rainbow') return 'Rainbow'
  const extra = piece.special === 'bomb' ? ' bomb' : piece.special ? ' line blaster' : ''
  return `${KINDS[piece.kind]}${extra}`
}

export function SweetCrush() {
  const [progress, setProgress] = useState(readProgress)
  const [phase, setPhase] = useState<Phase>('map')
  const [level, setLevel] = useState<Level>(() => levelConfig(1))
  const [game, setGame] = useState<Game | null>(null)
  const [clearing, setClearing] = useState<Set<number>>(() => new Set())
  const [selected, setSelected] = useState<number | null>(null)
  const [hint, setHint] = useState<[number, number] | null>(null)
  const [busy, setBusy] = useState(false)
  const [praise, setPraise] = useState<{ id: number; text: string } | null>(null)
  const [result, setResult] = useState({ stars: 0, note: '' })
  const [rescued, setRescued] = useState(false)
  const gameRef = useRef<Game | null>(null)
  const busyRef = useRef(false)
  // Bumped whenever a level starts or is left, so an animation still in flight knows to stop.
  const runRef = useRef(0)
  const praiseId = useRef(0)
  const dragRef = useRef<{ cell: number; x: number; y: number } | null>(null)
  const boardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    } catch {
      // Storage can be unavailable (private mode); progress still lasts for this visit.
    }
  }, [progress])

  useEffect(
    () => () => {
      runRef.current++
    },
    [],
  )

  useEffect(() => {
    if (phase !== 'playing' || busy || !game) return
    const timer = window.setTimeout(() => setHint(findHint(game.board)), HINT_AFTER_MS)
    return () => window.clearTimeout(timer)
  }, [phase, busy, game])

  const commit = (next: Game) => {
    gameRef.current = next
    setGame(next)
  }

  const markBusy = (value: boolean) => {
    busyRef.current = value
    setBusy(value)
  }

  const showPraise = (text: string) => setPraise({ id: ++praiseId.current, text })

  const startLevel = (number: number) => {
    runRef.current++
    const config = levelConfig(number)
    setLevel(config)
    commit({ board: createBoard(config.kinds), score: 0, collected: KINDS.map(() => 0), ice: config.ice.slice(), movesLeft: config.moves })
    setClearing(new Set())
    setSelected(null)
    setHint(null)
    setRescued(false)
    markBusy(false)
    showPraise(`Level ${number}: ${config.goals.map(goalSummary).join(' + ')}`)
    setPhase('playing')
  }

  const leave = () => {
    runRef.current++
    markBusy(false)
    setPhase('map')
  }

  /** Ends the level if it's won or out of moves; returns whether it ended. */
  const finish = (config: Level, final: Game) => {
    if (config.goals.every((goal) => goalDone(goal, final))) {
      const stars = starsFor(config, final.movesLeft)
      setProgress((current) => {
        const nextStars = current.stars.slice()
        nextStars[config.number - 1] = Math.max(nextStars[config.number - 1] ?? 0, stars)
        return { unlocked: Math.max(current.unlocked, config.number + 1), stars: nextStars }
      })
      setResult({ stars, note: pick(SWEET_NOTES) })
      setPhase('won')
      celebrate()
      return true
    }
    if (final.movesLeft <= 0) {
      setPhase('lost')
      return true
    }
    return false
  }

  const attemptSwap = async (a: number, b: number) => {
    const start = gameRef.current
    if (!start || busyRef.current || phase !== 'playing') return
    const run = runRef.current
    const config = level
    markBusy(true)
    setSelected(null)
    setHint(null)

    let current = start
    const steps = playMove(start.board, a, b, config.kinds)
    for (let step = steps.next(); !step.done; step = steps.next()) {
      const { value } = step
      if (value.type === 'clear') {
        current = {
          ...current,
          ...tallyClear(current, current.board, value.cells, value.cascade),
          movesLeft: value.cascade === 1 ? current.movesLeft - 1 : current.movesLeft,
        }
        commit(current)
        setClearing(value.cells)
        // Bigger cascades and blasts earn bigger praise.
        const cheer = value.cascade - 1 + Math.floor(value.cells.size / 8)
        if (cheer > 0) showPraise(PRAISE[Math.min(cheer, PRAISE.length) - 1])
        await sleep(CLEAR_MS)
      } else {
        current = { ...current, board: value.board }
        commit(current)
        setClearing(new Set())
        await sleep(MOVE_MS)
      }
      if (run !== runRef.current) return
    }

    if (!finish(config, current) && !findHint(current.board)) {
      showPraise('No moves left, shuffling! 🔀')
      await sleep(700)
      if (run !== runRef.current) return
      commit({ ...current, board: shuffleBoard(current.board, config.kinds) })
      await sleep(MOVE_MS)
      if (run !== runRef.current) return
    }
    markBusy(false)
  }

  const addMoves = () => {
    const current = gameRef.current
    if (!current) return
    const board = findHint(current.board) ? current.board : shuffleBoard(current.board, level.kinds)
    commit({ ...current, board, movesLeft: current.movesLeft + EXTRA_MOVES })
    setRescued(true)
    markBusy(false)
    setPhase('playing')
  }

  const tap = (cell: number) => {
    if (busyRef.current || phase !== 'playing') return
    if (selected !== null && selected !== cell && areAdjacent(selected, cell)) void attemptSwap(selected, cell)
    else setSelected(selected === cell ? null : cell)
  }

  const cellFromPoint = (x: number, y: number) => {
    const rect = boardRef.current?.getBoundingClientRect()
    if (!rect) return null
    const col = Math.floor(((x - rect.left) / rect.width) * SIZE)
    const row = Math.floor(((y - rect.top) / rect.height) * SIZE)
    return row >= 0 && row < SIZE && col >= 0 && col < SIZE ? row * SIZE + col : null
  }

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const cell = cellFromPoint(event.clientX, event.clientY)
    if (cell === null) return
    dragRef.current = { cell, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  // A drag of a little under half a tile swaps towards it; anything shorter counts as a tap.
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    const width = boardRef.current?.clientWidth
    if (!drag || !width) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < (width / SIZE) * 0.4) return
    dragRef.current = null
    const vertical = Math.abs(dy) > Math.abs(dx)
    const row = rowOf(drag.cell) + (vertical ? Math.sign(dy) : 0)
    const col = colOf(drag.cell) + (vertical ? 0 : Math.sign(dx))
    if (row >= 0 && row < SIZE && col >= 0 && col < SIZE) void attemptSwap(drag.cell, row * SIZE + col)
  }

  const handlePointerUp = () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag) tap(drag.cell)
  }

  const handleCellKey = (event: KeyboardEvent<HTMLButtonElement>, cell: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      tap(cell)
      return
    }
    const moves: Record<string, [number, number]> = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }
    const offset = moves[event.key]
    if (!offset) return
    event.preventDefault()
    const row = rowOf(cell) + offset[0]
    const col = colOf(cell) + offset[1]
    if (row < 0 || row >= SIZE || col < 0 || col >= SIZE) return
    const next = event.currentTarget.parentElement?.children[row * SIZE + col]
    if (next instanceof HTMLElement) next.focus()
  }

  if (phase === 'map' || !game) {
    const totalStars = progress.stars.reduce<number>((sum, stars) => sum + (stars ?? 0), 0)
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-gradient-to-br from-rose-100 via-pink-50 to-amber-50 p-5 text-center dark:from-rose-950/60 dark:via-stone-900 dark:to-stone-900">
          <p className="text-4xl">🍬🌷🍫</p>
          <p className="mt-2 text-lg font-extrabold text-stone-900 dark:text-white">Level {progress.unlocked} is waiting for you</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            ⭐ {totalStars} {totalStars === 1 ? 'star' : 'stars'} collected · your progress saves itself
          </p>
          <button type="button" onClick={() => startLevel(progress.unlocked)} className="btn mt-4 bg-rose-500 text-white shadow-sm hover:bg-rose-400">
            <Play size={16} />
            Play level {progress.unlocked}
          </button>
        </div>

        {progress.unlocked > 1 ? (
          <div>
            <p className="mb-2 text-sm font-semibold text-stone-600 dark:text-stone-300">Replay any level to earn more stars</p>
            <div className="grid max-h-52 grid-cols-5 gap-2 overflow-y-auto p-0.5 sm:grid-cols-8">
              {Array.from({ length: progress.unlocked }, (_, index) => {
                const number = index + 1
                const stars = progress.stars[index] ?? 0
                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => startLevel(number)}
                    aria-label={`Level ${number}, ${stars} of 3 stars`}
                    className="flex flex-col items-center gap-0.5 rounded-xl border border-rose-100 bg-white py-1.5 text-sm font-bold text-stone-800 shadow-sm transition hover:border-rose-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-400/20 dark:bg-stone-800 dark:text-stone-100"
                  >
                    {number}
                    <span className="text-[10px] leading-none tracking-tight text-amber-500">
                      {'★'.repeat(stars)}
                      <span className="text-stone-300 dark:text-stone-600">{'★'.repeat(3 - stars)}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-rose-100 p-4 text-sm text-stone-600 dark:border-rose-400/20 dark:text-stone-300">
          <p className="font-semibold text-stone-800 dark:text-stone-100">How to play</p>
          <ul className="mt-2 space-y-1">
            <li>👆 Swipe a sweet, or tap two neighbours, to swap them and line up 3 or more.</li>
            <li>↔️ Match 4 to make a line blaster that clears a whole row or column.</li>
            <li>💥 Match in an L or T shape to make a bomb.</li>
            <li>🌈 Match 5 to make a rainbow that clears every sweet of one kind.</li>
            <li>✨ Swap two specials into each other for a mega combo!</li>
          </ul>
        </div>
      </div>
    )
  }

  const pieces = game.board
    .flatMap((piece, cell) => (piece ? [{ piece, cell }] : []))
    // Stable DOM order (by id) so moving tiles never get re-inserted, which would replay their drop animation.
    .sort((x, y) => x.piece.id - y.piece.id)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={leave} className="btn btn-secondary btn-sm">
          <LayoutGrid size={14} />
          Levels
        </button>
        <div className="text-center leading-tight">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">Level {level.number}</p>
          <p className={`text-lg font-extrabold ${game.movesLeft <= 3 ? 'text-red-500 motion-safe:animate-pulse' : 'text-rose-600 dark:text-rose-300'}`}>
            {game.movesLeft} <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">{game.movesLeft === 1 ? 'move' : 'moves'}</span>
          </p>
        </div>
        <button type="button" onClick={() => startLevel(level.number)} className="btn btn-secondary btn-sm">
          <RotateCcw size={14} />
          Restart
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {level.goals.map((goal, index) => (
          <GoalChip key={index} goal={goal} game={game} />
        ))}
        {level.goals.every((goal) => goal.type !== 'score') ? (
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">Score {game.score.toLocaleString()}</span>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-md">
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => (dragRef.current = null)}
          className="aspect-square touch-none select-none overflow-hidden rounded-2xl bg-gradient-to-br from-rose-200/70 via-pink-100 to-amber-100 p-1 shadow-inner dark:from-rose-950/70 dark:via-stone-900 dark:to-stone-900"
        >
          <div ref={boardRef} className="relative h-full w-full">
            <div className="absolute inset-0 grid grid-cols-8 grid-rows-8">
              {game.board.map((piece, cell) => (
                <button
                  key={cell}
                  type="button"
                  tabIndex={cell === (selected ?? 0) ? 0 : -1}
                  onKeyDown={(event) => handleCellKey(event, cell)}
                  aria-label={`${cellLabel(piece)}${game.ice[cell] ? ' on ice' : ''}${selected === cell ? ', selected' : ''}`}
                  className={`m-px rounded-md transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                    selected === cell
                      ? 'bg-rose-300/80 dark:bg-rose-400/40'
                      : game.ice[cell]
                        ? 'bg-gradient-to-br from-sky-100 to-sky-300 ring-1 ring-inset ring-sky-300 dark:from-sky-300/30 dark:to-sky-500/30 dark:ring-sky-300/40'
                        : (rowOf(cell) + colOf(cell)) % 2
                          ? 'bg-white/45 dark:bg-white/[0.04]'
                          : 'bg-white/75 dark:bg-white/[0.08]'
                  }`}
                />
              ))}
            </div>
            {pieces.map(({ piece, cell }) => (
              <PieceTile
                key={piece.id}
                piece={piece}
                cell={cell}
                clearing={clearing.has(cell)}
                selected={selected === cell}
                hinted={hint?.includes(cell) ?? false}
              />
            ))}
          </div>
        </div>

        {praise ? (
          <div key={praise.id} className="pointer-events-none absolute inset-x-0 top-1/3 z-10 flex justify-center px-4">
            <span className="animate-praise rounded-2xl bg-white/90 px-4 py-2 text-center text-lg font-extrabold text-rose-600 shadow-lg dark:bg-stone-900/90 dark:text-rose-300">
              {praise.text}
            </span>
          </div>
        ) : null}

        {phase === 'won' || phase === 'lost' ? (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-white/70 p-6 text-center backdrop-blur-sm dark:bg-stone-950/70">
            {phase === 'won' ? (
              <div className="animate-fade-up space-y-3">
                <div className="flex justify-center gap-1" aria-label={`${result.stars} of 3 stars`}>
                  {[1, 2, 3].map((star) => (
                    <Star
                      key={star}
                      size={40}
                      className={`animate-pop-in ${star <= result.stars ? 'fill-amber-400 text-amber-400' : 'text-stone-300 dark:text-stone-600'}`}
                      style={{ animationDelay: `${star * 150}ms` }}
                    />
                  ))}
                </div>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-300">Level {level.number} complete!</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">{result.note}</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <button type="button" onClick={() => startLevel(level.number + 1)} className="btn bg-rose-500 text-white shadow-sm hover:bg-rose-400">
                    <Play size={16} />
                    Next level
                  </button>
                  <button type="button" onClick={() => startLevel(level.number)} className="btn btn-secondary">
                    <RotateCcw size={16} />
                    Replay
                  </button>
                </div>
              </div>
            ) : (
              <div className="animate-fade-up space-y-3">
                <p className="text-4xl">🥺</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-300">Out of moves</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  {rescued ? 'So close! You’ll get it next time, I believe in you 💪' : 'So close! Here, have 5 more moves, on me 💕'}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {rescued ? null : (
                    <button type="button" onClick={addMoves} className="btn bg-rose-500 text-white shadow-sm hover:bg-rose-400">
                      +{EXTRA_MOVES} moves
                    </button>
                  )}
                  <button type="button" onClick={() => startLevel(level.number)} className={rescued ? 'btn bg-rose-500 text-white shadow-sm hover:bg-rose-400' : 'btn btn-secondary'}>
                    <RotateCcw size={16} />
                    Try again
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
