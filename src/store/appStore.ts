import { collection, deleteDoc, deleteField, doc, increment, onSnapshot, setDoc, writeBatch } from 'firebase/firestore'
import { create } from 'zustand'

import { db } from '../firebase'
import { earnedPoints, progressFields } from '../lib/completions'
import { dayKey } from '../lib/dates'
import { getTaskPointsForTeam } from '../lib/points'
import type { DemoData, Employee, Task, Team, WorkType } from '../types'

const EMPTY_DATA: DemoData = {
  teams: [],
  employees: [],
  workTypes: [],
  tasks: [],
}

const EMPLOYEE_KEY = 'productivity-quest-employee'

function readStoredEmployeeId() {
  try {
    return localStorage.getItem(EMPLOYEE_KEY)
  } catch {
    return null
  }
}

function storeEmployeeId(employeeId: string | null) {
  try {
    if (employeeId) {
      localStorage.setItem(EMPLOYEE_KEY, employeeId)
    } else {
      localStorage.removeItem(EMPLOYEE_KEY)
    }
  } catch {
    // Storage can be unavailable (private mode); selection still works for this session.
  }
}

// Firestore rejects `undefined` values, so clear those fields explicitly instead.
function toFirestoreUpdate(data: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(data)
      .filter(([key]) => key !== 'id')
      .map(([key, value]) => [key, value === undefined ? deleteField() : value]),
  )
}

export type AuthStatus = 'loading' | 'ready'

type AppState = DemoData & {
  loaded: boolean
  selectedEmployeeId: string | null
  authStatus: AuthStatus
  adminLoggedIn: boolean
  adminEmail: string | null
  firebaseUnsubscribe: (() => void) | undefined
  setSelectedEmployeeId: (employeeId: string | null) => void
  setAuthState: (auth: { isAdmin: boolean; email: string | null }) => void
  startRealtimeSync: () => (() => void) | undefined
  stopRealtimeSync: () => void
  addTeam: (name: string) => Promise<Team>
  addEmployee: (employee: Omit<Employee, 'id' | 'totalPoints' | 'createdAt'>) => Promise<Employee>
  addWorkType: (workType: Omit<WorkType, 'id' | 'createdAt'>) => Promise<WorkType>
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>
  completeTask: (taskId: string) => Promise<number | undefined>
  revertTask: (taskId: string) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  deleteTeam: (teamId: string) => Promise<void>
  deleteEmployee: (employeeId: string) => Promise<void>
  deleteWorkType: (workTypeId: string) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
}

const mapTeam = (data: Record<string, unknown> & { id?: string }): Team => ({
  id: (data.id as string) ?? '',
  name: (data.name as string) ?? '',
  createdAt: (data.createdAt as string) ?? new Date().toISOString(),
})

const mapEmployee = (data: Record<string, unknown> & { id?: string }): Employee => ({
  id: (data.id as string) ?? '',
  name: (data.name as string) ?? '',
  teamId: (data.teamId as string) ?? '',
  active: Boolean(data.active),
  totalPoints: Number(data.totalPoints ?? 0),
  createdAt: (data.createdAt as string) ?? new Date().toISOString(),
})

const mapWorkType = (data: Record<string, unknown> & { id?: string }): WorkType => ({
  id: (data.id as string) ?? '',
  name: (data.name as string) ?? '',
  icon: (data.icon as string) ?? '✨',
  defaultPoints: Number(data.defaultPoints ?? 0),
  teamOverrides: (data.teamOverrides as Record<string, number>) ?? {},
  allowedTeamIds: Array.isArray(data.allowedTeamIds) ? (data.allowedTeamIds as string[]) : [],
  active: Boolean(data.active),
  createdAt: (data.createdAt as string) ?? new Date().toISOString(),
})

const mapTask = (data: Record<string, unknown> & { id?: string }): Task => {
  const createdAt = (data.createdAt as string) ?? new Date().toISOString()
  const completedAt = (data.completedAt as string | undefined) ?? undefined
  const completedDate = (data.completedDate as string | undefined) ?? undefined
  const count = Math.max(1, Math.floor(Number(data.count ?? 1)) || 1)
  const storedStatus = (data.status as Task['status']) ?? 'pending'
  // Multi-count tasks store every completion; single tasks (and all older tasks) only store status + completedAt.
  const completions =
    count > 1 && Array.isArray(data.completions)
      ? (data.completions as unknown[]).filter((value): value is string => typeof value === 'string')
      : storedStatus === 'completed'
        ? [completedAt ?? (completedDate ? new Date(`${completedDate}T12:00:00`).toISOString() : createdAt)]
        : []
  return {
    id: (data.id as string) ?? '',
    employeeId: (data.employeeId as string) ?? '',
    teamId: (data.teamId as string) ?? '',
    workTypeId: (data.workTypeId as string) ?? '',
    workTypeName: (data.workTypeName as string) ?? '',
    title: (data.title as string) ?? '',
    status: completions.length >= count ? 'completed' : 'pending',
    points: Number(data.points ?? 0),
    count,
    completions,
    // Tasks created before dates could be picked belong to the day they were created.
    taskDate: (data.taskDate as string | undefined) ?? dayKey(createdAt),
    createdAt,
    completedAt,
    completedDate,
    createdBy: (data.createdBy as Task['createdBy']) ?? 'hr',
  }
}

const byName = <T extends { name: string }>(left: T, right: T) => left.name.localeCompare(right.name)

export const useAppStore = create<AppState>()((set, get) => ({
  ...EMPTY_DATA,
  loaded: false,
  selectedEmployeeId: readStoredEmployeeId(),
  authStatus: 'loading',
  adminLoggedIn: false,
  adminEmail: null,
  firebaseUnsubscribe: undefined,
  setSelectedEmployeeId: (employeeId) => {
    storeEmployeeId(employeeId)
    set({ selectedEmployeeId: employeeId })
  },
  setAuthState: ({ isAdmin, email }) => set({ authStatus: 'ready', adminLoggedIn: isAdmin, adminEmail: email }),
  startRealtimeSync: () => {
    const currentStop = get().firebaseUnsubscribe
    if (currentStop) {
      currentStop()
    }

    const pending = new Set(['teams', 'employees', 'workTypes', 'tasks'])
    const markLoaded = (key: string) => {
      pending.delete(key)
      if (pending.size === 0 && !get().loaded) {
        set({ loaded: true })
      }
    }
    const onError = (key: string) => (error: Error) => {
      console.error(`Failed to sync ${key}:`, error)
      markLoaded(key)
    }

    const unsubscribers = [
      onSnapshot(
        collection(db, 'teams'),
        (snapshot) => {
          set({ teams: snapshot.docs.map((docSnap) => mapTeam({ id: docSnap.id, ...docSnap.data() })).sort(byName) })
          markLoaded('teams')
        },
        onError('teams'),
      ),
      onSnapshot(
        collection(db, 'employees'),
        (snapshot) => {
          const employees = snapshot.docs.map((docSnap) => mapEmployee({ id: docSnap.id, ...docSnap.data() })).sort(byName)
          const selected = get().selectedEmployeeId
          const selectionValid = employees.some((employee) => employee.id === selected)
          set({ employees, selectedEmployeeId: selectionValid ? selected : employees[0]?.id ?? null })
          markLoaded('employees')
        },
        onError('employees'),
      ),
      onSnapshot(
        collection(db, 'workTypes'),
        (snapshot) => {
          set({ workTypes: snapshot.docs.map((docSnap) => mapWorkType({ id: docSnap.id, ...docSnap.data() })).sort(byName) })
          markLoaded('workTypes')
        },
        onError('workTypes'),
      ),
      onSnapshot(
        collection(db, 'tasks'),
        (snapshot) => {
          set({ tasks: snapshot.docs.map((docSnap) => mapTask({ id: docSnap.id, ...docSnap.data() })) })
          markLoaded('tasks')
        },
        onError('tasks'),
      ),
    ]

    const stop = () => unsubscribers.forEach((unsubscribe) => unsubscribe())
    set({ firebaseUnsubscribe: stop })
    return stop
  },
  stopRealtimeSync: () => {
    const stop = get().firebaseUnsubscribe
    if (stop) {
      stop()
    }
    set({ firebaseUnsubscribe: undefined })
  },
  addTeam: async (name) => {
    const newTeam: Team = {
      id: `team-${crypto.randomUUID()}`,
      name,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'teams', newTeam.id), newTeam)
    return newTeam
  },
  addEmployee: async (employee) => {
    const newEmployee: Employee = {
      ...employee,
      id: `emp-${crypto.randomUUID()}`,
      totalPoints: 0,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'employees', newEmployee.id), newEmployee)
    return newEmployee
  },
  addWorkType: async (workType) => {
    const newType: WorkType = {
      ...workType,
      id: `wt-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    }
    await setDoc(doc(db, 'workTypes', newType.id), newType)
    return newType
  },
  addTask: async (task) => {
    const newTask: Task = {
      ...task,
      id: `task-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    }
    const { completions, ...fields } = newTask
    // Single tasks keep the original document shape; only multi-count tasks carry a completions list.
    await setDoc(doc(db, 'tasks', newTask.id), newTask.count > 1 ? { ...fields, completions } : fields)
    return newTask
  },
  completeTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task || task.completions.length >= task.count) {
      return undefined
    }

    const workType = get().workTypes.find((item) => item.id === task.workTypeId)
    // Older reverted tasks were stored with 0 points; fall back to the work type's value for those.
    const points = workType ? getTaskPointsForTeam(workType, task.teamId, task.points || undefined) : task.points || 0
    const completions = [...task.completions, new Date().toISOString()]
    const progress = progressFields(task.count, completions)
    const earned = points * completions.length - earnedPoints(task)

    // One batch so the task and the employee total never disagree if a write is rejected.
    const batch = writeBatch(db)
    batch.update(doc(db, 'tasks', taskId), toFirestoreUpdate({ ...progress, points }))
    const employee = get().employees.find((person) => person.id === task.employeeId)
    if (employee) {
      batch.update(doc(db, 'employees', employee.id), { totalPoints: increment(earned) })
    }
    await batch.commit()

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, ...progress, points, completions } : item)),
      employees: state.employees.map((person) =>
        person.id === employee?.id ? { ...person, totalPoints: person.totalPoints + earned } : person,
      ),
    }))
    return earned
  },
  revertTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task || task.completions.length === 0) {
      return
    }

    // Undo the latest completion. Points stay on the task so completing it again awards the same amount.
    const completions = task.completions.slice(0, -1)
    const progress = progressFields(task.count, completions)
    const batch = writeBatch(db)
    batch.update(doc(db, 'tasks', taskId), toFirestoreUpdate(progress))
    const employee = get().employees.find((person) => person.id === task.employeeId)
    if (employee) {
      batch.update(doc(db, 'employees', employee.id), { totalPoints: increment(-task.points) })
    }
    await batch.commit()

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, ...progress, completions } : item)),
      employees: state.employees.map((person) =>
        person.id === employee?.id ? { ...person, totalPoints: person.totalPoints - task.points } : person,
      ),
    }))
  },
  deleteTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    const employee = get().employees.find((person) => person.id === task?.employeeId)
    const earned = task ? earnedPoints(task) : 0
    const batch = writeBatch(db)
    batch.delete(doc(db, 'tasks', taskId))
    // A deleted task no longer counts, so take any points it earned back off the employee total.
    if (earned && employee) {
      batch.update(doc(db, 'employees', employee.id), { totalPoints: increment(-earned) })
    }
    await batch.commit()
    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== taskId),
      employees: state.employees.map((person) =>
        person.id === employee?.id && earned ? { ...person, totalPoints: person.totalPoints - earned } : person,
      ),
    }))
  },
  deleteTeam: async (teamId) => {
    await deleteDoc(doc(db, 'teams', teamId))
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
    }))
  },
  deleteEmployee: async (employeeId) => {
    await deleteDoc(doc(db, 'employees', employeeId))
    await Promise.all(get().tasks.filter((task) => task.employeeId === employeeId).map((task) => deleteDoc(doc(db, 'tasks', task.id))))
    set((state) => {
      const employees = state.employees.filter((employee) => employee.id !== employeeId)
      return {
        employees,
        tasks: state.tasks.filter((task) => task.employeeId !== employeeId),
        selectedEmployeeId: state.selectedEmployeeId === employeeId ? employees[0]?.id ?? null : state.selectedEmployeeId,
      }
    })
  },
  deleteWorkType: async (workTypeId) => {
    await deleteDoc(doc(db, 'workTypes', workTypeId))
    set((state) => ({
      workTypes: state.workTypes.filter((workType) => workType.id !== workTypeId),
    }))
  },
  updateTask: async (taskId, updates) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) {
      return
    }
    // Status and completion fields always follow count + completions, whatever HR changed.
    const merged = { ...task, ...updates }
    const progress = progressFields(merged.count, merged.completions)
    const next = { ...merged, ...progress, completions: merged.completions }

    // HR can change completions, points or assignee here, so move earned points between employee totals.
    const deltas = new Map<string, number>()
    deltas.set(task.employeeId, -earnedPoints(task))
    deltas.set(next.employeeId, (deltas.get(next.employeeId) ?? 0) + earnedPoints(next))

    const batch = writeBatch(db)
    batch.update(doc(db, 'tasks', taskId), toFirestoreUpdate({ ...updates, ...progress }))
    const knownEmployees = new Set(get().employees.map((person) => person.id))
    deltas.forEach((delta, employeeId) => {
      if (delta !== 0 && knownEmployees.has(employeeId)) {
        batch.update(doc(db, 'employees', employeeId), { totalPoints: increment(delta) })
      }
    })
    await batch.commit()

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? next : item)),
      employees: state.employees.map((person) => {
        const delta = deltas.get(person.id)
        return delta ? { ...person, totalPoints: person.totalPoints + delta } : person
      }),
    }))
  },
}))
