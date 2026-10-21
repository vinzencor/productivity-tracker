import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { ClipboardList, Users } from 'lucide-react'
import toast from 'react-hot-toast'

import { Avatar } from '../components/Avatar'
import { BrandMark } from '../components/BrandMark'
import { Card } from '../components/Card'
import { ConfirmDialog, type ConfirmRequest } from '../components/ConfirmDialog'
import { EmptyState } from '../components/EmptyState'
import { FullScreenLoader } from '../components/Loader'
import { SearchInput } from '../components/SearchInput'
import { SegmentedControl } from '../components/SegmentedControl'
import { TaskTile } from '../components/TaskTile'
import { ThemeToggle } from '../components/ThemeToggle'
import { sumEarned } from '../lib/completions'
import { errorMessage } from '../lib/errors'
import { getLevelFromPoints, getProgressToNextLevel } from '../lib/points'
import { useAppStore } from '../store/appStore'
import type { TaskStatus } from '../types'

export function EmployeePage() {
  const loaded = useAppStore((state) => state.loaded)
  const employees = useAppStore((state) => state.employees)
  const teams = useAppStore((state) => state.teams)
  const workTypes = useAppStore((state) => state.workTypes)
  const tasks = useAppStore((state) => state.tasks)
  const selectedEmployeeId = useAppStore((state) => state.selectedEmployeeId)
  const setSelectedEmployeeId = useAppStore((state) => state.setSelectedEmployeeId)
  const completeTask = useAppStore((state) => state.completeTask)
  const revertTask = useAppStore((state) => state.revertTask)
  const deleteTask = useAppStore((state) => state.deleteTask)
  const adminLoggedIn = useAppStore((state) => state.adminLoggedIn)

  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | TaskStatus>('pending')
  const [taskSearch, setTaskSearch] = useState('')
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  const employee = employees.find((person) => person.id === selectedEmployeeId) ?? employees[0] ?? null
  const employeeTeam = teams.find((team) => team.id === employee?.teamId)

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees.filter((person) => person.name.toLowerCase().includes(query))
  }, [employees, search])

  const employeeTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.employeeId === employee?.id)
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [employee?.id, tasks],
  )

  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()
    return employeeTasks.filter((task) => {
      const matchesFilter = taskFilter === 'all' || task.status === taskFilter
      const matchesSearch = !query || task.title.toLowerCase().includes(query) || task.workTypeName.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [employeeTasks, taskFilter, taskSearch])

  const points = sumEarned(employeeTasks)
  const pendingCount = employeeTasks.filter((task) => task.status === 'pending').length
  const completedCount = employeeTasks.length - pendingCount
  const level = getProgressToNextLevel(points)

  const runTaskAction = async (taskId: string, action: () => Promise<void>) => {
    setBusyTaskId(taskId)
    try {
      await action()
    } catch (error) {
      console.error(error)
      toast.error(errorMessage(error))
    } finally {
      setBusyTaskId(null)
    }
  }

  const handleComplete = (taskId: string) =>
    runTaskAction(taskId, async () => {
      const task = tasks.find((item) => item.id === taskId)
      const previousLevel = getLevelFromPoints(points)
      const earned = await completeTask(taskId)
      if (earned === undefined || !task) return
      const progress = task.count > 1 ? ` · ${task.completions.length + 1} of ${task.count} done` : ''
      if (getLevelFromPoints(points + earned) > previousLevel) {
        confetti({ spread: 120, particleCount: 160, origin: { y: 0.7 } })
        toast.success(`Level up! You reached level ${getLevelFromPoints(points + earned)}${progress}`)
      } else {
        toast.success(`Nice work! +${earned} pts${progress}`)
      }
    })

  const handleRevert = (taskId: string) =>
    runTaskAction(taskId, async () => {
      const task = tasks.find((item) => item.id === taskId)
      await revertTask(taskId)
      toast(
        task && task.count > 1 ? `Undone · ${task.completions.length - 1} of ${task.count} done` : 'Task moved back to pending',
        { icon: '↩️' },
      )
    })

  const handleDelete = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId)
    setConfirmRequest({
      title: 'Delete this task?',
      description: `"${task?.title || task?.workTypeName || 'This task'}" will be permanently removed.`,
      onConfirm: async () => {
        await deleteTask(taskId)
        toast.success('Task deleted')
      },
    })
  }

  if (!loaded) {
    return <FullScreenLoader label="Loading your workspace…" />
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100">
      <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-bold text-stone-900 dark:text-white">Productivity Quest</p>
              <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Your workspace</p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
        {!employee ? (
          <div className="card p-4 sm:p-5">
            <EmptyState
              icon={Users}
              title="No employees yet"
              description="Ask HR to add your profile, then refresh this page."
            />
          </div>
        ) : (
          <>
            <Card
              title="Who are you?"
              icon={Users}
              action={<span className="badge bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">{employees.length} {employees.length === 1 ? 'person' : 'people'}</span>}
            >
              <SearchInput value={search} onChange={setSearch} placeholder="Search your name" />
              <div className="mt-3 flex max-h-40 flex-wrap gap-2 overflow-y-auto">
                {filteredEmployees.length === 0 ? (
                  <p className="py-1 text-sm text-stone-500 dark:text-stone-400">No one matches "{search}".</p>
                ) : (
                  filteredEmployees.map((person) => {
                    const selected = employee.id === person.id
                    return (
                      <button
                        key={person.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedEmployeeId(person.id)}
                        className={`h-9 rounded-full border px-3.5 text-sm font-medium transition-colors ${
                          selected
                            ? 'border-yellow-400 bg-yellow-400 text-stone-900'
                            : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:hover:text-white'
                        }`}
                      >
                        {person.name}
                      </button>
                    )
                  })
                )}
              </div>
            </Card>

            <section className="card p-4 sm:p-5">
              <div className="flex items-center gap-4">
                <Avatar name={employee.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <h1 className="truncate text-xl font-bold tracking-tight text-stone-900 sm:text-2xl dark:text-white">{employee.name}</h1>
                  <p className="mt-0.5 truncate text-sm text-stone-500 dark:text-stone-400">{employeeTeam?.name ?? 'No team'}</p>
                </div>
              </div>

              <dl className="mt-5 grid grid-cols-3 divide-x divide-stone-100 rounded-xl border border-stone-100 dark:divide-stone-800 dark:border-stone-800">
                {[
                  { label: 'Points', value: points.toLocaleString() },
                  { label: 'Done', value: completedCount },
                  { label: 'Pending', value: pendingCount },
                ].map((stat) => (
                  <div key={stat.label} className="px-3 py-3 text-center">
                    <dt className="text-xs font-medium text-stone-500 dark:text-stone-400">{stat.label}</dt>
                    <dd className="mt-0.5 text-lg font-bold text-stone-900 sm:text-xl dark:text-white">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-stone-900 dark:text-white">Level {level.currentLevel}</span>
                  <span className="tabular-nums text-stone-500 dark:text-stone-400">
                    {level.nextLevelTarget - points} pts to level {level.currentLevel + 1}
                  </span>
                </div>
                <div
                  className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800"
                  role="progressbar"
                  aria-valuenow={Math.round(level.percent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Progress to level ${level.currentLevel + 1}`}
                >
                  <div className="h-full rounded-full bg-yellow-400 transition-all duration-500" style={{ width: `${level.percent}%` }} />
                </div>
              </div>
            </section>

            <Card title="My tasks" icon={ClipboardList} bodyClassName="p-0">
              <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-stone-800">
                <SegmentedControl
                  label="Filter tasks"
                  value={taskFilter}
                  onChange={setTaskFilter}
                  options={[
                    { value: 'pending', label: 'Pending', count: pendingCount },
                    { value: 'completed', label: 'Completed', count: completedCount },
                    { value: 'all', label: 'All', count: employeeTasks.length },
                  ]}
                />
                <SearchInput value={taskSearch} onChange={setTaskSearch} placeholder="Search tasks" className="sm:max-w-[220px] sm:flex-1" />
              </div>

              <div className="p-4 sm:p-5">
                {visibleTasks.length === 0 ? (
                  <EmptyState
                    icon={ClipboardList}
                    title={employeeTasks.length === 0 ? 'No tasks yet' : 'Nothing here'}
                    description={
                      employeeTasks.length === 0
                        ? 'Tasks assigned to you by HR will show up here.'
                        : taskFilter === 'pending' && !taskSearch
                          ? 'All caught up — no pending tasks.'
                          : 'No tasks match this filter.'
                    }
                  />
                ) : (
                  <ul className="space-y-3">
                    {visibleTasks.map((task) => (
                      <TaskTile
                        key={task.id}
                        task={task}
                        workType={workTypes.find((item) => item.id === task.workTypeId)}
                        busy={busyTaskId === task.id}
                        onComplete={(taskId) => void handleComplete(taskId)}
                        onRevert={(taskId) => void handleRevert(taskId)}
                        onDelete={adminLoggedIn ? handleDelete : undefined}
                      />
                    ))}
                  </ul>
                )}
              </div>
            </Card>
          </>
        )}
      </main>

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}
