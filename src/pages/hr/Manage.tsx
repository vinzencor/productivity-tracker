import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { addDays, format, parseISO, subDays } from 'date-fns'
import { Briefcase, ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, Shapes, Trash, UserRound, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useSearchParams } from 'react-router-dom'

import { Avatar } from '../../components/Avatar'
import { Card } from '../../components/Card'
import { ConfirmDialog, type ConfirmRequest } from '../../components/ConfirmDialog'
import { EmptyState } from '../../components/EmptyState'
import { SectionLoader, Spinner } from '../../components/Loader'
import { PageHeader } from '../../components/PageHeader'
import { SearchInput } from '../../components/SearchInput'
import { SegmentedControl } from '../../components/SegmentedControl'
import { StatusBadge } from '../../components/StatusBadge'
import { completionTimestamp, dayKey, formatDay, relativeDayLabel, todayKey } from '../../lib/dates'
import { errorMessage } from '../../lib/errors'
import { getTaskPointsForTeam } from '../../lib/points'
import { useAppStore } from '../../store/appStore'
import type { Employee, Task, TaskStatus, Team, WorkType } from '../../types'

type TabKey = 'tasks' | 'employees' | 'teams' | 'work-types'
type RequestConfirm = (request: ConfirmRequest) => void

const TAB_KEYS: TabKey[] = ['tasks', 'employees', 'teams', 'work-types']

async function runAction(action: () => Promise<unknown>, successMessage: string) {
  try {
    await action()
    toast.success(successMessage)
    return true
  } catch (error) {
    console.error(error)
    toast.error(errorMessage(error))
    return false
  }
}

const isAllowedForTeam = (workType: WorkType, teamId: string) =>
  !teamId || !workType.allowedTeamIds || workType.allowedTeamIds.length === 0 || workType.allowedTeamIds.includes(teamId)

const matches = (query: string, ...values: (string | undefined)[]) => {
  const needle = query.trim().toLowerCase()
  return !needle || values.some((value) => value?.toLowerCase().includes(needle))
}

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs text-stone-500 dark:text-stone-400">{hint}</p> : null}
    </div>
  )
}

function SubmitButton({ busy, disabled, children }: { busy: boolean; disabled: boolean; children: ReactNode }) {
  return (
    <button type="submit" disabled={busy || disabled} className="btn btn-primary w-full">
      {busy ? <Spinner size={16} /> : <Plus size={16} />}
      {children}
    </button>
  )
}

function SplitLayout({ form, list }: { form: ReactNode; list: ReactNode }) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-8">{form}</div>
      {list}
    </div>
  )
}

function ListToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-stone-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5 dark:border-stone-800">
      {children}
    </div>
  )
}

function EmployeeOptions({ employees, teams }: { employees: Employee[]; teams: Team[] }) {
  const unassigned = employees.filter((employee) => !teams.some((team) => team.id === employee.teamId))
  return (
    <>
      {teams.map((team) => {
        const members = employees.filter((employee) => employee.teamId === team.id)
        return members.length ? (
          <optgroup key={team.id} label={team.name}>
            {members.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </optgroup>
        ) : null
      })}
      {unassigned.length ? (
        <optgroup label="No team">
          {unassigned.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </>
  )
}

export function ManagePage() {
  const loaded = useAppStore((state) => state.loaded)
  const taskCount = useAppStore((state) => state.tasks.filter((task) => task.createdBy === 'hr').length)
  const employeeCount = useAppStore((state) => state.employees.length)
  const teamCount = useAppStore((state) => state.teams.length)
  const workTypeCount = useAppStore((state) => state.workTypes.length)
  const [searchParams, setSearchParams] = useSearchParams()
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null)

  const tabParam = searchParams.get('tab') as TabKey | null
  const tab: TabKey = tabParam && TAB_KEYS.includes(tabParam) ? tabParam : 'tasks'

  const handleTabChange = (next: TabKey) => {
    setSearchParams(next === 'tasks' ? {} : { tab: next }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manage" description="Assign tasks and set up employees, teams and work types." />

      <div>
        <SegmentedControl
          label="Manage sections"
          value={tab}
          onChange={handleTabChange}
          fullWidth
          options={[
            { value: 'tasks', label: 'Tasks', icon: ClipboardList, count: taskCount },
            { value: 'employees', label: 'Employees', icon: Users, count: employeeCount },
            { value: 'teams', label: 'Teams', icon: Briefcase, count: teamCount },
            { value: 'work-types', label: 'Work types', icon: Shapes, count: workTypeCount },
          ]}
        />
      </div>

      {!loaded ? (
        <SectionLoader />
      ) : tab === 'tasks' ? (
        <TasksTab onConfirm={setConfirmRequest} />
      ) : tab === 'employees' ? (
        <EmployeesTab onConfirm={setConfirmRequest} />
      ) : tab === 'teams' ? (
        <TeamsTab onConfirm={setConfirmRequest} />
      ) : (
        <WorkTypesTab onConfirm={setConfirmRequest} />
      )}

      <ConfirmDialog request={confirmRequest} onClose={() => setConfirmRequest(null)} />
    </div>
  )
}

/* ------------------------------------------------------------------ Tasks */

const ALL_DATES = 'all'

type DateBarProps = {
  value: string
  onChange: (value: string) => void
  countFor: (day: string) => number
  total: number
}

function DateBar({ value, onChange, countFor, total }: DateBarProps) {
  const quickDays = [0, 1, 2].map((offset) => dayKey(subDays(new Date(), offset)))
  const shift = (days: number) => onChange(dayKey(addDays(parseISO(value === ALL_DATES ? todayKey() : value), days)))

  return (
    <section className="card flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-center gap-2">
        <button type="button" onClick={() => shift(-1)} className="btn btn-secondary btn-icon h-10 w-10" aria-label="Previous day" title="Previous day">
          <ChevronLeft size={16} />
        </button>
        <label htmlFor="task-day" className="sr-only">
          Show tasks for date
        </label>
        <input
          id="task-day"
          type="date"
          value={value === ALL_DATES ? '' : value}
          onChange={(event) => onChange(event.target.value || ALL_DATES)}
          className="field flex-1 sm:w-44 sm:flex-none"
        />
        <button type="button" onClick={() => shift(1)} className="btn btn-secondary btn-icon h-10 w-10" aria-label="Next day" title="Next day">
          <ChevronRight size={16} />
        </button>
      </div>
      {/* Natural-width tabs so "Yesterday" isn't truncated on narrow phones. */}
      <div className="min-w-0">
        <SegmentedControl
          label="Quick dates"
          value={value}
          onChange={onChange}
          options={[
            ...quickDays.map((day, index) => ({
              value: day,
              label: index < 2 ? relativeDayLabel(day) : format(parseISO(day), 'EEE d'),
              count: countFor(day),
            })),
            { value: ALL_DATES, label: 'All dates', count: total },
          ]}
        />
      </div>
    </section>
  )
}

function TasksTab({ onConfirm }: { onConfirm: RequestConfirm }) {
  const teams = useAppStore((state) => state.teams)
  const employees = useAppStore((state) => state.employees)
  const workTypes = useAppStore((state) => state.workTypes)
  const tasks = useAppStore((state) => state.tasks)
  const addTask = useAppStore((state) => state.addTask)
  const deleteTask = useAppStore((state) => state.deleteTask)

  const [title, setTitle] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [workTypeId, setWorkTypeId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | TaskStatus>('all')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  // `dateFilter` picks which day the list shows; `taskDate` is the day new tasks are assigned to and follows it.
  const [dateFilter, setDateFilter] = useState(() => todayKey())
  const [taskDate, setTaskDate] = useState(() => todayKey())

  const employee = employees.find((person) => person.id === employeeId)
  const workTypeOptions = workTypes.filter((workType) => workType.active && isAllowedForTeam(workType, employee?.teamId ?? ''))
  const workType = workTypes.find((type) => type.id === workTypeId)
  const previewPoints = employee && workType ? getTaskPointsForTeam(workType, employee.teamId) : null

  const hrTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.createdBy === 'hr')
        .sort(
          (left, right) =>
            right.taskDate.localeCompare(left.taskDate) || new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
    [tasks],
  )

  const dayTasks = dateFilter === ALL_DATES ? hrTasks : hrTasks.filter((task) => task.taskDate === dateFilter)

  const visibleTasks = dayTasks.filter((task) => {
    const person = employees.find((item) => item.id === task.employeeId)
    return (statusFilter === 'all' || task.status === statusFilter) && matches(search, task.title, task.workTypeName, person?.name)
  })

  const handleDateFilterChange = (next: string) => {
    setDateFilter(next)
    if (next !== ALL_DATES) setTaskDate(next)
    setEditingTaskId(null)
  }

  const handleEmployeeChange = (nextEmployeeId: string) => {
    setEmployeeId(nextEmployeeId)
    const nextTeamId = employees.find((person) => person.id === nextEmployeeId)?.teamId ?? ''
    if (workType && !isAllowedForTeam(workType, nextTeamId)) setWorkTypeId('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !employee || !workType || !taskDate) return

    setSaving(true)
    const ok = await runAction(
      () =>
        addTask({
          employeeId: employee.id,
          teamId: employee.teamId,
          workTypeId: workType.id,
          workTypeName: workType.name,
          title: title.trim(),
          status: 'pending',
          points: getTaskPointsForTeam(workType, employee.teamId),
          taskDate,
          createdBy: 'hr',
        }),
      `Task assigned to ${employee.name}${taskDate === todayKey() ? '' : ` for ${formatDay(taskDate)}`}`,
    )
    setSaving(false)
    if (ok) {
      setTitle('')
      setWorkTypeId('')
      // Jump the list to the day the task went to so HR sees it straight away.
      if (dateFilter !== ALL_DATES && dateFilter !== taskDate) setDateFilter(taskDate)
    }
  }

  const pendingCount = dayTasks.filter((task) => task.status === 'pending').length
  const showingAll = dateFilter === ALL_DATES
  const summary = `${plural(dayTasks.length, 'task')} · ${pendingCount} pending`

  return (
    <div className="space-y-6">
      <DateBar
        value={dateFilter}
        onChange={handleDateFilterChange}
        countFor={(day) => hrTasks.filter((task) => task.taskDate === day).length}
        total={hrTasks.length}
      />
      <SplitLayout
        form={
          <Card title="Assign task" description="Create a task for an employee" icon={Plus}>
            {employees.length === 0 || workTypes.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Set up first"
                description="Add at least one employee and one work type before assigning tasks."
              />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Date" htmlFor="task-date">
                  <input
                    id="task-date"
                    type="date"
                    value={taskDate}
                    onChange={(event) => setTaskDate(event.target.value)}
                    className="field"
                  />
                </Field>
                <Field label="Task title" htmlFor="task-title">
                  <input
                    id="task-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="e.g. Diwali campaign poster"
                    className="field"
                  />
                </Field>
                <Field label="Employee" htmlFor="task-employee">
                  <select id="task-employee" value={employeeId} onChange={(event) => handleEmployeeChange(event.target.value)} className="field">
                    <option value="">Select employee</option>
                    <EmployeeOptions employees={employees} teams={teams} />
                  </select>
                </Field>
                <Field label="Work type" htmlFor="task-work-type" hint={employee ? undefined : 'Pick an employee to see the work types for their team.'}>
                  <select id="task-work-type" value={workTypeId} onChange={(event) => setWorkTypeId(event.target.value)} className="field">
                    <option value="">Select work type</option>
                    {workTypeOptions.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <div className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2.5 text-sm dark:bg-stone-800/60">
                  <span className="text-stone-500 dark:text-stone-400">Points on completion</span>
                  <span className="font-semibold tabular-nums text-stone-900 dark:text-white">{previewPoints ?? '—'}</span>
                </div>
                <SubmitButton busy={saving} disabled={!title.trim() || !employee || !workType || !taskDate}>
                  Assign task
                </SubmitButton>
              </form>
            )}
          </Card>
        }
        list={
          <Card
            title={showingAll ? 'All tasks' : `Tasks · ${relativeDayLabel(dateFilter)}`}
            description={showingAll ? summary : `${formatDay(dateFilter)} · ${summary}`}
            icon={ClipboardList}
            bodyClassName="p-0"
          >
            <ListToolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="Search tasks or employees" className="sm:max-w-xs sm:flex-1" />
              <SegmentedControl
                label="Filter by status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'completed', label: 'Completed' },
                ]}
              />
            </ListToolbar>

            {visibleTasks.length === 0 ? (
              <div className="p-4 sm:p-5">
                <EmptyState
                  icon={ClipboardList}
                  title={dayTasks.length > 0 ? 'No matching tasks' : showingAll ? 'No tasks assigned yet' : 'No tasks on this day'}
                  description={
                    dayTasks.length > 0
                      ? 'Try a different search or filter.'
                      : showingAll
                        ? 'Assigned tasks will appear here.'
                        : 'Assign one with the form, or pick another date.'
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-stone-100 dark:divide-stone-800">
                {visibleTasks.map((task) =>
                  editingTaskId === task.id ? (
                    <TaskEditor key={task.id} task={task} onDone={() => setEditingTaskId(null)} />
                  ) : (
                    <TaskRow
                      key={task.id}
                      task={task}
                      showDate={showingAll}
                      employeeName={employees.find((person) => person.id === task.employeeId)?.name ?? 'Unknown employee'}
                      teamName={teams.find((team) => team.id === task.teamId)?.name ?? 'No team'}
                      icon={workTypes.find((type) => type.id === task.workTypeId)?.icon}
                      onEdit={() => setEditingTaskId(task.id)}
                      onDelete={() =>
                        onConfirm({
                          title: 'Delete this task?',
                          description: `"${task.title}" will be permanently removed. This can't be undone.`,
                          onConfirm: async () => {
                            await deleteTask(task.id)
                            toast.success('Task deleted')
                          },
                        })
                      }
                    />
                  ),
                )}
              </ul>
            )}
          </Card>
        }
      />
    </div>
  )
}

type TaskRowProps = {
  task: Task
  showDate: boolean
  employeeName: string
  teamName: string
  icon?: string
  onEdit: () => void
  onDelete: () => void
}

function TaskRow({ task, showDate, employeeName, teamName, icon, onEdit, onDelete }: TaskRowProps) {
  const completedOtherDay = task.status === 'completed' && task.completedDate && task.completedDate !== task.taskDate
  return (
    <li className="flex items-start gap-3 px-4 py-3.5 sm:items-center sm:px-5">
      <span className="icon-tile h-10 w-10 text-lg">{icon ?? '✨'}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{task.title || task.workTypeName}</p>
          <p className="mt-0.5 truncate text-xs text-stone-500 dark:text-stone-400">
            {showDate ? `${formatDay(task.taskDate)} · ` : null}
            {employeeName} · {teamName} · {task.workTypeName}
            {completedOtherDay ? ` · done ${formatDay(task.completedDate)}` : null}
          </p>
        </div>
        <div className="flex items-center gap-3 sm:shrink-0">
          <StatusBadge status={task.status} />
          <span className="text-sm font-semibold tabular-nums text-stone-900 sm:w-14 sm:text-right dark:text-white">
            {task.points}
            <span className="ml-1 text-xs font-medium text-stone-400">pts</span>
          </span>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <button type="button" onClick={onEdit} className="btn btn-ghost btn-icon" aria-label={`Edit ${task.title}`} title="Edit">
              <Pencil size={15} />
            </button>
            <button type="button" onClick={onDelete} className="btn btn-ghost-danger btn-icon" aria-label={`Delete ${task.title}`} title="Delete">
              <Trash size={15} />
            </button>
          </div>
        </div>
      </div>
    </li>
  )
}

function TaskEditor({ task, onDone }: { task: Task; onDone: () => void }) {
  const teams = useAppStore((state) => state.teams)
  const employees = useAppStore((state) => state.employees)
  const workTypes = useAppStore((state) => state.workTypes)
  const updateTask = useAppStore((state) => state.updateTask)

  const [title, setTitle] = useState(task.title)
  const [employeeId, setEmployeeId] = useState(task.employeeId)
  const [workTypeId, setWorkTypeId] = useState(task.workTypeId)
  const [status, setStatus] = useState<TaskStatus>(task.status)
  const [taskDate, setTaskDate] = useState(task.taskDate)
  // Default a new completion to the task's own day (or today for a future task) so backfilled work lands on the right day.
  const [completedDate, setCompletedDate] = useState(() => task.completedDate ?? (task.taskDate < todayKey() ? task.taskDate : todayKey()))
  const [saving, setSaving] = useState(false)

  const employee = employees.find((person) => person.id === employeeId)
  const workType = workTypes.find((type) => type.id === workTypeId)
  const workTypeOptions = workTypes.filter((type) => type.id === task.workTypeId || isAllowedForTeam(type, employee?.teamId ?? ''))
  const completed = status === 'completed'
  const completedDateValid = !completed || Boolean(completedDate && completedDate <= todayKey())
  const valid = Boolean(title.trim() && taskDate && completedDateValid && employee && workType && isAllowedForTeam(workType, employee.teamId))

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || !employee || !workType) return

    // Keep the original timestamp unless HR moved the completion to another day.
    const completedAt = !completed
      ? undefined
      : completedDate === task.completedDate && task.completedAt
        ? task.completedAt
        : completionTimestamp(completedDate)

    setSaving(true)
    const ok = await runAction(
      () =>
        updateTask(task.id, {
          employeeId: employee.id,
          teamId: employee.teamId,
          workTypeId: workType.id,
          workTypeName: workType.name,
          title: title.trim(),
          points: getTaskPointsForTeam(workType, employee.teamId),
          taskDate,
          status,
          completedDate: completed ? completedDate : undefined,
          completedAt,
        }),
      'Task updated',
    )
    setSaving(false)
    if (ok) onDone()
  }

  const id = `edit-${task.id}`

  return (
    <li className="bg-stone-50/70 px-4 py-4 sm:px-5 dark:bg-stone-800/30">
      <form onSubmit={handleSave} className="space-y-3">
        <Field label="Task title" htmlFor={`${id}-title`}>
          <input id={`${id}-title`} value={title} onChange={(event) => setTitle(event.target.value)} className="field" autoFocus />
        </Field>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Employee" htmlFor={`${id}-employee`}>
            <select id={`${id}-employee`} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className="field">
              <option value="">Select employee</option>
              <EmployeeOptions employees={employees} teams={teams} />
            </select>
          </Field>
          <Field label="Work type" htmlFor={`${id}-type`}>
            <select id={`${id}-type`} value={workTypeId} onChange={(event) => setWorkTypeId(event.target.value)} className="field">
              <option value="">Select work type</option>
              {workTypeOptions.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.icon} {type.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status" htmlFor={`${id}-status`}>
            <select id={`${id}-status`} value={status} onChange={(event) => setStatus(event.target.value as TaskStatus)} className="field">
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Date" htmlFor={`${id}-date`}>
            <input id={`${id}-date`} type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} className="field" />
          </Field>
          {completed ? (
            <Field label="Completed on" htmlFor={`${id}-completed`} hint="Reports count the points on this day.">
              <input
                id={`${id}-completed`}
                type="date"
                max={todayKey()}
                value={completedDate}
                onChange={(event) => setCompletedDate(event.target.value)}
                className="field"
              />
            </Field>
          ) : null}
        </div>
        {employee && workType && !isAllowedForTeam(workType, employee.teamId) ? (
          <p className="text-xs font-medium text-red-600 dark:text-red-400">This work type isn't available for {employee.name}'s team.</p>
        ) : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onDone} disabled={saving} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" disabled={saving || !valid} className="btn btn-primary">
            {saving ? <Spinner size={16} /> : null}
            Save changes
          </button>
        </div>
      </form>
    </li>
  )
}

/* -------------------------------------------------------------- Employees */

function EmployeesTab({ onConfirm }: { onConfirm: RequestConfirm }) {
  const teams = useAppStore((state) => state.teams)
  const employees = useAppStore((state) => state.employees)
  const tasks = useAppStore((state) => state.tasks)
  const addEmployee = useAppStore((state) => state.addEmployee)
  const deleteEmployee = useAppStore((state) => state.deleteEmployee)

  const [name, setName] = useState('')
  const [teamId, setTeamId] = useState('')
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const visibleEmployees = employees.filter((employee) =>
    matches(search, employee.name, teams.find((team) => team.id === employee.teamId)?.name),
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !teamId) return
    if (employees.some((employee) => employee.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`${trimmed} already exists`)
      return
    }

    setSaving(true)
    const ok = await runAction(() => addEmployee({ name: trimmed, teamId, active: true }), `${trimmed} added`)
    setSaving(false)
    if (ok) setName('')
  }

  return (
    <SplitLayout
      form={
        <Card title="Add employee" description="Employees pick their name on the workspace" icon={UserRound}>
          {teams.length === 0 ? (
            <EmptyState icon={Briefcase} title="Create a team first" description="Every employee belongs to a team." />
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Full name" htmlFor="employee-name">
                <input
                  id="employee-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Priya Menon"
                  autoComplete="off"
                  className="field"
                />
              </Field>
              <Field label="Team" htmlFor="employee-team">
                <select id="employee-team" value={teamId} onChange={(event) => setTeamId(event.target.value)} className="field">
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </Field>
              <SubmitButton busy={saving} disabled={!name.trim() || !teamId}>
                Add employee
              </SubmitButton>
            </form>
          )}
        </Card>
      }
      list={
        <Card title="Employees" description={plural(employees.length, 'person')} icon={Users} bodyClassName="p-0">
          <ListToolbar>
            <SearchInput value={search} onChange={setSearch} placeholder="Search by name or team" className="sm:max-w-xs sm:flex-1" />
          </ListToolbar>
          {visibleEmployees.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState
                icon={Users}
                title={employees.length === 0 ? 'No employees yet' : 'No matching employees'}
                description={employees.length === 0 ? 'Added employees will appear here.' : 'Try a different search.'}
              />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {visibleEmployees.map((employee) => {
                const employeeTasks = tasks.filter((task) => task.employeeId === employee.id)
                const points = employeeTasks.filter((task) => task.status === 'completed').reduce((sum, task) => sum + task.points, 0)
                return (
                  <li key={employee.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <Avatar name={employee.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{employee.name}</p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {teams.find((team) => team.id === employee.teamId)?.name ?? 'No team'} · {plural(employeeTasks.length, 'task')}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-stone-900 dark:text-white">
                      {points.toLocaleString()}
                      <span className="ml-1 text-xs font-medium text-stone-400">pts</span>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onConfirm({
                          title: `Delete ${employee.name}?`,
                          description:
                            employeeTasks.length > 0
                              ? `This also deletes their ${plural(employeeTasks.length, 'task')}. This can't be undone.`
                              : "This can't be undone.",
                          onConfirm: async () => {
                            await deleteEmployee(employee.id)
                            toast.success(`${employee.name} deleted`)
                          },
                        })
                      }
                      className="btn btn-ghost-danger btn-icon"
                      aria-label={`Delete ${employee.name}`}
                      title="Delete"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      }
    />
  )
}

/* ------------------------------------------------------------------ Teams */

function TeamsTab({ onConfirm }: { onConfirm: RequestConfirm }) {
  const teams = useAppStore((state) => state.teams)
  const employees = useAppStore((state) => state.employees)
  const addTeam = useAppStore((state) => state.addTeam)
  const deleteTeam = useAppStore((state) => state.deleteTeam)

  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (teams.some((team) => team.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`A team named ${trimmed} already exists`)
      return
    }

    setSaving(true)
    const ok = await runAction(() => addTeam(trimmed), `${trimmed} team created`)
    setSaving(false)
    if (ok) setName('')
  }

  return (
    <SplitLayout
      form={
        <Card title="Create team" description="Group employees and tailor work types" icon={Briefcase}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Team name" htmlFor="team-name">
              <input
                id="team-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Creative"
                autoComplete="off"
                className="field"
              />
            </Field>
            <SubmitButton busy={saving} disabled={!name.trim()}>
              Create team
            </SubmitButton>
          </form>
        </Card>
      }
      list={
        <Card title="Teams" description={plural(teams.length, 'team')} icon={Briefcase} bodyClassName="p-0">
          {teams.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState icon={Briefcase} title="No teams yet" description="Created teams will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {teams.map((team) => {
                const memberCount = employees.filter((employee) => employee.teamId === team.id).length
                return (
                  <li key={team.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="icon-tile h-10 w-10">
                      <Briefcase size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{team.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">{plural(memberCount, 'member')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onConfirm({
                          title: `Delete ${team.name}?`,
                          description:
                            memberCount > 0
                              ? `${plural(memberCount, 'employee')} will be left without a team. This can't be undone.`
                              : "This can't be undone.",
                          onConfirm: async () => {
                            await deleteTeam(team.id)
                            toast.success(`${team.name} deleted`)
                          },
                        })
                      }
                      className="btn btn-ghost-danger btn-icon"
                      aria-label={`Delete ${team.name}`}
                      title="Delete"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      }
    />
  )
}

/* ------------------------------------------------------------- Work types */

function WorkTypesTab({ onConfirm }: { onConfirm: RequestConfirm }) {
  const teams = useAppStore((state) => state.teams)
  const workTypes = useAppStore((state) => state.workTypes)
  const tasks = useAppStore((state) => state.tasks)
  const addWorkType = useAppStore((state) => state.addWorkType)
  const deleteWorkType = useAppStore((state) => state.deleteWorkType)

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('✨')
  const [points, setPoints] = useState('1')
  const [teamIds, setTeamIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const parsedPoints = Number(points)
  const pointsValid = points.trim() !== '' && Number.isFinite(parsedPoints) && parsedPoints >= 0

  const toggleTeam = (teamId: string) =>
    setTeamIds((current) => (current.includes(teamId) ? current.filter((item) => item !== teamId) : [...current, teamId]))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed || !pointsValid) return
    if (workTypes.some((type) => type.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`${trimmed} already exists`)
      return
    }

    setSaving(true)
    const ok = await runAction(
      () =>
        addWorkType({
          name: trimmed,
          icon: icon.trim() || '✨',
          defaultPoints: parsedPoints,
          teamOverrides: {},
          allowedTeamIds: teamIds,
          active: true,
        }),
      `${trimmed} created`,
    )
    setSaving(false)
    if (ok) {
      setName('')
      setIcon('✨')
      setPoints('1')
      setTeamIds([])
    }
  }

  return (
    <SplitLayout
      form={
        <Card title="Create work type" description="Define what work is worth" icon={Shapes}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Name" htmlFor="work-type-name">
              <input
                id="work-type-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Ad poster"
                autoComplete="off"
                className="field"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Icon" htmlFor="work-type-icon">
                <input id="work-type-icon" value={icon} onChange={(event) => setIcon(event.target.value)} placeholder="✨" className="field" />
              </Field>
              <Field label="Points" htmlFor="work-type-points">
                <input
                  id="work-type-points"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={points}
                  onChange={(event) => setPoints(event.target.value)}
                  className="field"
                />
              </Field>
            </div>
            <div>
              <p className="label">Available to</p>
              {teams.length === 0 ? (
                <p className="text-xs text-stone-500 dark:text-stone-400">No teams yet — this work type will be available to everyone.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((team) => {
                      const selected = teamIds.includes(team.id)
                      return (
                        <button
                          key={team.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => toggleTeam(team.id)}
                          className={`h-8 rounded-full border px-3 text-sm font-medium transition-colors ${
                            selected
                              ? 'border-yellow-400 bg-yellow-400 text-stone-900'
                              : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:text-stone-900 dark:border-stone-700 dark:bg-stone-950 dark:text-stone-300 dark:hover:text-white'
                          }`}
                        >
                          {team.name}
                        </button>
                      )
                    })}
                  </div>
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
                    {teamIds.length === 0 ? 'No team selected — available to all teams.' : `Only ${plural(teamIds.length, 'team')} can use this.`}
                  </p>
                </>
              )}
            </div>
            <SubmitButton busy={saving} disabled={!name.trim() || !pointsValid}>
              Create work type
            </SubmitButton>
          </form>
        </Card>
      }
      list={
        <Card title="Work types" description={plural(workTypes.length, 'type')} icon={Shapes} bodyClassName="p-0">
          {workTypes.length === 0 ? (
            <div className="p-4 sm:p-5">
              <EmptyState icon={Shapes} title="No work types yet" description="Created work types will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-stone-100 dark:divide-stone-800">
              {workTypes.map((type) => {
                const earned = tasks
                  .filter((task) => task.workTypeId === type.id && task.status === 'completed')
                  .reduce((sum, task) => sum + task.points, 0)
                const allowed = type.allowedTeamIds?.length
                  ? type.allowedTeamIds.map((teamId) => teams.find((team) => team.id === teamId)?.name).filter(Boolean).join(', ')
                  : 'All teams'
                return (
                  <li key={type.id} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                    <span className="icon-tile h-10 w-10 text-lg">{type.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">{type.name}</p>
                      <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                        {plural(type.defaultPoints, 'pt')} each · {allowed || 'All teams'}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-sm font-semibold tabular-nums text-stone-900 dark:text-white">{earned.toLocaleString()}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">pts earned</p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onConfirm({
                          title: `Delete ${type.name}?`,
                          description: "It won't be available for new tasks. Existing tasks keep their history.",
                          onConfirm: async () => {
                            await deleteWorkType(type.id)
                            toast.success(`${type.name} deleted`)
                          },
                        })
                      }
                      className="btn btn-ghost-danger btn-icon"
                      aria-label={`Delete ${type.name}`}
                      title="Delete"
                    >
                      <Trash size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>
      }
    />
  )
}
