import { format } from 'date-fns'
import { collection, deleteDoc, deleteField, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
import { create } from 'zustand'

import { db } from '../firebase'
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

const mapTask = (data: Record<string, unknown> & { id?: string }): Task => ({
  id: (data.id as string) ?? '',
  employeeId: (data.employeeId as string) ?? '',
  teamId: (data.teamId as string) ?? '',
  workTypeId: (data.workTypeId as string) ?? '',
  workTypeName: (data.workTypeName as string) ?? '',
  title: (data.title as string) ?? '',
  status: (data.status as Task['status']) ?? 'pending',
  points: Number(data.points ?? 0),
  createdAt: (data.createdAt as string) ?? new Date().toISOString(),
  completedAt: (data.completedAt as string | undefined) ?? undefined,
  completedDate: (data.completedDate as string | undefined) ?? undefined,
  createdBy: (data.createdBy as Task['createdBy']) ?? 'hr',
})

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
    await setDoc(doc(db, 'tasks', newTask.id), newTask)
    return newTask
  },
  completeTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task || task.status === 'completed') {
      return undefined
    }

    const workType = get().workTypes.find((item) => item.id === task.workTypeId)
    // Older reverted tasks were stored with 0 points; fall back to the work type's value for those.
    const points = workType ? getTaskPointsForTeam(workType, task.teamId, task.points || undefined) : task.points || 0
    const completion = {
      status: 'completed' as const,
      points,
      completedAt: new Date().toISOString(),
      completedDate: format(new Date(), 'yyyy-MM-dd'),
    }
    await updateDoc(doc(db, 'tasks', taskId), completion)

    const employee = get().employees.find((person) => person.id === task.employeeId)
    if (employee) {
      await updateDoc(doc(db, 'employees', employee.id), { totalPoints: employee.totalPoints + points })
    }

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, ...completion } : item)),
      employees: state.employees.map((person) =>
        person.id === employee?.id ? { ...person, totalPoints: employee.totalPoints + points } : person,
      ),
    }))
    return points
  },
  revertTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task || task.status === 'pending') {
      return
    }

    // Points stay on the task so completing it again awards the same amount.
    await updateDoc(doc(db, 'tasks', taskId), {
      status: 'pending',
      completedAt: deleteField(),
      completedDate: deleteField(),
    })

    const employee = get().employees.find((person) => person.id === task.employeeId)
    const nextPoints = employee ? Math.max(employee.totalPoints - task.points, 0) : 0
    if (employee) {
      await updateDoc(doc(db, 'employees', employee.id), { totalPoints: nextPoints })
    }

    set((state) => ({
      tasks: state.tasks.map((item) =>
        item.id === taskId ? { ...item, status: 'pending', completedAt: undefined, completedDate: undefined } : item,
      ),
      employees: state.employees.map((person) => (person.id === employee?.id ? { ...person, totalPoints: nextPoints } : person)),
    }))
  },
  deleteTask: async (taskId) => {
    await deleteDoc(doc(db, 'tasks', taskId))
    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== taskId),
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
    await updateDoc(doc(db, 'tasks', taskId), toFirestoreUpdate(updates))
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, ...updates } : item)),
    }))
  },
}))
