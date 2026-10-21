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
  points: number
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
