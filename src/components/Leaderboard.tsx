import { Medal } from 'lucide-react'

type LeaderboardEntry = {
  id: string
  name: string
  teamName: string
  points: number
}

type LeaderboardProps = {
  entries: LeaderboardEntry[]
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const topEntries = [...entries].sort((left, right) => right.points - left.points)

  return (
    <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-bold text-stone-900 dark:text-white">Leaderboard</h3>
        <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-stone-700 dark:bg-yellow-900/30 dark:text-yellow-100">Top 3</span>
      </div>

      <div className="space-y-3">
        {topEntries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-center justify-between rounded-xl border border-yellow-100 bg-yellow-50/50 p-3 dark:border-yellow-800 dark:bg-stone-800/70"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-stone-900">
                {index === 0 ? '1' : index === 1 ? '2' : '3'}
              </div>
              <div>
                <div className="font-semibold text-stone-900 dark:text-white">{entry.name}</div>
                <div className="text-xs text-stone-500 dark:text-stone-300">{entry.teamName}</div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-amber-600 dark:text-yellow-300">
              <Medal size={16} className={index === 0 ? 'fill-current' : ''} />
              <span className="font-bold">{entry.points}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
