import { useMemo, useState } from 'react'
import { jsPDF } from 'jspdf'
import { Download, ListFilter } from 'lucide-react'

import { HrNav } from '../../components/HrNav'
import { downloadCsv, filterTasksByPeriod, type DatePreset } from '../../lib/reports'
import { useAppStore } from '../../store/appStore'

export function ReportsPage() {
  const { employees, teams, tasks, workTypes } = useAppStore()
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [period, setPeriod] = useState<DatePreset>('this-week')
  const [customStart, setCustomStart] = useState(() => new Date().toISOString().slice(0, 10))
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10))

  const filteredTasks = useMemo(() => {
    const employeeId = selectedEmployee === 'all' ? null : selectedEmployee

    return filterTasksByPeriod(tasks, period, customStart, customEnd).filter((task) => !employeeId || task.employeeId === employeeId)
  }, [customEnd, customStart, period, selectedEmployee, tasks])

  const rows = [
    ['Employee', 'Team', 'Task', 'Points', 'Date'],
    ...filteredTasks.map((task) => {
      const employee = employees.find((person) => person.id === task.employeeId)
      const team = teams.find((team) => team.id === task.teamId)
      return [employee?.name ?? 'Unknown', team?.name ?? 'Unknown', task.workTypeName, String(task.points), task.completedDate ?? '']
    }),
  ]

  const handleExportCsv = () => {
    downloadCsv(rows, 'productivity-report.csv')
  }

  const handleExportPdf = () => {
    const doc = new jsPDF()

    doc.setFontSize(18)
    doc.text('Productivity Report', 14, 18)

    doc.setFontSize(10)
    doc.text(`Employee: ${selectedEmployee === 'all' ? 'All employees' : employees.find((employee) => employee.id === selectedEmployee)?.name ?? 'Unknown'}`, 14, 28)
    doc.text(`Period: ${period === 'custom' ? `${customStart} to ${customEnd}` : period.replace('-', ' ')}`, 14, 35)

    if (filteredTasks.length === 0) {
      doc.text('No tasks in the current filter.', 14, 48)
      doc.save('productivity-report.pdf')
      return
    }

    let y = 48
    filteredTasks.forEach((task) => {
      const employee = employees.find((person) => person.id === task.employeeId)
      const team = teams.find((team) => team.id === task.teamId)
      const line = `${employee?.name ?? 'Unknown'} | ${team?.name ?? 'Unknown'} | ${task.workTypeName} | ${task.points} pts | ${task.completedDate ?? '-'}`

      if (y > 260) {
        doc.addPage()
        y = 18
      }

      doc.text(line, 14, y)
      y += 8
    })

    doc.save('productivity-report.pdf')
  }

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-stone-900 dark:bg-[#121214] dark:text-yellow-50">
      <HrNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-300">Insights</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900 dark:text-white">Reports</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-yellow-400 px-4 py-2.5 font-semibold text-stone-900 transition hover:bg-yellow-300"
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-yellow-300 bg-white px-4 py-2.5 font-semibold text-stone-900 transition hover:bg-yellow-50 dark:border-yellow-700 dark:bg-stone-900 dark:text-white"
            >
              <Download size={16} />
              Export PDF
            </button>
          </div>
        </header>

        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">Employee</label>
              <select value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)} className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 dark:border-yellow-700 dark:bg-stone-800 dark:text-white">
                <option value="all">All employees</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">Period</label>
              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value as DatePreset)}
                className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this-week">This week</option>
                <option value="this-month">This month</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>

          {period === 'custom' ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">From</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => setCustomStart(event.target.value)}
                  className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-stone-700 dark:text-stone-200">To</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => setCustomEnd(event.target.value)}
                  className="w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 dark:border-yellow-700 dark:bg-stone-800 dark:text-white"
                />
              </div>
            </div>
          ) : null}
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <ListFilter className="text-yellow-600" size={18} />
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Team totals</h2>
            </div>
            <div className="space-y-2">
              {teams.map((team) => {
                const total = filteredTasks.filter((task) => task.teamId === team.id && task.status === 'completed').reduce((sum, task) => sum + task.points, 0)
                return (
                  <div key={team.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                    <span className="font-medium text-stone-800 dark:text-stone-200">{team.name}</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-300">{total}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <ListFilter className="text-yellow-600" size={18} />
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Work totals</h2>
            </div>
            <div className="space-y-2">
              {workTypes.map((workType) => {
                const total = filteredTasks.filter((task) => task.workTypeId === workType.id && task.status === 'completed').reduce((sum, task) => sum + task.points, 0)
                return (
                  <div key={workType.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                    <span className="font-medium text-stone-800 dark:text-stone-200">{workType.icon} {workType.name}</span>
                    <span className="font-bold text-yellow-600 dark:text-yellow-300">{total}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-yellow-200 bg-white shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-yellow-50 dark:bg-stone-800">
                <tr>
                  <th className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">Employee</th>
                  <th className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">Team</th>
                  <th className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">Task</th>
                  <th className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">Points</th>
                  <th className="px-4 py-3 font-semibold text-stone-800 dark:text-stone-200">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-stone-500 dark:text-stone-300">No tasks in the current filter.</td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const employee = employees.find((person) => person.id === task.employeeId)
                    const team = teams.find((team) => team.id === task.teamId)
                    return (
                      <tr key={task.id} className="border-t border-yellow-100 dark:border-stone-700">
                        <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{employee?.name ?? 'Unknown'}</td>
                        <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{team?.name ?? 'Unknown'}</td>
                        <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{task.workTypeName}</td>
                        <td className="px-4 py-3 font-semibold text-yellow-600 dark:text-yellow-300">{task.points}</td>
                        <td className="px-4 py-3 text-stone-800 dark:text-stone-200">{task.completedDate ?? '-'}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
