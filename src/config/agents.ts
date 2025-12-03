/**
 * LHT Dashboard - Agent Configuration
 *
 * Central configuration for all AI agents/tools in the dashboard.
 * Add new agents here to make them available in the UI.
 */

import {
  UserCircle,
  Sparkles,
  PenTool,
  BookOpen,
  Mouse,
  type LucideIcon
} from "lucide-react"

/**
 * Agent configuration interface
 */
export interface AgentConfig {
  /** Unique identifier - must match backend agent name */
  id: string
  /** Display name shown in UI */
  name: string
  /** Short description of what the agent does */
  description: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Whether the agent is enabled (can be used for feature flags) */
  enabled: boolean
  /** Optional: accent color for the agent card (uses lht-green by default) */
  accentColor?: string
  /** Optional: text/icon color for the agent card (uses lht-black by default, use white for dark backgrounds) */
  textColor?: string
  /** Optional: category for grouping agents */
  category?: "hr" | "prompts" | "content" | "knowledge" | "general" | "operations"
}

/**
 * All configured agents
 *
 * To add a new agent:
 * 1. Add the agent config here
 * 2. Ensure the backend has a matching agent with the same id
 * 3. The agent will automatically appear in the dashboard
 */
export const agents: AgentConfig[] = [
  {
    id: "henry-hr",
    name: "Henry HR",
    description: "Begeleidt teamleden stap-voor-stap door het proces van het maken van hun eigen Custom GPT",
    icon: UserCircle,
    enabled: true,
    category: "hr",
    accentColor: "#f7b681",
  },
  {
    id: "perry-prompt",
    name: "Perry Prompt",
    description: "Een AI collega gespecialiseerd in het optimaliseren van AI-interacties",
    icon: Sparkles,
    enabled: true,
    category: "prompts",
    accentColor: "#a1d980",
  },
  {
    id: "corry-content",
    name: "Corry Content",
    description: "Transformeert ruwe teksten in platform-specifieke content die klaar is om te posten",
    icon: PenTool,
    enabled: true,
    category: "content",
    accentColor: "#efe173",
  },
  {
    id: "kenny-kennis",
    name: "Kenny Kennis",
    description: "Transformeert ruwe informatie in AI-interpreteerbare knowledge files",
    icon: BookOpen,
    enabled: true,
    category: "knowledge",
    accentColor: "#e7a4bb",
  },
  {
    id: "mickey-mice",
    name: "Mickey Mice",
    description: "Readonly toegang tot MICE Operations voor events en meetings",
    icon: Mouse,
    enabled: true,
    category: "operations",
    accentColor: "#000000",
    textColor: "#ffffff",
  },
]

/**
 * Get all enabled agents
 */
export function getEnabledAgents(): AgentConfig[] {
  return agents.filter(agent => agent.enabled)
}

/**
 * Get agent by ID
 */
export function getAgentById(id: string): AgentConfig | undefined {
  return agents.find(agent => agent.id === id)
}

/**
 * Get agents by category
 */
export function getAgentsByCategory(category: AgentConfig["category"]): AgentConfig[] {
  return agents.filter(agent => agent.category === category && agent.enabled)
}

/**
 * Check if an agent ID is valid
 */
export function isValidAgentId(id: string): boolean {
  return agents.some(agent => agent.id === id && agent.enabled)
}
