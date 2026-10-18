import { format, subDays } from 'date-fns'

import type { Employee, Task, WorkType } from '../types'

export function getLevelFromPoints(totalPoints: number) {
  return Math.floor(totalPoints / 10) + 1
}

export function getProgressToNextLevel(totalPoints: number) {
  const currentLevel = getLevelFromPoints(totalPoints)
  const levelStart = (currentLevel - 1) * 10
  const progress = totalPoints - levelStart
  return {
    currentLevel,
    progress,
    percent: Math.min((progress / 10) * 100, 100),
    nextLevelTarget: levelStart + 10,
  }
}

export function getTaskPointsForTeam(
  workType: WorkType,
  teamId: string,
  fallbackPoints?: number,
) {
  if (workType.teamOverrides[teamId] !== undefined) {
    return workType.teamOverrides[teamId]
  }

  return fallbackPoints ?? workType.defaultPoints
}

export function getPointsToday(tasks: Task[]) {
  const todayKey = format(new Date(), 'yyyy-MM-dd')

  return tasks
    .filter((task) => task.status === 'completed' && task.completedDate === todayKey)
    .reduce((sum, task) => sum + task.points, 0)
}

export function getCurrentStreak(tasks: Task[]) {
  const completedDates = new Set(
    tasks
      .filter((task) => task.status === 'completed' && task.completedDate)
      .map((task) => task.completedDate as string),
  )

  let streak = 0
  let cursor = new Date()

  while (completedDates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  return streak
}

export function getEmployeeLeaderboard(employees: Employee[], tasks: Task[]) {
  return [...employees]
    .map((employee) => ({
      ...employee,
      points: tasks
        .filter((task) => task.employeeId === employee.id && task.status === 'completed')
        .reduce((sum, task) => sum + task.points, 0),
    }))
    .sort((left, right) => right.points - left.points)
}

export function getBadges(tasks: Task[]) {
  const completedCount = tasks.filter((task) => task.status === 'completed').length
  const totalPoints = tasks
    .filter((task) => task.status === 'completed')
    .reduce((sum, task) => sum + task.points, 0)
  const streak = getCurrentStreak(tasks)

  const badges: string[] = []

  if (completedCount >= 1) badges.push('First Task')
  if (completedCount >= 10) badges.push('10 Tasks')
  if (totalPoints >= 50) badges.push('50 Points')
  if (streak >= 7) badges.push('7-Day Streak')

  return badges
}
