import { format } from 'date-fns'
import { collection, deleteDoc, doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore'
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

type AppState = DemoData & {
  selectedEmployeeId: string | null
  adminLoggedIn: boolean
  firebaseUnsubscribe: (() => void) | undefined
  setSelectedEmployeeId: (employeeId: string | null) => void
  setAdminLoggedIn: (value: boolean) => void
  startRealtimeSync: () => (() => void) | undefined
  stopRealtimeSync: () => void
  clearData: () => void
  addTeam: (name: string) => Promise<Team>
  addEmployee: (employee: Omit<Employee, 'id' | 'totalPoints' | 'createdAt'>) => Promise<Employee>
  addWorkType: (workType: Omit<WorkType, 'id' | 'createdAt'>) => Promise<WorkType>
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => Promise<Task>
  completeTask: (taskId: string) => Promise<void>
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

export const useAppStore = create<AppState>()((set, get) => ({
  ...EMPTY_DATA,
  selectedEmployeeId: null,
  adminLoggedIn: false,
  firebaseUnsubscribe: undefined,
  setSelectedEmployeeId: (employeeId) => set({ selectedEmployeeId: employeeId }),
  setAdminLoggedIn: (value) => set({ adminLoggedIn: value }),
  startRealtimeSync: () => {
    const currentStop = get().firebaseUnsubscribe
    if (currentStop) {
      currentStop()
    }

    const unsubscribers = [
      onSnapshot(collection(db, 'teams'), (snapshot) => {
        set({
          teams: snapshot.docs.map((docSnap) => mapTeam({ id: docSnap.id, ...docSnap.data() })),
        })
      }),
      onSnapshot(collection(db, 'employees'), (snapshot) => {
        const employees = snapshot.docs.map((docSnap) => mapEmployee({ id: docSnap.id, ...docSnap.data() }))
        set({ employees })
        const selected = get().selectedEmployeeId
        if (!selected && employees[0]) {
          set({ selectedEmployeeId: employees[0].id })
        }
      }),
      onSnapshot(collection(db, 'workTypes'), (snapshot) => {
        set({
          workTypes: snapshot.docs.map((docSnap) => mapWorkType({ id: docSnap.id, ...docSnap.data() })),
        })
      }),
      onSnapshot(collection(db, 'tasks'), (snapshot) => {
        set({
          tasks: snapshot.docs.map((docSnap) => mapTask({ id: docSnap.id, ...docSnap.data() })),
        })
      }),
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
  clearData: () => {
    set({
      ...EMPTY_DATA,
      selectedEmployeeId: null,
      adminLoggedIn: false,
    })
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
      return
    }

    const workType = get().workTypes.find((item) => item.id === task.workTypeId)
    const points = workType ? getTaskPointsForTeam(workType, task.teamId, task.points || 0) : task.points || 0
    const updatedTask: Task = {
      ...task,
      status: 'completed',
      points,
      completedAt: new Date().toISOString(),
      completedDate: format(new Date(), 'yyyy-MM-dd'),
    }
    await updateDoc(doc(db, 'tasks', taskId), updatedTask)

    const employee = get().employees.find((person) => person.id === task.employeeId)
    if (employee) {
      const nextPoints = employee.totalPoints + points
      await updateDoc(doc(db, 'employees', employee.id), { totalPoints: nextPoints })
    }

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
      employees: state.employees.map((person) =>
        person.id === employee?.id ? { ...person, totalPoints: employee.totalPoints + points } : person,
      ),
    }))
  },
  revertTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task || task.status === 'pending') {
      return
    }

    const updatedTask: Task = {
      ...task,
      status: 'pending',
      points: 0,
      completedAt: undefined,
      completedDate: undefined,
    }

    await updateDoc(doc(db, 'tasks', taskId), updatedTask)
    const employee = get().employees.find((person) => person.id === task.employeeId)
    if (employee) {
      const nextPoints = Math.max(employee.totalPoints - task.points, 0)
      await updateDoc(doc(db, 'employees', employee.id), { totalPoints: nextPoints })
    }

    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? updatedTask : item)),
      employees: state.employees.map((person) =>
        person.id === employee?.id ? { ...person, totalPoints: employee ? Math.max(employee.totalPoints - task.points, 0) : person.totalPoints } : person,
      ),
    }))
  },
  deleteTask: async (taskId) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) {
      return
    }

    await deleteDoc(doc(db, 'tasks', taskId))
    set((state) => ({
      tasks: state.tasks.filter((item) => item.id !== taskId),
    }))
  },
  deleteTeam: async (teamId) => {
    await deleteDoc(doc(db, 'teams', teamId))
    set((state) => ({
      teams: state.teams.filter((team) => team.id !== teamId),
      employees: state.employees.map((employee) =>
        employee.teamId === teamId ? { ...employee, teamId: state.teams[0]?.id ?? employee.teamId } : employee,
      ),
    }))
  },
  deleteEmployee: async (employeeId) => {
    await deleteDoc(doc(db, 'employees', employeeId))
    await Promise.all(get().tasks.filter((task) => task.employeeId === employeeId).map((task) => deleteDoc(doc(db, 'tasks', task.id))))
    set((state) => ({
      employees: state.employees.filter((employee) => employee.id !== employeeId),
      tasks: state.tasks.filter((task) => task.employeeId !== employeeId),
      selectedEmployeeId:
        state.selectedEmployeeId === employeeId ? state.employees[0]?.id ?? null : state.selectedEmployeeId,
    }))
  },
  deleteWorkType: async (workTypeId) => {
    await deleteDoc(doc(db, 'workTypes', workTypeId))
    set((state) => ({
      workTypes: state.workTypes.filter((workType) => workType.id !== workTypeId),
      tasks: state.tasks.filter((task) => task.workTypeId !== workTypeId),
    }))
  },
  updateTask: async (taskId, updates) => {
    const task = get().tasks.find((item) => item.id === taskId)
    if (!task) {
      return
    }
    const nextTask = { ...task, ...updates }
    await updateDoc(doc(db, 'tasks', taskId), nextTask)
    set((state) => ({
      tasks: state.tasks.map((item) => (item.id === taskId ? nextTask : item)),
    }))
  },
}))
