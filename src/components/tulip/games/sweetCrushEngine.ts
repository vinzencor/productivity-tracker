// Match-3 rules for Sweet Crush. Everything here is a pure function over a flat
// 8×8 board, so the component only has to animate the steps `playMove` yields.

export const SIZE = 8
export const CELLS = SIZE * SIZE
export const KINDS = ['🌷', '💖', '🍫', '🧸', '🍓', '🦋']
export const RAINBOW = -1

export type Special = 'row' | 'col' | 'bomb' | 'rainbow'
/** `drop` is how many rows a new piece falls in from above the board. */
export type Piece = { id: number; kind: number; special?: Special; drop: number }
export type Board = (Piece | null)[]

export type Step =
  | { type: 'swap' | 'transform' | 'fall'; board: Board }
  | { type: 'clear'; cells: Set<number>; cascade: number }

export type Goal = { type: 'score'; target: number } | { type: 'collect'; kind: number; count: number } | { type: 'ice' }
export type Level = { number: number; kinds: number; moves: number; goals: Goal[]; ice: boolean[] }

type Run = { cells: number[]; horizontal: boolean }
type Match = { cells: Set<number>; created: Map<number, Piece> }

let nextId = 0

function newPiece(kind: number, drop: number, special?: Special): Piece {
  return { id: nextId++, kind, special, drop }
}

export const rowOf = (cell: number) => Math.floor(cell / SIZE)
export const colOf = (cell: number) => cell % SIZE
const at = (row: number, col: number) => row * SIZE + col
const inside = (row: number, col: number) => row >= 0 && row < SIZE && col >= 0 && col < SIZE

export function areAdjacent(a: number, b: number) {
  return Math.abs(rowOf(a) - rowOf(b)) + Math.abs(colOf(a) - colOf(b)) === 1
}

function randomKind(kinds: number) {
  return Math.floor(Math.random() * kinds)
}

function kindAt(board: Board, cell: number) {
  return board[cell]?.kind ?? RAINBOW
}

function lineCells(index: number, horizontal: boolean) {
  return Array.from({ length: SIZE }, (_, k) => (horizontal ? at(index, k) : at(k, index)))
}

function square(row: number, col: number, radius: number) {
  const cells: number[] = []
  for (let r = row - radius; r <= row + radius; r++) {
    for (let c = col - radius; c <= col + radius; c++) {
      if (inside(r, c)) cells.push(at(r, c))
    }
  }
  return cells
}

function cellsOfKind(board: Board, kind: number) {
  return board.flatMap((piece, cell) => (piece && piece.kind === kind ? [cell] : []))
}

function mostCommonKind(board: Board) {
  const counts = new Map<number, number>()
  for (const piece of board) {
    if (piece && piece.kind !== RAINBOW) counts.set(piece.kind, (counts.get(piece.kind) ?? 0) + 1)
  }
  let best = RAINBOW
  for (const [kind, count] of counts) {
    if (best === RAINBOW || count > (counts.get(best) ?? 0)) best = kind
  }
  return best
}

export function swapCells(board: Board, a: number, b: number): Board {
  const next = board.slice()
  ;[next[a], next[b]] = [next[b], next[a]]
  return next
}

function findRuns(board: Board): Run[] {
  const runs: Run[] = []
  for (const horizontal of [true, false]) {
    for (let line = 0; line < SIZE; line++) {
      const cells = lineCells(line, horizontal)
      let start = 0
      for (let k = 1; k <= SIZE; k++) {
        const kind = kindAt(board, cells[start])
        if (k < SIZE && kind !== RAINBOW && kindAt(board, cells[k]) === kind) continue
        if (kind !== RAINBOW && k - start >= 3) runs.push({ cells: cells.slice(start, k), horizontal })
        start = k
      }
    }
  }
  return runs
}

function effectArea(board: Board, cell: number, special: Special) {
  switch (special) {
    case 'row':
      return lineCells(rowOf(cell), true)
    case 'col':
      return lineCells(colOf(cell), false)
    case 'bomb':
      return square(rowOf(cell), colOf(cell), 1)
    case 'rainbow':
      return cellsOfKind(board, mostCommonKind(board))
  }
}

/** Every cell that ends up cleared, following specials as they set each other off. */
function blast(board: Board, seeds: Iterable<number>, fired = new Set<number>()) {
  const cells = new Set<number>()
  const queue = [...seeds]
  while (queue.length) {
    const cell = queue.pop()!
    const piece = board[cell]
    if (cells.has(cell) || !piece) continue
    cells.add(cell)
    if (piece.special && !fired.has(cell)) {
      fired.add(cell)
      queue.push(...effectArea(board, cell, piece.special))
    }
  }
  return cells
}

/** Lines of 3+, plus the special each group earns: 4 in a row → line blaster, L/T → bomb, 5 → rainbow. */
function findMatches(board: Board, preferred: number[]): Match | null {
  const runs = findRuns(board)
  if (!runs.length) return null

  // Runs that share a cell (an L or T shape) are one group.
  const parent = runs.map((_, index) => index)
  const root = (index: number): number => (parent[index] === index ? index : (parent[index] = root(parent[index])))
  const owner = new Map<number, number>()
  runs.forEach((run, index) => {
    for (const cell of run.cells) {
      const other = owner.get(cell)
      if (other === undefined) owner.set(cell, index)
      else parent[root(index)] = root(other)
    }
  })
  const groups = new Map<number, Run[]>()
  runs.forEach((run, index) => groups.set(root(index), [...(groups.get(root(index)) ?? []), run]))

  const seeds = new Set<number>()
  const created = new Map<number, Piece>()
  for (const group of groups.values()) {
    const groupCells = new Set<number>()
    let shared: number | undefined
    for (const run of group) {
      for (const cell of run.cells) {
        if (groupCells.has(cell)) shared ??= cell
        groupCells.add(cell)
        seeds.add(cell)
      }
    }

    const longest = group.reduce((a, b) => (b.cells.length > a.cells.length ? b : a))
    const special: Special | undefined =
      longest.cells.length >= 5 ? 'rainbow' : shared !== undefined ? 'bomb' : longest.cells.length === 4 ? (longest.horizontal ? 'row' : 'col') : undefined
    if (!special) continue

    const spot = preferred.find((cell) => groupCells.has(cell)) ?? shared ?? longest.cells[Math.floor(longest.cells.length / 2)]
    created.set(spot, newPiece(special === 'rainbow' ? RAINBOW : kindAt(board, spot), 0, special))
  }

  return { cells: blast(board, seeds), created }
}

function isCombo(a: Piece | null, b: Piece | null) {
  if (!a || !b) return false
  return (a.special !== undefined && b.special !== undefined) || a.special === 'rainbow' || b.special === 'rainbow'
}

/** Two specials swapped together, or a rainbow swapped with anything, go off without needing a line. */
function comboClear(board: Board, a: number, b: number): { board: Board; cells: Set<number> } | null {
  const first = board[a]
  const second = board[b]
  if (!first || !second || !isCombo(first, second)) return null

  if (first.special === 'rainbow' && second.special === 'rainbow') {
    return { board, cells: new Set(board.flatMap((piece, cell) => (piece ? [cell] : []))) }
  }

  if (first.special === 'rainbow' || second.special === 'rainbow') {
    const [rainbowCell, partner] = first.special === 'rainbow' ? [a, second] : [b, first]
    const targets = cellsOfKind(board, partner.kind)
    if (!partner.special) return { board, cells: blast(board, [rainbowCell, ...targets], new Set([rainbowCell])) }

    // Rainbow + special: every piece of that colour turns into the same special, then they all go off.
    const next = board.slice()
    for (const cell of targets) {
      const special = partner.special === 'bomb' ? 'bomb' : Math.random() < 0.5 ? 'row' : 'col'
      next[cell] = { ...next[cell]!, special }
    }
    return { board: next, cells: blast(next, [rainbowCell, ...targets], new Set([rainbowCell])) }
  }

  const row = rowOf(b)
  const col = colOf(b)
  const bombs = [first, second].filter((piece) => piece.special === 'bomb').length
  let area: number[]
  if (bombs === 2) {
    area = square(row, col, 2)
  } else if (bombs === 1) {
    area = [-1, 0, 1].flatMap((offset) => [
      ...(inside(row + offset, 0) ? lineCells(row + offset, true) : []),
      ...(inside(0, col + offset) ? lineCells(col + offset, false) : []),
    ])
  } else {
    area = [...lineCells(row, true), ...lineCells(col, false)]
  }
  return { board, cells: blast(board, [a, b, ...area], new Set([a, b])) }
}

function removeCleared(board: Board, cells: Set<number>, created: Map<number, Piece>): Board {
  const next = board.map((piece, cell) => (cells.has(cell) ? null : piece))
  for (const [cell, piece] of created) next[cell] = piece
  return next
}

/** Gravity, then new pieces fall in from the top to fill each column. */
function collapse(board: Board, kinds: number): Board {
  const next: Board = Array(CELLS).fill(null)
  for (let col = 0; col < SIZE; col++) {
    let target = SIZE - 1
    for (let row = SIZE - 1; row >= 0; row--) {
      const piece = board[at(row, col)]
      if (piece) next[at(target--, col)] = piece
    }
    const missing = target + 1
    for (; target >= 0; target--) next[at(target, col)] = newPiece(randomKind(kinds), missing)
  }
  return next
}

/** A swap that would score, or null when the board is stuck. */
export function findHint(board: Board): [number, number] | null {
  for (let cell = 0; cell < CELLS; cell++) {
    const neighbours = [colOf(cell) < SIZE - 1 ? cell + 1 : -1, rowOf(cell) < SIZE - 1 ? cell + SIZE : -1]
    for (const other of neighbours) {
      if (other < 0) continue
      if (isCombo(board[cell], board[other]) || findRuns(swapCells(board, cell, other)).length) return [cell, other]
    }
  }
  return null
}

export function createBoard(kinds: number): Board {
  for (;;) {
    const board: Board = Array(CELLS).fill(null)
    for (let cell = 0; cell < CELLS; cell++) {
      const row = rowOf(cell)
      const col = colOf(cell)
      let kind: number
      do {
        kind = randomKind(kinds)
      } while (
        (col >= 2 && kindAt(board, cell - 1) === kind && kindAt(board, cell - 2) === kind) ||
        (row >= 2 && kindAt(board, cell - SIZE) === kind && kindAt(board, cell - 2 * SIZE) === kind)
      )
      board[cell] = newPiece(kind, SIZE)
    }
    if (findHint(board)) return board
  }
}

/** Mixes the pieces (keeping their specials) into a layout with no ready-made lines and at least one move. */
export function shuffleBoard(board: Board, kinds: number): Board {
  const pieces = board.filter((piece): piece is Piece => piece !== null)
  for (let attempt = 0; attempt < 200; attempt++) {
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[pieces[i], pieces[j]] = [pieces[j], pieces[i]]
    }
    const next: Board = pieces.map((piece) => ({ ...piece, drop: 0 }))
    if (!findRuns(next).length && findHint(next)) return next
  }
  return createBoard(kinds)
}

/**
 * Plays one swap to the end of its cascade. Yields each board change and each clear so the
 * caller can animate them, and returns false (after swapping back) when the swap scores nothing.
 */
export function* playMove(start: Board, a: number, b: number, kinds: number): Generator<Step, boolean> {
  let board = swapCells(start, a, b)
  yield { type: 'swap', board }

  let match: Match | null
  const combo = comboClear(board, a, b)
  if (combo) {
    if (combo.board !== board) {
      board = combo.board
      yield { type: 'transform', board }
    }
    match = { cells: combo.cells, created: new Map() }
  } else {
    match = findMatches(board, [b, a])
    if (!match) {
      yield { type: 'swap', board: start }
      return false
    }
  }

  for (let cascade = 1; match; cascade++) {
    yield { type: 'clear', cells: match.cells, cascade }
    board = collapse(removeCleared(board, match.cells, match.created), kinds)
    yield { type: 'fall', board }
    match = findMatches(board, [])
  }
  return true
}

export type Tally = { score: number; collected: number[]; ice: boolean[] }

/** Each cleared piece is worth more the deeper into a cascade it falls. */
export function tallyClear(tally: Tally, board: Board, cells: Set<number>, cascade: number): Tally {
  const collected = tally.collected.slice()
  const ice = tally.ice.slice()
  for (const cell of cells) {
    const kind = kindAt(board, cell)
    if (kind !== RAINBOW) collected[kind]++
    ice[cell] = false
  }
  return { score: tally.score + cells.size * 20 * cascade, collected, ice }
}

export function goalDone(goal: Goal, tally: Tally) {
  switch (goal.type) {
    case 'score':
      return tally.score >= goal.target
    case 'collect':
      return tally.collected[goal.kind] >= goal.count
    case 'ice':
      return !tally.ice.includes(true)
  }
}

export function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Mirrored patches of ice, so the layouts look designed rather than random. The outer ring
 * stays clear: edge and corner cells are too hard to reach for a relaxing game.
 */
function icePattern(count: number, random: () => number) {
  const ice: boolean[] = Array(CELLS).fill(false)
  for (let placed = 0; placed < count; ) {
    const row = 1 + Math.floor(random() * (SIZE - 2))
    const col = 1 + Math.floor(random() * (SIZE / 2 - 1))
    if (ice[at(row, col)]) continue
    ice[at(row, col)] = ice[at(row, SIZE - 1 - col)] = true
    placed += 2
  }
  return ice
}

/**
 * Levels never run out: they cycle through score, collect, ice and mixed goals, ramping up
 * for the first 40 levels and then holding steady so it never turns impossible.
 */
export function levelConfig(number: number): Level {
  const random = seededRandom(number * 7919)
  const step = Math.min(number - 1, 40)
  const kinds = number <= 4 ? 5 : 6
  const ice: boolean[] = Array(CELLS).fill(false)
  const collectKinds = [...Array(kinds).keys()]
  for (let i = collectKinds.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[collectKinds[i], collectKinds[j]] = [collectKinds[j], collectKinds[i]]
  }
  const scoreTarget = (base: number, perLevel: number) => Math.round((base + step * perLevel) / 50) * 50

  switch (number % 4) {
    case 1:
      return { number, kinds, moves: 22, goals: [{ type: 'score', target: scoreTarget(1400, 65) }], ice }
    case 2: {
      const two = number >= 10
      const count = Math.round(two ? 11 + step * 0.28 : 16 + step * 0.4)
      const goals: Goal[] = collectKinds.slice(0, two ? 2 : 1).map((kind) => ({ type: 'collect', kind, count }))
      return { number, kinds, moves: 22, goals, ice }
    }
    case 3:
      return { number, kinds, moves: 26, goals: [{ type: 'ice' }], ice: icePattern(Math.round(8 + step * 0.45), random) }
    default:
      return {
        number,
        kinds,
        moves: 24,
        goals: [
          { type: 'score', target: scoreTarget(1100, 40) },
          { type: 'collect', kind: collectKinds[0], count: Math.round(12 + step * 0.35) },
        ],
        ice,
      }
  }
}
