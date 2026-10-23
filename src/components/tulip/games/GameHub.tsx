import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import type { ComponentType } from 'react'

import { BubblePop } from './BubblePop'
import { CatchHearts } from './CatchHearts'
import { MemoryMatch } from './MemoryMatch'
import { SweetCrush } from './SweetCrush'
import { TicTacToe } from './TicTacToe'
import { TulipGarden } from './TulipGarden'
import { WhackWorry } from './WhackWorry'

/** `endless` games save her progress and are meant for long sessions, not a quick 30-second round. */
type GameInfo = { id: string; emoji: string; title: string; blurb: string; component: ComponentType; endless?: boolean }

const GAMES: GameInfo[] = [
  { id: 'crush', emoji: '🍬', title: 'Sweet Crush', blurb: 'Match sweets through never-ending levels', component: SweetCrush, endless: true },
  { id: 'garden', emoji: '🌱', title: 'Tulip Garden', blurb: 'Merge seeds into flowers… and something special', component: TulipGarden, endless: true },
  { id: 'bubbles', emoji: '🫧', title: 'Pop the Worries', blurb: 'Pop every worry away, one bubble at a time', component: BubblePop },
  { id: 'memory', emoji: '🧠', title: 'Cute Memory Match', blurb: 'Flip the cards and find the pairs', component: MemoryMatch },
  { id: 'catch', emoji: '🧺', title: 'Catch My Love', blurb: 'Catch the hearts, dodge the rain clouds', component: CatchHearts },
  { id: 'whack', emoji: '🔨', title: 'Whack-a-Worry', blurb: 'Bonk the stress monsters on the head', component: WhackWorry },
  { id: 'tictactoe', emoji: '🌷', title: 'Tulips vs Hearts', blurb: 'Tic-tac-toe against me. Go easy on me 🥺', component: TicTacToe },
]

export function GameHub({ name }: { name: string }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = GAMES.find((game) => game.id === activeId)

  if (active) {
    const Game = active.component
    return (
      <div className="animate-fade-up space-y-4">
        <div className="flex items-center gap-2 pr-8">
          <button type="button" onClick={() => setActiveId(null)} className="btn btn-ghost btn-sm -ml-2">
            <ArrowLeft size={16} />
            All games
          </button>
          <h3 className="min-w-0 flex-1 truncate text-right text-base font-bold text-stone-900 dark:text-white">
            {active.emoji} {active.title}
          </h3>
        </div>
        <Game />
      </div>
    )
  }

  return (
    <div className="animate-fade-up space-y-4">
      <div className="text-center">
        <p className="text-2xl font-extrabold text-stone-900 dark:text-white">Playtime, {name}! 🎮</p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">Pick one. Let’s melt that stress away and bring back that smile 😊</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {GAMES.map((game, index) => (
          <button
            key={game.id}
            type="button"
            onClick={() => setActiveId(game.id)}
            className={`group flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-rose-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 dark:border-rose-400/20 dark:bg-stone-800 dark:hover:border-rose-400/50 ${
              GAMES.length % 2 === 1 && index === GAMES.length - 1 ? 'sm:col-span-2' : ''
            }`}
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-50 text-2xl transition-transform group-hover:scale-110 dark:bg-rose-400/10">
              {game.emoji}
            </span>
            <span className="min-w-0">
              <span className="block font-bold text-stone-900 dark:text-white">{game.title}</span>
              <span className="block text-sm text-stone-500 dark:text-stone-400">{game.blurb}</span>
              {game.endless ? (
                <span className="badge mt-1 bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300">♾️ Endless · saves progress</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
