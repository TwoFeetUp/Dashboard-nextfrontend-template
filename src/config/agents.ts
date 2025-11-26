/**
 * LHT Dashboard - Agent Configuration
 *
 * Central configuration for all AI agents/tools in the dashboard.
 * Add new agents here to make them available in the UI.
 */

import {
  FileText,
  Calendar,
  FileCheck,
  Megaphone,
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
  /** Optional: category for grouping agents */
  category?: "contracts" | "events" | "marketing" | "general"
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
    id: "contract-clearance",
    name: "Contract Clearance",
    description: "AI-assistent voor contractbeheer en -controle",
    icon: FileText,
    enabled: true,
    category: "contracts",
  },
  {
    id: "event-planner",
    name: "Event Planner",
    description: "AI-assistent voor evenement planning en organisatie",
    icon: Calendar,
    enabled: true,
    category: "events",
  },
  {
    id: "event-contract-assistant",
    name: "Event Contract Assistant",
    description: "AI-assistent voor het opstellen van event contracten",
    icon: FileCheck,
    enabled: true,
    category: "events",
  },
  {
    id: "marketing-communicatie",
    name: "Marketing en Communicatie",
    description: "AI-assistent voor marketing en communicatie",
    icon: Megaphone,
    enabled: true,
    category: "marketing",
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
