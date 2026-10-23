import { RotateCcw, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'

import { celebrate } from '../celebrate'
import { pick, SWEET_NOTES } from '../messages'

const STORAGE_KEY = 'tulip-garden'
const SIDE = 4
const SLIDE_MS = 110
const UNDOS = 3
// Two of a kind merge into the next one. Stage 10 (the ring) is the classic 2048 tile.
const STAGES = [
  { emoji: '🌱', tile: 'bg-lime-100 dark:bg-lime-400/20' },
  { emoji: '🌿', tile: 'bg-green-100 dark:bg-green-400/20' },
  { emoji: '🍀', tile: 'bg-emerald-200 dark:bg-emerald-400/25' },
  { emoji: '🌼', tile: 'bg-yellow-100 dark:bg-yellow-400/20' },
  { emoji: '🌸', tile: 'bg-pink-100 dark:bg-pink-400/20' },
  { emoji: '🌷', tile: 'bg-rose-200 dark:bg-rose-400/30' },
  { emoji: '🌹', tile: 'bg-red-200 dark:bg-red-400/30' },
  { emoji: '💐', tile: 'bg-fuchsia-200 dark:bg-fuchsia-400/30' },
  { emoji: '🧸', tile: 'bg-amber-200 dark:bg-amber-400/30' },
  { emoji: '💝', tile: 'bg-pink-300 dark:bg-pink-400/40' },
  { emoji: '💍', tile: 'bg-sky-200 ring-2 ring-sky-300 dark:bg-sky-400/30' },
  { emoji: '👑', tile: 'bg-yellow-300 ring-2 ring-amber-400 dark:bg-yellow-400/40' },
  { emoji: '🏰', tile: 'bg-violet-200 ring-2 ring-violet-300 dark:bg-violet-400/30' },
  { emoji: '🌈', tile: 'bg-gradient-to-br from-pink-200 via-yellow-100 to-sky-200 ring-2 ring-pink-300 dark:from-pink-400/40 dark:via-yellow-300/30 dark:to-sky-400/40' },
  { emoji: '🪐', tile: 'bg-indigo-200 ring-2 ring-indigo-300 dark:bg-indigo-400/40' },
  { emoji: '✨', tile: 'bg-gradient-to-br from-amber-200 to-rose-300 ring-2 ring-amber-300 dark:from-amber-400/40 dark:to-rose-400/40' },
]
const RING = 10

type Direction = 'up' | 'down' | 'left' | 'right'
/** `gone` tiles have just merged away: they slide into place, then get cleaned up. */
type Tile = { id: number; stage: number; cell: number; fresh?: boolean; merged?: boolean; gone?: boolean }
type Garden = { tiles: Tile[]; score: number; best: number; undos: number; ringShown: boolean; previous: { tiles: Tile[]; score: number } | null }

let nextId = 0

const live = (tiles: Tile[]) => tiles.filter((tile) => !tile.gone)

function lineCells(direction: Direction, line: number) {
  return Array.from({ length: SIDE }, (_, k) => {
    const step = direction === 'left' || direction === 'up' ? k : SIDE - 1 - k
    return direction === 'left' || direction === 'right' ? line * SIDE + step : step * SIDE + line
  })
}

/** Slides every tile towards `direction`, merging equal neighbours once per move. */
function slide(tiles: Tile[], direction: Direction) {
  const byCell = new Map(live(tiles).map((tile) => [tile.cell, tile]))
  const next: Tile[] = []
  let gained = 0
  let moved = false
  for (let line = 0; line < SIDE; line++) {
    const cells = lineCells(direction, line)
    let target = 0
    let waiting: Tile | null = null
    for (const cell of cells) {
      const tile = byCell.get(cell)
      if (!tile) continue
      if (waiting && waiting.stage === tile.stage) {
        waiting.gone = true
        next.push({ id: tile.id, stage: tile.stage, cell: waiting.cell, gone: true })
        next.push({ id: nextId++, stage: tile.stage + 1, cell: waiting.cell, merged: true })
        gained += 2 ** (tile.stage + 2)
        moved = true
        waiting = null
      } else {
        const placed: Tile = { id: tile.id, stage: tile.stage, cell: cells[target++] }
        if (placed.cell !== cell) moved = true
        next.push(placed)
        waiting = placed
      }
    }
  }
  return { tiles: next, gained, moved }
}

function sprout(tiles: Tile[]): Tile[] {
  const taken = new Set(live(tiles).map((tile) => tile.cell))
  const free = Array.from({ length: SIDE * SIDE }, (_, cell) => cell).filter((cell) => !taken.has(cell))
  if (!free.length) return tiles
  return [...tiles, { id: nextId++, stage: Math.random() < 0.9 ? 0 : 1, cell: pick(free), fresh: true }]
}

function canMove(tiles: Tile[]) {
  const stages = new Map(live(tiles).map((tile) => [tile.cell, tile.stage]))
  if (stages.size < SIDE * SIDE) return true
  for (let cell = 0; cell < SIDE * SIDE; cell++) {
    if (cell % SIDE < SIDE - 1 && stages.get(cell) === stages.get(cell + 1)) return true
    if (cell + SIDE < SIDE * SIDE && stages.get(cell) === stages.get(cell + SIDE)) return true
  }
  return false
}

function freshGarden(best: number): Garden {
  return { tiles: sprout(sprout([])), score: 0, best, undos: UNDOS, ringShown: false, previous: null }
}

function loadGarden(): Garden {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    const tiles: Tile[] = (Array.isArray(saved?.tiles) ? saved.tiles : [])
      .filter((tile: Tile) => Number.isInteger(tile?.stage) && tile.stage >= 0 && Number.isInteger(tile.cell) && tile.cell >= 0 && tile.cell < SIDE * SIDE)
      .map((tile: Tile) => ({ id: nextId++, stage: tile.stage, cell: tile.cell }))
    if (tiles.length && typeof saved.score === 'number') {
      return { tiles, score: saved.score, best: saved.best ?? saved.score, undos: saved.undos ?? UNDOS, ringShown: !!saved.ringShown, previous: null }
    }
  } catch {
    // Unreadable or blocked storage just means planting a fresh garden.
  }
  return freshGarden(0)
}

export function TulipGarden() {
  const [garden, setGarden] = useState(loadGarden)
  const [confirmNew, setConfirmNew] = useState(false)
  const [note] = useState(() => pick(SWEET_NOTES))
  const swipeStart = useRef<{ x: number; y: number } | null>(null)

  const highest = Math.max(...garden.tiles.map((tile) => tile.stage))
  const showRing = highest >= RING && !garden.ringShown
  const over = !canMove(garden.tiles)

  useEffect(() => {
    try {
      const { tiles, score, best, undos, ringShown } = garden
      const saved = { tiles: live(tiles).map(({ stage, cell }) => ({ stage, cell })), score, best, undos, ringShown }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    } catch {
      // Storage can be unavailable (private mode); the garden still grows for this visit.
    }
  }, [garden])

  useEffect(() => {
    if (!garden.tiles.some((tile) => tile.gone)) return
    const timer = window.setTimeout(() => setGarden((current) => ({ ...current, tiles: live(current.tiles) })), SLIDE_MS + 20)
    return () => window.clearTimeout(timer)
  }, [garden.tiles])

  useEffect(() => {
    if (showRing) celebrate()
  }, [showRing])

  useEffect(() => {
    if (!confirmNew) return
    const timer = window.setTimeout(() => setConfirmNew(false), 3000)
    return () => window.clearTimeout(timer)
  }, [confirmNew])

  const move = useCallback((direction: Direction) => {
    setGarden((current) => {
      const { tiles, gained, moved } = slide(current.tiles, direction)
      if (!moved) return current
      const score = current.score + gained
      return {
        ...current,
        tiles: sprout(tiles),
        score,
        best: Math.max(current.best, score),
        previous: { tiles: live(current.tiles).map(({ id, stage, cell }) => ({ id, stage, cell })), score: current.score },
      }
    })
  }, [])

  useEffect(() => {
    const keys: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up',
      s: 'down',
      a: 'left',
      d: 'right',
    }
    const handleKey = (event: KeyboardEvent) => {
      const direction = keys[event.key]
      if (!direction) return
      event.preventDefault()
      move(direction)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [move])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current
    swipeStart.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'right' : 'left')
    else move(dy > 0 ? 'down' : 'up')
  }

  const undo = () =>
    setGarden((current) =>
      current.previous && current.undos > 0
        ? { ...current, tiles: current.previous.tiles, score: current.previous.score, previous: null, undos: current.undos - 1 }
        : current,
    )

  const startOver = () => {
    if (!confirmNew) {
      setConfirmNew(true)
      return
    }
    setConfirmNew(false)
    setGarden((current) => freshGarden(current.best))
  }

  const tiles = [...garden.tiles].sort((a, b) => a.id - b.id)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {[
            { label: 'Score', value: garden.score },
            { label: 'Best', value: garden.best },
          ].map((box) => (
            <div key={box.label} className="min-w-16 rounded-xl bg-emerald-50 px-3 py-1 text-center dark:bg-emerald-400/10">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">{box.label}</p>
              <p className="text-base font-extrabold text-stone-900 dark:text-white">{box.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={!garden.previous || garden.undos === 0}
            className="btn btn-secondary btn-sm"
            aria-label={`Undo, ${garden.undos} left`}
          >
            <Undo2 size={14} />
            {garden.undos}
          </button>
          <button type="button" onClick={startOver} className={`btn btn-sm ${confirmNew ? 'bg-rose-500 text-white hover:bg-rose-400' : 'btn-secondary'}`}>
            <RotateCcw size={14} />
            {confirmNew ? 'Sure?' : 'New'}
          </button>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-sm">
        <div
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
          className="aspect-square touch-none select-none rounded-2xl bg-gradient-to-br from-emerald-200 via-lime-100 to-amber-100 p-1.5 shadow-inner dark:from-emerald-950 dark:via-stone-900 dark:to-stone-900"
        >
          <div className="relative h-full w-full">
            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4" aria-hidden="true">
              {Array.from({ length: SIDE * SIDE }, (_, cell) => (
                <span key={cell} className="m-1 rounded-xl bg-white/45 dark:bg-white/[0.06]" />
              ))}
            </div>
            {tiles.map((tile) => {
              const stage = STAGES[Math.min(tile.stage, STAGES.length - 1)]
              return (
                <div
                  key={tile.id}
                  className={`pointer-events-none absolute left-0 top-0 h-1/4 w-1/4 p-1 transition-transform duration-[110ms] ease-out ${tile.gone ? 'z-0' : 'z-10'}`}
                  style={{ transform: `translate(${(tile.cell % SIDE) * 100}%, ${Math.floor(tile.cell / SIDE) * 100}%)` }}
                >
                  <div
                    className={`grid h-full w-full place-items-center rounded-xl shadow-sm ${stage.tile} ${
                      tile.fresh || tile.merged ? 'animate-pop-in [animation-delay:110ms]' : ''
                    }`}
                  >
                    <span className="text-[min(11vw,2.75rem)] leading-none">{stage.emoji}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {showRing || over ? (
          <div className="absolute inset-0 z-20 grid place-items-center rounded-2xl bg-white/70 p-6 text-center backdrop-blur-sm dark:bg-stone-950/70">
            {showRing ? (
              <div className="animate-fade-up space-y-3">
                <p className="text-5xl">💍</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-300">You grew a ring!</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">That’s the big one. But the garden goes on, and there’s more to discover ✨</p>
                <button
                  type="button"
                  onClick={() => setGarden((current) => ({ ...current, ringShown: true }))}
                  className="btn bg-rose-500 text-white shadow-sm hover:bg-rose-400"
                >
                  Keep growing 🌱
                </button>
              </div>
            ) : (
              <div className="animate-fade-up space-y-3">
                <p className="text-4xl">🌻</p>
                <p className="text-lg font-bold text-rose-600 dark:text-rose-300">Your garden is full!</p>
                <p className="text-sm text-stone-600 dark:text-stone-300">
                  You scored {garden.score.toLocaleString()}. {note}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {garden.previous && garden.undos > 0 ? (
                    <button type="button" onClick={undo} className="btn btn-secondary">
                      <Undo2 size={16} />
                      Undo ({garden.undos})
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setGarden((current) => freshGarden(current.best))}
                    className="btn bg-rose-500 text-white shadow-sm hover:bg-rose-400"
                  >
                    Plant a new garden 🌱
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1 text-lg" aria-label="What each pair grows into">
        {STAGES.map((stage, index) => (
          <span key={stage.emoji} className="flex items-center gap-1">
            {index > 0 ? <span className="text-xs text-stone-400">›</span> : null}
            <span className={index > highest + 1 ? 'opacity-60 grayscale' : ''}>{index > highest + 1 ? '❔' : stage.emoji}</span>
          </span>
        ))}
      </div>
      <p className="text-center text-sm text-stone-500 dark:text-stone-400">
        Swipe or use the arrow keys. Two of the same grow into the next one. Your garden saves itself, so come back any time 🌷
      </p>
    </div>
  )
}
