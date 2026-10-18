import { BarChart3, Copy, TrendingUp, Users, Wallet } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { HrNav } from '../../components/HrNav'
import { StatCard } from '../../components/StatCard'
import { useAppStore } from '../../store/appStore'

export function DashboardPage() {
  const { teams, employees, tasks, workTypes } = useAppStore()

  const totalPoints = tasks.filter((task) => task.status === 'completed').reduce((sum, task) => sum + task.points, 0)
  const pointsToday = tasks.filter((task) => task.status === 'completed' && task.completedDate === new Date().toISOString().slice(0, 10)).reduce((sum, task) => sum + task.points, 0)
  const completedTasks = tasks.filter((task) => task.status === 'completed').length
  const pendingTasks = tasks.filter((task) => task.status === 'pending').length

  const employeeLeaderboard = [...employees]
    .map((employee) => ({
      id: employee.id,
      name: employee.name,
      points: tasks.filter((task) => task.employeeId === employee.id && task.status === 'completed').reduce((sum, task) => sum + task.points, 0),
      team: teams.find((team) => team.id === employee.teamId)?.name ?? 'Team',
    }))
    .sort((left, right) => right.points - left.points)

  const teamChart = teams.map((team) => ({
    name: team.name,
    points: tasks
      .filter((task) => task.teamId === team.id && task.status === 'completed')
      .reduce((sum, task) => sum + task.points, 0),
  }))

  const workTypeChart = workTypes
    .filter((workType) => workType.active)
    .map((workType) => ({
      name: workType.name,
      points: tasks
        .filter((task) => task.workTypeId === workType.id && task.status === 'completed')
        .reduce((sum, task) => sum + task.points, 0),
    }))

  const handleCopyLink = async () => {
    const employeeLink = `${window.location.origin}/?employee=${employees[0]?.id ?? ''}`
    await navigator.clipboard.writeText(employeeLink)
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-stone-900 dark:bg-[#121214] dark:text-yellow-50">
      <HrNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-300">Overview</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900 dark:text-white">Dashboard</h1>
          </div>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2.5 font-semibold text-stone-900 transition hover:bg-yellow-300"
          >
            <Copy size={16} />
            Copy employee link
          </button>
        </header>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total points" value={totalPoints} icon={<Wallet size={18} />} accent="bg-yellow-100" />
          <StatCard label="Points today" value={pointsToday} icon={<TrendingUp size={18} />} accent="bg-yellow-100" />
          <StatCard label="Completed tasks" value={completedTasks} icon={<BarChart3 size={18} />} accent="bg-yellow-100" />
          <StatCard label="Pending tasks" value={pendingTasks} icon={<Users size={18} />} accent="bg-yellow-100" />
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <h3 className="mb-4 text-xl font-bold text-stone-900 dark:text-white">Employee ranking</h3>
            <div className="space-y-3">
              {employeeLeaderboard.slice(0, 5).map((entry, index) => (
                <div key={entry.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 font-bold text-stone-900">#{index + 1}</div>
                    <div>
                      <div className="font-semibold text-stone-900 dark:text-white">{entry.name}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-300">{entry.team}</div>
                    </div>
                  </div>
                  <span className="font-bold text-yellow-600 dark:text-yellow-300">{entry.points}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <h3 className="mb-4 text-xl font-bold text-stone-900 dark:text-white">Team comparison</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#facc15" />
                  <XAxis dataKey="name" stroke="#a16207" />
                  <YAxis stroke="#a16207" />
                  <Tooltip />
                  <Bar dataKey="points" fill="#facc15" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <h3 className="mb-4 text-xl font-bold text-stone-900 dark:text-white">Work by type</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={workTypeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#facc15" />
                  <XAxis dataKey="name" stroke="#a16207" />
                  <YAxis stroke="#a16207" />
                  <Tooltip />
                  <Bar dataKey="points" fill="#fbbf24" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <h3 className="mb-4 text-xl font-bold text-stone-900 dark:text-white">Points trend (30 days)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#facc15" />
                  <XAxis dataKey="day" stroke="#a16207" />
                  <YAxis stroke="#a16207" />
                  <Tooltip />
                  <Bar dataKey="points" fill="#facc15" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
