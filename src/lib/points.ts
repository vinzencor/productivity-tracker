import type { WorkType } from '../types'

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
