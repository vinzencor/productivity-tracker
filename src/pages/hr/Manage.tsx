import { useMemo, useState } from 'react'
import { BriefcaseBusiness, Pencil, Plus, Trash2, Users } from 'lucide-react'

import { HrNav } from '../../components/HrNav'
import { getTaskPointsForTeam } from '../../lib/points'
import { useAppStore } from '../../store/appStore'

export function ManagePage() {
  const { teams, employees, workTypes, addTeam, addEmployee, addWorkType, deleteTeam, deleteEmployee, deleteWorkType, tasks, addTask, updateTask, deleteTask } = useAppStore()
  const [teamName, setTeamName] = useState('')
  const [employeeName, setEmployeeName] = useState('')
  const [employeeTeam, setEmployeeTeam] = useState<string>('')
  const [workTypeName, setWorkTypeName] = useState('')
  const [workTypeIcon, setWorkTypeIcon] = useState('✨')
  const [defaultPoints, setDefaultPoints] = useState(1)
  const [selectedWorkTypeTeams, setSelectedWorkTypeTeams] = useState<string[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskEmployeeId, setTaskEmployeeId] = useState('')
  const [taskWorkTypeId, setTaskWorkTypeId] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskTitle, setEditTaskTitle] = useState('')
  const [editTaskEmployeeId, setEditTaskEmployeeId] = useState('')
  const [editTaskWorkTypeId, setEditTaskWorkTypeId] = useState('')
  const [editTaskStatus, setEditTaskStatus] = useState<'pending' | 'completed'>('pending')

  const selectedEmployeeTeamId = employees.find((person) => person.id === taskEmployeeId)?.teamId ?? ''
  const taskWorkTypeOptions = workTypes.filter((workType) => {
    if (!selectedEmployeeTeamId) {
      return true
    }
    return !workType.allowedTeamIds || workType.allowedTeamIds.length === 0 || workType.allowedTeamIds.includes(selectedEmployeeTeamId)
  })

  const editingEmployeeTeamId = employees.find((person) => person.id === editTaskEmployeeId)?.teamId ?? ''
  const editingTaskWorkTypeOptions = workTypes.filter((workType) => {
    if (!editingEmployeeTeamId) {
      return true
    }
    return !workType.allowedTeamIds || workType.allowedTeamIds.length === 0 || workType.allowedTeamIds.includes(editingEmployeeTeamId)
  })

  const pointsByType = useMemo(
    () =>
      workTypes.map((workType) => ({
        ...workType,
        total: tasks
          .filter((task) => task.workTypeId === workType.id && task.status === 'completed')
          .reduce((sum, task) => sum + task.points, 0),
      })),
    [tasks, workTypes],
  )

  const hrAssignedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.createdBy === 'hr')
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [tasks],
  )

  const handleAddTeam = async () => {
    if (!teamName.trim()) return
    await addTeam(teamName.trim())
    setTeamName('')
  }

  const handleAddEmployee = async () => {
    if (!employeeName.trim() || !employeeTeam) return
    await addEmployee({
      name: employeeName.trim(),
      teamId: employeeTeam,
      active: true,
    })
    setEmployeeName('')
    setEmployeeTeam('')
  }

  const handleAddWorkType = async () => {
    if (!workTypeName.trim()) return
    await addWorkType({
      name: workTypeName.trim(),
      icon: workTypeIcon,
      defaultPoints,
      teamOverrides: {},
      allowedTeamIds: selectedWorkTypeTeams,
      active: true,
    })
    setWorkTypeName('')
    setWorkTypeIcon('✨')
    setDefaultPoints(1)
    setSelectedWorkTypeTeams([])
  }

  const handleAddTask = async () => {
    if (!taskTitle.trim() || !taskEmployeeId || !taskWorkTypeId) return

    const employee = employees.find((person) => person.id === taskEmployeeId)
    const workType = workTypes.find((type) => type.id === taskWorkTypeId)
    if (!employee || !workType) return

    if (workType.allowedTeamIds && workType.allowedTeamIds.length > 0 && !workType.allowedTeamIds.includes(employee.teamId)) {
      return
    }

    const taskPoints = getTaskPointsForTeam(workType, employee.teamId)

    await addTask({
      employeeId: employee.id,
      teamId: employee.teamId,
      workTypeId: workType.id,
      workTypeName: workType.name,
      title: taskTitle.trim(),
      status: 'pending',
      points: taskPoints,
      createdBy: 'hr',
    })

    setTaskTitle('')
    setTaskEmployeeId('')
    setTaskWorkTypeId('')
  }

  const handleStartEditTask = (task: (typeof tasks)[number]) => {
    setEditingTaskId(task.id)
    setEditTaskTitle(task.title)
    setEditTaskEmployeeId(task.employeeId)
    setEditTaskWorkTypeId(task.workTypeId)
    setEditTaskStatus(task.status)
  }

  const handleSaveTask = async () => {
    if (!editingTaskId || !editTaskTitle.trim() || !editTaskEmployeeId || !editTaskWorkTypeId) return

    const employee = employees.find((person) => person.id === editTaskEmployeeId)
    const workType = workTypes.find((type) => type.id === editTaskWorkTypeId)
    if (!employee || !workType) return

    if (workType.allowedTeamIds && workType.allowedTeamIds.length > 0 && !workType.allowedTeamIds.includes(employee.teamId)) {
      return
    }

    const task = tasks.find((item) => item.id === editingTaskId)
    const nextPoints = getTaskPointsForTeam(workType, employee.teamId)

    await updateTask(editingTaskId, {
      employeeId: employee.id,
      teamId: employee.teamId,
      workTypeId: workType.id,
      workTypeName: workType.name,
      title: editTaskTitle.trim(),
      points: nextPoints,
      status: editTaskStatus,
      completedDate: editTaskStatus === 'completed' ? task?.completedDate ?? new Date().toISOString().slice(0, 10) : undefined,
      completedAt: editTaskStatus === 'completed' ? task?.completedAt ?? new Date().toISOString() : undefined,
    })

    setEditingTaskId(null)
    setEditTaskTitle('')
    setEditTaskEmployeeId('')
    setEditTaskWorkTypeId('')
    setEditTaskStatus('pending')
  }

  const fieldClass = 'w-full rounded-xl border border-yellow-200 bg-yellow-50 px-3 py-2.5 text-sm text-stone-900 outline-none transition focus:border-yellow-400 dark:border-yellow-700 dark:bg-stone-800 dark:text-white'

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-stone-900 dark:bg-[#121214] dark:text-yellow-50">
      <HrNav />
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <header className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-yellow-700 dark:text-yellow-300">Setup</p>
            <h1 className="mt-1 text-3xl font-black text-stone-900 dark:text-white">Manage</h1>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="flex min-h-[420px] flex-col rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <BriefcaseBusiness className="text-yellow-600" size={18} />
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Teams</h2>
            </div>
            <div className="space-y-3">
              <input value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="New team" className={fieldClass} />
              <button type="button" onClick={handleAddTeam} className="w-full rounded-xl bg-yellow-400 px-4 py-2.5 font-bold text-stone-900 transition hover:bg-yellow-300">Add team</button>
            </div>
            <div className="mt-4 max-h-[250px] space-y-2 overflow-y-auto pr-1">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                  <span className="font-medium text-stone-800 dark:text-stone-200">{team.name}</span>
                  <button type="button" onClick={() => void deleteTeam(team.id)} className="text-red-500 transition hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-yellow-600" size={18} />
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Employees</h2>
            </div>
            <div className="space-y-3">
              <input value={employeeName} onChange={(event) => setEmployeeName(event.target.value)} placeholder="Employee name" className={fieldClass} />
              <select value={employeeTeam} onChange={(event) => setEmployeeTeam(event.target.value)} className={fieldClass}>
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <button type="button" onClick={handleAddEmployee} className="w-full rounded-xl bg-yellow-400 px-4 py-2.5 font-bold text-stone-900 transition hover:bg-yellow-300">Add employee</button>
            </div>
            <div className="mt-4 max-h-[250px] space-y-2 overflow-y-auto pr-1">
              {employees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                  <div>
                    <div className="font-medium text-stone-800 dark:text-stone-200">{employee.name}</div>
                    <div className="text-xs text-stone-500 dark:text-stone-300">{teams.find((team) => team.id === employee.teamId)?.name ?? 'Unknown'}</div>
                  </div>
                  <button type="button" onClick={() => void deleteEmployee(employee.id)} className="text-red-500 transition hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex min-h-[420px] flex-col rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="text-yellow-600" size={18} />
              <h2 className="text-xl font-bold text-stone-900 dark:text-white">Work types</h2>
            </div>
            <div className="space-y-3">
              <input value={workTypeName} onChange={(event) => setWorkTypeName(event.target.value)} placeholder="Work type name" className={fieldClass} />
              <input value={workTypeIcon} onChange={(event) => setWorkTypeIcon(event.target.value)} placeholder="Emoji icon" className={fieldClass} />
              <input type="number" min={0} value={defaultPoints} onChange={(event) => setDefaultPoints(Number(event.target.value))} className={fieldClass} />

              <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-2.5 dark:border-yellow-700 dark:bg-stone-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-300">Available to teams</p>
                <div className="max-h-[120px] space-y-2 overflow-y-auto pr-1">
                  {teams.map((team) => {
                    const checked = selectedWorkTypeTeams.includes(team.id)
                    return (
                      <label key={team.id} className="flex cursor-pointer items-center justify-between gap-3 rounded-lg bg-white px-2.5 py-2 dark:bg-stone-900">
                        <span className="text-sm font-medium text-stone-700 dark:text-stone-200">{team.name}</span>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setSelectedWorkTypeTeams((current) =>
                              current.includes(team.id) ? current.filter((item) => item !== team.id) : [...current, team.id],
                            )
                          }
                          className="h-4 w-4 accent-yellow-500"
                        />
                      </label>
                    )
                  })}
                </div>
                {selectedWorkTypeTeams.length === 0 ? (
                  <p className="mt-2 text-xs text-stone-500 dark:text-stone-300">No team selected = available to all teams.</p>
                ) : null}
              </div>

              <button type="button" onClick={handleAddWorkType} className="w-full rounded-xl bg-yellow-400 px-4 py-2.5 font-bold text-stone-900 transition hover:bg-yellow-300">Create work type</button>
            </div>

            <div className="mt-4 max-h-[180px] space-y-2 overflow-y-auto pr-1">
              {pointsByType.map((type) => (
                <div key={type.id} className="flex items-center justify-between rounded-xl bg-yellow-50 p-3 dark:bg-stone-800">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{type.icon}</span>
                    <div>
                      <div className="font-medium text-stone-800 dark:text-stone-200">{type.name}</div>
                      <div className="text-xs text-stone-500 dark:text-stone-300">{type.total} pts total</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => void deleteWorkType(type.id)} className="text-red-500 transition hover:text-red-600"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center gap-2">
            <Plus className="text-yellow-600" size={18} />
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">Assign task</h2>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <input
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Task title"
              className={fieldClass}
            />

            <select
              value={taskEmployeeId}
              onChange={(event) => setTaskEmployeeId(event.target.value)}
              className={fieldClass}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.name}</option>
              ))}
            </select>

            <select
              value={taskWorkTypeId}
              onChange={(event) => {
                setTaskWorkTypeId(event.target.value)
              }}
              className={fieldClass}
            >
              <option value="">Select work type</option>
              {taskWorkTypeOptions.map((workType) => (
                <option key={workType.id} value={workType.id}>{workType.name}</option>
              ))}
            </select>
          </div>

          <div className="mt-3">
            <button
              type="button"
              onClick={() => void handleAddTask()}
              className="w-full rounded-xl bg-yellow-400 px-4 py-2.5 font-bold text-stone-900 transition hover:bg-yellow-300"
            >
              Assign task to employee
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-200 bg-white p-4 shadow-sm dark:border-yellow-800 dark:bg-stone-900">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-stone-900 dark:text-white">All assigned tasks</h2>
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100">
              {hrAssignedTasks.length}
            </span>
          </div>

          <div className="space-y-3">
            {hrAssignedTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-yellow-300 bg-yellow-50 p-5 text-center text-sm text-stone-600 dark:border-yellow-700 dark:bg-stone-800 dark:text-stone-200">
                No tasks assigned yet.
              </div>
            ) : (
              hrAssignedTasks.map((task) => {
                const employee = employees.find((person) => person.id === task.employeeId)
                const team = teams.find((group) => group.id === task.teamId)
                return (
                  <div key={task.id} className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-700 dark:bg-stone-800">
                    {editingTaskId === task.id ? (
                      <div className="space-y-3">
                        <input value={editTaskTitle} onChange={(event) => setEditTaskTitle(event.target.value)} className={fieldClass} />
                        <div className="grid gap-3 md:grid-cols-3">
                          <select value={editTaskEmployeeId} onChange={(event) => setEditTaskEmployeeId(event.target.value)} className={fieldClass}>
                            <option value="">Select employee</option>
                            {employees.map((person) => (
                              <option key={person.id} value={person.id}>{person.name}</option>
                            ))}
                          </select>
                          <select value={editTaskWorkTypeId} onChange={(event) => setEditTaskWorkTypeId(event.target.value)} className={fieldClass}>
                            <option value="">Select work type</option>
                            {editingTaskWorkTypeOptions.map((workType) => (
                              <option key={workType.id} value={workType.id}>{workType.name}</option>
                            ))}
                          </select>
                          <select value={editTaskStatus} onChange={(event) => setEditTaskStatus(event.target.value as 'pending' | 'completed')} className={fieldClass}>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => void handleSaveTask()} className="rounded-lg bg-yellow-400 px-3 py-2 text-sm font-bold text-stone-900 hover:bg-yellow-300">Save</button>
                          <button type="button" onClick={() => setEditingTaskId(null)} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="font-semibold text-stone-900 dark:text-white">{task.title}</div>
                          <div className="text-xs text-stone-500 dark:text-stone-300">
                            {employee?.name ?? 'Unknown'} • {team?.name ?? 'Unknown team'} • {task.workTypeName}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-semibold ${
                              task.status === 'completed'
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-100'
                            }`}
                          >
                            {task.status === 'completed' ? 'Completed' : 'Pending'}
                          </span>
                          <button type="button" onClick={() => handleStartEditTask(task)} className="rounded-lg border border-stone-300 bg-white p-2 text-stone-700 hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200">
                            <Pencil size={14} />
                          </button>
                          <button type="button" onClick={() => void deleteTask(task.id)} className="rounded-lg border border-red-200 bg-red-50 p-2 text-red-500 hover:bg-red-100 dark:border-red-800 dark:bg-red-950/30">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
