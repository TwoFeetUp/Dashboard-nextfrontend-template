/**
 * Dashboard types for the Research Dashboard feature.
 */

export interface DashboardCard {
  id: string
  userId: string
  title: string
  researchTopic: string
  refreshFrequency: 'daily' | 'weekly' | 'custom'
  customRefreshHours?: number
  position: number
  isActive: boolean
  cacheStatus: 'valid' | 'stale' | 'refreshing' | 'error' | 'none'
  lastUpdated?: string
  expiresAt?: string
  created: string
  updated: string
}

export interface ToolUsage {
  toolName: string
  domain: string
  resultsCount: number
  success: boolean
  errorMessage?: string
}

export interface ResearchMethodology {
  toolsUsed: ToolUsage[]
  totalSourcesChecked: number
  analysisSteps: string[]
  timeTakenSeconds: number
}

export interface CardContent {
  htmlContent: string
  isStale: boolean
  isRefreshing: boolean
  generatedAt?: string
  errorMessage?: string
  summary?: string
  keyInsight?: string  // The main finding/conclusion from the research
  methodology?: ResearchMethodology
}

export interface CardConfig {
  title: string
  researchTopic: string
  refreshFrequency: 'daily' | 'weekly' | 'custom'
  customRefreshHours?: number
  position?: number
  isActive?: boolean
}

export interface CreateCardResponse {
  id: string
  message: string
}

export interface ListCardsResponse {
  cards: DashboardCard[]
  total: number
}
