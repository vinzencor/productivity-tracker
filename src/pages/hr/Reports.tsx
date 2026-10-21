import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Briefcase, CircleCheck, FileText, ListChecks, Shapes, Sheet, Trophy, Zap } from 'lucide-react'

import { Card } from '../../components/Card'
import { EmptyState } from '../../components/EmptyState'
import { SectionLoader } from '../../components/Loader'
import { PageHeader } from '../../components/PageHeader'
import { StatCard } from '../../components/StatCard'
import { completionLabel, completionsOf, sumCompletionPoints } from '../../lib/completions'
import { formatDay, todayKey } from '../../lib/dates'
import { downloadCsv, filterCompletionsByPeriod, getRangeForPreset, type DatePreset } from '../../lib/reports'
import { useAppStore } from '../../store/appStore'

const PERIOD_LABELS: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  'this-week': 'This week',
  'this-month': 'This month',
  custom: 'Custom range',
}

type MeterItem = { id: string; name: string; value: number; icon?: string }

function MeterList({ items, emptyLabel }: { items: MeterItem[]; emptyLabel: string }) {
  const max = Math.max(...items.map((item) => item.value), 0)
  if (items.length === 0 || max === 0) {
    return <EmptyState icon={ListChecks} title="No points yet" description={emptyLabel} />
  }

  return (
    <ul className="space-y-4">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-stone-700 dark:text-stone-300">
              {item.icon ? <span className="mr-1.5">{item.icon}</span> : null}
              {item.name}
            </span>
            <span className="shrink-0 font-semibold tabular-nums text-stone-900 dark:text-white">
              {item.value.toLocaleString()}
              <span className="ml-1 text-xs font-medium text-stone-400">pts</span>
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-amber-600 dark:bg-amber-500"
              style={{ width: `${max ? (item.value / max) * 100 : 0}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function ReportsPage() {
  const loaded = useAppStore((state) => state.loaded)
  const employees = useAppStore((state) => state.employees)
  const teams = useAppStore((state) => state.teams)
  const tasks = useAppStore((state) => state.tasks)
  const workTypes = useAppStore((state) => state.workTypes)
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [period, setPeriod] = useState<DatePreset>('this-week')
  const [customStart, setCustomStart] = useState(() => todayKey())
  const [customEnd, setCustomEnd] = useState(() => todayKey())

  // One entry per "Mark as done", so a task with count 3 can spread its points over several days.
  const completed = useMemo(() => {
    const employeeId = selectedEmployee === 'all' ? null : selectedEmployee
    return filterCompletionsByPeriod(completionsOf(tasks), period, customStart, customEnd)
      .filter((item) => !employeeId || item.task.employeeId === employeeId)
      .sort((left, right) => right.at.localeCompare(left.at))
  }, [customEnd, customStart, period, selectedEmployee, tasks])

  const employeeName = (id: string) => employees.find((person) => person.id === id)?.name ?? 'Unknown'
  const teamName = (id: string) => teams.find((team) => team.id === id)?.name ?? 'No team'

  const totalPoints = sumCompletionPoints(completed)

  const topPerformer = useMemo(() => {
    const totals = new Map<string, number>()
    completed.forEach(({ task }) => totals.set(task.employeeId, (totals.get(task.employeeId) ?? 0) + task.points))
    const [best] = [...totals.entries()].sort((left, right) => right[1] - left[1])
    return best ? { name: employees.find((person) => person.id === best[0])?.name ?? 'Unknown', points: best[1] } : null
  }, [employees, completed])

  const teamTotals = useMemo(
    () =>
      teams
        .map((team) => ({
          id: team.id,
          name: team.name,
          value: sumCompletionPoints(completed.filter(({ task }) => task.teamId === team.id)),
        }))
        .sort((left, right) => right.value - left.value),
    [completed, teams],
  )

  const workTotals = useMemo(
    () =>
      workTypes
        .map((workType) => ({
          id: workType.id,
          name: workType.name,
          icon: workType.icon,
          value: sumCompletionPoints(completed.filter(({ task }) => task.workTypeId === workType.id)),
        }))
        .filter((item) => item.value > 0)
        .sort((left, right) => right.value - left.value),
    [completed, workTypes],
  )

  const rangeLabel = useMemo(() => {
    if (period === 'custom') {
      return customStart === customEnd ? formatDay(customStart) : `${formatDay(customStart)} – ${formatDay(customEnd)}`
    }
    const { start, end } = getRangeForPreset(period)
    const startLabel = format(start, 'MMM d')
    const endLabel = format(end, 'MMM d')
    return startLabel === endLabel ? format(start, 'EEE, MMM d') : `${startLabel} – ${endLabel}`
  }, [customEnd, customStart, period])

  const employeeLabel = selectedEmployee === 'all' ? 'All employees' : employeeName(selectedEmployee)

  const handleExportCsv = () => {
    downloadCsv(
      [
        ['Employee', 'Team', 'Task', 'Work type', 'Points', 'Completed on'],
        ...completed.map((item) => [
          employeeName(item.task.employeeId),
          teamName(item.task.teamId),
          completionLabel(item),
          item.task.workTypeName,
          String(item.task.points),
          item.day,
        ]),
      ],
      'productivity-report.csv',
    )
  }

  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF()
    const pageWidth = pdf.internal.pageSize.getWidth()

    pdf.setFontSize(18)
    pdf.text('Productivity Report', 14, 18)
    pdf.setFontSize(10)
    pdf.setTextColor(100)
    pdf.text(`${employeeLabel} · ${PERIOD_LABELS[period]} (${rangeLabel})`, 14, 26)
    pdf.text(`${completed.length} completed · ${totalPoints} points`, 14, 32)
    pdf.setTextColor(0)

    let y = 44
    completed.forEach((item) => {
      const { task } = item
      const line = `${item.day}  ·  ${employeeName(task.employeeId)} (${teamName(task.teamId)})  ·  ${completionLabel(item)} [${task.workTypeName}]  ·  ${task.points} pts`
      const wrapped = pdf.splitTextToSize(line, pageWidth - 28) as string[]
      if (y + wrapped.length * 6 > 280) {
        pdf.addPage()
        y = 18
      }
      pdf.text(wrapped, 14, y)
      y += wrapped.length * 6 + 2
    })

    pdf.save('productivity-report.pdf')
  }

  const noData = completed.length === 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Completed work and points for any period."
        actions={
          <>
            <button type="button" onClick={handleExportCsv} disabled={noData} className="btn btn-secondary">
              <Sheet size={16} />
              Export CSV
            </button>
            <button type="button" onClick={() => void handleExportPdf()} disabled={noData} className="btn btn-primary">
              <FileText size={16} />
              Export PDF
            </button>
          </>
        }
      />

      <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-4">
        <div className="min-w-0">
          <label htmlFor="report-employee" className="label">
            Employee
          </label>
          <select id="report-employee" value={selectedEmployee} onChange={(event) => setSelectedEmployee(event.target.value)} className="field">
            <option value="all">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-0">
          <label htmlFor="report-period" className="label">
            Period
          </label>
          <select id="report-period" value={period} onChange={(event) => setPeriod(event.target.value as DatePreset)} className="field">
            {(Object.keys(PERIOD_LABELS) as DatePreset[]).map((key) => (
              <option key={key} value={key}>
                {PERIOD_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
        {period === 'custom' ? (
          <>
            <div className="min-w-0">
              <label htmlFor="report-from" className="label">
                From
              </label>
              <input
                id="report-from"
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(event) => setCustomStart(event.target.value)}
                className="field"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="report-to" className="label">
                To
              </label>
              <input
                id="report-to"
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(event) => setCustomEnd(event.target.value)}
                className="field"
              />
            </div>
          </>
        ) : (
          <div className="flex min-w-0 items-end sm:col-span-2">
            <p className="flex h-10 items-center text-sm text-stone-500 dark:text-stone-400">
              Showing <span className="mx-1 font-semibold text-stone-900 dark:text-white">{rangeLabel}</span>
            </p>
          </div>
        )}
      </section>

      {!loaded ? (
        <SectionLoader />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            <StatCard label="Completed" value={completed.length} icon={CircleCheck} hint={rangeLabel} />
            <StatCard label="Points earned" value={totalPoints} icon={Zap} hint={employeeLabel} />
            <div className="col-span-2 lg:col-span-1">
              <StatCard
                label="Top performer"
                value={topPerformer?.name ?? '—'}
                icon={Trophy}
                hint={topPerformer ? `${topPerformer.points.toLocaleString()} pts` : 'No completed tasks'}
              />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card title="By team" description="Points earned in this period" icon={Briefcase}>
              <MeterList items={teamTotals} emptyLabel="No team earned points in this period." />
            </Card>
            <Card title="By work type" description="Points earned in this period" icon={Shapes}>
              <MeterList items={workTotals} emptyLabel="No work was completed in this period." />
            </Card>
          </section>

          <Card title="Completed tasks" description={`${completed.length} in ${rangeLabel}`} icon={ListChecks} bodyClassName="p-0">
            {noData ? (
              <div className="p-4 sm:p-5">
                <EmptyState icon={ListChecks} title="Nothing to show" description="No tasks were completed for this filter." />
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-stone-100 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:border-stone-800 dark:text-stone-400">
                        <th className="px-5 py-3 font-semibold">Employee</th>
                        <th className="px-5 py-3 font-semibold">Team</th>
                        <th className="px-5 py-3 font-semibold">Task</th>
                        <th className="px-5 py-3 text-right font-semibold">Points</th>
                        <th className="px-5 py-3 text-right font-semibold">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {completed.map((item) => (
                        <tr key={`${item.task.id}-${item.unit}`} className="transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/40">
                          <td className="whitespace-nowrap px-5 py-3 font-medium text-stone-900 dark:text-white">{employeeName(item.task.employeeId)}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-stone-600 dark:text-stone-300">{teamName(item.task.teamId)}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium text-stone-900 dark:text-white">{completionLabel(item)}</p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">{item.task.workTypeName}</p>
                          </td>
                          <td className="whitespace-nowrap px-5 py-3 text-right font-semibold tabular-nums text-stone-900 dark:text-white">{item.task.points}</td>
                          <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums text-stone-600 dark:text-stone-300">{formatDay(item.day)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile list */}
                <ul className="divide-y divide-stone-100 md:hidden dark:divide-stone-800">
                  {completed.map((item) => (
                    <li key={`${item.task.id}-${item.unit}`} className="px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 truncate text-sm font-semibold text-stone-900 dark:text-white">{employeeName(item.task.employeeId)}</p>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900 dark:text-white">
                          {item.task.points}
                          <span className="ml-1 text-xs font-medium text-stone-400">pts</span>
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-sm text-stone-700 dark:text-stone-300">{completionLabel(item)}</p>
                      <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
                        {teamName(item.task.teamId)} · {item.task.workTypeName} · {formatDay(item.day)}
                      </p>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
