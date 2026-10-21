export type Team = {
  id: string
  name: string
  createdAt: string
}

export type Employee = {
  id: string
  name: string
  teamId: string
  active: boolean
  totalPoints: number
  createdAt: string
}

export type WorkType = {
  id: string
  name: string
  icon: string
  defaultPoints: number
  teamOverrides: Record<string, number>
  allowedTeamIds?: string[]
  active: boolean
  createdAt: string
}

export type TaskStatus = 'pending' | 'completed'

export type Task = {
  id: string
  employeeId: string
  teamId: string
  workTypeId: string
  workTypeName: string
  title: string
  status: TaskStatus
  /** Points for each completion. */
  points: number
  /** How many times the task must be marked done (e.g. 3 posters). */
  count: number
  /** ISO timestamp of every completion so far; a task is completed once there are `count` of them. */
  completions: string[]
  /** Day the task is assigned for (yyyy-MM-dd, local). Older tasks fall back to their createdAt day. */
  taskDate: string
  createdAt: string
  completedAt?: string
  completedDate?: string
  createdBy: 'employee' | 'hr'
}

export type DemoData = {
  teams: Team[]
  employees: Employee[]
  workTypes: WorkType[]
  tasks: Task[]
}
