import { useMemo, useState } from 'react'
import confetti from 'canvas-confetti'
import { CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'

import { TaskTile } from '../components/TaskTile'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../hooks/useTheme'
import { getLevelFromPoints, getTaskPointsForTeam } from '../lib/points'
import { useAppStore } from '../store/appStore'

type EmployeePageProps = {
  selectedEmployeeId: string | null
  onSelectEmployee: (id: string | null) => void
}

export function EmployeePage({ selectedEmployeeId, onSelectEmployee }: EmployeePageProps) {
  const { theme, toggleTheme } = useTheme()
  const {
    employees,
    teams,
    workTypes,
    tasks,
    selectedEmployeeId: storedEmployeeId,
    setSelectedEmployeeId,
    completeTask,
    revertTask,
    deleteTask,
  } = useAppStore()

  const [search, setSearch] = useState('')
  const [taskFilter, setTaskFilter] = useState<'all' | 'pending' | 'completed'>('all')
  const [taskSearch, setTaskSearch] = useState('')

  const employee = useMemo(
    () => employees.find((person) => person.id === (selectedEmployeeId ?? storedEmployeeId)) ?? employees[0] ?? null,
    [employees, selectedEmployeeId, storedEmployeeId],
  )

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase()
    return employees.filter((person) => person.name.toLowerCase().includes(query))
  }, [employees, search])

  const employeeTasks = useMemo(
    () => tasks.filter((task) => task.employeeId === employee?.id),
    [employee?.id, tasks],
  )

  const visibleTasks = useMemo(() => {
    const query = taskSearch.trim().toLowerCase()

    return employeeTasks.filter((task) => {
      const matchesFilter = taskFilter === 'all' || task.status === taskFilter
      const matchesSearch =
        query.length === 0 ||
        task.title.toLowerCase().includes(query) ||
        task.workTypeName.toLowerCase().includes(query)
      return matchesFilter && matchesSearch
    })
  }, [employeeTasks, taskFilter, taskSearch])

  const currentPoints = employee?.totalPoints ?? 0
  const employeeTeam = teams.find((team) => team.id === employee?.teamId)

  const handleCompleteTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return

    const workType = workTypes.find((item) => item.id === task.workTypeId)
    const points = workType ? getTaskPointsForTeam(workType, task.teamId, task.points || 0) : task.points || 0
    const previousLevel = getLevelFromPoints(currentPoints)

    completeTask(taskId)

    const nextLevel = getLevelFromPoints(currentPoints + points)
    if (nextLevel > previousLevel) {
      confetti({ spread: 120, particleCount: 160, origin: { y: 0.7 } })
    }

    toast.success(`Task completed`)
  }

  if (!employee) {
    return <div className="p-6 text-center text-stone-700 dark:text-stone-200">No employee found.</div>
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-stone-900 transition-colors dark:bg-[#121214] dark:text-yellow-50">
      <header className="sticky top-0 z-20 border-b border-yellow-200 bg-[#FFFDF5]/90 backdrop-blur dark:border-yellow-800 dark:bg-[#121214]/90">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-300">Productivity Quest</p>
            <h1 className="text-xl font-black text-stone-900 dark:text-white">Your workspace</h1>
          </div>
          <ThemeToggle theme={theme} onToggle={toggleTheme} />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-5">
        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-stone-700 dark:text-stone-200">Who are you?</label>
            <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100">
              {filteredEmployees.length} people
            </span>
          </div>

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search your name"
            className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-base outline-none transition focus:border-yellow-400 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
          />

          <div className="mt-3 flex flex-wrap gap-2">
            {filteredEmployees.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onSelectEmployee(person.id)
                  setSelectedEmployeeId(person.id)
                }}
                className={`rounded-full px-3 py-2 text-sm font-semibold ${employee.id === person.id ? 'bg-yellow-400 text-stone-900' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`}
              >
                {person.name}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500 dark:text-stone-300">Profile</p>
              <h2 className="mt-1 text-3xl font-black text-stone-900 dark:text-white">{employee.name}</h2>
            </div>
            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm font-medium text-stone-700 dark:bg-yellow-900/40 dark:text-yellow-100">
              {employeeTeam?.name ?? 'Unknown team'}
            </span>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-white">
              <CheckCircle2 className="text-yellow-500" size={18} />
              My tasks
            </div>
            <div className="flex items-center gap-2">
              {(['all', 'pending', 'completed'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTaskFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-semibold ${taskFilter === filter ? 'bg-yellow-400 text-stone-900' : 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200'}`}
                >
                  {filter === 'all' ? 'All' : filter === 'pending' ? 'Pending' : 'Completed'}
                </button>
              ))}
            </div>
          </div>

          <input
            value={taskSearch}
            onChange={(event) => setTaskSearch(event.target.value)}
            placeholder="Filter task title or type"
            className="mb-3 w-full rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-2.5 text-sm outline-none focus:border-yellow-400 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
          />

          <div className="space-y-3">
            {visibleTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-yellow-300 bg-yellow-50 p-6 text-center text-stone-600 dark:border-yellow-700 dark:bg-stone-800 dark:text-stone-200">
                No tasks match this filter.
              </div>
            ) : (
              visibleTasks.map((task) => {
                const workType = workTypes.find((item) => item.id === task.workTypeId)
                return (
                  <TaskTile
                    key={task.id}
                    task={task}
                    workType={workType}
                    onComplete={handleCompleteTask}
                    onRevert={(taskId) => {
                      revertTask(taskId)
                      toast('Task moved back to pending', { icon: '↩️' })
                    }}
                    onDelete={(taskId) => {
                      deleteTask(taskId)
                      toast('Task removed', { icon: '🗑️' })
                    }}
                  />
                )
              })
            )}
          </div>
        </section>
      </main>

    </div>
  )
}
