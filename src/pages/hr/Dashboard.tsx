import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import { CircleCheck, Clock3, Copy, Shapes, Star, TrendingUp, Trophy, Users, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { CategoryBarChart, TrendChart } from '../../components/Charts'
import { EmptyState } from '../../components/EmptyState'
import { SectionLoader } from '../../components/Loader'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { completionsOf, sumCompletionPoints } from '../../lib/completions'
import { todayKey } from '../../lib/dates'
import { useAppStore } from '../../store/appStore'

export function DashboardPage() {
  const loaded = useAppStore((state) => state.loaded)
  const teams = useAppStore((state) => state.teams)
  const employees = useAppStore((state) => state.employees)
  const tasks = useAppStore((state) => state.tasks)
  const workTypes = useAppStore((state) => state.workTypes)

  const stats = useMemo(() => {
    // Points come from every "Mark as done"; Completed/Pending count whole tasks.
    const completions = completionsOf(tasks)
    const completedCount = tasks.filter((task) => task.status === 'completed').length
    const today = todayKey()
    return {
      completions,
      totalPoints: sumCompletionPoints(completions),
      pointsToday: sumCompletionPoints(completions.filter((item) => item.day === today)),
      completedCount,
      pendingCount: tasks.length - completedCount,
      completionRate: tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0,
    }
  }, [tasks])

  const trend = useMemo(() => {
    const pointsByDay = new Map<string, number>()
    stats.completions.forEach(({ day, task }) => pointsByDay.set(day, (pointsByDay.get(day) ?? 0) + task.points))
    return Array.from({ length: 30 }, (_, index) => {
      const day = subDays(new Date(), 29 - index)
      return {
        name: format(day, 'MMM d'),
        tooltipLabel: format(day, 'EEE, MMM d'),
        value: pointsByDay.get(format(day, 'yyyy-MM-dd')) ?? 0,
      }
    })
  }, [stats.completions])

  const trendTotal = trend.reduce((sum, day) => sum + day.value, 0)

  const leaderboard = useMemo(
    () =>
      employees
        .map((employee) => ({
          id: employee.id,
          name: employee.name,
          team: teams.find((team) => team.id === employee.teamId)?.name ?? 'No team',
          points: sumCompletionPoints(stats.completions.filter(({ task }) => task.employeeId === employee.id)),
        }))
        .sort((left, right) => right.points - left.points)
        .slice(0, 5),
    [employees, stats.completions, teams],
  )

  const teamChart = useMemo(
    () =>
      teams
        .map((team) => ({ name: team.name, value: sumCompletionPoints(stats.completions.filter(({ task }) => task.teamId === team.id)) }))
        .sort((left, right) => right.value - left.value),
    [stats.completions, teams],
  )

  const workTypeChart = useMemo(
    () =>
      workTypes
        .filter((workType) => workType.active)
        .map((workType) => ({
          name: workType.name,
          value: sumCompletionPoints(stats.completions.filter(({ task }) => task.workTypeId === workType.id)),
        }))
        .sort((left, right) => right.value - left.value)
        .slice(0, 8),
    [stats.completions, workTypes],
  )

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/`)
      toast.success('Employee link copied')
    } catch {
      toast.error('Could not copy the link')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Live overview of your team's productivity."
        actions={
          <button type="button" onClick={() => void handleCopyLink()} className="btn btn-secondary">
            <Copy size={16} />
            Copy employee link
          </button>
        }
      />

      {!loaded ? (
        <SectionLoader />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Total points" value={stats.totalPoints} icon={Zap} hint="All time" />
            <StatCard label="Points today" value={stats.pointsToday} icon={TrendingUp} hint={format(new Date(), 'EEE, MMM d')} />
            <StatCard label="Completed" value={stats.completedCount} icon={CircleCheck} hint={`${stats.completionRate}% completion rate`} />
            <StatCard label="Pending" value={stats.pendingCount} icon={Clock3} hint="Awaiting completion" />
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <Card
              title="Points trend"
              description="Completed task points · last 30 days"
              icon={TrendingUp}
              className="xl:col-span-2"
              action={<span className="badge bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">{trendTotal.toLocaleString()} pts</span>}
            >
              <TrendChart data={trend} />
            </Card>

            <Card title="Top performers" description="Ranked by points earned" icon={Trophy} bodyClassName="p-2 sm:p-3">
              {leaderboard.length === 0 ? (
                <div className="p-2">
                  <EmptyState icon={Users} title="No employees yet" description="Add employees from the Manage page." />
                </div>
              ) : (
                <ol className="divide-y divide-stone-100 dark:divide-stone-800">
                  {leaderboard.map((entry, index) => (
                    <li key={entry.id} className="flex items-center gap-3 px-2 py-2.5 sm:px-3">
                      <span
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold tabular-nums ${
                          index < 3 ? 'bg-yellow-400 text-stone-900' : 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
                        }`}
                      >
                        {index + 1}
                      </span>
                      <Avatar name={entry.name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{entry.name}</p>
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">{entry.team}</p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900 dark:text-white">
                        {entry.points.toLocaleString()}
                        <span className="ml-1 text-xs font-medium text-stone-400">pts</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Card>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="Points by team" description="All-time completed points" icon={Users}>
              {teamChart.length === 0 ? (
                <EmptyState icon={Users} title="No teams yet" description="Create teams from the Manage page." />
              ) : stats.totalPoints === 0 ? (
                <EmptyState icon={Zap} title="No points yet" description="Team totals appear once tasks are completed." />
              ) : (
                <CategoryBarChart data={teamChart} />
              )}
            </Card>

            <Card
              title="Points by work type"
              description={workTypeChart.length === 8 ? 'Top 8 active work types' : 'Active work types'}
              icon={Shapes}
            >
              {workTypeChart.length === 0 ? (
                <EmptyState icon={Star} title="No work types yet" description="Create work types from the Manage page." />
              ) : stats.totalPoints === 0 ? (
                <EmptyState icon={Zap} title="No points yet" description="Work type totals appear once tasks are completed." />
              ) : (
                <CategoryBarChart data={workTypeChart} />
              )}
            </Card>
          </section>
        </>
      )}
    </div>
  )
}
